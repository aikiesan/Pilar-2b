"""Reads migration 043 and checks what it promises (the DB run is done by hand)."""

import re
from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "app"
    / "migrations"
    / "043_analysis_registry.sql"
)

TABLES = (
    "analyses",
    "analysis_values",
    "analysis_classes",
    "analysis_breaks",
    "analysis_grants",
)


def test_remaps_old_scale_in_one_transaction():
    sql = MIGRATION.read_text(encoding="utf-8")
    assert "BEGIN" in sql and "COMMIT" in sql
    assert "BETWEEN 0 AND 3" in sql
    to_internal = re.search(
        r"SET clearance\s*=\s*3\s+WHERE role IN \('admin',\s*'interno'\) OR clearance >= 1",
        sql,
    )
    to_registered = re.search(r"SET clearance\s*=\s*1\s+WHERE clearance = 0 AND is_active", sql)
    assert to_internal and to_registered
    # Order matters: read the old scale first, then shift 0 -> 1
    assert to_internal.start() < to_registered.start()


def test_remap_runs_only_while_old_check_is_in_place():
    sql = MIGRATION.read_text(encoding="utf-8")
    guard = re.search(r"pg_constraint", sql)
    assert guard, "remap must look up the existing CHECK"
    assert re.search(r"DO \$\$", sql)
    # Both UPDATEs sit after the guard lookup, inside the DO block
    assert guard.start() < sql.index("SET clearance = 3")
    assert sql.index("SET clearance = 3") < sql.index("SET clearance = 1")
    assert sql.index("SET clearance = 1") < sql.index("BETWEEN 0 AND 3")


def test_registry_tables_and_cascades():
    sql = MIGRATION.read_text(encoding="utf-8")
    for table in TABLES:
        assert f"CREATE TABLE IF NOT EXISTS {table}" in sql
    assert sql.count("ON DELETE CASCADE") >= 5
    assert "ON DELETE SET NULL" in sql
    assert "idx_analysis_grants_user" in sql
