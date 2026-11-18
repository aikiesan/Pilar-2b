import pytest

from scripts import promote_public_state_activity as activity


def test_source_and_snapshot_numeric_formats_are_not_conflated():
    assert activity._sidra_value(387.0) == 387.0
    assert activity._sidra_value("8.000,00") == 8000.0
    assert activity._snapshot_value("51915.0") == 51915.0
    assert activity._snapshot_value("") is None


def test_snapshot_validation_allows_whole_ppm_absence_but_not_partial(monkeypatch):
    monkeypatch.setattr(activity, "PUBLIC_STATE_COUNTS", {"31": 1, "35": 1})
    monkeypatch.setattr(activity, "PUBLIC_MUNICIPALITIES", 2)
    rows = [
        {
            "ibge_code": "3100000",
            "population_2022": 10,
            "cattle_head_2024": 1,
            "swine_head_2024": 2,
            "poultry_head_2024": 3,
        },
        {"ibge_code": "3500000", "population_2022": 20},
    ]
    activity.validate_snapshot(rows)

    rows[1]["cattle_head_2024"] = 1
    with pytest.raises(ValueError, match="partial PPM"):
        activity.validate_snapshot(rows)


def test_committed_snapshot_preserves_public_state_coverage_and_missing_ppm():
    rows = activity.load_snapshot(activity.DEFAULT_SNAPSHOT)
    assert len(rows) == 1498
    assert sum(str(row["ibge_code"]).startswith("31") for row in rows) == 853
    assert sum(str(row["ibge_code"]).startswith("35") for row in rows) == 645

    missing_ppm = [
        row
        for row in rows
        if all(row.get(field) is None for field in activity.HERD_VARIABLES.values())
    ]
    assert len(missing_ppm) == 28
    assert all(str(row["ibge_code"]).startswith("35") for row in missing_ppm)


def test_database_spine_requires_exact_sp_and_mg_match():
    activity.validate_database_spine({"3100000", "3500000"}, {"3100000", "3500000"})

    with pytest.raises(ValueError, match=r"SP \+ MG database spine") as exc_info:
        activity.validate_database_spine({"3100000", "3300000"}, {"3100000", "3500000"})

    message = str(exc_info.value)
    assert "missing=['3500000']" in message
    assert "extra=['3300000']" in message


def test_promotion_preserves_units_and_skips_unreported_ppm():
    rows = [
        {
            "ibge_code": "3500600",
            "population_2022": 2780.0,
            "cattle_head_2024": None,
            "swine_head_2024": None,
            "poultry_head_2024": None,
            "snis_rdo_t_year": 100.0,
            "snis_rpu_t_year": None,
            "snis_rdo_rpu_t_year": 120.0,
        }
    ]
    populations, series = activity.promotion_rows(rows)

    assert populations == [{"ibge_code": "3500600", "population": 2780}]
    assert not any(row["source_id"] == "ibge_ppm" for row in series)
    rdo = next(row for row in series if row["variable"] == "rdo_coletado")
    assert rdo["value"] == 100.0
    assert rdo["unit"] == "t"
    assert rdo["quality"] == "measured"
