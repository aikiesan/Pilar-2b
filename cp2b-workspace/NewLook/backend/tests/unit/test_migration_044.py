"""Reads migration 044 and checks what it promises (the DB run is done by hand)."""

from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[2] / "app" / "migrations" / "044_land_cover_soy_ingest.sql"
)


def test_allows_soy_and_other_ufs():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "DROP CONSTRAINT IF EXISTS municipality_land_cover_uf" in sql
    assert "DROP CONSTRAINT IF EXISTS municipality_land_cover_group" in sql
    assert "'soy'" in sql
    for group in ("forest", "pasture", "cane", "crops", "silviculture", "mosaic", "urban", "other"):
        assert f"'{group}'" in sql


def test_links_rows_to_the_ingest_ledger():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert (
        "ADD COLUMN IF NOT EXISTS ingest_run_id INTEGER REFERENCES staging.ingest_runs(id)" in sql
    )


def test_is_rerunnable_and_atomic():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "BEGIN" in sql and "COMMIT" in sql
    assert "ADD CONSTRAINT municipality_land_cover_group" in sql


def test_timeseries_accepts_the_1970_and_1980_censuses():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "DROP CONSTRAINT IF EXISTS municipality_timeseries_year_check" in sql
    assert "CHECK (year BETWEEN 1970 AND 2100)" in sql
