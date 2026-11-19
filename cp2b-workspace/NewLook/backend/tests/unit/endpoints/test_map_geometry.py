"""detail=map (migration 039): the map's outlines, simplified once per shared border.

A municipality the build script has not reached falls back to the ~550 m
geometry_detail, never to the full geometry (hundreds of MB nationally). A
database without the column serves geometry_detail for every row.
"""

from contextlib import contextmanager

from fastapi.testclient import TestClient

from app.api.v1.endpoints import municipalities
from app.api.v1.endpoints.municipalities import _GEOM_LOD, _geojson_select_sql
from app.main import app


def _coalesce(sql: str) -> list[str]:
    body = sql.split("COALESCE(", 1)[1].split(")", 1)[0]
    return [part.strip() for part in body.split(",") if part.strip()]


def test_map_level_reads_geometry_map():
    assert _GEOM_LOD["map"] == ("geometry_map", 5)


def test_map_select_falls_back_to_detail_before_the_full_geometry():
    sql = _geojson_select_sql(
        False, "geometry_map", 5, has_limit=False, geom_fallback="geometry_detail"
    )
    assert _coalesce(sql)[:3] == ["m.geometry_map", "m.geometry_detail", "m.geometry"]


def test_other_levels_keep_their_coalesce():
    sql = _geojson_select_sql(False, "geometry_overview", 4, has_limit=False)
    assert _coalesce(sql)[:2] == ["m.geometry_overview", "m.geometry"]


class _Cursor:
    """Answers the builder's statements; records them."""

    def __init__(self, has_map_column: bool):
        self.has_map_column = has_map_column
        self.statements: list[str] = []

    def execute(self, sql, params=None):
        self.statements.append(sql)

    def fetchone(self):
        last = self.statements[-1]
        if "information_schema.columns" in last:
            return (1,) if self.has_map_column else None
        return None  # no optional table deployed

    def fetchall(self):
        return []

    def close(self):
        pass


def _serve(monkeypatch, has_map_column: bool) -> _Cursor:
    cursor = _Cursor(has_map_column)

    class Conn:
        def cursor(self):
            return cursor

    @contextmanager
    def fake_db():
        yield Conn()

    monkeypatch.setattr(municipalities, "get_db", fake_db)
    return cursor


def _geojson_sql(cursor: _Cursor) -> str:
    return next(s for s in cursor.statements if "ST_AsGeoJSON" in s)


def test_builder_uses_geometry_map_when_the_column_exists(monkeypatch):
    cursor = _serve(monkeypatch, has_map_column=True)
    municipalities._build_municipalities_geojson(None, "map", "map")
    assert _coalesce(_geojson_sql(cursor))[:2] == ["m.geometry_map", "m.geometry_detail"]


def test_builder_without_the_column_serves_detail(monkeypatch):
    cursor = _serve(monkeypatch, has_map_column=False)
    municipalities._build_municipalities_geojson(None, "map", "map")
    sql = _geojson_sql(cursor)
    assert "geometry_map" not in sql
    assert _coalesce(sql)[0] == "m.geometry_detail"


def test_route_accepts_detail_map(monkeypatch):
    monkeypatch.setattr(
        municipalities,
        "_build_municipalities_geojson",
        lambda *a: {"type": "FeatureCollection", "features": []},
    )
    assert (
        TestClient(app).get("/api/v1/municipalities/geojson?fields=map&detail=map").status_code
        == 200
    )
    assert TestClient(app).get("/api/v1/municipalities/geojson?detail=nope").status_code == 422
