"""
Guardrail: baseline HTTP security headers must exist and be wired in.

Source-scanning regression test (no DB / network / jwt) so it runs in CI and the
constrained sandbox alike. Supports LGPD Art. 46 (security of processing). When
the test app can be imported in CI, this can be promoted to a live response-header
assertion; here it pins the configuration so it can't be silently dropped.
"""

from __future__ import annotations

from pathlib import Path

import pytest

NEWLOOK = Path(__file__).resolve().parents[3]
MIDDLEWARE = NEWLOOK / "backend" / "app" / "middleware" / "security_headers.py"
MAIN = NEWLOOK / "backend" / "app" / "main.py"

REQUIRED_HEADERS = [
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
    "Strict-Transport-Security",
]


def _read(p: Path) -> str:
    assert p.exists(), f"missing file: {p.relative_to(NEWLOOK)}"
    return p.read_text(encoding="utf-8")


@pytest.mark.parametrize("header", REQUIRED_HEADERS)
def test_security_header_is_set(header):
    assert header in _read(MIDDLEWARE), f"{header} must be set by the security-headers middleware"


def test_no_mime_sniffing_value():
    assert "nosniff" in _read(MIDDLEWARE)


def test_clickjacking_protection_value():
    assert "DENY" in _read(MIDDLEWARE)


def test_middleware_is_wired_in_main():
    main = _read(MAIN)
    assert (
        "security_headers_middleware" in main
    ), "security_headers_middleware must be imported and registered in main.py"
    assert (
        'app.middleware("http")(security_headers_middleware)' in main
    ), "security-headers middleware must be registered on the app"
