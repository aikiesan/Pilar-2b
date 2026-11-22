"""/municipalities/land-cover: MapBiomas Collection 11 land cover per municipality.

Signed-in only, eight groups in a fixed order, one year for every municipality
or every year for one. An empty table answers "not available", uncached, and
the cached answer is private, so no shared proxy keeps protected data.
"""

from contextlib import contextmanager
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import municipalities
from app.core import response_cache
from scripts.load_municipality_land_cover import GROUPS, group_of

YEARS = [1985, 2005, 2025]
# Ribeirão Preto 2025, hectares, from the loaded Collection 11.
RP_2025 = {
    "forest": 4788.8,
    "pasture": 1430.7,
    "cane": 29859.9,
    "crops": 3138.4,
    "silviculture": 9.6,
    "mosaic": 9725.9,
    "urban": 15722.7,
    "other": 417.8,
}


class _Cursor:
    """Answers the three queries the endpoint makes, from a small table."""

    def __init__(self, table):
        self.table = table  # [(ibge, year, group, ha)]
        self.rows = []

    def execute(self, sql, params=None):
        if "DISTINCT year" in sql:
            self.rows = [{"year": y} for y in sorted({r[1] for r in self.table})]
        elif "WHERE year" in sql:
            self.rows = [
                {"ibge_code": c, "group_key": g, "area_ha": a}
                for c, y, g, a in self.table
                if y == params[0]
            ]
        else:
            self.rows = [
                {"year": y, "group_key": g, "area_ha": a}
                for c, y, g, a in self.table
                if c == params[0]
            ]

    def fetchall(self):
        return self.rows

    def close(self):
        pass


def _table():
    rows = [("3543402", 2025, g, a) for g, a in RP_2025.items()]
    rows += [("3543402", y, g, 1.0) for y in (1985, 2005) for g in GROUPS]
    # A MG municipality with only two groups stored: the rest reads as zero.
    rows += [("3106200", 2025, "forest", 10.0), ("3106200", 2025, "urban", 5.0)]
    return rows


@pytest.fixture(autouse=True)
def _fresh_cache():
    response_cache._CACHE.clear()
    yield
    response_cache._CACHE.clear()


def _patch(monkeypatch, table, has_table=True):
    cursor = _Cursor(table)

    class _Conn:
        def cursor(self):
            return cursor

    @contextmanager
    def fake_db():
        yield _Conn()

    monkeypatch.setattr(municipalities, "get_db", fake_db)
    monkeypatch.setattr(municipalities, "_table_exists", lambda _c, _t: has_table)


@pytest.fixture
def signed_in(test_app):
    from app.middleware.auth import get_current_user
    from app.models.auth import UserProfile

    user = UserProfile(
        id="u",
        email="test@example.com",
        full_name="Test",
        role="autenticado",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )
    test_app.dependency_overrides[get_current_user] = lambda: user
    yield TestClient(test_app, base_url="http://testserver")
    test_app.dependency_overrides.clear()


URL = "/api/v1/municipalities/land-cover"


def test_refuses_a_visitor_without_a_session(client, monkeypatch):
    _patch(monkeypatch, _table())
    assert client.get(URL).status_code in (401, 403)
    assert client.get(URL, headers={"Authorization": "Bearer nope"}).status_code in (401, 403)


def test_refuses_a_visitante(test_app, monkeypatch):
    from app.middleware.auth import get_current_user
    from app.models.auth import UserProfile

    _patch(monkeypatch, _table())
    visitor = UserProfile(
        id="v",
        email="v@example.com",
        full_name="V",
        role="visitante",
        created_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
        updated_at=datetime(2025, 1, 1, tzinfo=timezone.utc),
    )
    test_app.dependency_overrides[get_current_user] = lambda: visitor
    try:
        assert TestClient(test_app).get(URL).status_code == 403
    finally:
        test_app.dependency_overrides.clear()


def test_one_year_for_every_municipality_in_group_order(signed_in, monkeypatch):
    _patch(monkeypatch, _table())
    res = signed_in.get(URL, params={"year": 2025})
    assert res.status_code == 200
    body = res.json()
    assert body["source"] == "MapBiomas Collection 11"
    assert body["unit"] == "ha"
    assert body["year"] == 2025
    assert body["years"] == YEARS
    assert body["groups"] == list(GROUPS)
    assert body["data"]["3543402"] == [RP_2025[g] for g in GROUPS]
    assert body["data"]["3106200"] == [10.0, 0, 0, 0, 0, 0, 5.0, 0]
    # Behind a login: the browser may keep it, a shared proxy must not.
    assert res.headers["cache-control"].startswith("private")


def test_one_municipality_for_every_year(signed_in, monkeypatch):
    _patch(monkeypatch, _table())
    body = signed_in.get(URL, params={"ibge": "3543402"}).json()
    assert body["ibge"] == "3543402"
    assert sorted(body["years"]) == ["1985", "2005", "2025"]
    assert body["years"]["2025"] == [RP_2025[g] for g in GROUPS]


@pytest.mark.parametrize(
    "params, status",
    [({"year": 1990}, 400), ({"ibge": "123"}, 400), ({"ibge": "9999999"}, 404)],
)
def test_refuses_what_is_not_loaded(signed_in, monkeypatch, params, status):
    _patch(monkeypatch, _table())
    assert signed_in.get(URL, params=params).status_code == status


def test_says_not_available_without_data_and_does_not_cache_it(signed_in, monkeypatch):
    _patch(monkeypatch, [], has_table=False)
    res = signed_in.get(URL)
    assert res.json() == {"available": False}
    assert res.headers["cache-control"] == "no-store"
    assert not response_cache._CACHE


# ── The loader's grouping ────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "l1, l2, l4, expected",
    [
        ("1. Forest", "Forest Formation", "Forest Formation", "forest"),
        ("2. Non Forest Natural Formation", "Grassland", "Grassland", "forest"),
        ("3. Farming", "Pasture", "Pasture", "pasture"),
        ("3. Farming", "Agriculture", "Sugar cane", "cane"),
        ("3. Farming", "Agriculture", "Sugar Cane", "cane"),
        ("3. Farming", "Agriculture", "Soybean", "crops"),
        ("3. Farming", "Forest Plantation", "Forest Plantation", "silviculture"),
        ("3. Farming", "Mosaic of Uses", "Mosaic of Uses", "mosaic"),
        ("4. Non vegetated area", "Urban Area", "Urban Area", "urban"),
        ("4. Non vegetated area", "Mining", "Mining", "other"),
        ("5. Water", "River, Lake and Ocean", "River, Lake and Ocean", "other"),
        (None, None, None, "other"),
    ],
)
def test_groups_each_class(l1, l2, l4, expected):
    assert group_of(l1, l2, l4) == expected
