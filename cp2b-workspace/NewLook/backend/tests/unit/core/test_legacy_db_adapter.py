"""
Tests for the legacy DB compatibility adapter (technology_routes bridge).

Pure unit tests — no real DB — validating the risky part: SQLAlchemy ``:name`` →
psycopg2 ``%(name)s`` conversion, and that the adapter delegates correctly.
"""
import pytest

from app.core.legacy_db_adapter import LegacyDBAdapter, text, to_pyformat


class TestToPyformat:
    def test_single_named_param(self):
        assert to_pyformat("WHERE id = :tech_id") == "WHERE id = %(tech_id)s"

    def test_multiple_named_params(self):
        assert to_pyformat("VALUES (:id, :name)") == "VALUES (%(id)s, %(name)s)"

    def test_leaves_double_colon_casts_untouched(self):
        assert to_pyformat("SELECT NULL::text AS doi") == "SELECT NULL::text AS doi"

    def test_cast_and_param_together(self):
        assert to_pyformat("x = :val::text") == "x = %(val)s::text"

    def test_does_not_touch_word_colon(self):
        # e.g. a time literal '12:30' must not become a param
        assert to_pyformat("'12:30:00'") == "'12:30:00'"

    def test_no_params_passthrough(self):
        q = "SELECT 1 FROM technology_cards"
        assert to_pyformat(q) == q


class TestText:
    def test_text_is_identity(self):
        assert text("SELECT :x") == "SELECT :x"


class _FakeCursor:
    def __init__(self):
        self.executed = []
        self._row = {"id": "abc"}

    def execute(self, query, params):
        self.executed.append((query, params))

    def fetchone(self):
        return self._row


class _FakeConn:
    def __init__(self):
        self._cursor = _FakeCursor()
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return self._cursor

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class TestLegacyDBAdapter:
    def test_execute_converts_params_and_returns_cursor(self):
        conn = _FakeConn()
        db = LegacyDBAdapter(conn)
        cur = db.execute("SELECT * FROM t WHERE id = :tid", {"tid": "abc"})
        assert conn._cursor.executed == [("SELECT * FROM t WHERE id = %(tid)s", {"tid": "abc"})]
        assert cur.fetchone() == {"id": "abc"}

    def test_execute_defaults_params_to_empty_dict(self):
        conn = _FakeConn()
        LegacyDBAdapter(conn).execute("SELECT 1")
        assert conn._cursor.executed[0][1] == {}

    def test_commit_and_rollback_delegate(self):
        conn = _FakeConn()
        db = LegacyDBAdapter(conn)
        db.commit()
        db.rollback()
        assert conn.committed and conn.rolled_back


if __name__ == "__main__":
    raise SystemExit(pytest.main([__file__, "-v"]))
