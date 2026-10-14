"""/municipalities/{ibge}/context: state rank on CP2b N4, neighbours, centroid.

The municipality page reads these around its own figures. Absent is not zero:
outside the CP2b view there is no rank and a neighbour's N4 is None, never 0.
"""

from contextlib import contextmanager

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import municipalities
from app.api.v1.endpoints.municipalities import _ALL_MUNICIPALITIES, build_context
from app.main import app

BASE = {
    "ibge_code": "3509502",
    "municipality_name": "Campinas",
    "centroid_lat": -22.9,
    "centroid_lng": -47.06,
}
NEIGHBOURS = [
    {"ibge_code": "3501608", "municipality_name": "Americana"},
    {"ibge_code": "3106200", "municipality_name": "Belo Horizonte"},
]


class FakeCursor:
    """Answers each statement of the endpoint by what it selects."""

    def __init__(self, base, neighbours, has_view, rank, n4_rows):
        self.base, self.neighbours, self.has_view = base, neighbours, has_view
        self.rank, self.n4_rows = rank, n4_rows
        self.statements: list[tuple[str, tuple]] = []

    def execute(self, sql, params=None):
        self.statements.append((sql, params))

    @property
    def _last(self):
        return self.statements[-1][0]

    def fetchone(self):
        if "information_schema" in self._last:
            return {"?column?": 1} if self.has_view else None
        if "rank()" in self._last:
            return self.rank
        return self.base

    def fetchall(self):
        if "ST_DWithin" in self._last:
            return self.neighbours
        return self.n4_rows

    def close(self):
        pass


@pytest.fixture
def serve(monkeypatch):
    def _serve(**kwargs):
        cursor = FakeCursor(**kwargs)

        class Conn:
            def cursor(self):
                return cursor

        @contextmanager
        def fake_db():
            yield Conn()

        monkeypatch.setattr(municipalities, "get_db", fake_db)
        return cursor

    return _serve


def test_shapes_rank_neighbours_and_centroid():
    out = build_context(
        "3509502",
        BASE,
        {"position": 3, "of_total": 645},
        NEIGHBOURS,
        {"3501608": 1_000.0},
    )
    assert out["rank_in_state"] == {"position": 3, "of": 645, "level": "n4"}
    assert out["centroid"] == {"lat": -22.9, "lng": -47.06}
    assert out["neighbours"][0] == {
        "ibge_code": "3501608",
        "name": "Americana",
        "ch4_cp2b_n4_m3_year": 1_000.0,
    }


def test_a_neighbour_outside_the_view_has_no_value_not_zero():
    out = build_context("3509502", BASE, None, NEIGHBOURS, {"3501608": 0.0})
    by_code = {n["ibge_code"]: n["ch4_cp2b_n4_m3_year"] for n in out["neighbours"]}
    # A served 0 is a modelled result and stays 0; a code the view lacks is None.
    assert by_code["3501608"] == 0.0
    assert by_code["3106200"] is None


def test_no_rank_and_no_centroid_when_not_served():
    out = build_context(
        "3106200", {**BASE, "centroid_lat": None, "centroid_lng": None}, None, [], {}
    )
    assert out["rank_in_state"] is None
    assert out["centroid"] is None
    assert out["neighbours"] == []


def test_endpoint_ranks_within_the_state(serve):
    cursor = serve(
        base=BASE,
        neighbours=NEIGHBOURS,
        has_view=True,
        rank={"position": 3, "of_total": 645},
        n4_rows=[{"ibge_code": 3501608, "ch4_cp2b_n4_m3_year": 1_000}],
    )
    response = TestClient(app).get("/api/v1/municipalities/3509502/context")
    assert response.status_code == 200
    body = response.json()
    assert body["rank_in_state"]["position"] == 3
    assert body["neighbours"][0]["ch4_cp2b_n4_m3_year"] == 1_000.0
    assert body["neighbours"][1]["ch4_cp2b_n4_m3_year"] is None
    rank_params = next(p for sql, p in cursor.statements if "rank()" in sql)
    # State = the first two IBGE digits.
    assert rank_params == (35, 3509502)


def test_endpoint_without_the_view_serves_no_rank(serve):
    serve(base=BASE, neighbours=[], has_view=False, rank=None, n4_rows=[])
    body = TestClient(app).get("/api/v1/municipalities/3509502/context").json()
    assert body["rank_in_state"] is None


def test_unknown_municipality_is_404(serve):
    serve(base=None, neighbours=[], has_view=True, rank=None, n4_rows=[])
    assert TestClient(app).get("/api/v1/municipalities/9999999/context").status_code == 404


def test_malformed_code_is_422_and_not_queried(serve):
    cursor = serve(base=BASE, neighbours=[], has_view=True, rank=None, n4_rows=[])
    assert TestClient(app).get("/api/v1/municipalities/campinas/context").status_code == 422
    assert cursor.statements == []


def test_names_can_return_every_municipality():
    # 5,571 municipalities; the frontend's A–Z index and slugs read them all.
    assert _ALL_MUNICIPALITIES >= 5571
