"""Registry of data sources (fontes_dados.yaml) and GET /api/v1/sources."""

import json
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import data_sources as S
from app.services.canonical_loader import load_data_sources

NEWLOOK = Path(__file__).resolve().parents[4]
MAP_COMPONENT = NEWLOOK / "frontend" / "src" / "components" / "map" / "MapComponent.tsx"
MAP_SCOPE = NEWLOOK / "frontend" / "src" / "lib" / "mapScope.ts"
METADATA = NEWLOOK / "docs" / "data" / "METADATA.json"


def test_every_source_is_complete_or_says_what_is_missing():
    registry = load_data_sources()
    cat = S.catalog(registry)
    assert set(cat["sources"]) == set(registry["fontes"])
    cited = {k for keys in [*cat["layers"].values(), *cat["pages"].values()] for k in keys}
    # Every registered source is cited somewhere, so the registry holds no dead entry.
    assert cited == set(cat["sources"])
    for key, s in cat["sources"].items():
        assert s["title"] and 0 < len(s["short"]) <= 32, key
        if s["date"] is not None:
            assert s["date"][:4].isdigit(), key
        if s["url"] is not None:
            assert s["url"].startswith("https://"), key
        if s["publisher"] is None or s["date"] is None:
            assert s["to_check"], key


def test_a_source_without_a_link_must_say_why():
    registry = {"fontes": {"x": {"titulo": "X", "curta": "X", "tipo": "dados"}}}
    with pytest.raises(ValueError, match="no link"):
        S.resolve(registry, "x")
    registry["fontes"]["x"]["tipo"] = "estimativa"
    assert S.resolve(registry, "x")["url"] is None


def test_unknown_keys_and_kinds_are_refused():
    registry = {
        "versao": "1",
        "fontes": {"x": {"titulo": "X", "curta": "X", "tipo": "boato", "url": "https://a"}},
        "camadas": {},
        "paginas": {},
    }
    with pytest.raises(ValueError, match="unknown kind"):
        S.catalog(registry)
    registry["fontes"]["x"]["tipo"] = "dados"
    registry["camadas"]["layer"] = ["y"]
    with pytest.raises(ValueError, match="unknown sources"):
        S.catalog(registry)


def test_every_infrastructure_layer_the_loader_writes_has_a_source():
    from scripts.load_infrastructure_layers import LAYERS

    assert set(LAYERS) <= set(load_data_sources()["camadas"])


@pytest.mark.skipif(not MAP_COMPONENT.exists(), reason="frontend not checked out")
def test_every_map_layer_has_a_source():
    text = MAP_COMPONENT.read_text(encoding="utf-8")
    block = text.split("const INITIAL_LAYERS", 1)[1].split("];", 1)[0]
    ids = set(re.findall(r"\{\s*id:\s*'([^']+)'", block))
    if "MG_BETA_LAYER_ID" in block:
        beta = re.search(r"MG_BETA_LAYER_ID\s*=\s*'([^']+)'", MAP_SCOPE.read_text("utf-8"))
        ids.add(beta.group(1))
    assert len(ids) > 20
    assert ids == set(load_data_sources()["camadas"])


@pytest.mark.skipif(not METADATA.exists(), reason="docs not checked out")
def test_links_match_the_lineage_in_metadata_json():
    lineage = {s["id"]: s for s in json.loads(METADATA.read_text(encoding="utf-8"))["sources"]}
    for key, f in load_data_sources()["fontes"].items():
        if f.get("metadados"):
            assert f["metadados"] in lineage, key
            assert f["url"].rstrip("/") == lineage[f["metadados"]]["url"].rstrip("/"), key


def test_endpoint_serves_the_catalog():
    with TestClient(app) as client:
        r = client.get("/api/v1/sources")
    assert r.status_code == 200
    body = r.json()
    assert body["layers"]["highway_state"] == ["mapbiomas_infraestrutura"]
    assert body["sources"]["cp2b_v51"]["kind"] == "estimativa"
    assert "mapbiomas_infraestrutura" in body["to_check"]
    # A license is written down only once checked at the source; until then it is listed.
    assert body["without_license"] == sorted(
        k for k, s in body["sources"].items() if s["kind"] != "estimativa" and not s["license"]
    )
