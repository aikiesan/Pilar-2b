"""Reads migration 040 and checks what it promises (the DB run is done by hand)."""

import re
from pathlib import Path

MIGRATION = (
    Path(__file__).resolve().parents[2] / "app" / "migrations" / "040_auth_access_requests.sql"
)


def _sql():
    return MIGRATION.read_text(encoding="utf-8")


def test_existing_accounts_become_approved_and_new_ones_wait_for_the_email():
    sql = _sql()
    add = re.search(r"ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'", sql)
    later = re.search(r"ALTER COLUMN status SET DEFAULT 'pending_email'", sql)
    assert add and later and add.start() < later.start()
    for value in ("pending_email", "pending_review", "approved", "rejected"):
        assert f"'{value}'" in sql


def test_safe_to_re_run_in_one_transaction():
    sql = _sql()
    assert "BEGIN;" in sql and "COMMIT;" in sql
    adds = re.findall(r"ADD COLUMN(?! IF NOT EXISTS)", sql)
    assert adds == []
    assert "CREATE TABLE IF NOT EXISTS auth_email_tokens" in sql
    assert sql.count("CREATE INDEX IF NOT EXISTS") == 2


def test_tokens_are_stored_as_hashes_and_go_with_the_account():
    sql = _sql()
    assert "token_hash  TEXT NOT NULL UNIQUE" in sql
    assert "REFERENCES auth_users(id) ON DELETE CASCADE" in sql
    assert "kind IN ('verify_email', 'reset_password')" in sql
