"""
Tests for transaction management and thread safety
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
import threading
import time
import os
from app.core.database import get_db_transaction


class TestTransactionManagement:
    """Tests for database transaction management"""

    def test_transaction_commits_on_success(self, monkeypatch):
        """Test that transaction commits when no exception occurs"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        # Execute transaction
        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO test VALUES (1)")
            cursor.close()

        # Verify commit was called
        mock_conn.commit.assert_called_once()

        # Verify rollback was NOT called
        mock_conn.rollback.assert_not_called()

        # Verify connection returned to pool
        mock_pool.putconn.assert_called_once_with(mock_conn)

    def test_transaction_rolls_back_on_error(self, monkeypatch):
        """Test that transaction rolls back when exception occurs"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        # Execute transaction with error
        with pytest.raises(Exception):
            with get_db_transaction() as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO test VALUES (1)")
                raise Exception("Database error")

        # Verify rollback was called
        mock_conn.rollback.assert_called_once()

        # Verify commit was NOT called
        mock_conn.commit.assert_not_called()

        # Verify connection still returned to pool
        mock_pool.putconn.assert_called_once_with(mock_conn)

    def test_transaction_autocommit_disabled(self, monkeypatch):
        """Test that autocommit is disabled during transaction"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        with get_db_transaction() as conn:
            # Verify autocommit was set to False
            assert conn.autocommit == False

        # Verify autocommit restored to True before returning to pool
        assert mock_conn.autocommit == True

    def test_transaction_sets_utf8_encoding(self, monkeypatch):
        """Test that UTF-8 encoding is enforced"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        with get_db_transaction() as conn:
            pass

        # Verify UTF-8 encoding was set
        mock_conn.set_client_encoding.assert_called_once_with('UTF8')

    def test_multiple_operations_atomic(self, monkeypatch):
        """Test that multiple operations are atomic (all or nothing)"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        # Successful transaction
        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO users VALUES (1, 'Alice')")
            cursor.execute("INSERT INTO orders VALUES (1, 100)")
            cursor.close()

        # Both operations committed
        assert mock_conn.commit.call_count == 1

        # Failed transaction
        mock_conn.reset_mock()
        with pytest.raises(Exception):
            with get_db_transaction() as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO users VALUES (2, 'Bob')")
                raise Exception("Something went wrong")
                cursor.execute("INSERT INTO orders VALUES (2, 200)")  # Never executed

        # All operations rolled back
        assert mock_conn.rollback.call_count == 1
        assert mock_conn.commit.call_count == 0


