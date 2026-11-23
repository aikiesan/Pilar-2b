"""Loader for one bivariate analysis (scripts/load_analysis.py).

The DB tests open their own connection to the scratch database
(TEST_DATABASE_URL) and roll back at the end, so nothing is left behind.
All data is made up (tests/unit/fixtures/demo_xy).
"""

import os
import shutil
import sys
from pathlib import Path

import psycopg2
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts"))

import load_analysis  # noqa: E402
from load_analysis import ManifestError, load, read_axis, read_manifest  # noqa: E402

DEMO = Path(__file__).parent / "fixtures" / "demo_xy"
TEST_DB = os.getenv("TEST_DATABASE_URL")


@pytest.fixture
def db():
    if not TEST_DB:
        pytest.skip("TEST_DATABASE_URL not set")
    conn = psycopg2.connect(TEST_DB)
    try:
        yield conn
    finally:
        conn.rollback()
        conn.close()


@pytest.fixture
def demo(tmp_path):
    """A writable copy of the demo manifest and CSVs."""
    dest = tmp_path / "demo_xy"
    shutil.copytree(DEMO, dest)
    return dest


def one(conn, sql, args=()):
    with conn.cursor() as cur:
        cur.execute(sql, args or None)
        return cur.fetchone()[0]


def table_rows(conn):
    return {
        t: one(conn, f"SELECT count(*) FROM {t} WHERE analysis_id = 'demo_xy'")
        for t in ("analysis_values", "analysis_classes", "analysis_breaks", "analysis_grants")
    } | {"analyses": one(conn, "SELECT count(*) FROM analyses WHERE id = 'demo_xy'")}


@pytest.mark.database
def test_first_load_creates_analysis_with_manifest_level(db):
    summary = load(db, read_manifest(DEMO / "manifest.yaml"))
    assert one(db, "SELECT level FROM analyses WHERE id = 'demo_xy'") == 3
    assert one(db, "SELECT count(*) FROM analysis_classes WHERE analysis_id = 'demo_xy'") == 9
    assert one(db, "SELECT count(*) FROM analysis_breaks WHERE analysis_id = 'demo_xy'") == 4
    assert one(db, "SELECT count(*) FROM analysis_values WHERE analysis_id = 'demo_xy'") == 9
    # 3500006 has no y, so SP has 5 cells and 1 without data; MG has 3 and 0
    assert summary.with_cell == {"35": 5, "31": 3}
    assert summary.no_data == {"35": 1, "31": 0}
    assert sum(summary.counts) == 8


@pytest.mark.database
def test_reload_keeps_level_opens_at_active_and_grants(db, demo):
    load(db, read_manifest(demo / "manifest.yaml"))
    with db.cursor() as cur:
        cur.execute(
            "UPDATE analyses SET level = 0, opens_at = '2030-01-01+00', is_active = false"
            " WHERE id = 'demo_xy'"
        )
        cur.execute(
            "INSERT INTO auth_users (email, password_hash, full_name)"
            " VALUES ('loader-test@example.invalid', 'x', 'Loader Test') RETURNING id"
        )
        uid = cur.fetchone()[0]
        cur.execute(
            "INSERT INTO analysis_grants (analysis_id, user_id) VALUES ('demo_xy', %s)", (uid,)
        )

    text = (demo / "manifest.yaml").read_text(encoding="utf-8")
    (demo / "manifest.yaml").write_text(
        text.replace("Demo X × Y", "Demo X × Y, second edition").replace("level: 3", "level: 2"),
        encoding="utf-8",
    )
    (demo / "x.csv").write_text(
        "CD_MUN,valor_x\n3500001,9\n3500002,5\n3500003,12\n3500004,40\n3500005,90\n"
        "3500006,150\n3100001,3\n3100002,8\n3100003,20\n",
        encoding="utf-8",
    )
    load(db, read_manifest(demo / "manifest.yaml"))

    assert (
        one(db, "SELECT title_en FROM analyses WHERE id = 'demo_xy'")
        == "Demo X × Y, second edition"
    )
    assert (
        one(
            db,
            "SELECT x FROM analysis_values WHERE analysis_id = 'demo_xy' AND ibge_code = '3500001'",
        )
        == 9
    )
    assert one(db, "SELECT level FROM analyses WHERE id = 'demo_xy'") == 0
    assert one(db, "SELECT opens_at IS NOT NULL FROM analyses WHERE id = 'demo_xy'") is True
    assert one(db, "SELECT is_active FROM analyses WHERE id = 'demo_xy'") is False
    assert one(db, "SELECT count(*) FROM analysis_grants WHERE analysis_id = 'demo_xy'") == 1
    # 3500001 went from 0 (class 0, "no use") to 9, so its cell can move; counts stay whole
    assert one(db, "SELECT count(*) FROM analysis_classes WHERE analysis_id = 'demo_xy'") == 9


