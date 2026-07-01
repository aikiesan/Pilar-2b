"""
Legacy DB compatibility adapter (temporary bridge).

`app/routers/technology_routes.py` was half-migrated to a SQLAlchemy-style
``db.execute(text(q), {..})`` API with ``:named`` parameters, while the rest of
the project uses the psycopg2 connection pool. As a result its CRUD endpoints
referenced an undefined ``db``/``text`` and crashed at runtime (NameError).

This module restores them with a minimal, uniform change: a FastAPI dependency
that yields an adapter exposing ``.execute()/.commit()/.rollback()`` on a pooled
psycopg2 connection, transparently converting ``:name`` → ``%(name)s``.

TODO: migrate those endpoints to native ``get_db()`` / ``get_db_transaction()``
and delete this shim. Kept small and self-contained on purpose.
"""
import re

# Match ":name" SQLAlchemy params but NOT "::type" casts or "word:token"
# (negative lookbehind excludes a preceding ':' or word char).
_NAMED_PARAM = re.compile(r"(?<![:\w]):(\w+)")


def to_pyformat(query: str) -> str:
    """Convert SQLAlchemy ``:name`` params to psycopg2 ``%(name)s``.

    Leaves PostgreSQL ``::type`` casts and time/array-slice colons untouched.
    """
    return _NAMED_PARAM.sub(r"%(\1)s", query)


def text(query: str) -> str:
    """No-op stand-in for SQLAlchemy's ``text()`` — psycopg2 needs no wrapper.

    Kept so legacy call sites ``db.execute(text(q), ...)`` remain unchanged.
    """
    return query


class LegacyDBAdapter:
    """Adapts ``db.execute(...).fetchone()`` + ``db.commit()/rollback()`` onto a
    single psycopg2 cursor/connection (RealDictCursor from the pool → dict rows)."""

    def __init__(self, conn):
        self._conn = conn
        self._cursor = conn.cursor()

    def execute(self, query, params=None):
        self._cursor.execute(to_pyformat(query), params or {})
        return self._cursor  # exposes fetchone/fetchall/rowcount

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()


def get_legacy_db():
    """FastAPI dependency: yield a LegacyDBAdapter backed by a pooled connection."""
    from app.core.database import get_connection_pool  # lazy: keep import light

    pool = get_connection_pool()
    conn = pool.getconn()
    try:
        conn.set_client_encoding("UTF8")
        yield LegacyDBAdapter(conn)
    finally:
        try:
            conn.commit()
        except Exception:
            pass
        pool.putconn(conn)
