"""Gates of the CP2b v5.1 loader (migration 034).

The snapshot lives under data/raw/ (gitignored), so these tests build small
frames that mimic it and check that each gate refuses what it should. The one
test that needs the real snapshot skips when it is absent.
"""

import pandas as pd
import pytest

from scripts import load_cp2b_potential as L
from scripts import run_migrations


def _levels(codes=(3500105, 3500204), scenarios=L.SCENARIOS) -> pd.DataFrame:
    rows = []
    for code in codes:
        for sub, (residue, sector, ligno) in L.SUBSTRATES.items():
            for sc in scenarios:
                rows.append(
                    {
                        "ibge_code": code,
                        "substrate": sub,
                        "residue": residue,
                        "sector": sector,
                        "lignocellulosic": ligno,
                        "scenario": sc,
                        "n1_ch4_nm3_year": 100.0,
                        "n2_ch4_nm3_year": 80.0,
                        "n3_before_existing_use_ch4_nm3_year": 60.0,
                        "existing_use_subtracted_ch4_nm3_year": 0.0,
                        "n3_ch4_nm3_year": 60.0,
                        "n4_ch4_nm3_year": 50.0,
                        "n3_biogas_eq_nm3_year": 107.0,
                        "n3_biomethane_eq_nm3_year": 62.0,
                        "n4_biogas_eq_nm3_year": 90.0,
                        "n4_biomethane_eq_nm3_year": 51.0,
                        "ch4_fraction_in_biogas": 0.56,
                        "fs_x_fl": 50 / 60,
                        "method_version": L.METHOD_VERSION,
                    }
                )
    return pd.DataFrame(rows)


def _summary_from(levels: pd.DataFrame) -> pd.DataFrame:
    out = []
    for (code, sc), g in levels.groupby(["ibge_code", "scenario"]):
        row = {"ibge_code": code, "scenario": sc}
        for level in ("n3", "n4"):
            col = f"{level}_ch4_nm3_year"
            row[f"{level}_total_ch4_nm3_year"] = g[col].sum()
            for s in L.SECTORS:
                row[f"{level}_{s}_ch4_nm3_year"] = g.loc[g["sector"] == s, col].sum()
        out.append(row)
    return pd.DataFrame(out)


def _frames(levels=None) -> dict:
    levels = _levels() if levels is None else levels
    params = pd.DataFrame(
        [
            {
                "substrate": "PALHA",
                "residue": "sugarcane",
                "element": "BMP",
                "min_value": 140.0,
                "med_value": 175.0,
                "max_value": 250.0,
                "unit": "Nm³ CH4 / t SV",
                "source": "feedstocks.yaml",
                "status": "provisorio",
                "method_version": L.METHOD_VERSION,
            }
        ]
    )
    fl = levels[["ibge_code", "substrate", "scenario"]].copy()
    fl["residuos_codigo"] = "x"
    for c in L.FL_VARIANTS.values():
        fl[c] = 0.9
    fl["supply_n3_ch4_nm3_day"] = 1.0
    fl["method_version"] = L.METHOD_VERSION
    return {"levels": levels, "summary": _summary_from(levels), "parameters": params, "fl": fl}


# ── The classification the map depends on ───────────────────────────────────


def test_seventeen_substrates_and_the_four_lignocellulosic_ones():
    assert len(L.SUBSTRATES) == 17
    ligno = {k for k, (_, _, is_ligno) in L.SUBSTRATES.items() if is_ligno}
    # The article's "without lignocellulosics" figure excludes exactly these.
    assert ligno == {"PALHA", "BAGACO", "PALHA_MILHO", "PALHA_SOJA"}


def test_residues_are_in_the_map_filter_vocabulary():
    from app.api.v1.endpoints.municipalities import _CP2B_RESIDUES, _SCENARIO_RESIDUES

    residues = {r for r, _, _ in L.SUBSTRATES.values()}
    assert residues == set(_CP2B_RESIDUES)
    assert residues <= set(_SCENARIO_RESIDUES)


def test_expected_totals_are_the_article_headline():
    # 19.18 / 16.36 M Nm3 CH4 per day, Table T1 of the v5.1 article package.
    assert round(L.EXPECTED_STATE_TOTALS[("med", "n3")] / 365e6, 2) == 19.18
    assert round(L.EXPECTED_STATE_TOTALS[("med", "n4")] / 365e6, 2) == 16.36


