"""
Tests for database connection pooling and management
"""
import os
import pytest
from unittest.mock import Mock, patch, MagicMock
from app.core.database import get_connection_pool, get_db
import psycopg2


class TestConnectionPooling:
    """Tests for database connection pool"""

    @patch('app.core.database.pool.ThreadedConnectionPool')
    def test_connection_pool_singleton(self, mock_pool_cls):
        """Test that connection pool is a singleton"""
        import app.core.database as db_module
        with db_module._pool_lock:
            db_module._connection_pool = None

        mock_pool_cls.return_value = MagicMock()

        pool1 = get_connection_pool()
        pool2 = get_connection_pool()

        assert pool1 is pool2, "Connection pool should be singleton"
        mock_pool_cls.assert_called_once()

        # Reset so subsequent tests start clean
        with db_module._pool_lock:
            db_module._connection_pool = None

    @patch('app.core.database.pool.ThreadedConnectionPool')
    def test_connection_pool_thread_safe(self, mock_pool_cls):
        """Test that connection pool initialization is thread-safe"""
        import threading
        import app.core.database as db_module
        with db_module._pool_lock:
            db_module._connection_pool = None

        mock_pool_cls.return_value = MagicMock()

        pools = []

        def get_pool():
            pools.append(get_connection_pool())

        threads = [threading.Thread(target=get_pool) for _ in range(10)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        # All should reference the same pool
        assert len(pools) == 10
        assert all(p is pools[0] for p in pools), "Pool should be thread-safe singleton"

        with db_module._pool_lock:
            db_module._connection_pool = None

    @patch('app.core.database.pool.ThreadedConnectionPool')
    def test_connection_pool_configuration(self, mock_pool_cls):
        """Test that connection pool is configured correctly"""
        import app.core.database as db_module
        with db_module._pool_lock:
            db_module._connection_pool = None

        mock_pool_cls.return_value = MagicMock()

        get_connection_pool()

        # Verify pool was created with correct parameters
        mock_pool_cls.assert_called_once()
        call_kwargs = mock_pool_cls.call_args.kwargs

        assert call_kwargs['minconn'] == 2
        assert call_kwargs['maxconn'] == 20
        assert 'dsn' in call_kwargs          # connection via DSN
        assert 'connect_timeout' in call_kwargs

        with db_module._pool_lock:
            db_module._connection_pool = None

    def test_get_db_returns_connection_to_pool(self, monkeypatch):
        """Test that get_db() properly returns connections to pool"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        # Use connection
        with get_db() as conn:
            assert conn is mock_conn

        # Verify connection was returned to pool
        mock_pool.putconn.assert_called_once_with(mock_conn)

    def test_get_db_rollback_on_error(self, monkeypatch):
        """Test that get_db() rolls back on psycopg2 errors and returns connection to pool"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        # Only psycopg2.Error triggers the rollback branch in get_db()
        with pytest.raises(psycopg2.OperationalError):
            with get_db() as conn:
                raise psycopg2.OperationalError("Simulated DB error")

        # Verify rollback was called
        mock_conn.rollback.assert_called_once()

        # Verify connection was still returned to pool
        mock_pool.putconn.assert_called_once_with(mock_conn)

    def test_get_db_sets_utf8_encoding(self, monkeypatch):
        """Test that get_db() sets UTF-8 encoding"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        with get_db() as conn:
            pass

        # Verify UTF-8 encoding was set
        mock_conn.set_client_encoding.assert_called_once_with('UTF8')


class TestDatabaseTransactions:
    """Tests for database transaction management"""

    def test_connection_context_manager_cleanup(self, monkeypatch):
        """Test that context manager always cleans up"""
        mock_pool = MagicMock()
        mock_conn = MagicMock()

        mock_pool.getconn.return_value = mock_conn
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        # Normal operation
        with get_db() as conn:
            conn.cursor()

        # Connection should be returned
        assert mock_pool.putconn.called

    def test_multiple_connections_from_pool(self, monkeypatch):
        """Test that multiple connections can be acquired"""
        mock_pool = MagicMock()
        connections = [MagicMock() for _ in range(3)]

        mock_pool.getconn.side_effect = connections
        monkeypatch.setattr('app.core.database.get_connection_pool', lambda: mock_pool)

        # Acquire multiple connections
        acquired = []
        for _ in range(3):
            with get_db() as conn:
                acquired.append(conn)

        # Verify all connections were acquired and returned
        assert len(acquired) == 3
        assert mock_pool.getconn.call_count == 3
        assert mock_pool.putconn.call_count == 3


@pytest.mark.integration
@pytest.mark.database
class TestDatabaseIntegration:
    """Integration tests requiring real database"""

    @pytest.fixture(autouse=True)
    def require_db(self):
        if not os.getenv("TEST_DATABASE_URL"):
            pytest.skip("Integration tests require TEST_DATABASE_URL")

    def test_real_connection_pool(self):
        """Test real connection pool (requires TEST_DATABASE_URL)"""
        pool = get_connection_pool()
        assert pool is not None

    def test_real_connection_acquisition(self):
        """Test acquiring and using real connection"""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()
            assert result['test'] == 1
            cursor.close()

    def test_concurrent_connections(self):
        """Test multiple concurrent connections"""
        import threading
        results = []

        def query_db():
            with get_db() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT 1 as test")
                results.append(cursor.fetchone()['test'])
                cursor.close()

        # Create 5 concurrent connections
        threads = [threading.Thread(target=query_db) for _ in range(5)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        assert len(results) == 5
        assert all(r == 1 for r in results)
