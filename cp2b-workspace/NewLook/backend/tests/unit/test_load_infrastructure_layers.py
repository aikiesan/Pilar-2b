"""Unit coverage for the Docker-local MapBiomas infrastructure loader."""

from __future__ import annotations

import importlib.util
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
