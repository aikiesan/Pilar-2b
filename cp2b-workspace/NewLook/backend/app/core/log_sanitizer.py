"""
PII log sanitiser.

A logging filter that redacts personal data from log records before they are
emitted, supporting data-minimisation in logs (LGPD Art. 6 / Art. 46 security of
processing). Currently redacts e-mail addresses and Brazilian CPF/CNPJ numbers
(structured, low-false-positive patterns) — defence-in-depth even though the app
does not collect CPF/CNPJ, since they could still appear in free-text fields.

Attach once at application start (root logger):

    import logging
    from app.core.log_sanitizer import PiiRedactingFilter
    logging.getLogger().addFilter(PiiRedactingFilter())
"""

import logging
import re

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
# CNPJ: 14 digits, formatted (00.000.000/0000-00) or bare. Matched before CPF.
_CNPJ_RE = re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")
# CPF: 11 digits, formatted (000.000.000-00) or bare.
_CPF_RE = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")


def redact(text: str) -> str:
    """Return ``text`` with e-mails and CPF/CNPJ replaced by placeholders."""
    text = _EMAIL_RE.sub("[EMAIL]", text)
    text = _CNPJ_RE.sub("[CNPJ]", text)  # before CPF so 14-digit isn't split
    text = _CPF_RE.sub("[CPF]", text)
    return text


class PiiRedactingFilter(logging.Filter):
    """Redacts PII from both the format string and any positional args."""

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            if isinstance(record.msg, str):
                record.msg = redact(record.msg)
            if record.args:
                record.args = tuple(
                    redact(a) if isinstance(a, str) else a for a in record.args
                )
        except Exception:
            # Never let logging hygiene break logging itself.
            pass
        return True
