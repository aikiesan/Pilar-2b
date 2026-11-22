"""/municipalities/siting-indicators: plants and pipeline distance per municipality.

The map's two infrastructure analyses read these. A missing distance stays
null (a gap, never zero), and a database without infrastructure_features
answers "not available" instead of an error.
"""

from contextlib import contextmanager

from app.api.v1.endpoints import municipalities


class _Cursor:
    def __init__(self, rows, has_table=True):
        self.rows = rows
        self.has_table = has_table
        self.params = None
        self.closed = False

    def execute(self, sql, params=None):
        self.params = params

    def fetchall(self):
        return self.rows

    def close(self):
        self.closed = True


def _patch(monkeypatch, cursor):
    class _Conn:
        def cursor(self):
            return cursor

    @contextmanager
    def fake_db():
        yield _Conn()

    monkeypatch.setattr(municipalities, "get_db", fake_db)
    monkeypatch.setattr(municipalities, "_table_exists", lambda _c, _t: cursor.has_table)


def test_maps_rows_by_code_keeping_gaps_null(monkeypatch):
    cursor = _Cursor(
        [
            {"ibge_code": "3509502", "biogas_plants": 0, "pipeline_km": 2.84},
            {"ibge_code": 3100104, "biogas_plants": 2, "pipeline_km": None},
        ]
    )
    _patch(monkeypatch, cursor)

    out = municipalities._build_siting_indicators()

    assert out["available"] is True
    assert out["indicators"]["3509502"] == {"biogas_plants": 0, "pipeline_km": 2.8}
    assert out["indicators"]["3100104"] == {"biogas_plants": 2, "pipeline_km": None}
    # Only transport and distribution pipelines: a plant cannot inject into outflow lines.
    assert cursor.params["pipes"] == ["gas_pipeline_transport", "gas_pipeline_distribution"]


def test_says_not_available_without_the_infrastructure_table(monkeypatch):
    cursor = _Cursor([], has_table=False)
    _patch(monkeypatch, cursor)
    assert municipalities._build_siting_indicators() == {"available": False, "indicators": {}}
    # The early return still closes the cursor.
    assert cursor.closed is True


def test_route_does_not_cache_not_available(monkeypatch):
    calls = []

    def fake_cached(_request, _key, build, ttl):
        calls.append(ttl)
        return build()

    monkeypatch.setattr(municipalities, "cached_json_response", fake_cached)
    _patch(monkeypatch, _Cursor([], has_table=False))
    response = municipalities.get_siting_indicators(request=None)
    assert response.headers["cache-control"] == "no-store"
    assert response.body == b'{"available":false,"indicators":{}}'
