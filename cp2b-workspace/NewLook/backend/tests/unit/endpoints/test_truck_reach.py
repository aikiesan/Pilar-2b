"""Truck reach: the stored routes, their endpoints, the build and the loader.

/truck-reach/sites is public; /truck-reach/{site_id} is signed-in only, 404 for
an unknown site, and private in the browser. The build routes town -> site on
the transposed graph and site -> pipeline on the forward one, so a one-way
road counts only in its own direction.
"""

import gzip
import importlib.util
import json
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import truck_reach
from app.core import response_cache

SCRIPTS = Path(__file__).resolve().parents[3] / "scripts"


def _load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build = _load("build_truck_reach")
loader = _load("load_truck_reach")

BUILT = datetime(2026, 11, 22, 20, 28, 51, tzinfo=timezone.utc)
SITE = {
    "site_id": "ITB_SP_0005",
    "name": "Usina São Martinho",
    "tipo": "etanol",
    "ibge_code": "3540903",
    "municipio": "Pradópolis",
    "at_town_centre": True,
    "lon": -48.0667,
    "lat": -21.3574,
    "snap_m": 60,
}
TOWNS = [
    {"ibge_code": "3540903", "name": "Pradópolis", "minutes": 0.0, "km": 0.0},
    {"ibge_code": "3514601", "name": "Dumont", "minutes": 18.1, "km": 17.1},
    {"ibge_code": "3518602", "name": "Guariba", "minutes": 23.9, "km": 23.2},
]
TREE = [-48.0667, -21.3574, -48.07, -21.36, 0.0, 1.2]
PIPELINE = {"lon": -48.31, "lat": -21.72, "kind": "distribution", "minutes": 61.8, "km": 71.1}


class _Cursor:
    """Answers the endpoint's queries from one stored site."""

    def __init__(self, loaded=True):
        self.loaded = loaded
        self.row = None
        self.rows = []

    def execute(self, sql, params=None):
        if "to_regclass" in sql or "EXISTS" in sql:
            self.row = {"ok": self.loaded}
        elif "SELECT built_at FROM truck_build" in sql:
            self.row = {"built_at": BUILT}
        elif "FROM truck_site ORDER BY" in sql:
            self.rows = [{k: SITE[k] for k in SITE if k != "snap_m"}]
        elif "JOIN truck_route" in sql:
            found = params[0] == SITE["site_id"]
            self.row = (
                {
                    **SITE,
                    "tree": TREE,
                    "pipeline": PIPELINE,
                    "built_at": BUILT,
                    "graph_source": "OpenStreetMap contributors",
                }
                if found
                else None
            )
        elif "FROM truck_reach" in sql:
            self.rows = TOWNS
        elif "FROM truck_build" in sql:
            self.row = {
                "caps": build.TRUCK_CAPS,
                "other_cap": 30.0,
                "town_limit_min": 90.0,
                "pipeline_limit_min": 180.0,
                "grid_m": 250.0,
            }
        else:
            raise AssertionError(f"unexpected query: {sql}")

    def fetchone(self):
        return self.row

    def fetchall(self):
        return self.rows

    def close(self):
        pass


@pytest.fixture(autouse=True)
def _fresh_cache():
    response_cache._CACHE.clear()
    yield
    response_cache._CACHE.clear()


def _patch(monkeypatch, loaded=True):
    class _Conn:
        def cursor(self):
            return _Cursor(loaded)

    @contextmanager
    def fake_db():
        yield _Conn()

    monkeypatch.setattr(truck_reach, "get_db", fake_db)


def _user(role):
    from app.models.auth import UserProfile

    return UserProfile(
        id=role,
        email=f"{role}@example.com",
        full_name=role,
        role=role,
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )


@pytest.fixture
def signed_in(test_app):
    from app.middleware.auth import get_current_user

    test_app.dependency_overrides[get_current_user] = lambda: _user("autenticado")
    yield TestClient(test_app, base_url="http://testserver")
    test_app.dependency_overrides.clear()


URL = "/api/v1/truck-reach"


def test_sites_are_public(client, monkeypatch):
    _patch(monkeypatch)
    res = client.get(f"{URL}/sites")
    assert res.status_code == 200
    body = res.json()
    assert body["available"] is True
    assert body["built_at"] == BUILT.isoformat()
    assert body["sites"] == [
        {k: SITE[k] for k in SITE if k != "snap_m"},
    ]


