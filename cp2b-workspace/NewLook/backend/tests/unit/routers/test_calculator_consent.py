"""
Regression tests for the LGPD consent gate on the calculator lead endpoint.

The consent check happens BEFORE any database access, so these tests run against
a minimal app that mounts only the calculator router — no DB or full-app
middleware required.
"""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers.calculator import router


@pytest.fixture()
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router, prefix="/calculator")
    return TestClient(app)


def _payload(consent: bool) -> dict:
    return {
        "lead": {
            "nome": "Test User",
            "email": "test@example.com",
            "consent_lgpd": consent,
        },
        "activity_type": "livestock",
        "quantity_input": {"type": "heads", "value": 100},
        "active_months": [1, 2, 3],
        "outputs_selected": ["biogas"],
        "calc_results": {"biogas_m3_year": 12345},
    }


def test_submit_without_consent_is_rejected(client):
    """No consent -> 403, and nothing reaches the database."""
    resp = client.post("/calculator/submit", json=_payload(consent=False))
    assert resp.status_code == 403
    assert resp.json()["detail"]["code"] == "LGPD_CONSENT_REQUIRED"


def test_consent_defaults_to_false_when_omitted(client):
    """Privacy by default: omitting the flag must NOT imply consent."""
    payload = _payload(consent=False)
    del payload["lead"]["consent_lgpd"]
    resp = client.post("/calculator/submit", json=payload)
    assert resp.status_code == 403
