"""SIDRA API snapshots: one JSON file per UF, never overwritten."""

import json

import pytest

from ingest import sidra_api
from ingest.sidra_api import ALL_UFS, fetch_by_uf, read_rows, snapshot_files, snapshot_path


def test_snapshot_path_layout(tmp_path):
    assert snapshot_path(tmp_path, "src", 2022, "35") == tmp_path / "src" / "2022" / "35.json"


def test_read_rows_drops_header_and_maps_special_values(tmp_path):
    p = tmp_path / "35.json"
    p.write_text(
        json.dumps(
            [
                {"V": "Valor", "D1C": "Município (Código)"},
                {"V": "17983", "D1C": "3521705"},
                {"V": "-", "D1C": "3500105"},
                {"V": "..", "D1C": "3500204"},
                {"V": "X", "D1C": "3500303"},
                {"V": "...", "D1C": "3500402"},
            ]
        ),
        encoding="utf-8",
    )
    rows = read_rows(p)
    assert [r["V"] for r in rows] == [17983.0, 0.0, None, None, None]
    assert rows[0]["D1C"] == "3521705"


def test_fetch_never_overwrites(tmp_path, monkeypatch):
    target = snapshot_path(tmp_path, "src", 2022, "35")
    target.parent.mkdir(parents=True)
    target.write_text("[]")
    monkeypatch.setattr(sidra_api, "_download", lambda url: pytest.fail("downloaded"))
    assert fetch_by_uf("http://x/{uf}", tmp_path, "src", 2022, ("35",)) == [target]
    assert target.read_text() == "[]"


def test_fetch_downloads_missing_uf_with_numeric_code(tmp_path, monkeypatch):
    seen = []

    def fake(url):
        seen.append(url)
        return b'[{"V": "Valor"}]'

    monkeypatch.setattr(sidra_api, "_download", fake)
    (path,) = fetch_by_uf("http://x/n3/{uf}", tmp_path, "src", 2022, ("MG",))
    assert seen == ["http://x/n3/31"]
    assert path == snapshot_path(tmp_path, "src", 2022, "31")
    assert json.loads(path.read_text()) == [{"V": "Valor"}]


def test_fetch_rejects_non_json_reply(tmp_path, monkeypatch):
    monkeypatch.setattr(sidra_api, "_download", lambda url: b"Erro: tabela inexistente")
    with pytest.raises(ValueError, match="SIDRA"):
        fetch_by_uf("http://x/{uf}", tmp_path, "src", 2022, ("35",))
    assert not snapshot_path(tmp_path, "src", 2022, "35").exists()


def test_snapshot_files_missing_raises(tmp_path):
    with pytest.raises(FileNotFoundError, match="fetch"):
        snapshot_files(tmp_path, "src", 2022)


def test_all_ufs_is_national():
    assert len(ALL_UFS) == 27 and "35" in ALL_UFS and "31" in ALL_UFS