def test_a_site_needs_a_session(client, monkeypatch):
    _patch(monkeypatch)
    assert client.get(f"{URL}/ITB_SP_0005").status_code in (401, 403)
    res = client.get(f"{URL}/ITB_SP_0005", headers={"Authorization": "Bearer nope"})
    assert res.status_code in (401, 403)


def test_a_site_refuses_a_visitante(test_app, monkeypatch):
    from app.middleware.auth import get_current_user

    _patch(monkeypatch)
    test_app.dependency_overrides[get_current_user] = lambda: _user("visitante")
    try:
        assert TestClient(test_app).get(f"{URL}/ITB_SP_0005").status_code == 403
    finally:
        test_app.dependency_overrides.clear()


def test_one_site_in_full(signed_in, monkeypatch):
    _patch(monkeypatch)
    res = signed_in.get(f"{URL}/ITB_SP_0005")
    assert res.status_code == 200
    body = res.json()
    assert body["site"] == SITE
    assert len(body["towns"]) == 3
    assert body["towns"][1] == {
        "ibge_code": "3514601",
        "name": "Dumont",
        "minutes": 18.1,
        "km": 17.1,
    }
    assert body["tree"] == TREE
    assert body["pipeline"] == PIPELINE
    assert body["caps"]["motorway"] == 80
    assert body["town_limit_min"] == 90.0
    # Behind a login: the browser may keep it, a shared proxy must not, and
    # it never takes a slot in the shared in-process cache.
    assert res.headers["cache-control"].startswith("private")
    assert not response_cache._CACHE
    again = signed_in.get(f"{URL}/ITB_SP_0005", headers={"If-None-Match": res.headers["etag"]})
    assert again.status_code == 304


def test_unknown_and_malformed_sites(signed_in, monkeypatch):
    _patch(monkeypatch)
    assert signed_in.get(f"{URL}/ITB_SP_9999").status_code == 404
    assert signed_in.get(f"{URL}/not%20a%20site").status_code == 400


def test_not_available_before_loading(signed_in, monkeypatch):
    _patch(monkeypatch, loaded=False)
    for path in ("sites", "ITB_SP_0005"):
        res = signed_in.get(f"{URL}/{path}")
        assert res.json() == {"available": False}
        assert res.headers["cache-control"] == "no-store"
    assert not response_cache._CACHE


# ── The build ────────────────────────────────────────────────────────────────


def test_truck_minutes_never_beat_the_class_cap():
    # 1 km of motorway the graph says takes 0.5 min: a truck at 80 km/h takes 0.75.
    # 1 km of residential street at 3 min: slower than the 25 km/h cap, kept.
    # 1 km of an unknown class: 30 km/h, 2 min.
    got = build.truck_minutes([0.5, 3.0, 0.1], [1000, 1000, 1000], ["motorway", "residential", "x"])
    assert got == pytest.approx([0.75, 3.0, 2.0])


def test_arcs_keep_one_way_roads_and_the_faster_parallel_edge():
    u = np.array([0, 1, 0])
    v = np.array([1, 2, 1])
    minutes = np.array([5.0, 2.0, 3.0])
    length = np.array([500.0, 200.0, 300.0])
    one_way = np.array([True, False, True])
    a, b, t, m = build.directed_arcs(u, v, minutes, length, one_way)
    arcs = {(int(x), int(y)): (float(tt), float(mm)) for x, y, tt, mm in zip(a, b, t, m)}
    assert arcs == {(0, 1): (3.0, 300.0), (1, 2): (2.0, 200.0), (2, 1): (2.0, 200.0)}


def _line_graph():
    """Town (node 0) - site (node 2) - pipeline (node 4), on a straight road.

    0 -> 1 is one-way toward the site, so a truck can bring residues from the
    town but cannot drive back the same way. 1 - 2, 2 - 3 and 3 - 4 are two-way.
    """
    lon = np.array([0.00, 0.01, 0.02, 0.03, 0.04])
    lat = np.zeros(5)
    u, v = np.array([0, 1, 2, 3]), np.array([1, 2, 3, 4])
    minutes = np.array([1.0, 2.0, 3.0, 4.0])
    length = np.array([1000.0, 1000.0, 1000.0, 1000.0])
    one_way = np.array([True, False, False, False])
    a, b, t, m = build.directed_arcs(u, v, minutes, length, one_way)
    return build.Graph(lon, lat, a, b, t, m, np.ones(5, dtype=bool))


