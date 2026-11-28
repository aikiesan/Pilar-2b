"""Censo 2022 urban/rural split (SIDRA 9923)."""

from pathlib import Path

import pytest

from ingest.contract import IngestContext
from ingest.sources.ibge_censo_situacao import source as situacao

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def frame():
    return situacao.load(2022, FIXTURES)


def test_load_itabera(frame):
    row = frame.set_index("ibge_code").loc["3521705"]
    assert (row.total, row.urban, row.rural) == (17983, 12320, 5663)


def test_load_one_row_per_municipality(frame):
    assert sorted(frame.ibge_code) == ["3100104", "3521705"]


def test_gate_urban_plus_rural_equals_total(frame):
    bad = frame.copy()
    bad.loc[0, "urban"] += 1
    results, _ = situacao.validate(bad, IngestContext(spec=situacao.SPEC, year=2022))
    gate = next(r for r in results if r.gate == "cross-source[urban_plus_rural]")
    assert not gate.passed and "1 municipalit" in gate.details


def test_gate_passes_on_consistent_frame(frame):
    results, _ = situacao.validate(frame, IngestContext(spec=situacao.SPEC, year=2022))
    assert next(r for r in results if r.gate == "cross-source[urban_plus_rural]").passed


def test_promote_updates_only_split_columns(frame, fake_conn):
    fake_conn.rowcount = 2
    assert situacao.promote(frame, fake_conn, 3) == 2
    sql, rows = fake_conn.executed[0]
    assert "urban_population" in sql and "rural_population" in sql
    assert " population =" not in sql and " population=" not in sql
    assert ("3521705", 12320.0, 5663.0) in rows


def test_promote_reports_rows_the_database_updated(frame, fake_conn):
    fake_conn.rowcount = 2
    assert situacao.promote(frame, fake_conn, 3) == 2


def test_promote_fails_when_a_municipality_is_missing(frame, fake_conn):
    fake_conn.rowcount = 1  # one of the two codes is not in municipalities
    with pytest.raises(ValueError, match="1 of 2"):
        situacao.promote(frame, fake_conn, 3)
