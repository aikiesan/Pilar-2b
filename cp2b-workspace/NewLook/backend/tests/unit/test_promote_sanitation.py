"""promote_sanitation: bbp harmonised variables -> the platform's timeseries rows."""

import pytest

from ingest import bbp
from scripts import promote_sanitation as ps


class FakeCursor:
    """Answers the queries read_sanitation, parity and latest issue."""

    def __init__(self, sanitation=(), timeseries=(), has_view=True):
        self.sanitation, self.timeseries, self.has_view = (
            list(sanitation),
            list(timeseries),
            has_view,
        )
        self.result = []

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def execute(self, sql, params=None):
        if sql.startswith("SELECT to_regclass"):
            self.result = [("bbp.v_sanitation" if self.has_view else None,)]
        elif "FROM bbp.v_sanitation" in sql:
            year, survey = params
            self.result = [
                (g, v, x) for g, y, s, v, x in self.sanitation if y == year and s == survey
            ]
        elif "source_id = 'snis'" in sql:
            self.result = [
                (c, v, x) for c, y, s, v, x, q in self.timeseries if s == "snis" and y == params[0]
            ]
        elif "DISTINCT ON (ibge_code)" in sql:
            rows = sorted(
                (r for r in self.timeseries if r[3] == params[0] and r[5] != "preliminary"),
                key=lambda r: (r[0], -r[1]),
            )
            seen, self.result = set(), []
            for c, y, _s, _v, x, _q in rows:
                if c not in seen:
                    seen.add(c)
                    self.result.append((c, y, x))

    def fetchone(self):
        return self.result[0] if self.result else None

    def fetchall(self):
        return self.result


class FakeConn:
    def __init__(self, **kw):
        self.cur = FakeCursor(**kw)

    def cursor(self):
        return self.cur


SANITATION = [
    # geocode, year, survey, bbp variable, value
    (3550308, 2023, "SINISA", "msw_collected_t", 4_000_000.5),
    (3550308, 2023, "SINISA", "household_collected_t", 3_000_000.0),
    (3550308, 2023, "SINISA", "population_total", 11_451_999.0),
    (1302603, 2023, "SINISA", "household_collected_t", 0.0),  # a reported zero
    (9999999, 2023, "SINISA", "household_collected_t", 1.0),  # not in the spine
    (3550308, 2022, "SNIS", "household_collected_t", 2_900_000.0),
]


def test_read_sanitation_keeps_reported_zeros_and_filters_survey_and_year():
    reading = bbp.read_sanitation(FakeConn(sanitation=SANITATION), 2023, "SINISA")
    assert reading["1302603"] == {"household_collected_t": 0.0}
    assert reading["3550308"]["msw_collected_t"] == 4_000_000.5
    assert "household_collected_t" in reading["3550308"]
    assert bbp.read_sanitation(FakeConn(sanitation=SANITATION), 2022, "SNIS") == {
        "3550308": {"household_collected_t": 2_900_000.0}
    }


def test_read_sanitation_without_the_view_is_a_clear_error():
    with pytest.raises(bbp.BbpUnavailable, match="v_sanitation"):
        bbp.read_sanitation(FakeConn(has_view=False), 2023, "SINISA")


def test_rows_use_the_platform_names_and_the_survey_as_source():
    reading = bbp.read_sanitation(FakeConn(sanitation=SANITATION), 2023, "SINISA")
    rows, skipped, unmapped = ps.to_rows(reading, 2023, "SINISA", {"3550308", "1302603"})
    assert skipped == 1 and unmapped == []
    by_key = {(r["ibge_code"], r["variable"]): r for r in rows}
    assert by_key[("3550308", "rdo_rpu_coletado")]["value"] == 4_000_000.5
    assert by_key[("3550308", "populacao_total")]["unit"] == "inhabitants"
    assert by_key[("1302603", "rdo_coletado")]["value"] == 0.0
    assert {r["source_id"] for r in rows} == {"sinisa"}
    assert {r["quality"] for r in rows} == {"measured"}


def test_unmapped_bbp_variable_is_reported_not_dropped():
    _, _, unmapped = ps.to_rows({"3550308": {"new_variable": 1.0}}, 2023, "SINISA", {"3550308"})
    assert unmapped == ["new_variable"]


def test_every_snis_variable_promote_snis_writes_has_a_bbp_source():
    from ingest.sources.snis import source as snis

    assert set(snis.UNIT_BY_VARIABLE.items()) == set(ps.VARIABLES.values())


def test_parity_counts_differences_and_one_sided_rows():
    timeseries = [
        ("3550308", 2022, "snis", "rdo_coletado", 2_900_000.0, "measured"),
        ("3550308", 2022, "snis", "populacao_total", 11_000_000.0, "measured"),
    ]
    rows = [
        {"ibge_code": "3550308", "variable": "rdo_coletado", "value": 2_900_000.0},
        {"ibge_code": "1302603", "variable": "rdo_coletado", "value": 5.0},
    ]
    p = ps.parity(FakeCursor(timeseries=timeseries), rows, 2022)
    assert p == {"both": 1, "different": 0, "only_bbp": 1, "only_db": 1}


def test_latest_takes_the_newest_final_year_and_lets_new_rows_win_ties():
    timeseries = [
        ("3550308", 2022, "snis", "rdo_coletado", 100.0, "measured"),
        ("3550308", 2021, "snis", "rdo_coletado", 90.0, "measured"),
        ("1302603", 2025, "x", "rdo_coletado", 7.0, "preliminary"),  # skipped by the map
    ]
    cur = FakeCursor(timeseries=timeseries)
    assert ps.latest(cur, "rdo_coletado") == {"3550308": 100.0}
    extra = [{"ibge_code": "3550308", "year": 2024, "variable": "rdo_coletado", "value": 120.0}]
    assert ps.latest(cur, "rdo_coletado", extra) == {"3550308": 120.0}