def test_town_routes_run_toward_the_site_and_the_pipeline_away_from_it():
    graph = _line_graph()
    pipe_nodes = np.array([4])
    towns, tree, pipeline = build.build_site(
        graph, 2, {"3500001": 0}, pipe_nodes, {4: (0.04, 0.0, "transport")}
    )
    # Town -> site uses the one-way 0 -> 1: 1 + 2 minutes, 2 km.
    assert towns == [["3500001", 3.0, 2.0]]
    # Tree arcs run from the site out: [lon near, lat near, lon far, lat far, t near, t far].
    segs = np.array(tree).reshape(-1, 6)
    assert sorted(map(tuple, segs[:, 4:].tolist())) == [(0.0, 2.0), (2.0, 3.0)]
    assert pipeline["minutes"] == 7.0 and pipeline["km"] == 2.0
    assert pipeline["kind"] == "transport"


def test_a_town_behind_a_one_way_road_pointing_away_is_not_reached():
    graph = _line_graph()
    # Site at node 0, town at node 2: the only way in is 1 -> 0, against the
    # one-way 0 -> 1. The forward graph would wrongly find 0 -> 1 -> 2.
    towns, tree, _ = build.build_site(graph, 0, {"3500002": 2}, np.array([], dtype=np.int64), {})
    assert towns == [] and tree == []


def test_at_town_centre():
    towns = {"3540903": ("Pradópolis", -48.0667, -21.3574)}
    site = {"ibge_code": "3540903", "lon": -48.0667, "lat": -21.3574}
    assert build.at_town_centre(site, towns)
    assert not build.at_town_centre({**site, "lon": -48.03}, towns)  # about 3.9 km east
    assert not build.at_town_centre({**site, "ibge_code": "3500000"}, towns)


def test_closed_landfills_are_left_out(tmp_path):
    def feature(pid, situacao=None):
        props = {
            "plant_id": pid,
            "nome_curto": pid,
            "cod_ibge": 3500001,
            "municipio": "X",
            "tipo": "aterro",
            "pot": [1, 2, 3],  # a model result: must not come through
        }
        if situacao:
            props["aterro"] = {"situacao": situacao}
        return {"geometry": {"coordinates": [-47.0, -22.0]}, "properties": props}

    path = tmp_path / "unidades.geojson"
    path.write_text(
        json.dumps(
            {
                "features": [
                    feature("A", "em_uso"),
                    feature("B", "encerrado"),
                    feature("C", "encerrado_ou_sem_aterro_em_uso"),
                    feature("D"),
                ]
            }
        ),
        encoding="utf-8",
    )
    sites, closed = build.read_sites(path)
    assert [s["site_id"] for s in sites] == ["A", "D"]
    assert closed == ["B", "C"]
    assert set(sites[0]) == {"site_id", "name", "tipo", "ibge_code", "municipio", "lon", "lat"}


# ── The loader ───────────────────────────────────────────────────────────────


def _build_file(tmp_path, **override):
    data = {
        "meta": {"built_at": BUILT.isoformat(), "graph_source": "OSM"},
        "sites": [{**SITE, "ch4_nm3d": 123}],
        "reach": [["ITB_SP_0005", "3540903", 0.0, 0.0]],
        "routes": {"ITB_SP_0005": {"tree": TREE, "pipeline": None}},
        **override,
    }
    path = tmp_path / "truck_reach.json.gz"
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump(data, fh)
    return path


def test_loader_takes_only_the_public_site_fields(tmp_path):
    data = loader.read_build(_build_file(tmp_path))
    (row,) = loader.site_rows(data)
    assert row == tuple(SITE[k] for k in loader.SITE_FIELDS)
    assert 123 not in row


def test_loader_refuses_a_file_that_is_not_a_build(tmp_path):
    with pytest.raises(SystemExit, match="no route"):
        loader.read_build(_build_file(tmp_path, routes={}))
    path = tmp_path / "other.json.gz"
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump({"sites": []}, fh)
    with pytest.raises(SystemExit, match="meta"):
        loader.read_build(path)
