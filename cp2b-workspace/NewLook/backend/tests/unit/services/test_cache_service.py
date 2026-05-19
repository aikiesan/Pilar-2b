"""
Tests for Cache Service
Tests LRU cache implementation with TTL and thread safety
"""

import pytest
import time
import threading
from datetime import datetime, timedelta

from app.services.cache_service import (
    CacheEntry,
    LRUCache,
    get_proximity_cache_key,
    get_mapbiomas_cache_key,
    get_all_cache_stats,
)


class TestCacheEntry:
    """Test CacheEntry class"""

    def test_cache_entry_creation(self):
        """Test cache entry is created with correct expiration"""
        value = {"test": "data"}
        ttl = 10
        entry = CacheEntry(value, ttl)

        assert entry.value == value
        assert entry.created_at is not None
        assert entry.expires_at > entry.created_at

    def test_cache_entry_not_expired(self):
        """Test cache entry is not expired immediately"""
        entry = CacheEntry("value", ttl_seconds=10)
        assert not entry.is_expired()

    def test_cache_entry_is_expired(self):
        """Test cache entry expires after TTL"""
        entry = CacheEntry("value", ttl_seconds=1)
        time.sleep(1.1)
        assert entry.is_expired()

    def test_get_age_seconds(self):
        """Test get_age_seconds returns correct age"""
        entry = CacheEntry("value", ttl_seconds=10)
        time.sleep(0.5)
        age = entry.get_age_seconds()
        assert age >= 0
        assert age < 2  # Should be less than 2 seconds


