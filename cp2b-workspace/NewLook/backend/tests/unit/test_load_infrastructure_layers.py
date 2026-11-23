"""Unit coverage for the Docker-local MapBiomas infrastructure loader."""

from __future__ import annotations

import importlib.util
import json
import zipfile
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "load_infrastructure_layers.py"
SPEC = importlib.util.spec_from_file_location("load_infrastructure_layers", SCRIPT)
assert SPEC and SPEC.loader
loader = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(loader)

SETUP_SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "setup_local_infrastructure.py"
SETUP_SPEC = importlib.util.spec_from_file_location("setup_local_infrastructure", SETUP_SCRIPT)
assert SETUP_SPEC and SETUP_SPEC.loader
setup = importlib.util.module_from_spec(SETUP_SPEC)
SETUP_SPEC.loader.exec_module(setup)


def test_resolve_archive_accepts_local_source_alias(tmp_path, monkeypatch):
    archive = tmp_path / "STATE_PROTECTED_AREAS_INTEGRAL_PROTECTION_v1.zip"
    archive.write_bytes(b"placeholder")
    monkeypatch.setattr(loader, "ARCHIVE_DIR", tmp_path)

    resolved = loader.resolve_archive("STATE_PROTECTED_AREAS_INTEGRAL_PROTECTION_v2")

    assert resolved == archive


def test_materialize_source_extracts_zip(tmp_path, monkeypatch):
    archive = tmp_path / "structure_transmission_line.zip"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("nested/transmission.shp", b"shape")
        bundle.writestr("nested/transmission.dbf", b"table")

    monkeypatch.setattr(loader, "ARCHIVE_DIR", tmp_path)
    monkeypatch.setattr(loader, "MAPBIOMAS_DIR", tmp_path / "no-mapbiomas-tree")
    monkeypatch.setattr(loader, "INFRA_DIR", tmp_path / "no-infra-tree")

    with loader.materialize_source("INFRAESTRUTURA/structure_transmission_line") as source:
        assert source is not None
        assert (source / "nested" / "transmission.shp").read_bytes() == b"shape"

    assert not source.exists(), "temporary extraction must be cleaned after reading"


def test_safe_extract_rejects_path_traversal(tmp_path):
    archive = tmp_path / "unsafe.zip"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("../escape.shp", b"nope")

    with pytest.raises(ValueError, match="unsafe path"):
        loader._safe_extract_zip(archive, tmp_path / "destination")


def test_snap_query_uses_indexable_bbox_before_geography_distance():
    assert "mm.geometry && ST_Expand(f2.geometry, %s)" in loader.SNAP_SQL
    assert loader.SNAP_BBOX_DEGREES > loader.SNAP_TOLERANCE_M / 111_320


def test_legacy_bootstrap_downloads_only_missing_sidecars(tmp_path, monkeypatch):
    existing = tmp_path / f"{setup.LEGACY_BUNDLES[0]}{setup.LEGACY_EXTENSIONS[0]}"
    existing.write_bytes(b"existing")
    downloads = []

    def fake_download(url, destination):
        downloads.append((url, destination))
        destination.write_bytes(b"downloaded")

    monkeypatch.setattr(setup, "download", fake_download)

    downloaded = setup.ensure_legacy_sp(tmp_path)

    expected = len(setup.LEGACY_BUNDLES) * len(setup.LEGACY_EXTENSIONS) - 1
    assert downloaded == expected
    assert len(downloads) == expected
    assert existing.read_bytes() == b"existing"
    assert all(setup.PROJECT_MAP_REF in url for url, _ in downloads)


# ── Accents: file names in the ZIP, attribute text in the .dbf ───────────────

# "Termelétricas" as the MapBiomas archives store it: UTF-8, the accent
# decomposed (e + U+0301), and the ZIP's UTF-8 flag left off.
THERMAL_UTF8_NFD = "Usinas_Termelétricas_UTE_Biomassa.shp".encode("utf-8")
THERMAL = "Usinas_Termelétricas_UTE_Biomassa.shp"


def _zip_without_utf8_flag(path: Path, name: bytes, data: bytes = b"shape") -> None:
    """Write a ZIP whose one entry name is raw UTF-8 bytes with flag bit 11 off.

    zipfile sets the flag for any non-ASCII name it writes, so write an ASCII
    placeholder of the same length and swap the bytes in afterwards.
    """
    placeholder = b"x" * len(name)
    with zipfile.ZipFile(path, "w") as bundle:
        bundle.writestr(placeholder.decode("ascii"), data)
    path.write_bytes(path.read_bytes().replace(placeholder, name))


def test_member_name_reads_unflagged_utf8_names(tmp_path):
    archive = tmp_path / "thermal.zip"
    _zip_without_utf8_flag(archive, THERMAL_UTF8_NFD)
    with zipfile.ZipFile(archive) as bundle:
        (member,) = bundle.infolist()
        assert member.filename == "Usinas_Termele╠ütricas_UTE_Biomassa.shp"  # the bug
        assert loader._member_name(member) == THERMAL


def test_member_name_keeps_flagged_and_plain_names(tmp_path):
    archive = tmp_path / "plain.zip"
    with zipfile.ZipFile(archive, "w") as bundle:
        bundle.writestr("usina_biogas.shp", b"a")
        bundle.writestr("Distribuição.shp", b"b")  # zipfile flags this one
    with zipfile.ZipFile(archive) as bundle:
        names = [loader._member_name(m) for m in bundle.infolist()]
    assert names == ["usina_biogas.shp", "Distribuição.shp"]


