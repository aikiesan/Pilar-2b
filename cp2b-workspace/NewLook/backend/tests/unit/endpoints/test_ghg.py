"""GHG endpoints: validation, the per-substrate default baselines, and degradation."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_parameters_serve_the_yaml_options(client):
    body = client.get("/api/v1/ghg/parameters").json()
    assert body["gwp_ch4"]["padrao"] == "AR6"
    assert "lagoa_anaerobia" in body["linhas_de_base"]
    assert "membranas" in body["emissoes_projeto"]["slip"]


def test_estimate_reports_the_three_parts_and_the_gwp(client):
    r = client.post(
        "/api/v1/ghg/estimate",
        json={"ch4_produced_nm3_year": 1e6, "baseline": "lagoa_anaerobia"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["gwp_version"] == "AR6"
    assert body["er_net_t"] == pytest.approx(
        body["be_methane_t"] + body["be_fossil_t"] - body["pe_total_t"]
    )
    assert "não crédito" in body["note"]
    assert "linhas_de_base.lagoa_anaerobia" in body["unverified"]


@pytest.mark.parametrize(
    "payload",
    [
        {"ch4_produced_nm3_year": -1},
        {"ch4_produced_nm3_year": 1, "leak": 2},
        {"ch4_produced_nm3_year": 1, "baseline": "nope"},
        {"ch4_produced_nm3_year": 1, "gwp_version": "AR4"},
    ],
)
def test_estimate_rejects_bad_input(client, payload):
    assert client.post("/api/v1/ghg/estimate", json=payload).status_code == 422


def test_municipality_code_is_validated(client):
    assert client.get("/api/v1/ghg/municipalities/35abc").status_code == 422
    assert client.get("/api/v1/ghg/municipalities/3550308?level=n1").status_code == 422


def test_municipality_is_503_before_the_cp2b_migration(client, mock_db_connection):
    _, cursor = mock_db_connection
    cursor.fetchone.return_value = None
    assert client.get("/api/v1/ghg/municipalities/3550308").status_code == 503


def test_municipality_applies_each_substrate_default_baseline(client, mock_db_connection):
    _, cursor = mock_db_connection
    cursor.fetchone.return_value = {"?column?": 1}
    cursor.fetchall.return_value = [
        {"substrate": "SUINOS", "residue": "swine", "sector": "livestock", "ch4": 1e6},
        {"substrate": "PALHA", "residue": "sugarcane", "sector": "agricultural", "ch4": 1e6},
    ]
    r = client.get("/api/v1/ghg/municipalities/3550308")
    assert r.status_code == 200
    body = r.json()
    by = {s["substrate"]: s for s in body["substrates"]}
    assert by["SUINOS"]["baseline"] == "lagoa_anaerobia"
    assert by["PALHA"]["be_methane_t"] == 0
    assert body["substrates"][0]["substrate"] == "SUINOS"  # ordered by net reduction
    assert body["totals"]["er_net_t"] == pytest.approx(sum(s["er_net_t"] for s in by.values()))
    assert (body["level"], body["scenario"], body["gwp_version"]) == ("n3", "med", "AR6")
