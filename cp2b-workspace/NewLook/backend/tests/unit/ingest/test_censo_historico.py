"""Resident population at every census 1970–2022 (SIDRA 200 + 4714)."""

from pathlib import Path

import pytest

from ingest.sources.ibge_censo_historico import source as hist

FIXTURES = Path(__file__).parent / "fixtures"
NEW_CODE = "3500758"  # SP municipality first counted in 2000


@pytest.fixture
def frame():
    return hist.load(2022, FIXTURES)


def test_itabera_series(frame):
    row = frame.set_index("ibge_code").loc["3521705"]
    assert {y: row[f"pop_{y}"] for y in hist.CENSUS_YEARS} == {
        1970: 14585,
        1980: 16399,
        1991: 17899,
        2000: 18911,
        2010: 17858,
        2022: 17983,
    }


def test_municipality_created_later_has_no_early_values(frame):
    row = frame.set_index("ibge_code").loc[NEW_CODE]
    assert row.isna()[["pop_1970", "pop_1980", "pop_1991"]].all()
    assert row["pop_2000"] == 3650 and row["pop_2022"] == 6141


def test_promote_writes_only_existing_years(frame, fake_conn):
    hist.promote(frame, fake_conn, 9)
    _, rows = fake_conn.executed[0]
    years_new = sorted(r["year"] for r in rows if r["ibge_code"] == NEW_CODE)
    assert years_new == [2000, 2010, 2022]
    assert all(r["variable"] == "populacao_residente" and r["value"] > 0 for r in rows)
    assert len(rows) == 6 + 3


def test_2022_matches_census_total_gate(frame):
    from ingest.contract import IngestContext

    results, ctx = hist.validate(frame, IngestContext(spec=hist.SPEC, year=2022))
    assert ctx.totals_column == "pop_2022"
    assert not next(r for r in results if r.gate == "aggregation").passed  # 2 towns ≠ SP