def test_safe_extract_writes_the_real_file_name(tmp_path):
    archive = tmp_path / "thermal.zip"
    _zip_without_utf8_flag(archive, THERMAL_UTF8_NFD, b"shape")
    loader._safe_extract_zip(archive, tmp_path / "out")
    assert [p.name for p in (tmp_path / "out").iterdir()] == [THERMAL]
    assert (tmp_path / "out" / THERMAL).read_bytes() == b"shape"


def test_dbf_encoding_follows_the_cpg_or_assumes_windows_1252(tmp_path):
    shp = tmp_path / "usina_biogas.shp"
    assert loader.dbf_encoding(shp) == "cp1252"
    (tmp_path / "USINA_BIOGAS.CPG").write_text("UTF-8")
    assert loader.dbf_encoding(shp) is None


@pytest.mark.parametrize(
    "text",
    [
        "Gasoduto de Distribui��o",  # UTF-8 guessed for Windows-1252
        "AgropecuÃ¡ria",  # UTF-8 read as Latin-1
        "Usinas_Termele╠ütricas",  # UTF-8 read as CP437
        "Usinas_Termelétricas",  # a loose combining accent
    ],
)
def test_broken_strings_finds_each_kind_of_damage(text):
    row = {"name": "ok", "source_file": "ok.shp", "attributes": '{"a": null}'}
    assert loader.broken_strings([row]) == []
    assert loader.broken_strings([{**row, "name": text}]) == [text]
    assert loader.broken_strings([{**row, "attributes": json.dumps({text: "x"})}]) == [text]


def test_broken_strings_leaves_real_names_alone():
    row = {
        "name": "SÃO JOÃO DA BOA VISTA",
        "source_file": THERMAL,
        "attributes": json.dumps({"Situação": "Operação", "Município": "Paraguaçu"}),
    }
    assert loader.broken_strings([row]) == []


def _write_shapefile(folder: Path, name: str, encoding: str, keep_cpg: bool) -> None:
    gpd = pytest.importorskip("geopandas")
    from shapely.geometry import Point

    folder.mkdir(parents=True, exist_ok=True)
    gdf = gpd.GeoDataFrame(
        {"Nome": ["Abengoa - São João Bv"], "Situação": ["Operação"]},
        geometry=[Point(-47.0, -22.0)],
        crs="EPSG:4326",
    )
    gdf.to_file(folder / f"{name}.shp", engine="pyogrio", encoding=encoding)
    if not keep_cpg:
        (folder / f"{name}.cpg").unlink()


@pytest.mark.parametrize("encoding, keep_cpg", [("cp1252", False), ("UTF-8", True)])
def test_load_layer_reads_accents_right(tmp_path, monkeypatch, encoding, keep_cpg):
    """The MapBiomas case (Windows-1252, no .cpg) and the well-labelled one."""
    _write_shapefile(tmp_path / "src", "usina_etanol", encoding, keep_cpg)
    monkeypatch.setattr(loader, "resolve_folder", lambda _rel: tmp_path / "src")

    _, rows = loader.load_layer("ethanol_plant", "INFRAESTRUTURA/structure_ethanol_plant")

    assert rows[0]["name"] == "Abengoa - São João Bv"
    assert json.loads(rows[0]["attributes"]) == {
        "Nome": "Abengoa - São João Bv",
        "Situação": "Operação",
    }


def test_load_layer_refuses_to_store_broken_text(tmp_path, monkeypatch):
    _write_shapefile(tmp_path / "src", "usina_etanol", "cp1252", keep_cpg=False)
    monkeypatch.setattr(loader, "resolve_folder", lambda _rel: tmp_path / "src")
    monkeypatch.setattr(loader, "clean_text", lambda v: v.replace("ã", "�"))

    with pytest.raises(ValueError, match="still broken"):
        loader.load_layer("ethanol_plant", "INFRAESTRUTURA/structure_ethanol_plant")


# The real archives, when they are mounted (the infrastructure-loader service).
# One known name per layer the brief listed, read the way the loader reads it.
KNOWN_NAMES = [
    ("gas_pipeline_distribution", "name", "Gasoduto de Distribuição"),
    ("ethanol_plant", "Nome", "Abengoa - São João Bv"),
    ("biogas_plant", "Categoria", "Agropecuária"),
]


@pytest.mark.skipif(not loader.ARCHIVE_DIR.is_dir(), reason="MapBiomas archives not mounted")
@pytest.mark.parametrize("layer_id, field, expected", KNOWN_NAMES)
def test_real_archives_read_clean(layer_id, field, expected):
    _, rows = loader.load_layer(layer_id, loader.LAYERS[layer_id])
    values = [json.loads(r["attributes"]).get(field) for r in rows]
    assert expected in values
    assert not any("�" in (v or "") for r in rows for v in json.loads(r["attributes"]).values())


@pytest.mark.skipif(not loader.ARCHIVE_DIR.is_dir(), reason="MapBiomas archives not mounted")
def test_real_thermal_archive_keeps_its_file_name():
    source_file, rows = loader.load_layer(
        "biomass_thermal_plant", loader.LAYERS["biomass_thermal_plant"]
    )
    assert source_file == THERMAL
    assert {r["source_file"] for r in rows} == {THERMAL}
