"""Per-sector Real/Ideal columns must reach the municipality detail endpoint.

The map payload deliberately omits them — eight fields across 5,571 features for
something only an opened municipality reads. But `/municipalities/{id}/metrics`
omitted them too, so they existed nowhere the client could see. With
DEFAULT_MAP_SCENARIO = 'real', that left the profile panel with no breakdown to
show for biogás/biometano/bioenergia on first load: it printed "Sem dados" over a
municipality the choropleth was painting green.
"""

from app.api.v1.endpoints.municipalities import (
    _SCENARIO_SECTOR_COLUMNS,
    _SCENARIO_SECTORS,
    _served_scenario_sectors,
)


def test_covers_both_tiers_and_all_four_sectors():
    assert set(_SCENARIO_SECTORS) == {"agricultural", "livestock", "urban", "forestry"}
    # 4 sectors x 2 tiers, plus the 2 municipality totals.
    assert len(_SCENARIO_SECTOR_COLUMNS) == 10
    for tier in ("real", "ideal"):
        for sector in _SCENARIO_SECTORS:
            assert f"ch4_{tier}_{sector}_m3_year" in _SCENARIO_SECTOR_COLUMNS


def test_serves_the_municipality_totals_too():
    # So the endpoint answers the whole question without the caller needing the
    # collection payload alongside it.
    assert "ch4_real_m3_year" in _SCENARIO_SECTOR_COLUMNS
    assert "ch4_ideal_m3_year" in _SCENARIO_SECTOR_COLUMNS


def test_column_names_match_migration_026():
    # The migration is the authority on these names; a typo here would silently
    # serve None for every municipality rather than fail.
    assert "ch4_real_agricultural_m3_year" in _SCENARIO_SECTOR_COLUMNS
    assert "ch4_ideal_forestry_m3_year" in _SCENARIO_SECTOR_COLUMNS


def test_passes_served_values_through_unchanged():
    row = {c: 100.0 for c in _SCENARIO_SECTOR_COLUMNS}
    row["ch4_real_livestock_m3_year"] = 4_000.0
    out = _served_scenario_sectors(row)
    assert out["ch4_real_livestock_m3_year"] == 4_000.0
    # Served, never re-derived: no scaling, no rounding, no unit change.
    assert out["ch4_real_urban_m3_year"] == 100.0


def test_null_stays_null_and_is_not_coerced_to_zero():
    # Outside São Paulo migration 026 loaded nothing. A 0 would state "measured,
    # and there is no potential"; the panel must be able to say "no data".
    out = _served_scenario_sectors({})
    assert set(out) == set(_SCENARIO_SECTOR_COLUMNS)
    assert all(v is None for v in out.values())

    partial = _served_scenario_sectors({"ch4_real_agricultural_m3_year": None})
    assert partial["ch4_real_agricultural_m3_year"] is None


def test_a_measured_zero_survives_as_zero():
    out = _served_scenario_sectors({"ch4_real_urban_m3_year": 0.0})
    assert out["ch4_real_urban_m3_year"] == 0.0
    assert out["ch4_real_urban_m3_year"] is not None


def test_sector_columns_do_not_collide_with_the_per_residue_ones():
    # `forestry` is both a sector and a residue (migration 029 comment), so the
    # two column families would overlap if either used the other's naming.
    from app.api.v1.endpoints.municipalities import _SCENARIO_RESIDUE_COLUMNS

    overlap = set(_SCENARIO_SECTOR_COLUMNS) & set(_SCENARIO_RESIDUE_COLUMNS)
    assert overlap == {"ch4_real_forestry_m3_year", "ch4_ideal_forestry_m3_year"}
