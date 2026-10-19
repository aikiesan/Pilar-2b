"""Financing observatory endpoint (C18)."""

from fastapi.testclient import TestClient

from app.main import app


def test_benchmarks_serve_projects_ranges_and_the_note():
    with TestClient(app) as client:
        r = client.get("/api/v1/financing/benchmarks")
    assert r.status_code == 200
    body = r.json()
    assert body["projects"] and set(body["by_route"]) == {"aterro", "agroindustrial"}
    assert body["assumptions"]["rates"] == [0.10, 0.12]
    assert "limite inferior" in body["note"]
