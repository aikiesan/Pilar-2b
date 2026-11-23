"""The sign-up e-mails: content, escaping, and the log fallback without SMTP."""

import logging

import pytest

from app.core.config import settings
from app.services import mailer


@pytest.fixture(autouse=True)
def site(monkeypatch):
    monkeypatch.setattr(settings, "PUBLIC_SITE_URL", "https://example.org/pilar2b/")


def test_links_point_at_the_public_site_with_the_locale():
    mail = mailer.verify_email("a@b.c", "Ana", "tok123")
    assert "https://example.org/pilar2b/pt-BR/verify-email?token=tok123" in mail.text
    assert "https://example.org/pilar2b/pt-BR/verify-email?token=tok123" in mail.html
    assert "48 horas" in mail.text


def test_everything_the_person_typed_is_escaped_in_html():
    mail = mailer.new_request_notice(
        "admin@x.y", "<b>Ana</b>", "a@b.c", "Inst & Co", '<img src=x onerror="1">'
    )
    assert "<b>Ana</b>" not in mail.html and "&lt;b&gt;Ana&lt;/b&gt;" in mail.html
    assert "Inst &amp; Co" in mail.html
    assert "<img" not in mail.html
    # plain text keeps it as typed
    assert "<b>Ana</b>" in mail.text and "/pt-BR/admin" in mail.text


def test_refusal_carries_the_reason_only_when_given():
    assert "Motivo" not in mailer.rejected("a@b.c", "Ana", None).text
    with_note = mailer.rejected("a@b.c", "Ana", "<fora> do escopo")
    assert "Motivo: <fora> do escopo" in with_note.text
    assert "&lt;fora&gt;" in with_note.html


def test_without_smtp_the_message_goes_to_the_log(monkeypatch, caplog):
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    with caplog.at_level(logging.WARNING, logger="app.services.mailer"):
        sent = mailer.send(mailer.approved("a@b.c", "Ana"))
    assert sent is False
    assert "SMTP not configured" in caplog.text and "/pt-BR/login" in caplog.text


def test_a_failing_server_is_logged_and_never_raises(monkeypatch, caplog):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.invalid")
    monkeypatch.setattr(settings, "SMTP_PORT", 587)

    class Boom:
        def __init__(self, *a, **k):
            raise OSError("no route")

    monkeypatch.setattr(mailer.smtplib, "SMTP", Boom)
    with caplog.at_level(logging.ERROR, logger="app.services.mailer"):
        assert mailer.send(mailer.approved("a@b.c", "Ana")) is False
    assert "mail failed" in caplog.text


def test_sends_with_starttls_and_login(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.org")
    monkeypatch.setattr(settings, "SMTP_PORT", 587)
    monkeypatch.setattr(settings, "SMTP_USER", "sender@example.org")
    monkeypatch.setattr(settings, "SMTP_PASSWORD", "app-password")
    monkeypatch.setattr(settings, "SMTP_FROM", "PILAR-2b <sender@example.org>")
    calls = []

    class FakeSMTP:
        def __init__(self, host, port, timeout):
            calls.append(("connect", host, port))

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def starttls(self, context):
            calls.append(("starttls",))

        def login(self, user, password):
            calls.append(("login", user))

        def send_message(self, msg):
            calls.append(("send", msg["To"], msg["From"], msg.is_multipart()))

    monkeypatch.setattr(mailer.smtplib, "SMTP", FakeSMTP)
    assert mailer.send(mailer.approved("a@b.c", "Ana")) is True
    assert calls == [
        ("connect", "smtp.example.org", 587),
        ("starttls",),
        ("login", "sender@example.org"),
        ("send", "a@b.c", "PILAR-2b <sender@example.org>", True),
    ]
