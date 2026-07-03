"""
Tests for the PII log sanitiser (LGPD data-minimisation in logs).

Pure unit tests — no DB / network / jwt — so they run in CI and the sandbox.
"""

import logging

import pytest

from app.core.log_sanitizer import PiiRedactingFilter, redact


class TestRedact:
    def test_redacts_email(self):
        assert redact("user lucasnc@unicamp.br logged in") == "user [EMAIL] logged in"

    def test_redacts_multiple_emails(self):
        out = redact("from a@b.com to c.d@e.org")
        assert "a@b.com" not in out and "c.d@e.org" not in out
        assert out.count("[EMAIL]") == 2

    def test_redacts_formatted_cpf(self):
        assert redact("CPF 123.456.789-09 here") == "CPF [CPF] here"

    def test_redacts_bare_cpf(self):
        assert redact("doc 12345678909 end") == "doc [CPF] end"

    def test_redacts_formatted_cnpj(self):
        assert redact("CNPJ 12.345.678/0001-95 ok") == "CNPJ [CNPJ] ok"

    def test_redacts_bare_cnpj_not_as_two_cpfs(self):
        # 14-digit CNPJ must be redacted as one [CNPJ], not partially as a CPF.
        out = redact("id 12345678000195 done")
        assert out == "id [CNPJ] done"

    def test_passes_through_non_pii(self):
        msg = "computed 645 municipalities in 1.2s"
        assert redact(msg) == msg

    def test_mixed_pii(self):
        out = redact("mail x@y.com cpf 111.222.333-44")
        assert "[EMAIL]" in out and "[CPF]" in out
        assert "x@y.com" not in out and "111.222.333-44" not in out


class TestFilter:
    def _record(self, msg, *args):
        return logging.LogRecord(
            name="t",
            level=logging.INFO,
            pathname=__file__,
            lineno=1,
            msg=msg,
            args=args,
            exc_info=None,
        )

    def test_filter_returns_true(self):
        assert PiiRedactingFilter().filter(self._record("hello")) is True

    def test_filter_redacts_msg(self):
        rec = self._record("login lucasnc@unicamp.br")
        PiiRedactingFilter().filter(rec)
        assert rec.msg == "login [EMAIL]"

    def test_filter_redacts_string_args(self):
        rec = self._record("user %s acted", "a@b.com")
        PiiRedactingFilter().filter(rec)
        assert rec.args == ("[EMAIL]",)

    def test_filter_leaves_non_string_args_untouched(self):
        rec = self._record("count %d", 42)
        PiiRedactingFilter().filter(rec)
        assert rec.args == (42,)

    def test_rendered_message_is_clean(self):
        rec = self._record("from %s id %s", "a@b.com", "123.456.789-09")
        PiiRedactingFilter().filter(rec)
        assert rec.getMessage() == "from [EMAIL] id [CPF]"


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