def test_rejects_duplicate_codes(tmp_path):
    f = tmp_path / "a.csv"
    f.write_text("CD_MUN,v\n3500001,1\n3500001,2\n", encoding="utf-8")
    with pytest.raises(ManifestError, match="duplicate CD_MUN 3500001"):
        read_axis(f, "CD_MUN", "v")


def test_rejects_codes_of_other_lengths(tmp_path):
    for bad in ("35", "350000100"):
        f = tmp_path / "a.csv"
        f.write_text(f"CD_MUN,v\n{bad},1\n", encoding="utf-8")
        with pytest.raises(ManifestError, match=bad):
            read_axis(f, "CD_MUN", "v")


@pytest.mark.database
def test_six_digit_codes_match_the_seven_digit_code(db, demo):
    with db.cursor() as cur:
        # canonical table; only the name is NOT NULL
        cur.execute(
            "INSERT INTO municipalities (municipality_name, ibge_code)"
            " VALUES ('Demo Municipality', '3500007')"
        )
    (demo / "x.csv").write_text("CD_MUN,valor_x\n350000,5\n350009,7\n3500002,8\n", encoding="utf-8")
    (demo / "y.csv").write_text("CD_MUN,valor_y\n350000,1\n3500002,2\n", encoding="utf-8")
    summary = load(db, read_manifest(demo / "manifest.yaml"))
    assert (
        one(
            db,
            "SELECT count(*) FROM analysis_values WHERE analysis_id='demo_xy' AND ibge_code='3500007'",
        )
        == 1
    )
    assert (
        one(db, "SELECT x FROM analysis_values WHERE analysis_id='demo_xy' AND ibge_code='3500007'")
        == 5
    )
    # 350009 (x only) has no municipality: counted, not written
    assert summary.unmatched == 1
    assert one(db, "SELECT count(*) FROM analysis_values WHERE analysis_id='demo_xy'") == 2


@pytest.mark.database
def test_drops_codes_outside_manifest_ufs_and_counts_them(db, demo):
    (demo / "manifest.yaml").write_text(
        (demo / "manifest.yaml").read_text(encoding="utf-8").replace('["35", "31"]', '["35"]'),
        encoding="utf-8",
    )
    summary = load(db, read_manifest(demo / "manifest.yaml"))
    assert summary.dropped == 3
    assert (
        one(
            db,
            "SELECT count(*) FROM analysis_values WHERE analysis_id='demo_xy' AND ibge_code LIKE '31%'",
        )
        == 0
    )
    assert (
        one(
            db,
            "SELECT count(*) FROM analysis_classes WHERE analysis_id='demo_xy' AND ibge_code LIKE '31%'",
        )
        == 0
    )
    assert one(db, "SELECT count(*) FROM analysis_breaks WHERE analysis_id='demo_xy'") == 2


