"""The login limiter counts the connecting client, not what it claims to be."""

import pytest
from starlette.requests import Request

from app.middleware.rate_limit import get_client_ip, rate_limit_key_func


def _request(client, headers=()):
    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/v1/auth/login",
            "headers": [(k.lower().encode(), v.encode()) for k, v in headers],
            "client": client,
        }
    )


@pytest.mark.unit
def test_a_forged_x_forwarded_for_does_not_change_the_address():
    # uvicorn has already resolved the client from the proxy's headers; a value
    # the caller writes into X-Forwarded-For must not replace it.
    request = _request(("203.0.113.7", 50000), [("X-Forwarded-For", "198.51.100.1")])
    assert get_client_ip(request) == "203.0.113.7"


@pytest.mark.unit
def test_each_forged_header_lands_in_the_same_bucket():
    keys = {
        rate_limit_key_func(_request(("203.0.113.7", 50000), [("X-Forwarded-For", f"10.0.0.{n}")]))
        for n in range(5)
    }
    assert keys == {"203.0.113.7:/api/v1/auth/login"}


@pytest.mark.unit
def test_no_client_address():
    assert get_client_ip(_request(None)) == "unknown"
