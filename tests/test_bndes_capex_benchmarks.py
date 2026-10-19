"""Guards for analysis/build_bndes_capex_benchmarks.py: it reports the platform's own calculation."""

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "analysis" / "build_bndes_capex_benchmarks.py"
_spec = importlib.util.spec_from_file_location("bndes", SCRIPT)
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)


def test_reads_the_canonical_deals_through_the_backend_service():
    params = B.F.read(B.CANONICAL)
    assert params["operacoes"] and all(d["fonte_url"].startswith("https://") for d in params["operacoes"])


def test_every_basis_has_a_report_label():
    s = B.F.summary(B.F.read(B.CANONICAL))
    assert {b["basis"] for b in s["projects"]} <= set(B.BASIS)


def test_financing_only_entries_are_flagged_as_lower_bounds():
    projects = B.F.summary(B.F.read(B.CANONICAL))["projects"]
    onebio = next(b for b in projects if "Onebio" in b["project"])
    assert onebio["lower_bound"] and onebio["basis"] == "financing"
    assert all(not b["lower_bound"] for b in projects if b["basis"] != "financing")
