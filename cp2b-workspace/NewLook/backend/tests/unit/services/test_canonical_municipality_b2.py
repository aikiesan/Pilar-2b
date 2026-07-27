import csv
import json
import math
from pathlib import Path

from app.services.biogas_forward import SCENARIOS
from app.services.canonical_municipality import (
    compute_canonical_municipality,
    load_snis_activity_snapshot,
)
from app.services.map_metrics import compute_published_municipality_metrics
from scripts.compute_sp_canonical_totals import _baseline_expected, _guard


ROOT = Path(__file__).resolve().parents[4]
BIOMASS = ROOT / "docs" / "data" / "municipality_biomass_tons.csv"


def _rows():
    return {
        row["ibge_code"]: row
        for row in csv.DictReader(BIOMASS.open(encoding="utf-8"))
    }


def test_snis_snapshot_has_645_and_explicit_forsu_routes():
    activity = load_snis_activity_snapshot()
    assert len(activity) == 645
    assert sum(row["co111_rdo_t_2022"] > 0 for row in activity.values()) == 214
    assert sum(row["co111_rdo_t_2022"] <= 0 for row in activity.values()) == 431


def test_measured_forsu_sludge_and_availability_share_one_instance():
    activity = load_snis_activity_snapshot()
    code = next(
        code
        for code, values in activity.items()
        if values["co111_rdo_t_2022"] > 0
        and values["es006_treated_sewage_1000m3_2022"] > 0
    )
    result = compute_canonical_municipality(_rows()[code], activity=activity[code])
    assert result.activity_route == "snis_co111"
    assert "forsu" in result.feedstocks
    assert "lodo_primario" in result.feedstocks
    assert "lodo_secundario" in result.feedstocks
    assert "poda_urbana" not in result.feedstocks
    for scenario in SCENARIOS:
        forsu = result.feedstocks["forsu"]
        ratio = forsu.biomass_mobilizable[scenario] / forsu.biomass_gross[scenario]
        assert math.isclose(ratio, forsu.availability[scenario], rel_tol=1e-12)


def test_public_surface_matches_canonical_for_all_bands():
    activity = load_snis_activity_snapshot()
    code = next(iter(activity))
    row = _rows()[code]
    canonical = compute_canonical_municipality(row, activity=activity[code])
    public = compute_published_municipality_metrics(row, activity=activity[code])
    public_metrics = {
        "biomass_gross": public.biomass_gross_total_by_scenario,
        "biomass_mobilizable": public.biomass_corrected_total,
        "ch4": public.biogas_ch4_total,
        "biogas": public.biogas_total,
        "biomethane": public.biomethane_total,
    }
    for metric, values in public_metrics.items():
        for scenario in SCENARIOS:
            assert values[scenario] == canonical.totals[metric][scenario]


def test_guard_reads_persisted_expected_and_rejects_changed_output(tmp_path):
    baseline = tmp_path / "canonical_results.json"
    baseline.write_text(
        json.dumps(
            {
                "totals": {
                    "ch4_practical": {
                        "medio": {"value": 123.5, "unit": "m3_CH4/year"}
                    }
                }
            }
        ),
        encoding="utf-8",
    )
    expected = _baseline_expected(baseline)
    assert expected == 123.5
    assert _guard(123.5, expected, False)["status"] == "pass"
    try:
        _guard(124.0, expected, False)
    except RuntimeError:
        pass
    else:
        raise AssertionError("guard accepted output different from persisted baseline")
