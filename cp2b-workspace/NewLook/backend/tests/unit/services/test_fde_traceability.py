"""
FDE traceability guard (reproducibility test).

Runs the same checks as backend/scripts/validate_fde_traceability.py so CI fails
if any FDE block loses arithmetic consistency, a citation, a URL, or a confidence
tier. This is the regression guard that keeps the canonical dataset publishable.
"""

import importlib.util
from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml", reason="PyYAML required")

# Locate the validator by walking up until we find it, rather than counting
# parent directories.
#
# A fixed parents[4] assumed the checkout layout NewLook/backend/tests/unit/
# services/. That holds on a developer machine, but docker-compose bind-mounts
# ./backend to /app, so in the container the path is /app/tests/unit/services/ —
# parents[4] overshoots to "/" and the test died with
# "No such file: /backend/scripts/validate_fde_traceability.py". Three tests were
# red in Docker and green on the host for weeks, which is the worst way for a
# test to fail: it looks like an environment quirk rather than a bug.
_SCRIPT_REL = Path("scripts") / "validate_fde_traceability.py"


def _find_script() -> Path:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / _SCRIPT_REL
        if candidate.is_file():
            return candidate
        # Checkout layout: the script lives under a sibling `backend/`.
        candidate = parent / "backend" / _SCRIPT_REL
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(f"could not locate {_SCRIPT_REL} from {__file__}")


_SCRIPT = _find_script()


def _load_validator():
    spec = importlib.util.spec_from_file_location("validate_fde_traceability", _SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.mark.unit
class TestFdeTraceability:
    def test_all_fde_blocks_pass_traceability(self):
        v = _load_validator()
        fs, refs = v.load()
        errors = v.validate(fs, refs)
        assert errors == [], "FDE traceability failures:\n" + "\n".join(errors)

    def test_every_feedstock_has_confidence_tier(self):
        fs, _ = _load_validator().load()
        for code, e in fs.items():
            assert e["fde"].get("confidence") in {"HIGH", "MEDIUM", "LOW"}, code

    def test_every_cited_ref_resolves_with_url(self):
        v = _load_validator()
        fs, refs = v.load()
        for code, e in fs.items():
            for r in e["fde"]["refs"]:
                rid = r["id"]
                assert rid in refs, f"{code}: ref {rid} missing"
                assert (refs[rid].get("url") or "").strip(), f"{code}: ref {rid} has no URL"
