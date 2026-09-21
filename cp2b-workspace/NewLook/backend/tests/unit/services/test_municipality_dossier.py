"""Guards on how the dossier gatherer talks to the database.

Both bugs these cover shipped in #219 and survived until the export was wired to
an HTTP route, because the module had no tests at all (0% coverage) — the export
suite exercises the renderers with fixture dicts and never calls `collect`.
"""

import psycopg2
import pytest

from app.services import municipality_dossier as dossier


class FakeCursor:
    """Records SQL and returns tuple rows, like psycopg2's default cursor."""

    def __init__(self, rows, description):
        self.rows = rows
        self.description = description
        self.statements = []

    def execute(self, sql, params=None):
        self.statements.append((" ".join(sql.split()), params))

    def fetchall(self):
        return self.rows

    def fetchone(self):
        return self.rows[0] if self.rows else None

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConnection:
    """Mimics a pooled connection: dict cursors unless a factory is demanded."""

    def __init__(self, cursor):
        self._cursor = cursor
        self.requested_factories = []

    def cursor(self, cursor_factory=None):
        self.requested_factories.append(cursor_factory)
        return self._cursor


def test_cursor_pins_the_tuple_factory():
    """The module indexes rows positionally, so it must not inherit RealDictCursor.

    app.core.database.get_db() builds its pool with cursor_factory=RealDictCursor.
    Inheriting that made `row[0]` raise KeyError, and made `identity` silently
    return column names as values, because dict(zip(cols, row)) iterates a
    RealDictRow's keys.
    """
    conn = FakeConnection(FakeCursor([], []))
    with dossier._cursor(conn):
        pass
    assert conn.requested_factories == [psycopg2.extensions.cursor]


def test_rows_drops_geometry_blobs():
    description = [("ibge_code",), ("municipality_name",), ("geometry",), ("centroid",)]
    cur = FakeCursor([("3526803", "Lençóis Paulista", b"wkb", b"wkb")], description)

    rows = dossier._rows(cur, "municipalities", "ibge_code", "3526803")

    assert rows == [{"ibge_code": "3526803", "municipality_name": "Lençóis Paulista"}]
    assert not dossier.GEOMETRY_COLUMNS & set(rows[0])


def test_validation_plants_is_reached_through_the_name():
    """validation_plants has no ibge_code and its municipality_id is NULL on every row.

    Keying it like the other sections produced UndefinedColumn for every
    municipality, so the exporter had never completed a single run.
    """
    assert "validation_plants" in dossier.NAME_KEYED

    cur = FakeCursor([], [])
    dossier._rows(cur, "validation_plants", "ibge_code", "3526803")
    sql, params = cur.statements[0]

    assert "JOIN municipalities" in sql
    assert "m.ibge_code::text = %s" in sql
    assert "ibge_code::text = %s" not in sql.split("JOIN")[0], "must not key the table itself"
    assert params == ("3526803",)


@pytest.mark.parametrize("name,table,key", dossier.SECTIONS)
def test_every_section_is_keyed_somehow(name, table, key):
    """A section is either keyed on its own column or declared name-keyed."""
    assert key == "ibge_code" or table in dossier.NAME_KEYED, f"{table} has no usable key"
