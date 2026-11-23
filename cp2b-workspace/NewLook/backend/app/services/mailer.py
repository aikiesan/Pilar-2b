"""
E-mail for sign-up with approval.

Plain `smtplib` with STARTTLS (port 587) or SSL (port 465): no new package.
Production sends as the CP2B Google Workspace account with an app password
(SMTP_HOST=smtp.gmail.com). With SMTP_HOST empty (Docker, tests) a message is
written to the log instead, links included, so the flow can be followed
locally.

Sending runs in FastAPI BackgroundTasks: a failure is logged and never undoes
the request that caused it.

Every message has a plain-text part and a simple HTML part. Anything the
person typed (name, institution, purpose, a refusal note) is escaped in the
HTML. Texts are in Portuguese only for now.
"""

from __future__ import annotations

import html
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

SITE_NAME = "PILAR-2b"


@dataclass(frozen=True)
class Mail:
    to: str
    subject: str
    text: str
    html: str


def site_url(path: str, locale: str = "pt-BR") -> str:
    """A link into the site: PUBLIC_SITE_URL + /<locale> + path."""
    base = settings.PUBLIC_SITE_URL.rstrip("/")
    return f"{base}/{locale}{path}"


def _html(paragraphs: list[str], link: Optional[tuple[str, str]] = None) -> str:
    """Paragraphs are already escaped; the link's label and URL are escaped here."""
    body = "".join(f'<p style="margin:0 0 16px">{p}</p>' for p in paragraphs)
    if link:
        label, url = link
        body += (
            f'<p style="margin:0 0 16px"><a href="{html.escape(url, quote=True)}" '
            f'style="color:#1f5f3f">{html.escape(label)}</a></p>'
        )
    return (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;'
        f'line-height:1.5;color:#1d2420;max-width:560px">{body}'
        f'<p style="margin:24px 0 0;color:#5b6660;font-size:13px">{SITE_NAME} · Unicamp</p>'
        "</div>"
    )


def _text(paragraphs: list[str], link: Optional[tuple[str, str]] = None) -> str:
    out = "\n\n".join(paragraphs)
    if link:
        out += f"\n\n{link[0]}:\n{link[1]}"
    return out + f"\n\n{SITE_NAME} · Unicamp\n"


# ── The five messages ─────────────────────────────────────────────────────────
def verify_email(to: str, full_name: str, token: str) -> Mail:
    url = site_url(f"/verify-email?token={token}")
    first = f"Olá, {full_name}."
    lines = [
        "Recebemos seu pedido de acesso ao PILAR-2b.",
        "Confirme seu e-mail pelo link abaixo. Depois disso, o pedido vai para análise "
        "e você recebe outro e-mail quando a conta for liberada.",
        "O link vale por 48 horas. Se não foi você quem pediu, ignore esta mensagem.",
    ]
    return Mail(
        to=to,
        subject="Confirme seu e-mail · PILAR-2b",
        text=_text([first, *lines], ("Confirmar e-mail", url)),
        html=_html([html.escape(first), *lines], ("Confirmar e-mail", url)),
    )


def new_request_notice(to: str, full_name: str, email: str, institution: str, purpose: str) -> Mail:
    url = site_url("/admin")
    rows = [
        ("Nome", full_name),
        ("E-mail", email),
        ("Instituição", institution or "não informada"),
        ("Para que vai usar", purpose or "não informado"),
    ]
    text_rows = [f"{k}: {v}" for k, v in rows]
    html_rows = [f"<strong>{k}:</strong> {html.escape(v)}" for k, v in rows]
    intro = "Um pedido de acesso está esperando sua decisão (o e-mail já foi confirmado)."
    return Mail(
        to=to,
        subject=f"Novo pedido de acesso: {full_name}",
        text=_text([intro, "\n".join(text_rows)], ("Abrir o painel", url)),
        html=_html([intro, "<br>".join(html_rows)], ("Abrir o painel", url)),
    )


def approved(to: str, full_name: str) -> Mail:
    url = site_url("/login")
    first = f"Olá, {full_name}."
    lines = [
        "Seu acesso ao PILAR-2b foi liberado.",
        "Entre com o e-mail e a senha que você cadastrou.",
    ]
    return Mail(
        to=to,
        subject="Seu acesso foi liberado · PILAR-2b",
        text=_text([first, *lines], ("Entrar", url)),
        html=_html([html.escape(first), *lines], ("Entrar", url)),
    )


def rejected(to: str, full_name: str, note: Optional[str]) -> Mail:
    first = f"Olá, {full_name}."
    line = "Seu pedido de acesso ao PILAR-2b não foi aprovado."
    text_parts = [first, line]
    html_parts = [html.escape(first), line]
    if note:
        text_parts.append(f"Motivo: {note}")
        html_parts.append(f"<strong>Motivo:</strong> {html.escape(note)}")
    closing = "Se quiser que o pedido seja revisto, responda a este e-mail."
    text_parts.append(closing)
    html_parts.append(closing)
    return Mail(
        to=to,
        subject="Seu pedido de acesso · PILAR-2b",
        text=_text(text_parts),
        html=_html(html_parts),
    )


def reset_password(to: str, full_name: str, token: str) -> Mail:
    url = site_url(f"/reset-password?token={token}")
    first = f"Olá, {full_name}."
    lines = [
        "Recebemos um pedido para trocar a senha da sua conta no PILAR-2b.",
        "O link vale por 1 hora e só pode ser usado uma vez. Se não foi você, "
        "ignore esta mensagem: a senha continua a mesma.",
    ]
    return Mail(
        to=to,
        subject="Trocar a senha · PILAR-2b",
        text=_text([first, *lines], ("Escolher uma senha nova", url)),
        html=_html([html.escape(first), *lines], ("Escolher uma senha nova", url)),
    )


# ── Sending ───────────────────────────────────────────────────────────────────
def _build(mail: Mail) -> EmailMessage:
    msg = EmailMessage()
    sender = settings.SMTP_FROM or settings.SMTP_USER
    name, addr = parseaddr(sender)
    msg["From"] = formataddr((name or SITE_NAME, addr))
    msg["To"] = mail.to
    msg["Subject"] = mail.subject
    msg.set_content(mail.text)
    msg.add_alternative(mail.html, subtype="html")
    return msg


def send(mail: Mail) -> bool:
    """Send one message. Never raises: returns False and logs on failure."""
    if not settings.SMTP_HOST:
        # A warning, not info: the app configures no log level, and this is
        # how an admin finds the link while SMTP is not set up yet.
        logger.warning(
            "mail (SMTP not configured, not sent)\nTo: %s\nSubject: %s\n\n%s",
            mail.to,
            mail.subject,
            mail.text,
        )
        return False
    try:
        msg = _build(mail)
        context = ssl.create_default_context()
        if settings.SMTP_PORT == 465:
            with smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=20
            ) as smtp:
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
                smtp.starttls(context=context)
                if settings.SMTP_USER:
                    smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                smtp.send_message(msg)
        logger.warning("mail sent: %s", mail.subject)
        return True
    except Exception as e:  # a mail failure must never break the request
        logger.error("mail failed (%s): %s", mail.subject, e)
        return False