class TestLRUCache:
    """Test LRUCache class"""

    @pytest.fixture
    def cache(self):
        """Create fresh cache instance for each test"""
        return LRUCache(max_size=3, default_ttl=10)

    def test_cache_initialization(self, cache):
        """Test cache initializes with correct parameters"""
        assert cache.max_size == 3
        assert cache.default_ttl == 10
        assert cache.hits == 0
        assert cache.misses == 0
        assert cache.evictions == 0

    def test_set_and_get(self, cache):
        """Test basic set and get operations"""
        cache.set("key1", "value1")
        result = cache.get("key1")

        assert result == "value1"
        assert cache.hits == 1
        assert cache.misses == 0

    def test_get_missing_key(self, cache):
        """Test get on missing key returns None"""
        result = cache.get("nonexistent")

        assert result is None
        assert cache.misses == 1

    def test_get_expired_entry(self, cache):
        """Test get on expired entry returns None"""
        cache.set("key1", "value1", ttl=1)
        time.sleep(1.1)

        result = cache.get("key1")

        assert result is None
        assert cache.misses == 1
        assert "key1" not in cache.cache  # Expired entry should be removed

    def test_lru_eviction(self, cache):
        """Test LRU eviction when cache is full"""
        # Fill cache to max capacity
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")

        # Access key1 to make it recently used
        cache.get("key1")

        # Add new key, should evict key2 (oldest)
        cache.set("key4", "value4")

        assert cache.get("key1") == "value1"  # Recently used, kept
        assert cache.get("key2") is None  # Evicted
        assert cache.get("key3") == "value3"  # Kept
        assert cache.get("key4") == "value4"  # New entry
        assert cache.evictions == 1

    def test_update_existing_key(self, cache):
        """Test updating existing key with new value"""
        cache.set("key1", "value1")
        cache.set("key1", "value2")

        result = cache.get("key1")
        assert result == "value2"

    def test_custom_ttl(self, cache):
        """Test setting custom TTL overrides default"""
        cache.set("key1", "value1", ttl=1)
        cache.set("key2", "value2", ttl=10)

        time.sleep(1.1)

        assert cache.get("key1") is None  # Expired
        assert cache.get("key2") == "value2"  # Still valid

    def test_delete(self, cache):
        """Test deleting cache entry"""
        cache.set("key1", "value1")
        cache.delete("key1")

        result = cache.get("key1")
        assert result is None

    def test_delete_nonexistent_key(self, cache):
        """Test deleting nonexistent key doesn't raise error"""
        cache.delete("nonexistent")  # Should not raise

    def test_clear(self, cache):
        """Test clearing all cache entries"""
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.get("key1")  # Generate some stats

        cache.clear()

        assert len(cache.cache) == 0
        assert cache.hits == 0
        assert cache.misses == 0
        assert cache.evictions == 0

    def test_get_stats(self, cache):
        """Test getting cache statistics"""
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.get("key1")  # Hit
        cache.get("key3")  # Miss

        stats = cache.get_stats()

        assert stats["size"] == 2
        assert stats["max_size"] == 3
        assert stats["hits"] == 1
        assert stats["misses"] == 1
        assert stats["evictions"] == 0
        assert stats["total_requests"] == 2
        assert stats["hit_rate_percent"] == 50.0

    def test_cleanup_expired(self, cache):
        """Test cleaning up expired entries"""
        cache.set("key1", "value1", ttl=1)
        cache.set("key2", "value2", ttl=10)
        cache.set("key3", "value3", ttl=1)

        time.sleep(1.1)

        expired_count = cache.cleanup_expired()

        assert expired_count == 2
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"
        assert cache.get("key3") is None

    def test_generate_key_consistency(self, cache):
        """Test key generation is consistent for same parameters"""
        key1 = cache._generate_key("test", lat=1.234, lng=5.678, radius=10)
        key2 = cache._generate_key("test", lat=1.234, lng=5.678, radius=10)

        assert key1 == key2

    def test_generate_key_different_params(self, cache):
        """Test key generation produces different keys for different parameters"""
        key1 = cache._generate_key("test", lat=1.234, lng=5.678, radius=10)
        key2 = cache._generate_key("test", lat=1.234, lng=5.678, radius=20)

        assert key1 != key2

    def test_generate_key_order_independence(self, cache):
        """Test key generation is order-independent"""
        key1 = cache._generate_key("test", lat=1.234, lng=5.678)
        key2 = cache._generate_key("test", lng=5.678, lat=1.234)

        assert key1 == key2

    def test_thread_safety_concurrent_reads(self, cache):
        """Test thread-safe concurrent read operations"""
        cache.set("key1", "value1")

        results = []
        errors = []

        def read_cache():
            try:
                for _ in range(100):
                    result = cache.get("key1")
                    results.append(result)
            except Exception as e:
                errors.append(e)

        # Create multiple threads
        threads = [threading.Thread(target=read_cache) for _ in range(10)]

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Verify
        assert len(errors) == 0
        assert all(r == "value1" for r in results)
        assert cache.hits == 1000

    def test_thread_safety_concurrent_writes(self, cache):
        """Test thread-safe concurrent write operations"""
        errors = []

        def write_cache(thread_id):
            try:
                for i in range(50):
                    cache.set(f"key_{thread_id}_{i}", f"value_{thread_id}_{i}")
            except Exception as e:
                errors.append(e)

        # Create multiple threads
        threads = [threading.Thread(target=write_cache, args=(i,)) for i in range(5)]

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Verify
        assert len(errors) == 0
        stats = cache.get_stats()
        assert stats["size"] <= cache.max_size

    def test_thread_safety_mixed_operations(self, cache):
        """Test thread-safe mixed read/write/delete operations"""
        cache.set("shared_key", "initial_value")
        errors = []

        def mixed_operations(thread_id):
            try:
                for i in range(20):
                    cache.set(f"key_{thread_id}_{i}", f"value_{i}")
                    cache.get(f"key_{thread_id}_{i}")
                    cache.get("shared_key")
                    if i % 5 == 0:
                        cache.delete(f"key_{thread_id}_{i-1}")
            except Exception as e:
                errors.append(e)

        # Create multiple threads
        threads = [threading.Thread(target=mixed_operations, args=(i,)) for i in range(10)]

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Verify no errors occurred
        assert len(errors) == 0

    def test_large_values(self, cache):
        """Test cache handles large values correctly"""
        large_dict = {f"key_{i}": f"value_{i}" * 100 for i in range(100)}
        cache.set("large_key", large_dict)

        result = cache.get("large_key")
        assert result == large_dict

    def test_complex_data_types(self, cache):
        """Test cache handles various data types"""
        test_data = {
            "string": "test",
            "int": 42,
            "float": 3.14,
            "list": [1, 2, 3],
            "dict": {"nested": "value"},
            "bool": True,
            "none": None,
        }

        cache.set("complex", test_data)
        result = cache.get("complex")

        assert result == test_data


