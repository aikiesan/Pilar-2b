"""Censo 2022 by age group and sex (SIDRA 9514)."""

from pathlib import Path

import pytest

from ingest.contract import IngestContext
from ingest.sources.ibge_censo_idade import source as idade

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def frame():
    return idade.load(2022, FIXTURES)


def test_seventeen_groups_two_sexes():
    assert len(idade.AGE_GROUPS) == 17
    assert idade.AGE_GROUPS[0] == "0-4" and idade.AGE_GROUPS[-1] == "80+"
    assert len(idade.VARIABLES) == 34


def test_variable_names():
    assert idade.variable_name("0-4", "h") == "pop_0_4_h"
    assert idade.variable_name("80+", "m") == "pop_80mais_m"


def test_load_one_row_per_municipality(frame):
    assert sorted(frame.ibge_code) == ["3100104", "3521705"]
    assert set(idade.VARIABLES) <= set(frame.columns)


def test_itabera_totals(frame):
    ita = frame.set_index("ibge_code").loc["3521705"]
    assert ita["population"] == 17983
    assert sum(ita[v] for v in idade.VARIABLES) == 17983
    assert (
        ita[[v for v in idade.VARIABLES if v.endswith("_h")]].sum()
        + ita[[v for v in idade.VARIABLES if v.endswith("_m")]].sum()
        == 17983
    )


def test_validate_fails_when_uf_total_drifts(frame):
    ctx = IngestContext(spec=idade.SPEC, year=2022)
    results, ctx = idade.validate(frame, ctx)  # two municipalities never sum to SP
    agg = next(r for r in results if r.gate == "aggregation")
    assert not agg.passed
    assert ctx.published_totals["SP"] == 44_411_238


def test_promote_melts_to_long_rows(frame, fake_conn):
    n = idade.promote(frame, fake_conn, 5)
    sql, rows = fake_conn.executed[0]
    assert n == 68 == len(rows)
    row = next(r for r in rows if r["ibge_code"] == "3521705" and r["variable"] == "pop_0_4_h")
    assert (
        row["year"] == 2022 and row["unit"] == "pessoas" and row["source_id"] == "ibge_censo_idade"
    )
    assert row["ingest_run_id"] == 5


def test_promote_skips_missing_values(frame, fake_conn):
    frame.loc[frame.ibge_code == "3521705", "pop_80mais_m"] = float("nan")
    _, rows = fake_conn.executed[0] if idade.promote(frame, fake_conn, 5) else (None, [])
    assert not any(r["ibge_code"] == "3521705" and r["variable"] == "pop_80mais_m" for r in rows)
