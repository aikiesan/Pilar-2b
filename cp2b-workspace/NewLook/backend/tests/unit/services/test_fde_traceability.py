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

# test file: NewLook/backend/tests/unit/services/test_fde_traceability.py
#   parents[0]=services [1]=unit [2]=tests [3]=backend [4]=NewLook
_NEWLOOK = Path(__file__).resolve().parents[4]
_SCRIPT = _NEWLOOK / "backend" / "scripts" / "validate_fde_traceability.py"


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
