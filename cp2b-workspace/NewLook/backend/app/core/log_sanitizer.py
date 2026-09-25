"""
Log sanitisers: PII redaction, and one-line values for log messages.

A logging filter that redacts personal data from log records before they are
emitted, supporting data-minimisation in logs (LGPD Art. 6 / Art. 46 security of
processing). Currently redacts e-mail addresses and Brazilian CPF/CNPJ numbers
(structured, low-false-positive patterns) — defence-in-depth even though the app
does not collect CPF/CNPJ, since they could still appear in free-text fields.

Install once at application start; every log record is redacted from then on:

    from app.core.log_sanitizer import install_pii_redaction
    install_pii_redaction()

Wrap any request-derived value (an ID, a cache key) put into a log message in
``log_safe``, so a crafted value cannot forge log lines (CWE-117):

    logger.error("Error fetching residuo %s: %s", log_safe(residuo_id, 50), e)
"""

import logging
import re
from collections.abc import Mapping

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
# CNPJ: 14 digits, formatted (00.000.000/0000-00) or bare. Matched before CPF.
_CNPJ_RE = re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")
# CPF: 11 digits, formatted (000.000.000-00) or bare.
_CPF_RE = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")


def log_safe(value: object, limit: int = 200) -> str:
    """``value`` as one log line: line breaks become spaces, at most ``limit`` chars."""
    return str(value).replace("\n", " ").replace("\r", " ")[:limit]


def redact(text: str) -> str:
    """Return ``text`` with e-mails and CPF/CNPJ replaced by placeholders."""
    text = _EMAIL_RE.sub("[EMAIL]", text)
    text = _CNPJ_RE.sub("[CNPJ]", text)  # before CPF so 14-digit isn't split
    text = _CPF_RE.sub("[CPF]", text)
    return text


def _redact_arg(value: object) -> object:
    return redact(value) if isinstance(value, str) else value


class PiiRedactingFilter(logging.Filter):
    """Redacts PII from both the format string and its args."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            if isinstance(record.msg, str):
                record.msg = redact(record.msg)
            if isinstance(record.args, Mapping):
                # logger.info("%(user)s", {"user": ...}): the args are one mapping.
                record.args = {k: _redact_arg(v) for k, v in record.args.items()}
            elif record.args:
                record.args = tuple(_redact_arg(a) for a in record.args)
        except Exception:
            # Never let logging hygiene break logging itself.
            pass
        return True


def install_pii_redaction() -> None:
    """Pass every log record the process creates through ``PiiRedactingFilter``.

    A filter added to the root logger never sees the modules' records
    (``logging.getLogger(__name__)``): propagation hands them to the root's
    handlers, not to its filters. A record factory runs for every record,
    whichever logger creates it and whichever handler writes it.
    """
    previous = logging.getLogRecordFactory()
    if getattr(previous, "redacts_pii", False):
        return
    pii_filter = PiiRedactingFilter()

    def factory(*args, **kwargs) -> logging.LogRecord:
        record = previous(*args, **kwargs)
        pii_filter.filter(record)
        return record

    factory.redacts_pii = True  # type: ignore[attr-defined]
    logging.setLogRecordFactory(factory)
