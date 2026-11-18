"""
A request-derived value in a middleware log stays on one line (CWE-117).

Query values arrive percent-decoded, so ``%0A`` in a request is a real line
break by the time it reaches a log message.
"""

import logging

import pytest
from fastapi import HTTPException

from app.middleware.validation import sanitize_query_params


def test_injection_warning_keeps_one_line(caplog):
    with caplog.at_level(logging.WARNING, logger="app.middleware.validation"):
        with pytest.raises(HTTPException):
            sanitize_query_params({"q\nFORGED key": "1; DROP TABLE x\nFORGED value"})
    messages = [r.getMessage() for r in caplog.records]
    assert any("FORGED" in m for m in messages)
    assert all("\n" not in m and "\r" not in m for m in messages)