@pytest.mark.database
def test_empty_value_is_no_cell(db):
    summary = load(db, read_manifest(DEMO / "manifest.yaml"))
    assert (
        one(
            db,
            "SELECT cell IS NULL FROM analysis_classes WHERE analysis_id='demo_xy' AND ibge_code='3500006'",
        )
        is True
    )
    assert (
        one(
            db,
            "SELECT y IS NULL FROM analysis_values WHERE analysis_id='demo_xy' AND ibge_code='3500006'",
        )
        is True
    )
    assert summary.no_data["35"] == 1


@pytest.mark.database
def test_failure_writes_nothing(db, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("forced after analysis_values")

    monkeypatch.setattr(load_analysis, "classify_uf", boom)
    with pytest.raises(RuntimeError, match="forced"):
        load(db, read_manifest(DEMO / "manifest.yaml"))
    # the connection is still usable and every table is empty for the analysis
    assert table_rows(db) == dict.fromkeys(
        ("analyses", "analysis_values", "analysis_classes", "analysis_breaks", "analysis_grants"), 0
    )


@pytest.mark.database
def test_dry_run_writes_nothing(db):
    summary = load(db, read_manifest(DEMO / "manifest.yaml"), dry_run=True)
    assert sum(summary.counts) == 8
    assert all(n == 0 for n in table_rows(db).values())


def test_manifest_validation(tmp_path, demo):
    text = (demo / "manifest.yaml").read_text(encoding="utf-8")
    for old, new, msg in (
        ("id: demo_xy", "id: Bad-Id", "id"),
        ("answer_cell: 8", "answer_cell: 9", "answer_cell"),
        ("level: 3", "level: 4", "level"),
        ("method: tertile_nonzero", "method: median", "method"),
        ('["35", "31"]', '["35", "41"]', "uf_prefixes"),
        ('["35", "31"]', '["35", "35"]', "duplicate"),
        ("id: demo_xy", 'id: "demo_xy\n"', "id"),
    ):
        (demo / "m.yaml").write_text(text.replace(old, new), encoding="utf-8")
        with pytest.raises(ManifestError, match=msg):
            read_manifest(demo / "m.yaml")
    assert read_manifest(demo / "manifest.yaml").id == "demo_xy"


def test_preview_needs_no_database_for_seven_digit_codes():
    summary = load_analysis.preview(read_manifest(DEMO / "manifest.yaml"))
    assert summary.with_cell == {"35": 5, "31": 3}
    assert sum(summary.counts) == 8


def test_preview_says_six_digit_codes_need_the_database(demo):
    (demo / "x.csv").write_text("CD_MUN,valor_x\n350000,5\n", encoding="utf-8")
    with pytest.raises(ManifestError, match="DATABASE_URL"):
        load_analysis.preview(read_manifest(demo / "manifest.yaml"))


def test_cli_prints_only_class_and_pgcode_on_database_error(monkeypatch, capsys):
    def boom(*a, **k):
        raise psycopg2.Error("DETAIL: Key (x)=(31415.9) secret")

    monkeypatch.setenv("DATABASE_URL", "postgresql://unused")
    monkeypatch.setattr(psycopg2, "connect", boom)
    monkeypatch.setattr(sys, "argv", ["load_analysis", "--manifest", str(DEMO / "manifest.yaml")])
    assert load_analysis.main() == 1
    out = capsys.readouterr().out
    assert "Error" in out and "pgcode" in out
    assert "31415.9" not in out and "secret" not in out


def test_broken_connection_keeps_the_original_error(monkeypatch):
    class Cur:
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def execute(self, sql, args=None):
            if sql.startswith("ROLLBACK"):
                raise psycopg2.OperationalError("connection lost")

        executemany = execute

    class Conn:
        def cursor(self):
            return Cur()

    def boom(*a, **k):
        raise RuntimeError("original")

    monkeypatch.setattr(load_analysis, "_resolve_six_digit", boom)
    with pytest.raises(RuntimeError, match="original"):
        load(Conn(), read_manifest(DEMO / "manifest.yaml"))
