"""Mandate panel endpoint (C26)."""

from fastapi.testclient import TestClient

from app.main import app


def test_panel_serves_targets_series_and_cgob_status():
    with TestClient(app) as client:
        r = client.get("/api/v1/mandate/panel")
    assert r.status_code == 200
    body = r.json()
    assert body["targets"][0]["year"] == 2026 and body["series"]
    assert body["latest"]["month"] == body["series"][-1]["month"]
    assert body["cgob"]["public_registry"] is False
