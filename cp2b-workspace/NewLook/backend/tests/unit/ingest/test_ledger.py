"""The promote ledger (staging.ingest_runs) and the long-table upsert."""

import pandas as pd

from ingest.gates import frame_checksum
from ingest.ledger import record_run, upsert_timeseries


def test_record_run_uses_frame_checksum_and_upserts(fake_conn):
    df = pd.DataFrame({"ibge_code": ["3521705"], "v": [1.0]})
    run_id = record_run(fake_conn, "ibge_censo_idade", 2022, df, True, "r.md")
    sql, params = fake_conn.executed[0]
    assert "staging.ingest_runs" in sql
    assert "ON CONFLICT (source_id, reference_year, frame_checksum)" in sql
    assert params[0] == "ibge_censo_idade" and params[1] == 2022
    assert params[2] == frame_checksum(df)
    assert run_id == 1


def test_upsert_timeseries_binds_run_and_quality(fake_conn):
    n = upsert_timeseries(
        fake_conn,
        [
            {
                "ibge_code": "3521705",
                "year": 2022,
                "source_id": "s",
                "variable": "v",
                "value": 1.0,
                "unit": "pessoas",
            }
        ],
        7,
    )
    sql, rows = fake_conn.executed[0]
    assert "ON CONFLICT (ibge_code, year, source_id, variable)" in sql
    assert rows[0]["ingest_run_id"] == 7 and rows[0]["quality"] == "measured"
    assert n == 1


def test_upsert_timeseries_empty_writes_nothing(fake_conn):
    assert upsert_timeseries(fake_conn, [], 7) == 0
    assert fake_conn.executed == []