class TestSupabaseClientThreadSafety:
    """Tests for thread-safe Supabase client"""

    @patch('app.services.supabase_client.create_client')
    @patch('app.services.supabase_client.settings')
    def test_supabase_client_singleton(self, mock_settings, mock_create):
        """Test that Supabase client is a singleton"""
        from app.services.supabase_client import get_supabase_client

        # Provide required credentials via mocked settings
        mock_settings.SUPABASE_URL = "https://test.supabase.co"
        mock_settings.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"

        # Reset global state
        import app.services.supabase_client as client_module
        with client_module._client_lock:
            client_module._supabase_client = None

        mock_client = MagicMock()
        mock_create.return_value = mock_client

        # Get client twice
        client1 = get_supabase_client()
        client2 = get_supabase_client()

        # Should be same instance
        assert client1 is client2

        # Client should only be created once
        mock_create.assert_called_once()

        # Restore singleton state to avoid polluting other tests
        with client_module._client_lock:
            client_module._supabase_client = None

    @patch('app.services.supabase_client.create_client')
    @patch('app.services.supabase_client.settings')
    def test_supabase_client_thread_safe_initialization(self, mock_settings, mock_create):
        """Test that concurrent initialization is thread-safe"""
        from app.services.supabase_client import get_supabase_client

        # Provide required credentials via mocked settings
        mock_settings.SUPABASE_URL = "https://test.supabase.co"
        mock_settings.SUPABASE_SERVICE_ROLE_KEY = "test-service-key"

        # Reset global state
        import app.services.supabase_client as client_module
        with client_module._client_lock:
            client_module._supabase_client = None

        mock_client = MagicMock()
        mock_create.return_value = mock_client

        clients = []

        def get_client():
            clients.append(get_supabase_client())

        # Create 10 concurrent threads
        threads = [threading.Thread(target=get_client) for _ in range(10)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # All should get the same instance
        assert len(clients) == 10
        assert all(c is clients[0] for c in clients)

        # Client should only be created once despite concurrent access
        mock_create.assert_called_once()

        # Restore singleton state
        with client_module._client_lock:
            client_module._supabase_client = None


class TestCacheThreadSafety:
    """Tests for thread-safe cache"""

    def test_cache_concurrent_get_set(self):
        """Test concurrent get/set operations are thread-safe"""
        from app.services.cache_service import LRUCache

        cache = LRUCache(max_size=100, default_ttl=300)
        results = []

        def set_and_get(key, value):
            cache.set(key, value)
            retrieved = cache.get(key)
            results.append((key, value, retrieved))
            time.sleep(0.01)  # Simulate some work

        # Create 20 concurrent operations
        threads = []
        for i in range(20):
            thread = threading.Thread(target=set_and_get, args=(f"key{i}", f"value{i}"))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # Verify all operations completed correctly
        assert len(results) == 20
        for key, expected, actual in results:
            assert actual == expected, f"Cache corruption: {key} expected {expected}, got {actual}"

    def test_cache_concurrent_eviction(self):
        """Test that LRU eviction is thread-safe"""
        from app.services.cache_service import LRUCache

        cache = LRUCache(max_size=10, default_ttl=300)

        def add_items(start, end):
            for i in range(start, end):
                cache.set(f"key{i}", f"value{i}")

        # Create threads that will cause evictions
        threads = []
        for i in range(5):
            thread = threading.Thread(target=add_items, args=(i*10, (i+1)*10))
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # Cache should not exceed max size
        stats = cache.get_stats()
        assert stats['size'] <= cache.max_size

        # Should have evictions
        assert stats['evictions'] > 0

    def test_cache_stats_thread_safe(self):
        """Test that statistics are accurately maintained under concurrent access"""
        from app.services.cache_service import LRUCache

        cache = LRUCache(max_size=50, default_ttl=300)

        # Pre-populate some entries
        for i in range(20):
            cache.set(f"key{i}", f"value{i}")

        def access_cache():
            for i in range(20):
                # Mix of hits and misses
                cache.get(f"key{i}")  # Hit
                cache.get(f"missing{i}")  # Miss

        # Multiple threads accessing cache
        threads = [threading.Thread(target=access_cache) for _ in range(5)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # Verify statistics are consistent
        stats = cache.get_stats()
        assert stats['total_requests'] == stats['hits'] + stats['misses']
        assert stats['hits'] == 20 * 5  # 20 hits per thread, 5 threads
        assert stats['misses'] == 20 * 5  # 20 misses per thread, 5 threads

    def test_cache_cleanup_thread_safe(self):
        """Test that expired entry cleanup is thread-safe"""
        from app.services.cache_service import LRUCache

        cache = LRUCache(max_size=100, default_ttl=1)  # 1 second TTL

        # Add entries
        for i in range(50):
            cache.set(f"key{i}", f"value{i}")

        # Wait for expiration
        time.sleep(1.1)

        # Concurrent cleanup and access
        def cleanup():
            cache.cleanup_expired()

        def access():
            for i in range(50):
                cache.get(f"key{i}")

        threads = [threading.Thread(target=cleanup) for _ in range(2)]
        threads.extend([threading.Thread(target=access) for _ in range(3)])

        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # Should not crash and cache should be cleaned
        stats = cache.get_stats()
        assert stats['size'] == 0  # All expired


@pytest.mark.integration
@pytest.mark.database
class TestTransactionIntegration:
    """Integration tests for transaction management (requires real database)"""

    @pytest.fixture(autouse=True)
    def require_db(self):
        if not os.getenv("TEST_DATABASE_URL"):
            pytest.skip("Integration tests require TEST_DATABASE_URL")

    def test_real_transaction_commit(self):
        """Test real transaction commits successfully"""
        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            assert result['test'] == 1
            cursor.close()

    def test_real_transaction_rollback(self):
        """Test real transaction rollback on error"""
        try:
            with get_db_transaction() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1 as test")
                raise Exception("Test error")
        except Exception:
            pass  # Expected

        # Transaction should have rolled back, connection should be fine
        with get_db_transaction() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            assert result['test'] == 1
            cursor.close()