class TestCacheHelperFunctions:
    """Test cache helper functions"""

    def test_get_proximity_cache_key(self):
        """Test proximity cache key generation"""
        key = get_proximity_cache_key(lat=-23.5505, lng=-46.6333, radius_km=5.0)

        assert key.startswith("proximity:")
        assert isinstance(key, str)

    def test_get_proximity_cache_key_rounding(self):
        """Test proximity cache key rounds coordinates"""
        key1 = get_proximity_cache_key(lat=-23.55051234, lng=-46.63331234, radius_km=5.0)
        key2 = get_proximity_cache_key(lat=-23.55054567, lng=-46.63334567, radius_km=5.0)

        # Should be the same after rounding to 4 decimals
        assert key1 == key2

    def test_get_mapbiomas_cache_key(self):
        """Test MapBiomas cache key generation"""
        key = get_mapbiomas_cache_key(lat=-23.5505, lng=-46.6333, radius_km=10.0)

        assert key.startswith("mapbiomas:")
        assert isinstance(key, str)

    def test_cache_keys_are_different(self):
        """Test different cache key generators produce different keys"""
        proximity_key = get_proximity_cache_key(lat=-23.5505, lng=-46.6333, radius_km=5.0)
        mapbiomas_key = get_mapbiomas_cache_key(lat=-23.5505, lng=-46.6333, radius_km=5.0)

        assert proximity_key != mapbiomas_key

    def test_get_all_cache_stats(self):
        """Test getting all cache statistics"""
        stats = get_all_cache_stats()

        assert "proximity" in stats
        assert "mapbiomas" in stats
        assert "municipality" in stats
        assert "economic" in stats

        # Verify structure
        for cache_name, cache_stats in stats.items():
            assert "size" in cache_stats
            assert "max_size" in cache_stats
            assert "hits" in cache_stats
            assert "misses" in cache_stats
            assert "hit_rate_percent" in cache_stats


class TestCachePerformance:
    """Test cache performance characteristics"""

    def test_get_performance(self):
        """Test get operation is fast"""
        cache = LRUCache(max_size=10000)

        # Populate cache
        for i in range(1000):
            cache.set(f"key_{i}", f"value_{i}")

        # Measure get performance
        start = time.time()
        for i in range(1000):
            cache.get(f"key_{i}")
        elapsed = time.time() - start

        # Should complete 1000 operations in less than 0.1 seconds
        assert elapsed < 0.1

    def test_set_performance(self):
        """Test set operation is fast"""
        cache = LRUCache(max_size=10000)

        start = time.time()
        for i in range(1000):
            cache.set(f"key_{i}", f"value_{i}")
        elapsed = time.time() - start

        # Should complete 1000 operations in less than 0.1 seconds
        assert elapsed < 0.1

    def test_cleanup_expired_performance(self):
        """Test cleanup_expired is reasonably fast"""
        cache = LRUCache(max_size=10000)

        # Add many expired entries
        for i in range(1000):
            cache.set(f"key_{i}", f"value_{i}", ttl=1)

        time.sleep(1.1)

        start = time.time()
        cache.cleanup_expired()
        elapsed = time.time() - start

        # Should complete in less than 0.5 seconds
        assert elapsed < 0.5