def test_the_loader_is_wired_into_seed():
    assert "load_cp2b_potential" in run_migrations.SEEDERS


# ── Gates on synthetic frames ────────────────────────────────────────────────


def test_clean_frames_pass_every_gate_but_coverage_and_totals():
    frames = _frames()
    assert L.gate_schema(frames) == []
    assert L.gate_vocabulary(frames) == []
    assert L.gate_range(frames) == []
    assert L.gate_summary_identity(frames) == []
    # Two municipalities, not 645; synthetic volumes, not the article's.
    assert any("645" in f for f in L.gate_coverage(frames))
    assert L.gate_state_totals(frames)


def test_duplicate_key_is_refused():
    lv = _levels()
    frames = _frames(pd.concat([lv, lv.iloc[[0]]], ignore_index=True))
    assert any("duplicate" in f for f in L.gate_schema(frames))


def test_other_method_version_is_refused():
    lv = _levels()
    lv["method_version"] = "CP2b v5.0"
    assert any("method_version" in f for f in L.gate_schema(_frames(lv)))


def test_residue_that_disagrees_with_the_method_is_refused():
    lv = _levels()
    lv.loc[lv["substrate"] == "VINHACA", "residue"] = "sewage"
    fails = L.gate_vocabulary(_frames(lv))
    assert any("residue" in f and "VINHACA" in f for f in fails)


def test_lignocellulosic_flag_is_checked():
    lv = _levels()
    lv.loc[lv["substrate"] == "PALHA", "lignocellulosic"] = False
    assert any("lignocellulosic" in f for f in L.gate_vocabulary(_frames(lv)))


def test_a_level_above_the_one_before_is_refused():
    lv = _levels()
    lv.loc[0, "n4_ch4_nm3_year"] = 70.0  # N4 > N3
    assert any("N1 >= N2 >= N3 >= N4" in f for f in L.gate_range(_frames(lv)))


def test_negative_volume_is_refused():
    lv = _levels()
    lv.loc[0, "existing_use_subtracted_ch4_nm3_year"] = -1.0
    assert any("negative" in f for f in L.gate_range(_frames(lv)))


def test_fl_outside_unit_interval_is_refused():
    frames = _frames()
    frames["fl"].loc[0, "fl_b_codigestion_allocated"] = 1.2
    assert any("fl_b_codigestion_allocated" in f for f in L.gate_range(frames))


def test_summary_from_another_run_is_refused():
    frames = _frames()
    frames["summary"].loc[0, "n3_total_ch4_nm3_year"] *= 1.01
    assert any("n3_total" in f for f in L.gate_summary_identity(frames))


def test_state_total_off_by_a_fraction_is_refused(monkeypatch):
    frames = _frames()
    med_n3 = float(frames["levels"].query("scenario == 'med'")["n3_ch4_nm3_year"].sum())
    monkeypatch.setattr(L, "EXPECTED_STATE_TOTALS", {("med", "n3"): med_n3 * 1.001})
    assert L.gate_state_totals(frames)
    monkeypatch.setattr(L, "EXPECTED_STATE_TOTALS", {("med", "n3"): med_n3})
    assert L.gate_state_totals(frames) == []


# ── Snapshot handling ────────────────────────────────────────────────────────


def test_missing_snapshot_is_a_decline_with_instructions(tmp_path):
    with pytest.raises(SystemExit) as exc:
        L.load_frames(tmp_path)
    assert "raw snapshot missing" in str(exc.value)
    assert "outputs_v5/plataforma" in str(exc.value)


def test_checksum_mismatch_is_refused(tmp_path):
    for name in L.FILES.values():
        (tmp_path / name).write_text("a,b\n1,2\n", encoding="utf-8")
    with pytest.raises(SystemExit) as exc:
        L.load_frames(tmp_path)
    assert "checksum mismatch" in str(exc.value)


@pytest.mark.skipif(
    not (L.SNAPSHOT_DIR / L.FILES["levels"]).exists(), reason="raw snapshot not present"
)
def test_real_snapshot_passes_every_gate():
    assert L.run_gates(L.load_frames()) == []
