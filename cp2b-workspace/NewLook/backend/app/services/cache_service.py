"""
In-Memory Cache Service for PILAR-2b V3
Caches repeated proximity analyses and MapBiomas queries
Sprint 4: Task 4.1 - Performance Optimization

Thread-safe implementation using locks for concurrent access.

Production note: Replace with Redis for multi-server deployments
"""

from typing import Any, Optional
from datetime import datetime, timedelta
from collections import OrderedDict
import hashlib
import json
import logging
import threading

logger = logging.getLogger(__name__)


class CacheEntry:
    """Single cache entry with expiration"""
    
    def __init__(self, value: Any, ttl_seconds: int):
        self.value = value
        self.created_at = datetime.now()
        self.expires_at = self.created_at + timedelta(seconds=ttl_seconds)
    
    def is_expired(self) -> bool:
        return datetime.now() > self.expires_at
    
    def get_age_seconds(self) -> int:
        return int((datetime.now() - self.created_at).total_seconds())


class LRUCache:
    """
    Thread-safe LRU (Least Recently Used) Cache with TTL

    Features:
    - Automatic expiration (TTL)
    - Max size limit (evicts oldest)
    - Cache hit/miss tracking
    - Thread-safe operations via lock

    Thread Safety:
    All cache operations are protected by a threading.Lock() to ensure
    safe concurrent access in multi-threaded FastAPI environment.
    """

    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Args:
            max_size: Maximum number of entries
            default_ttl: Time-to-live in seconds (default: 5 minutes)
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()

        # Thread safety
        self._lock = threading.Lock()

        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    def _generate_key(self, prefix: str, **kwargs) -> str:
        """
        Generate cache key from parameters
        
        Args:
            prefix: Cache key prefix (e.g., "proximity", "mapbiomas")
            **kwargs: Parameters to include in key
            
        Returns:
            Hash-based cache key
        """
        # Sort keys for consistent hashing
        params = json.dumps(kwargs, sort_keys=True)
        hash_value = hashlib.sha256(f"{prefix}:{params}".encode()).hexdigest()[:16]
        return f"{prefix}:{hash_value}"
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache (thread-safe)

        Returns:
            Cached value if exists and not expired, None otherwise
        """
        with self._lock:
            if key not in self.cache:
                self.misses += 1
                return None

            entry = self.cache[key]

            # Check expiration
            if entry.is_expired():
                del self.cache[key]
                self.misses += 1
                logger.debug(f"Cache expired: {key}")
                return None

            # Move to end (mark as recently used)
            self.cache.move_to_end(key)
            self.hits += 1

            logger.debug(f"Cache hit: {key} (age: {entry.get_age_seconds()}s)")
            return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """
        Store value in cache (thread-safe)

        Args:
            key: Cache key
            value: Value to store
            ttl: Time-to-live in seconds (overrides default)
        """
        with self._lock:
            # Remove existing entry if present
            if key in self.cache:
                del self.cache[key]

            # Evict oldest if at capacity
            if len(self.cache) >= self.max_size:
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                self.evictions += 1
                logger.debug(f"Cache eviction: {oldest_key}")

            # Add new entry
            ttl_seconds = ttl if ttl is not None else self.default_ttl
            self.cache[key] = CacheEntry(value, ttl_seconds)

            logger.debug(f"Cache set: {key} (TTL: {ttl_seconds}s)")
    
    def delete(self, key: str):
        """Delete specific cache entry (thread-safe)"""
        with self._lock:
            if key in self.cache:
                del self.cache[key]

    def clear(self):
        """Clear all cache entries (thread-safe)"""
        with self._lock:
            self.cache.clear()
            self.hits = 0
            self.misses = 0
            self.evictions = 0
            logger.info("Cache cleared")
    
    def get_stats(self) -> dict:
        """Get cache statistics (thread-safe)"""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0

            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "evictions": self.evictions,
                "hit_rate_percent": round(hit_rate, 2),
                "total_requests": total_requests
            }
    
    def cleanup_expired(self) -> int:
        """Remove all expired entries (periodic maintenance, thread-safe)"""
        with self._lock:
            expired_keys = [
                key for key, entry in self.cache.items()
                if entry.is_expired()
            ]

            for key in expired_keys:
                del self.cache[key]

            if expired_keys:
                logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

            return len(expired_keys)


# Global cache instances
proximity_cache = LRUCache(max_size=500, default_ttl=300)  # 5 minutes
mapbiomas_cache = LRUCache(max_size=200, default_ttl=600)  # 10 minutes (stable data)
municipality_cache = LRUCache(max_size=1000, default_ttl=3600)  # 1 hour (rarely changes)
economic_cache = LRUCache(max_size=100, default_ttl=300)  # 5 minutes for economic simulation


def get_proximity_cache_key(lat: float, lng: float, radius_km: float) -> str:
    """Generate cache key for proximity analysis"""
    return proximity_cache._generate_key(
        "proximity",
        lat=round(lat, 4),  # Round to ~11m precision
        lng=round(lng, 4),
        radius=round(radius_km, 1)
    )


def get_mapbiomas_cache_key(lat: float, lng: float, radius_km: float) -> str:
    """Generate cache key for MapBiomas analysis"""
    return mapbiomas_cache._generate_key(
        "mapbiomas",
        lat=round(lat, 4),
        lng=round(lng, 4),
        radius=round(radius_km, 1)
    )


def get_all_cache_stats() -> dict:
    """Get statistics for all caches"""
    return {
        "proximity": proximity_cache.get_stats(),
        "mapbiomas": mapbiomas_cache.get_stats(),
        "municipality": municipality_cache.get_stats(),
        "economic": economic_cache.get_stats()
    }


def get_cache_service() -> LRUCache:
    """
    Get economic cache instance for dependency injection.

    Returns:
        LRUCache instance for economic simulation caching
    """
    return economic_cache

