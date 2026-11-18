"""Per-sector Real/Ideal columns must reach the municipality detail endpoint.

The map payload deliberately omits them — six fields across 5,571 features for
something only an opened municipality reads. `/municipalities/{id}/metrics`
serves them instead. With DEFAULT_MAP_SCENARIO = 'real', the profile panel reads
this split on first load; without it the panel printed "Sem dados" over a
municipality the choropleth was painting green.

Real and Ideal are the CP2b cascade (migration 034): Real = N4, Ideal = N3,
served under the method's own names from the municipality_cp2b_map view.
"""

from app.api.v1.endpoints.municipalities import (
    _CP2B_DETAIL_COLUMNS,
    _CP2B_MAP_COLUMNS,
    _load_cp2b_detail,
)


class FakeCursor:
    """Answers _table_exists and the one detail SELECT."""

    def __init__(self, has_view: bool, row: dict | None):
        self.has_view = has_view
        self.row = row
        self.statements: list[str] = []
        self._last = None

    def execute(self, sql, params=None):
        self.statements.append(sql)
        self._last = sql

    def fetchone(self):
        if "information_schema" in self._last or "to_regclass" in self._last:
            return {"exists": True, "to_regclass": "x"} if self.has_view else None
        return self.row


def test_covers_both_levels_and_the_three_cp2b_sectors():
    for tier in ("cp2b_n3", "cp2b_n4"):
        for sector in ("agricultural", "livestock", "urban"):
            assert f"ch4_{tier}_{sector}_m3_year" in _CP2B_DETAIL_COLUMNS
    # The method has no forestry stream, so there is no column to serve.
    assert not any("forestry" in c for c in (*_CP2B_DETAIL_COLUMNS, *_CP2B_MAP_COLUMNS))


def test_serves_the_municipality_totals_too():
    # So the endpoint answers the whole question without the collection payload.
    assert "ch4_cp2b_n3_m3_year" in _CP2B_MAP_COLUMNS
    assert "ch4_cp2b_n4_m3_year" in _CP2B_MAP_COLUMNS


def test_the_atlas_columns_are_no_longer_served():
    served = (*_CP2B_DETAIL_COLUMNS, *_CP2B_MAP_COLUMNS)
    assert not any(c.startswith(("ch4_real_", "ch4_ideal_")) for c in served)


def test_sector_columns_do_not_collide_with_the_per_residue_ones():
    assert not set(_CP2B_DETAIL_COLUMNS) & set(_CP2B_MAP_COLUMNS)


def test_no_view_means_no_keys_not_zeros():
    # Before migration 034 is loaded the panel must say "no data", not "0".
    assert _load_cp2b_detail(FakeCursor(has_view=False, row=None), "3550308") == {}


def test_outside_the_view_means_no_keys():
    assert _load_cp2b_detail(FakeCursor(has_view=True, row=None), "3106200") == {}


def test_passes_served_values_through_unchanged():
    row = {"ch4_cp2b_n4_livestock_m3_year": 4_000.0, "ch4_cp2b_n4_urban_m3_year": 0.0}
    out = _load_cp2b_detail(FakeCursor(has_view=True, row=row), "3517406")
    # Served, never re-derived; a measured zero stays a zero.
    assert out["ch4_cp2b_n4_livestock_m3_year"] == 4_000.0
    assert out["ch4_cp2b_n4_urban_m3_year"] == 0.0
    assert out["ch4_cp2b_n4_urban_m3_year"] is not None


def test_a_malformed_code_is_not_queried():
    cur = FakeCursor(has_view=True, row={"x": 1})
    assert _load_cp2b_detail(cur, "not-a-code") == {}
    assert not any("municipality_cp2b_map WHERE" in s for s in cur.statements)
