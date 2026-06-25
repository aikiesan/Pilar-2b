"""
PII log sanitiser.

A logging filter that redacts personal data (currently e-mail addresses) from
log records before they are emitted, supporting data-minimisation in logs
(LGPD Art. 6). Attach once at application start:

    import logging
    from app.core.log_sanitizer import PiiRedactingFilter
    logging.getLogger().addFilter(PiiRedactingFilter())
"""

import logging
import re

_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")


def redact(text: str) -> str:
    """Return ``text`` with e-mail addresses replaced by ``[EMAIL]``."""
    return _EMAIL_RE.sub("[EMAIL]", text)


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
