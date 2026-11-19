"""Guards for analysis/build_integra_residuos.py.

The prototype computes both routes from constants it reads from the backend
scripts; these tests fail if its digestion methane stops matching the scenario
script, if the landfill ratio stops reproducing the Atlas Tabela V.6 totals, or
if the seed would accept a block member without a source.
"""

import csv
import importlib.util
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("integra", ROOT / "analysis" / "build_integra_residuos.py")
R = importlib.util.module_from_spec(spec)
spec.loader.exec_module(R)
D = R.load(R.DIGESTATE, "digestate")
S = D.load_scenario_module()
A = R.atlas_landfill()

with D.MASTER.open(encoding="utf-8-sig") as fh:
    MASTER = {r["CD_GEOCODI"].strip(): r for r in csv.DictReader(fh)}
BY_POP = sorted(MASTER.values(), key=lambda r: float(r["populacao_total_hab"] or 0))
# One municipality in each of the per-capita bands the scenario script uses.
SAMPLE = [BY_POP[0], BY_POP[len(BY_POP) // 2], BY_POP[-2], BY_POP[-1]]


@pytest.mark.parametrize("row", SAMPLE, ids=lambda r: r["CD_GEOCODI"])
def test_digestion_reproduces_scenario_methane(row):
    f = R.member_flows(S, D, A, row)
    assert f["ch4_digestao_nm3_ano"] == pytest.approx(S.calcular([row], "real")["RSU (FORSU)"])
    assert f["forsu_t"] == pytest.approx(f["rsu_coletado_t"] * S.RSU_MO_FRACAO)


def test_landfill_ratio_reproduces_atlas_totals():
    captured_ch4 = A["ATLAS_RSU_COLETADO_T"] * R.landfill_ch4_per_t(A)
    assert captured_ch4 == pytest.approx(A["ATLAS_BIOGAS_ATERRO_CAPTADO"] * A["CH4_ATERRO"], rel=1e-6)
    assert captured_ch4 / A["PUREZA_BIOMETANO"] == pytest.approx(A["ATLAS_BIOMETANO_ATERRO"], rel=1e-6)


def test_state_rsu_is_close_to_the_atlas_collected_total():
    rsu = sum(R.member_flows(S, D, A, r)["rsu_coletado_t"] for r in MASTER.values())
    assert rsu == pytest.approx(A["ATLAS_RSU_COLETADO_T"], rel=0.15)


def test_constants_are_read_not_retyped():
    assert R.literal(R.OPPORTUNITY, "MIN_SITE_NM3_DAY") > 0
    with pytest.raises(RuntimeError):
        R.literal(R.ATLAS_RSU, "NAO_EXISTE")


def test_block_is_the_sum_of_its_members():
    B = R.load(R.RECONCILIATION, "biogram_reconciliation")
    muns = B.municipalities()
    codes = [r["CD_GEOCODI"] for r in SAMPLE if r["CD_GEOCODI"] in muns]
    members = [{"ibge_code": c, "municipio": "", "conferido": "nao"} for c in codes]
    row, mem = R.block_row(S, D, A, "ceriso", "x", members, MASTER, None, 15_000.0, None)
    assert row["membros"] == row["membros_a_conferir"] == len(codes)
    assert row["forsu_t_ano"] == pytest.approx(sum(m["forsu_t_ano"] for m in mem), abs=len(codes))
    assert row["capex_aterro_mi_brl_min"] == ""


def test_capex_is_landfill_total_investment_only():
    lo, hi = R.landfill_capex_range()
    with R.CAPEX.open(encoding="utf-8-sig") as fh:
        rows = list(csv.DictReader(fh))
    used = {float(r["capex_brl_por_m3d"]) for r in rows
            if r["rota"].startswith("aterro") and r["base"].startswith("investimento total")}
    assert (lo, hi) == (min(used), max(used))
    # A financing-only amount is a floor of the investment, not a price: left out.
    assert all(float(r["capex_brl_por_m3d"]) not in used for r in rows if r["base"] == "só financiamento BNDES")


def test_committed_seed_has_the_header_and_only_sourced_rows():
    with R.SEED.open(encoding="utf-8-sig") as fh:
        assert next(csv.reader(fh)) == R.SEED_COLUMNS
    for r in R.read_seed(R.SEED, set(MASTER)):
        assert r["fonte_titulo"] and r["fonte_url"] and r["bloco"] in R.BLOCOS


def write_seed(path, *rows):
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(R.SEED_COLUMNS)
        w.writerows(rows)
    return path


def test_seed_refuses_members_without_source_or_unknown(tmp_path):
    code = SAMPLE[0]["CD_GEOCODI"]
    bad = [
        [code, "x", "ceriso", "", "", "", "", "", "", "sim", ""],  # no source
        ["9999999", "x", "ceriso", "", "t", "u", "", "", "", "sim", ""],  # not SP
        [code, "x", "abc", "", "t", "u", "", "", "", "sim", ""],  # unknown block
        [code, "x", "ceriso", "", "t", "u", "", "", "", "talvez", ""],  # conferido
    ]
    for i, r in enumerate(bad):
        with pytest.raises(SystemExit):
            R.read_seed(write_seed(tmp_path / f"b{i}.csv", r), set(MASTER))
    dup = [code, "x", "ceriso", "", "t", "u", "", "", "", "sim", ""]
    with pytest.raises(SystemExit):
        R.read_seed(write_seed(tmp_path / "dup.csv", dup, [*dup[:2], "concen", *dup[3:]]), set(MASTER))
    ok = R.read_seed(write_seed(tmp_path / "ok.csv", dup, [""] * len(R.SEED_COLUMNS)), set(MASTER))
    assert [r["ibge_code"] for r in ok] == [code]


def test_seed_refuses_a_wrong_header(tmp_path):
    p = tmp_path / "h.csv"
    p.write_text("ibge_code,bloco\n", encoding="utf-8")
    with pytest.raises(SystemExit):
        R.read_seed(p, set(MASTER))
