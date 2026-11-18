"""
LGPD / privacy / security **guardrail** tests.

These are deliberately *source-scanning* regression tests, not behavioural tests:
they pin the compliance posture so it cannot silently regress (e.g. someone
re-adds CPF collection, flips consent to opt-out, or commits a secret into an
example file). They need no database, no network and no `jwt`/`cryptography`
import, so they run anywhere — including CI and the constrained dev sandbox.

Scope = what is on `main` today. Items still in review (PII log-sanitizer,
security headers, full WCAG-A page) get guardrails when they land — see
docs/planning/COMPLIANCE_AND_ROADMAP.md.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

# backend/tests/compliance/<this file> -> NewLook root is parents[3]
NEWLOOK = Path(__file__).resolve().parents[3]
BACKEND = NEWLOOK / "backend"
FRONTEND = NEWLOOK / "frontend"

CALCULATOR = BACKEND / "app" / "routers" / "calculator.py"
MIGRATIONS = BACKEND / "app" / "migrations"
PRIVACY = FRONTEND / "src" / "app" / "[locale]" / "privacy" / "page.tsx"
TERMS = FRONTEND / "src" / "app" / "[locale]" / "terms" / "page.tsx"
ACCESSIBILITY = FRONTEND / "src" / "app" / "[locale]" / "accessibility" / "page.tsx"


def _read(p: Path) -> str:
    assert p.exists(), f"expected file is missing: {p.relative_to(NEWLOOK)}"
    return p.read_text(encoding="utf-8")


# ── Data minimisation: no CPF/CNPJ collection (LGPD Art. 6 III / 16) ──────────


class TestDataMinimisation:
    def test_calculator_model_has_no_cpf_field(self):
        src = _read(CALCULATOR)
        # No Pydantic field / column / param named cpf or cnpj should remain.
        offenders = [
            ln
            for ln in src.splitlines()
            if re.search(r"\bcpf|\bcnpj", ln, re.I)
            and not re.search(r"NOT collected|não.*colet|data minimi|Art\. 6", ln, re.I)
        ]
        assert (
            not offenders
        ), "CPF/CNPJ must not be collected (data minimisation). Offending lines:\n" + "\n".join(
            offenders
        )

    def test_a_migration_drops_cpf_column(self):
        drops = [
            p.name
            for p in MIGRATIONS.glob("*.sql")
            if re.search(
                r"drop\s+column\s+if\s+exists\s+cpf_cnpj", p.read_text(encoding="utf-8"), re.I
            )
        ]
        assert drops, "expected a migration that DROPs the cpf_cnpj column"


# ── Consent: opt-in by default + an enforced gate (LGPD Art. 7/8) ─────────────


class TestConsent:
    def test_consent_defaults_to_false(self):
        src = _read(CALCULATOR)
        assert re.search(
            r"consent_lgpd\s*:\s*bool\s*=\s*False", src
        ), "consent_lgpd must default to False (opt-in / privacy by default)"

    def test_consent_gate_rejects_without_consent(self):
        src = _read(CALCULATOR)
        assert (
            "LGPD_CONSENT_REQUIRED" in src and "403" in src
        ), "submit endpoint must refuse to store data without explicit consent (403)"

    def test_consent_is_versioned_and_timestamped(self):
        src = _read(CALCULATOR)
        assert (
            "consent_text_version" in src and "consented_at" in src
        ), "consent must be demonstrable: store notice version + timestamp (Art. 8 §1)"


# ── Data-subject rights: access + erasure endpoints (LGPD Art. 18) ────────────


class TestDataSubjectRights:
    def test_access_and_erasure_endpoints_exist(self):
        src = _read(CALCULATOR)
        assert re.search(
            r'@router\.get\(\s*["\']/leads/\{lead_id\}', src
        ), "missing DSR access (GET) endpoint"
        assert re.search(
            r'@router\.delete\(\s*["\']/leads/\{lead_id\}', src
        ), "missing DSR erasure (DELETE) endpoint"


# ── Transparency: real privacy & terms pages with the required LGPD content ───


class TestTransparencyPages:
    def test_privacy_page_declares_lgpd_basis_and_rights(self):
        txt = _read(PRIVACY)
        for token in ("LGPD", "13.709", "titular"):
            assert token in txt, f"privacy page should reference '{token}'"

    def test_privacy_page_names_a_contact_for_rights(self):
        txt = _read(PRIVACY)
        assert re.search(
            r"Encarregad|DPO|e-?mail|contato", txt, re.I
        ), "privacy page should give a channel to exercise data-subject rights"

    def test_terms_page_exists_and_is_not_a_stub(self):
        txt = _read(TERMS)
        assert len(txt) > 500, "terms page looks like a stub"

    def test_accessibility_page_addresses_accessibility(self):
        # The full WCAG-A accessibility page is still in review (PR #121). This
        # guardrail activates automatically once it lands on main.
        if not ACCESSIBILITY.exists():
            pytest.skip("accessibility page not on main yet (pending PR #121)")
        txt = ACCESSIBILITY.read_text(encoding="utf-8")
        assert re.search(r"acessibilidade|accessibility", txt, re.I)


# ── No secrets in committed example env files (the GitGuardian lesson) ────────


class TestNoCommittedSecrets:
    PLACEHOLDER = re.compile(
        r"(change|example|placeholder|your|dummy|dev-only|replace|xxx|<|\$\{|\.\.\.)", re.I
    )
    SECRET_KEY = re.compile(r"(PASSWORD|SECRET|TOKEN|API_KEY|PASSWD)\b", re.I)

    def _example_env_files(self):
        return [
            p
            for p in NEWLOOK.rglob("*.example")
            if ".env" in p.name and "node_modules" not in str(p)
        ]

    def test_example_env_files_have_no_real_secret_values(self):
        offenders = []
        for f in self._example_env_files():
            for ln in f.read_text(encoding="utf-8").splitlines():
                ln = ln.strip()
                if ln.startswith("#") or "=" not in ln:
                    continue
                key, _, val = ln.partition("=")
                val = val.strip().strip("'\"")
                if not self.SECRET_KEY.search(key) or not val:
                    continue
                if self.PLACEHOLDER.search(val) or len(val) < 8:
                    continue
                offenders.append(f"{f.relative_to(NEWLOOK)}: {key.strip()}={val}")
        assert (
            not offenders
        ), "example env files must not contain real-looking secret values:\n" + "\n".join(offenders)

    def test_there_is_at_least_one_example_env_file(self):
        # Sanity: the scan above is meaningful only if it actually finds files.
        assert self._example_env_files(), "no .env*.example files found to scan"


if __name__ == "__main__":  # convenience: python -m / direct run
    raise SystemExit(pytest.main([__file__, "-v"]))
