"""scripts/promote_profile_data.py: load -> validate -> report -> promote, all or nothing."""

import types

import pandas as pd
import pytest

from ingest.gates import GateResult
from scripts import promote_profile_data as ppd


def _fake_source(monkeypatch, fake_conn, tmp_path, gates_pass=True, takes_ufs=False):
    calls = {"promote": []}
    df = pd.DataFrame({"ibge_code": ["3521705"], "population": [17983.0]})

    def load(year, raw_dir, **kw):
        calls["load_kw"] = kw
        return df

    def validate(frame, ctx):
        return [GateResult("schema", gates_pass, "x")], ctx

    if takes_ufs:

        def promote(frame, conn, run_id, ufs=("35", "31")):
            calls["promote"].append((run_id, ufs))
            return 1

    else:

        def promote(frame, conn, run_id):
            calls["promote"].append((run_id, None))
            return 1

    module = types.SimpleNamespace(
        SPEC=types.SimpleNamespace(source_id="fake"), load=load, validate=validate, promote=promote
    )
    monkeypatch.setattr(ppd, "get_source", lambda source_id: module)
    monkeypatch.setattr(ppd, "_connect", lambda: fake_conn)
    monkeypatch.setattr(ppd, "write_report", lambda results, ctx, d: tmp_path / "r.md")
    return calls


def test_failed_gate_writes_nothing(monkeypatch, fake_conn, tmp_path):
    calls = _fake_source(monkeypatch, fake_conn, tmp_path, gates_pass=False)
    assert ppd.main(["--source", "ibge_censo_idade", "--year", "2022"]) == 1
    assert fake_conn.executed == [] and calls["promote"] == []


def test_dry_run_writes_nothing(monkeypatch, fake_conn, tmp_path):
    calls = _fake_source(monkeypatch, fake_conn, tmp_path)
    assert ppd.main(["--source", "ibge_censo_idade", "--year", "2022", "--dry-run"]) == 0
    assert fake_conn.executed == [] and calls["promote"] == []


def test_promotes_with_ledger_row_and_commits(monkeypatch, fake_conn, tmp_path):
    calls = _fake_source(monkeypatch, fake_conn, tmp_path)
    assert ppd.main(["--source", "ibge_censo_idade", "--year", "2022"]) == 0
    assert "staging.ingest_runs" in fake_conn.executed[0][0]
    assert calls["promote"] == [(1, None)]
    assert fake_conn.commits == 1 and fake_conn.rollbacks == 0


def test_rerun_same_frame_reuses_ledger_row(monkeypatch, fake_conn, tmp_path):
    _fake_source(monkeypatch, fake_conn, tmp_path)
    ppd.main(["--source", "ibge_censo_idade", "--year", "2022"])
    ppd.main(["--source", "ibge_censo_idade", "--year", "2022"])
    ledger_sql = [s for s, _ in fake_conn.executed if "staging.ingest_runs" in s]
    assert len(ledger_sql) == 2 and all("ON CONFLICT" in s for s in ledger_sql)


def test_ufs_reach_load_and_promote_for_land_cover(monkeypatch, fake_conn, tmp_path):
    calls = _fake_source(monkeypatch, fake_conn, tmp_path, takes_ufs=True)
    assert ppd.main(["--source", "mapbiomas_cobertura", "--year", "2025", "--ufs", "35"]) == 0
    assert calls["load_kw"] == {"ufs": ("35",)}
    assert calls["promote"] == [(1, ("35",))]


def test_ufs_rejected_for_census_sources(monkeypatch, fake_conn, tmp_path):
    _fake_source(monkeypatch, fake_conn, tmp_path)
    assert ppd.main(["--source", "ibge_censo_idade", "--year", "2022", "--ufs", "35"]) == 2


def test_promote_error_rolls_back(monkeypatch, fake_conn, tmp_path):
    _fake_source(monkeypatch, fake_conn, tmp_path)
    module = ppd.get_source("x")
    module.promote = lambda frame, conn, run_id: (_ for _ in ()).throw(RuntimeError("boom"))
    with pytest.raises(RuntimeError):
        ppd.main(["--source", "ibge_censo_idade", "--year", "2022"])
    assert fake_conn.rollbacks == 1 and fake_conn.commits == 0


def test_unknown_source_is_usage_error():
    assert ppd.main(["--source", "nope", "--year", "2022"]) == 2


def test_runner_lists_new_sources():
    from ingest.runner import SOURCES

    assert {
        "ibge_censo_idade",
        "ibge_censo_situacao",
        "ibge_censo_historico",
        "mapbiomas_cobertura",
    } <= set(SOURCES)
