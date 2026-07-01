"""
Canonical Parameter Database — integrity, citation, and drift guards.

The canonical parameter database lives in
    data/canonical_parameters/feedstocks.yaml
    data/canonical_parameters/references.yaml
and is the SINGLE SOURCE OF TRUTH for all biochemical parameters used by the
PILAR-2b platform. Code layers (SQL migrations, the Python service configs in
biomass_availability.py, the TypeScript calculator, and fde_all_residues.json)
are generated from it by scripts/generate_from_canonical.py.

These tests enforce, in CI:

1. Physical plausibility — every BMP/TS/VS/CH4/C:N value sits within the same
   bounds verified by test_residuos_bounds.py (Angelidaki & Sanders 2004; APHA
   Standard Methods; Yen & Brune 2007; Wellinger et al. 2013).

2. Citation integrity — every parameter cites at least one reference, every
   referenced id exists in references.yaml, and every reference carries a URL.

3. No drift — the values baked into the runtime service
   (RESIDUE_BIOMASS_CONFIGS in biomass_availability.py) still match what the
   canonical YAML would generate. If someone edits the YAML without re-running
   the generator (or hand-edits the service), this test fails.
"""

from pathlib import Path

import pytest

yaml = pytest.importorskip("yaml", reason="PyYAML required for canonical parameter tests")

# data/canonical_parameters lives at <NewLook>/data; this file is at
# <NewLook>/backend/tests/unit/test_canonical_parameters.py → parents[3] = NewLook
_CANON_DIR = Path(__file__).resolve().parents[3] / "data" / "canonical_parameters"
_FEEDSTOCKS = _CANON_DIR / "feedstocks.yaml"
_REFERENCES = _CANON_DIR / "references.yaml"


# ── Physical bounds (mirror test_residuos_bounds.py) ─────────────────────────
BMP_MIN, BMP_MAX = 40.0, 1100.0  # NmL CH4/gVS; upper raised for fats (Sheets 2015)
VS_MIN, VS_MAX = 0.0, 100.0  # % of TS
TS_MIN, TS_MAX = 0.0, 100.0  # % wet weight
CN_MIN, CN_MAX = 2.0, 100.0  # blood C:N ~3 (Sheets 2015) → lower than 5
CH4_MIN, CH4_MAX = 45.0, 80.0  # % vol in biogas


@pytest.fixture(scope="module")
def feedstocks():
    if not _FEEDSTOCKS.exists():
        pytest.skip(f"canonical feedstocks.yaml not found at {_FEEDSTOCKS}")
    return yaml.safe_load(_FEEDSTOCKS.read_text(encoding="utf-8"))["feedstocks"]


@pytest.fixture(scope="module")
def references():
    if not _REFERENCES.exists():
        pytest.skip(f"canonical references.yaml not found at {_REFERENCES}")
    return yaml.safe_load(_REFERENCES.read_text(encoding="utf-8"))["references"]


def _ref_ids(param_block):
    """Extract reference ids from a parameter block's refs list (dicts or strings)."""
    out = []
    for r in param_block.get("refs", []):
        out.append(r["id"] if isinstance(r, dict) else r)
    return out


@pytest.mark.unit
class TestCanonicalStructure:
    def test_has_feedstocks(self, feedstocks):
        assert len(feedstocks) >= 20, "expected the full canonical feedstock set"

    def test_every_feedstock_has_core_params(self, feedstocks):
        required = {"bmp", "ts", "vs_of_ts", "ch4_pct", "cn_ratio", "sector"}
        for code, fs in feedstocks.items():
            missing = required - set(fs.keys())
            assert not missing, f"{code} missing canonical fields: {missing}"


