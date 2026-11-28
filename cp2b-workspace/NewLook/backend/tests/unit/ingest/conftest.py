"""Shared fakes for the ingest unit tests: a connection that records SQL."""

import pytest


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn

    @property
    def rowcount(self):
        return self.conn.rowcount

    def execute(self, sql, params=None):
        self.conn.executed.append((sql, params))

    def fetchone(self):
        self.conn.next_id += 1
        return (self.conn.next_id,)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConn:
    def __init__(self):
        self.executed: list[tuple[str, object]] = []
        self.next_id = 0
        self.commits = 0
        self.rollbacks = 0
        self.rowcount = -1  # what the next UPDATE reports; tests set it

    def cursor(self):
        return FakeCursor(self)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        pass


@pytest.fixture
def fake_conn(monkeypatch):
    conn = FakeConn()
    from ingest import ledger

    def record_batch(cur, sql, rows, page_size=1000):
        cur.conn.executed.append((sql, list(rows)))

    def record_values(cur, sql, rows, **kw):
        cur.conn.executed.append((sql, list(rows)))

    from ingest.sources.ibge_censo_situacao import source as situacao
    from ingest.sources.mapbiomas_cobertura import source as cobertura

    monkeypatch.setattr(ledger, "_execute_batch", record_batch)
    monkeypatch.setattr(cobertura, "_execute_values", record_values)
    monkeypatch.setattr(situacao, "_execute_values", record_values)
    return conn
