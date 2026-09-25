"""/health reports a database failure without the driver's message."""

import json
import logging

import pytest

import app.main as main


@pytest.mark.unit
async def test_database_failure_is_reported_without_its_message(monkeypatch, caplog):
    def unreachable():
        raise RuntimeError('connection to server at "db.internal" failed for user "cp2b"')

    monkeypatch.setattr(main, "test_db_connection", unreachable)
    with caplog.at_level(logging.ERROR):
        response = await main.health_check()

    assert response.status_code == 503
    body = json.loads(response.body)
    assert body["status"] == "unhealthy"
    assert body["database"] == "disconnected"
    assert "db.internal" not in response.body.decode()
    # The message is not lost: it goes to the server log.
    assert "db.internal" in caplog.text