@pytest.mark.unit
class TestPhysicalBounds:
    def test_bmp_in_range(self, feedstocks):
        for code, fs in feedstocks.items():
            for k in ("min", "medio", "max"):
                v = fs["bmp"][k]
                assert BMP_MIN <= v <= BMP_MAX, f"{code}.bmp.{k}={v} out of [{BMP_MIN},{BMP_MAX}]"

    def test_bmp_ordering(self, feedstocks):
        for code, fs in feedstocks.items():
            b = fs["bmp"]
            assert b["min"] <= b["medio"] <= b["max"], f"{code}.bmp ordering violated"

    def test_ts_in_range(self, feedstocks):
        for code, fs in feedstocks.items():
            for k in ("min", "medio", "max"):
                v = fs["ts"][k]
                assert TS_MIN <= v <= TS_MAX, f"{code}.ts.{k}={v} out of range"

    def test_vs_of_ts_in_range(self, feedstocks):
        for code, fs in feedstocks.items():
            for k in ("min", "medio", "max"):
                v = fs["vs_of_ts"][k]
                assert VS_MIN <= v <= VS_MAX, f"{code}.vs_of_ts.{k}={v} out of range"

    def test_vs_ordering(self, feedstocks):
        for code, fs in feedstocks.items():
            for param in ("ts", "vs_of_ts"):
                p = fs[param]
                assert p["min"] <= p["medio"] <= p["max"], f"{code}.{param} ordering violated"

    def test_ch4_in_range(self, feedstocks):
        for code, fs in feedstocks.items():
            v = fs["ch4_pct"]
            assert CH4_MIN <= v <= CH4_MAX, f"{code}.ch4_pct={v} out of [{CH4_MIN},{CH4_MAX}]"

    def test_cn_in_range(self, feedstocks):
        for code, fs in feedstocks.items():
            v = fs["cn_ratio"]
            assert CN_MIN <= v <= CN_MAX, f"{code}.cn_ratio={v} out of [{CN_MIN},{CN_MAX}]"

    def test_derived_vs_wet_not_above_100(self, feedstocks):
        # vs_wet = ts × vs_of_ts / 100 must be a physically possible fraction
        for code, fs in feedstocks.items():
            vs_wet = fs["ts"]["medio"] * fs["vs_of_ts"]["medio"] / 100.0
            assert 0.0 <= vs_wet <= 100.0, f"{code} derived vs_wet={vs_wet:.2f} impossible"


@pytest.mark.unit
class TestCitationIntegrity:
    def test_every_param_cites_a_reference(self, feedstocks):
        for code, fs in feedstocks.items():
            for param in ("bmp", "ts", "vs_of_ts"):
                ids = _ref_ids(fs[param])
                assert ids, f"{code}.{param} has no citations"

    def test_all_reference_ids_resolve(self, feedstocks, references):
        for code, fs in feedstocks.items():
            for param in ("bmp", "ts", "vs_of_ts"):
                for ref_id in _ref_ids(fs[param]):
                    assert ref_id in references, f"{code}.{param} cites unknown ref '{ref_id}'"

    def test_every_reference_has_url(self, references):
        for ref_id, ref in references.items():
            url = ref.get("url", "")
            assert url and url.startswith("http"), f"reference '{ref_id}' has no valid URL"

    def test_every_reference_has_authors_and_year(self, references):
        for ref_id, ref in references.items():
            assert ref.get("authors"), f"reference '{ref_id}' missing authors"
            assert ref.get("year"), f"reference '{ref_id}' missing year"


@pytest.mark.unit
class TestNoDriftWithRuntimeService:
    """The runtime RESIDUE_BIOMASS_CONFIGS must match canonical YAML values.

    This is the guard that keeps the generated Python service in sync with the
    single source of truth. Mapping mirrors SERVICE_LAYER_MAP in
    scripts/generate_from_canonical.py.
    """

    # service key -> canonical feedstock code used as its representative stream
    SERVICE_MAP = {
        "sugarcane": "BAGACO",
        "soybean": "PALHA_SOJA",  # field straw mapping (confirmed 2026-06)
        "corn": "PALHA_MILHO",
        "coffee": "CASCA_CAFE",
        "citrus": "BAGACO_CITROS",
        "cattle": "ESTERCO_BOVINO",
        "swine": "DEJETOS_SUINO",
        "poultry": "CAMA_AVIARIO",
        "rsu": "FORSU",
        "rpo": "PODA_URBANA",  # urban pruning waste (confirmed 2026-06)
    }

    def test_service_bmp_matches_canonical(self, feedstocks):
        from app.services.biomass_availability import RESIDUE_BIOMASS_CONFIGS

        by_key = {c.key: c for c in RESIDUE_BIOMASS_CONFIGS}
        for key, code in self.SERVICE_MAP.items():
            assert key in by_key, f"service missing key {key}"
            expected = feedstocks[code]["bmp"]["medio"]
            assert by_key[key].bmp == pytest.approx(expected), (
                f"DRIFT: service '{key}' bmp={by_key[key].bmp} != canonical "
                f"{code} bmp_medio={expected}. Re-run scripts/generate_from_canonical.py."
            )

    def test_service_vs_wet_matches_canonical(self, feedstocks):
        from app.services.biomass_availability import RESIDUE_BIOMASS_CONFIGS

        by_key = {c.key: c for c in RESIDUE_BIOMASS_CONFIGS}
        for key, code in self.SERVICE_MAP.items():
            fs = feedstocks[code]
            expected_vs_wet = fs["ts"]["medio"] * fs["vs_of_ts"]["medio"] / 100.0
            # service stores rounded wet VS; allow 0.1 absolute tolerance for rounding
            assert by_key[key].vs_percent == pytest.approx(expected_vs_wet, abs=0.1), (
                f"DRIFT: service '{key}' vs_percent={by_key[key].vs_percent} != canonical "
                f"derived vs_wet={expected_vs_wet:.2f} ({code}). "
                f"Re-run scripts/generate_from_canonical.py."
            )
