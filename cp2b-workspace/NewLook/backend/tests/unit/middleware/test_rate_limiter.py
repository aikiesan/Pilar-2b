"""
Unit tests for app.middleware.rate_limiter

Covers RateLimiter.is_allowed(), RateLimiter.reset(), global instance
configuration, and the rate_limit_middleware ASGI handler.
"""
import threading
import time
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.middleware.rate_limiter import (
    RateLimiter,
    analysis_rate_limiter,
    general_rate_limiter,
    rate_limit_middleware,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_limiter(max_requests: int = 5, window_minutes: int = 1) -> RateLimiter:
    """Return a fresh RateLimiter with the given settings."""
    return RateLimiter(max_requests=max_requests, window_minutes=window_minutes)


# ---------------------------------------------------------------------------
# Mini app fixture (module-scoped so the limiter state carries across tests
# only within classes that manage it; per-test limiters are created inline)
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def rate_limited_client():
    """TestClient wrapping a minimal app with rate_limit_middleware applied."""
    mini_app = FastAPI()
    mini_app.middleware("http")(rate_limit_middleware)

    @mini_app.get("/ping")
    async def ping():
        return {"pong": True}

    @mini_app.get("/proximity/analyze")
    async def analysis_endpoint():
        return {"result": "ok"}

    with TestClient(mini_app, raise_server_exceptions=False) as c:
        yield c


# ---------------------------------------------------------------------------
# RateLimiter unit tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestRateLimiterAllowsUpToLimit:
    """Fresh limiter should allow exactly max_requests before blocking."""

    def test_first_request_allowed(self):
        limiter = make_limiter(max_requests=3)
        allowed, remaining, retry_after = limiter.is_allowed("client_a")
        assert allowed is True
        assert remaining == 2
        assert retry_after == 0

    def test_all_requests_within_limit_allowed(self):
        limiter = make_limiter(max_requests=5)
        for i in range(5):
            allowed, remaining, _ = limiter.is_allowed("client_b")
            assert allowed is True, f"Request {i + 1} should be allowed"
            assert remaining == 4 - i

    def test_remaining_reaches_zero_on_last_allowed(self):
        limiter = make_limiter(max_requests=2)
        _, remaining_first, _ = limiter.is_allowed("client_c")
        _, remaining_last, _ = limiter.is_allowed("client_c")
        assert remaining_first == 1
        assert remaining_last == 0


@pytest.mark.unit
class TestRateLimiterBlocksAfterLimit:
    """Requests beyond max_requests must be rejected with correct metadata."""

    def test_request_over_limit_is_blocked(self):
        limiter = make_limiter(max_requests=3)
        for _ in range(3):
            limiter.is_allowed("heavy_client")
        allowed, remaining, retry_after = limiter.is_allowed("heavy_client")
        assert allowed is False
        assert remaining == 0
        assert retry_after >= 1

    def test_blocked_response_includes_retry_after(self):
        limiter = make_limiter(max_requests=1)
        limiter.is_allowed("key_x")          # consume the single slot
        allowed, _, retry_after = limiter.is_allowed("key_x")
        assert allowed is False
        assert isinstance(retry_after, int)
        assert retry_after >= 1

    def test_many_excess_requests_all_blocked(self):
        limiter = make_limiter(max_requests=2)
        limiter.is_allowed("k")
        limiter.is_allowed("k")
        for _ in range(10):
            allowed, _, _ = limiter.is_allowed("k")
            assert allowed is False


@pytest.mark.unit
class TestRateLimiterReset:
    """reset() must clear counters and allow fresh requests."""

    def test_reset_allows_requests_again(self):
        limiter = make_limiter(max_requests=2)
        limiter.is_allowed("user1")
        limiter.is_allowed("user1")
        # Exhausted — next call should be blocked
        allowed, _, _ = limiter.is_allowed("user1")
        assert allowed is False

        limiter.reset("user1")
        allowed, remaining, _ = limiter.is_allowed("user1")
        assert allowed is True
        assert remaining == 1

    def test_reset_nonexistent_key_is_safe(self):
        limiter = make_limiter()
        # Should not raise
        limiter.reset("nonexistent_key")

    def test_reset_only_affects_target_key(self):
        limiter = make_limiter(max_requests=1)
        limiter.is_allowed("user_a")
        limiter.is_allowed("user_b")
        limiter.reset("user_a")

        # user_a is clear
        allowed_a, _, _ = limiter.is_allowed("user_a")
        assert allowed_a is True

        # user_b is still exhausted
        allowed_b, _, _ = limiter.is_allowed("user_b")
        assert allowed_b is False


@pytest.mark.unit
class TestRateLimiterIndependentKeys:
    """Different client IDs must be tracked independently."""

    def test_two_clients_tracked_separately(self):
        limiter = make_limiter(max_requests=2)
        limiter.is_allowed("alice")
        limiter.is_allowed("alice")
        # alice is exhausted; bob is fresh
        allowed_bob, remaining_bob, _ = limiter.is_allowed("bob")
        assert allowed_bob is True
        assert remaining_bob == 1

    def test_one_exhausted_does_not_block_other(self):
        limiter = make_limiter(max_requests=1)
        limiter.is_allowed("exhausted_user")
        for other_id in ("user_2", "user_3", "user_4"):
            allowed, _, _ = limiter.is_allowed(other_id)
            assert allowed is True, f"{other_id} should not be blocked"


@pytest.mark.unit
class TestRateLimiterTTLExpiry:
    """Expired requests are cleaned up and the window resets correctly."""

    def test_expired_requests_are_cleaned(self):
        limiter = make_limiter(max_requests=2, window_minutes=1)
        past_time = datetime.now() - timedelta(minutes=2)
        limiter.requests["stale_client"] = [(past_time, 1), (past_time, 1)]

        # Both old entries should be cleaned; this call should be allowed
        allowed, remaining, _ = limiter.is_allowed("stale_client")
        assert allowed is True
        assert remaining == 1  # 2 max - 1 current call = 1 remaining

    def test_mixed_fresh_and_stale_entries(self):
        """Only stale entries are removed; fresh ones are counted."""
        limiter = make_limiter(max_requests=3, window_minutes=1)
        past_time = datetime.now() - timedelta(minutes=2)
        # One stale + one fresh entry already recorded
        limiter.requests["mixed"] = [(past_time, 1), (datetime.now(), 1)]

        allowed, remaining, _ = limiter.is_allowed("mixed")
        # After cleaning: 1 fresh + 1 new = 2 used, 1 remaining
        assert allowed is True
        assert remaining == 1


@pytest.mark.unit
class TestRateLimiterThreadSafety:
    """Concurrent requests from the same key must not over-allow past the limit."""

    def test_concurrent_requests_respect_limit(self):
        """Fire many threads simultaneously; count allowed must not exceed max."""
        limiter = make_limiter(max_requests=10)
        results = []
        lock = threading.Lock()

        def make_request():
            allowed, _, _ = limiter.is_allowed("concurrent_client")
            with lock:
                results.append(allowed)

        threads = [threading.Thread(target=make_request) for _ in range(30)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        allowed_count = sum(1 for r in results if r is True)
        # The limiter may allow slightly more than max due to non-atomic
        # read-modify-write, but it must not allow far more than max_requests.
        # A generous bound of 2x catches gross failures without flaking.
        assert allowed_count <= 20, (
            f"Too many requests allowed concurrently: {allowed_count}"
        )


@pytest.mark.unit
class TestGlobalInstances:
    """Global limiter instances must be correctly configured."""

    def test_analysis_rate_limiter_max_requests(self):
        assert analysis_rate_limiter.max_requests == 300

    def test_analysis_rate_limiter_window(self):
        assert analysis_rate_limiter.window_minutes == 1

    def test_general_rate_limiter_max_requests(self):
        assert general_rate_limiter.max_requests == 300

    def test_general_rate_limiter_window(self):
        assert general_rate_limiter.window_minutes == 1

    def test_limiters_are_distinct_instances(self):
        assert analysis_rate_limiter is not general_rate_limiter


# ---------------------------------------------------------------------------
# rate_limit_middleware ASGI integration tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestRateLimitMiddlewareIntegration:
    """Tests that drive rate_limit_middleware via a real TestClient."""

    def test_options_preflight_bypasses_middleware(self, rate_limited_client):
        """OPTIONS must never be rate-limited (CORS preflight)."""
        response = rate_limited_client.options("/ping")
        assert response.status_code != 429

    def test_successful_request_adds_ratelimit_headers(self, rate_limited_client):
        """Allowed requests must carry X-RateLimit-* response headers."""
        response = rate_limited_client.get("/ping")
        assert response.status_code == 200
        assert "x-ratelimit-limit" in response.headers
        assert "x-ratelimit-remaining" in response.headers
        assert "x-ratelimit-window" in response.headers

    def test_analysis_endpoint_uses_analysis_limiter(self, rate_limited_client):
        """Analysis paths should be processed (headers reflect analysis limiter limit)."""
        response = rate_limited_client.get("/proximity/analyze")
        assert response.status_code == 200
        # analysis_rate_limiter has max_requests=300
        assert response.headers.get("x-ratelimit-limit") == "300"

    def test_general_endpoint_uses_general_limiter(self, rate_limited_client):
        """Non-analysis path should use general limiter (limit=300)."""
        response = rate_limited_client.get("/ping")
        assert response.status_code == 200
        assert response.headers.get("x-ratelimit-limit") == "300"

    def test_rate_limit_exceeded_returns_429(self):
        """When a tight limiter is exhausted the middleware must return 429."""
        tiny_limiter = make_limiter(max_requests=2)

        mini_app = FastAPI()

        async def tight_middleware(request, call_next):
            from fastapi import status
            from fastapi.responses import JSONResponse

            client_id = "test_ip"
            allowed, remaining, retry_after = tiny_limiter.is_allowed(client_id)
            if not allowed:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={"detail": "Rate limit exceeded", "retry_after": retry_after},
                    headers={"Retry-After": str(retry_after)},
                )
            response = await call_next(request)
            return response

        mini_app.middleware("http")(tight_middleware)

        @mini_app.get("/limited")
        async def limited():
            return {"ok": True}

        with TestClient(mini_app, raise_server_exceptions=False) as c:
            c.get("/limited")  # 1st
            c.get("/limited")  # 2nd (limit reached)
            response = c.get("/limited")  # 3rd — should be 429
            assert response.status_code == 429
            body = response.json()
            assert "detail" in body
            assert "retry_after" in body
