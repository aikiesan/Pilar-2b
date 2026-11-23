"""The sign-up and request-queue routes: answers, validation and who may call them.

The service is replaced by fakes, so these tests only check what the routes
add: the hidden field, the uniform answers, the mail hand-off and the admin
gate. The service itself is covered in services/test_auth_signup.py.
"""

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.middleware.auth import get_current_user
from app.middleware.rate_limit import auth_limiter, read_limiter
from app.models.auth import AccessRequest, UserProfile
from app.services import mailer
from app.services.auth_service import auth_service
from app.services.mailer import Mail

NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)
USER_ID = "22222222-2222-2222-2222-222222222222"

SIGNUP = {
    "email": "nova@usp.br",
    "password": "SenhaForte123",
    "full_name": "Ana Pesquisadora",
    "institution": "USP",
    "purpose": "Estudo regional de potencial de biogás",
    "accept_terms": True,
}


def _profile(role="admin"):
    return UserProfile(
        id="11111111-1111-1111-1111-111111111111", email="a@example.com", full_name="A",
        role=role, clearance=3, created_at=NOW, updated_at=NOW,
    )  # fmt: skip


def _request(**over):
    data = dict(
        id=USER_ID, email="nova@usp.br", full_name="Ana", status="pending_review",
        clearance=0, created_at=NOW,
    )  # fmt: skip
    data.update(over)
    return AccessRequest(**data)


@pytest.fixture
def api(test_app, monkeypatch):
    # The limiters keep counts in memory across tests; these tests call fast.
    monkeypatch.setattr(auth_limiter, "enabled", False)
    monkeypatch.setattr(read_limiter, "enabled", False)
    sent, calls = [], []
    monkeypatch.setattr(mailer, "send", lambda mail: sent.append(mail))

    async def fake_signup(data):
        calls.append(("signup", data.email))
        return [Mail("nova@usp.br", "s", "t", "h")]

    async def fake_list(status_filter):
        calls.append(("list", status_filter))
        return [_request()]

    async def fake_approve(user_id, clearance, admin_id):
        calls.append(("approve", user_id, clearance))
        return _request(status="approved", clearance=clearance), [
            Mail("nova@usp.br", "a", "t", "h")
        ]

    async def fake_reject(user_id, note, admin_id):
        calls.append(("reject", user_id, note))
        return _request(status="rejected", review_note=note), [Mail("nova@usp.br", "r", "t", "h")]

    async def fake_forgot(email):
        calls.append(("forgot", email))
        return []

    monkeypatch.setattr(auth_service, "signup", fake_signup)
    monkeypatch.setattr(auth_service, "list_requests", fake_list)
    monkeypatch.setattr(auth_service, "approve_request", fake_approve)
    monkeypatch.setattr(auth_service, "reject_request", fake_reject)
    monkeypatch.setattr(auth_service, "forgot_password", fake_forgot)
    test_app.dependency_overrides[get_current_user] = lambda: _profile()
    yield TestClient(test_app, base_url="http://testserver"), sent, calls
    test_app.dependency_overrides.clear()


def test_signup_is_accepted_and_the_mail_goes_out_after_the_answer(api):
    client, sent, calls = api
    resp = client.post("/api/v1/auth/signup", json=SIGNUP)
    assert resp.status_code == 202
    assert calls == [("signup", "nova@usp.br")]
    assert [m.to for m in sent] == ["nova@usp.br"]


def test_the_hidden_field_gets_the_same_answer_and_does_nothing(api):
    client, sent, calls = api
    plain = client.post("/api/v1/auth/signup", json=SIGNUP).json()
    calls.clear()
    sent.clear()
    resp = client.post("/api/v1/auth/signup", json={**SIGNUP, "website": "http://spam"})
    assert resp.status_code == 202 and resp.json() == plain
    assert calls == [] and sent == []


@pytest.mark.parametrize(
    "over", [{"password": "a" * 5}, {"accept_terms": False}, {"email": "not-an-email"}]
)
def test_signup_rejects_bad_input(api, over):
    client, _, calls = api
    assert client.post("/api/v1/auth/signup", json={**SIGNUP, **over}).status_code == 422
    assert calls == []


def test_forgot_password_answers_the_same_for_any_address(api):
    client, _, _ = api
    a = client.post("/api/v1/auth/password/forgot", json={"email": "x@y.z"})
    b = client.post("/api/v1/auth/password/forgot", json={"email": "other@y.z"})
    assert a.status_code == b.status_code == 202 and a.json() == b.json()


def test_admin_lists_pending_requests_by_default(api):
    client, _, calls = api
    resp = client.get("/api/v1/auth/admin/requests")
    assert resp.status_code == 200 and resp.json()[0]["email"] == "nova@usp.br"
    assert calls == [("list", "pending_review")]
    assert client.get("/api/v1/auth/admin/requests?status=rejected").status_code == 200
    assert client.get("/api/v1/auth/admin/requests?status=whatever").status_code == 422


def test_approve_defaults_to_level_one_and_mails(api):
    client, sent, calls = api
    resp = client.post(f"/api/v1/auth/admin/requests/{USER_ID}/approve", json={})
    assert resp.status_code == 200 and resp.json()["clearance"] == 1
    assert calls == [("approve", USER_ID, 1)] and len(sent) == 1


@pytest.mark.parametrize("level", [0, 4])
def test_approve_refuses_a_level_out_of_range(api, level):
    client, _, calls = api
    resp = client.post(f"/api/v1/auth/admin/requests/{USER_ID}/approve", json={"clearance": level})
    assert resp.status_code == 422 and calls == []


def test_reject_passes_the_reason(api):
    client, sent, calls = api
    resp = client.post(f"/api/v1/auth/admin/requests/{USER_ID}/reject", json={"note": "Fora"})
    assert resp.status_code == 200 and resp.json()["status"] == "rejected"
    assert calls == [("reject", USER_ID, "Fora")] and len(sent) == 1


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/api/v1/auth/admin/requests", None),
        ("post", f"/api/v1/auth/admin/requests/{USER_ID}/approve", {}),
        ("post", f"/api/v1/auth/admin/requests/{USER_ID}/reject", {}),
    ],
)
def test_only_an_admin_reaches_the_queue(api, test_app, method, path, body):
    client, _, calls = api
    test_app.dependency_overrides[get_current_user] = lambda: _profile("interno")
    resp = getattr(client, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 403 and calls == []
