"""municipalities.co2_reduction_tons_year must be the Climate card's net reduction."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.canonical_loader import load_ghg_params
from scripts import run_migrations, sync_co2_from_ghg

ROWS = [
    {"substrate": "SUINOS", "residue": "swine", "sector": "livestock", "ch4": 1e6},
    {"substrate": "PALHA", "residue": "sugarcane", "sector": "agricultural", "ch4": 2e6},
    {"substrate": "RSU_ORGANICO", "residue": "rsu", "sector": "urban", "ch4": 0},
]


def test_column_equals_the_municipality_endpoint_total(mock_db_connection):
    _, cursor = mock_db_connection
    cursor.fetchone.return_value = {"?column?": 1}
    cursor.fetchall.return_value = ROWS
    with TestClient(app) as client:
        body = client.get(
            f"/api/v1/ghg/municipalities/3550308?level={sync_co2_from_ghg.LEVEL}"
            f"&scenario={sync_co2_from_ghg.SCENARIO}"
        ).json()
    net = sync_co2_from_ghg.net_reduction_by_municipality(
        load_ghg_params(), [(3550308, r["substrate"], r["ch4"]) for r in ROWS]
    )
    assert net == {"3550308": pytest.approx(body["totals"]["er_net_t"])}


def test_municipalities_are_kept_apart_and_none_counts_as_zero():
    params = load_ghg_params()
    net = sync_co2_from_ghg.net_reduction_by_municipality(
        params, [(1, "SUINOS", 1e6), (2, "SUINOS", 2e6), (2, "PALHA", None)]
    )
    assert set(net) == {"1", "2"}
    assert net["2"] == pytest.approx(2 * net["1"])


def test_runs_after_the_cp2b_potential_is_loaded():
    order = list(run_migrations.SEEDERS)
    assert order.index("load_cp2b_potential") < order.index("sync_co2_from_ghg")
    # The legacy sync no longer writes the column, so it cannot overwrite it.
    assert order.index("sync_db_canonical") < order.index("sync_co2_from_ghg")


def _fake_db(monkeypatch, exists, rows):
    from unittest.mock import MagicMock

    import psycopg2
    import psycopg2.extras

    cur = MagicMock()
    cur.fetchone.return_value = (exists,)
    cur.fetchall.return_value = rows
    cur.rowcount = len(rows)
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cur
    monkeypatch.setattr(psycopg2, "connect", lambda dsn: conn)
    written = []
    monkeypatch.setattr(
        psycopg2.extras, "execute_values", lambda c, sql, values, page_size: written.extend(values)
    )
    return conn, written


def test_main_writes_one_value_per_municipality(monkeypatch):
    conn, written = _fake_db(monkeypatch, True, [(3550308, "SUINOS", 1e6), (3509502, "SUINOS", 0)])
    assert sync_co2_from_ghg.main() == 0
    assert {ibge for ibge, _ in written} == {"3550308", "3509502"}
    conn.commit.assert_called_once()


def test_main_declines_without_the_cp2b_table(monkeypatch):
    conn, written = _fake_db(monkeypatch, False, [])
    with pytest.raises(SystemExit):
        sync_co2_from_ghg.main()
    assert written == []
    conn.commit.assert_not_called()
