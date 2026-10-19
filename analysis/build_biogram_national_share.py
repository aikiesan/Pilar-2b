"""Top-down check of the C16 map reading: São Paulo's share of Brazil, applied to BioGRAM.

The IEA map cannot trace the state border, so the hand-drawn polygon could be the
reason BioGRAM reads 1.8x the PILAR N3. This script asks the question the other
way round: BioGRAM 1.2 gives Brazil per feedstock group; IBGE gives SP's share of
the national crop, herd and population behind each group. If SP's share times the
national value lands where the map reading does, the gap with PILAR is real and
not a polygon artifact.

Inputs, none retyped:
    national 2023 totals  PUBLISHED_NATIONAL in backend/ingest/sources/{pam_1612,pam_1613,ibge_ppm}
                          and PUBLISHED_CENSO_POPULATION in backend/scripts/promote_ibge_demographics.py
                          (read with ast)
    SP 2023               SP_master_residue_streams_2023_FINAL.csv (sum of the 645 municipalities)
    BioGRAM Brazil        analysis/data/sources/iea/biogram_1_2_paises.csv
    map reading, PILAR    analysis/data/07_biogram_sp_seed.csv,
                          analysis/outputs/biogram_reconciliation/pilar_por_area.csv
    national gaps         analysis/data/08_brasil_totais_2023_seed.csv (optional: fill valor_brasil
                          from the national pipeline and the ranges below tighten to exact shares)

Shares are by tonnage (crops), head count (herds) and population (waste): BioGRAM
weighs crops by residue factors this script does not know. Where a national total is
missing the share is a labelled range, never a point.

    python analysis/build_biogram_national_share.py
    pytest tests/test_biogram_national_share.py -v
"""

from __future__ import annotations

import ast
import csv
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
INGEST = NEWLOOK / "backend" / "ingest" / "sources"
DEMOGRAPHICS = NEWLOOK / "backend" / "scripts" / "promote_ibge_demographics.py"
NATIONAL_SEED = ROOT / "analysis" / "data" / "08_brasil_totais_2023_seed.csv"
PILAR = ROOT / "analysis" / "outputs" / "biogram_reconciliation" / "pilar_por_area.csv"
OUT = ROOT / "analysis" / "outputs" / "biogram_national_share"
YEAR = 2023

_spec = importlib.util.spec_from_file_location("biogram_recon", ROOT / "analysis" / "build_biogram_reconciliation.py")
R = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(R)

# BioGRAM group -> crops as (SP master column, national source). A source is
# ("ingest", module, key) from PUBLISHED_NATIONAL or ("seed", indicador) from
# 08_brasil_totais_2023_seed.csv. The share is exact when every national value is
# known; otherwise low = the known crops only, high = all SP crops over the known
# national crops (a strict upper bound, since the national group is at least that).
CROP_GROUPS = {
    "Sugar crops": (("prod_t_Cana_de_açúcar", ("ingest", "pam_1612", "sugarcane_production_t")),),
    "Cereals and grains": (
        ("prod_t_Milho_em_grão", ("ingest", "pam_1612", "corn_production_t")),
        ("prod_t_Arroz_em_casca", ("seed", "arroz")),
        ("prod_t_Trigo_em_grão", ("seed", "trigo")),
        ("prod_t_Sorgo_em_grão", ("seed", "sorgo")),
    ),
    "Oil and protein": (
        ("prod_t_Soja_em_grão", ("ingest", "pam_1612", "soybean_production_t")),
        ("prod_t_Amendoim_em_casca", ("seed", "amendoim")),
        ("prod_t_Feijão_em_grão", ("seed", "feijao")),
    ),
    "Roots and tubers": (
        ("prod_t_Mandioca", ("seed", "mandioca")),
        ("prod_t_Batata_doce", ("seed", "batata_doce")),
        ("prod_t_Batata_inglesa", ("seed", "batata_inglesa")),
    ),
}
# Used only while a group has no national value at all. "Other crops" stays an
# assumption even with full IBGE data: it mixes coffee (SP 9 % of Brazil), orange
# (78 %), seed cotton (< 1 %), fodder and vegetables with residue factors we lack.
ASSUMED_SHARE = {
    "Roots and tubers": (0.05, 0.15),
    "Other crops": (0.10, 0.35),
}
# Manure: SP share of each herd, weighted by its part of Brazil's manure methane.
# Cattle dominate (239 M head); the split is our estimate (volatile solids x B0 with
# the same 65 % recovery for all), the IEA does not publish it.
HERDS = {
    "bovinos": ("cabecas_Bovino", ("ingest", "ibge_ppm", "bovino")),
    "suinos": ("cabecas_Suíno___total", ("seed", "suino_total")),
    "aves": ("cabecas_Galináceos___total", ("seed", "galinaceos_total")),
}
HERD_WEIGHTS = {"low": {"bovinos": 0.90, "suinos": 0.05, "aves": 0.05},
                "high": {"bovinos": 0.75, "suinos": 0.10, "aves": 0.15}}
# While the national herd is missing. Poultry: the high end is SP's share of laying
# hens (galinhas, which the ingest does publish nationally); broilers are less SP.
ASSUMED_HERD_SHARE = {"suinos": (0.03, 0.05), "aves": (0.12, None)}
# Waste: SP's share of collected MSW and of treated sewage (SINISA) when the seed has
# both sides; otherwise population share. MSW per head in SP is above the national
# mean (income, collection) so the fallback high end adds 15 %; sewage sludge follows
# treated volume, and SP treats far more than its population share.
WASTE_SEED = {"Municipal solid waste": "rsu_coletado", "Wastewater": "esgoto_tratado"}
MSW_PER_HEAD_UPLIFT = 1.15
WASTEWATER_HIGH_SHARE = 0.40

TABS = {  # map tab -> BioGRAM groups it adds up
    "residuos_agricolas": ("Sugar crops", "Cereals and grains", "Oil and protein", "Other crops", "Roots and tubers"),
    "dejetos": ("Manure",),
    "biowaste": ("Municipal solid waste", "Wastewater"),
}
TABS[R.TOTAL] = tuple(g for gs in TABS.values() for g in gs)


# ── Inputs ───────────────────────────────────────────────────────────────────

def _literal(path: Path, name: str):
    for node in ast.parse(path.read_text(encoding="utf-8")).body:
        target = node.target if isinstance(node, ast.AnnAssign) else (node.targets[0] if isinstance(node, ast.Assign) else None)
        if isinstance(target, ast.Name) and target.id == name:
            return ast.literal_eval(node.value)
    raise RuntimeError(f"{name} not found in {path}")


def published_national(module: str, key: str, year: int = YEAR) -> float:
    return float(_literal(INGEST / module / "source.py", "PUBLISHED_NATIONAL")[year][key][0])


def national_seed() -> dict[str, dict]:
    with NATIONAL_SEED.open(encoding="utf-8") as fh:
        return {r["indicador"]: r for r in csv.DictReader(fh)}


def national_value(src: tuple, seed: dict[str, dict]) -> float | None:
    if src[0] == "ingest":
        return published_national(src[1], src[2])
    v = seed.get(src[1], {}).get("valor_brasil", "").strip()
    return float(v.replace(",", ".")) if v else None


def seed_share(indicador: str, seed: dict[str, dict]) -> float | None:
    """SP ÷ Brazil for a seed row that carries both sides (valor_sp, valor_brasil)."""
    r = seed.get(indicador, {})
    br, sp = (r.get(k, "").strip().replace(",", ".") for k in ("valor_brasil", "valor_sp"))
    return float(sp) / float(br) if br and sp else None


def sp_totals() -> dict[str, float]:
    with R.MASTER.open(encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    cols = [c for c in rows[0] if c.startswith(("prod_t_", "cabecas_")) or c == "populacao_censo2022"]
    return {c: sum(float(r[c] or 0) for r in rows) for c in cols}


def pilar_state() -> dict[str, dict[str, float]]:
    with PILAR.open(encoding="utf-8") as fh:
        return {r["categoria"]: r for r in csv.DictReader(fh) if r["area_id"] == "SP"}


def map_reading() -> dict[str, dict]:
    with R.SEED.open(encoding="utf-8") as fh:
        return {r["categoria"]: r for r in csv.DictReader(fh) if r["area_id"] == "SP"}


# ── Shares ───────────────────────────────────────────────────────────────────

def crop_share(items, sp: dict[str, float], seed: dict[str, dict]) -> tuple[float, float, str] | None:
    known = [(col, national_value(src, seed)) for col, src in items]
    have = [(c, v) for c, v in known if v]
    if not have:
        return None
    br_known = sum(v for _, v in have)
    sp_all = sum(sp[c] for c, _ in known)
    if len(have) == len(known):
        s = sp_all / br_known
        return s, s, "exata (tonelagem, todas as culturas)"
    low = sum(sp[c] for c, _ in have) / br_known
    missing = ", ".join(c.removeprefix("prod_t_") for c, v in known if not v)
    return low, sp_all / br_known, f"faixa: só a cultura principal / cota superior (falta Brasil: {missing})"


def herd_shares(sp: dict[str, float], seed: dict[str, dict]) -> dict[str, tuple[float, float, str]]:
    hens = sp["cabecas_Galináceos___galinhas"] / published_national("ibge_ppm", "galinaceos_galinhas")
    out = {}
    for herd, (col, src) in HERDS.items():
        br = national_value(src, seed)
        if br:
            out[herd] = (sp[col] / br,) * 2 + ("exata",)
        else:
            lo, hi = ASSUMED_HERD_SHARE[herd]
            out[herd] = (lo, hi if hi is not None else hens, "suposição" if hi is not None
                         else "suposição; teto = participação em galinhas poedeiras")
    return out


def shares(sp: dict[str, float], seed: dict[str, dict]) -> dict[str, dict]:
    """BioGRAM group -> {low, high, metodo}: SP's share of Brazil."""
    out = {}
    for group, items in CROP_GROUPS.items():
        got = crop_share(items, sp, seed)
        if got is None:
            lo, hi = ASSUMED_SHARE[group]
            got = (lo, hi, "suposição (sem total nacional no repo)")
        out[group] = dict(zip(("low", "high", "metodo"), got))
    lo, hi = ASSUMED_SHARE["Other crops"]
    out["Other crops"] = {"low": lo, "high": hi, "metodo": "suposição (mistura de culturas, fatores IEA desconhecidos)"}

    herds = herd_shares(sp, seed)
    out["Manure"] = {
        "low": sum(w * herds[h][0] for h, w in HERD_WEIGHTS["low"].items()),
        "high": sum(w * herds[h][1] for h, w in HERD_WEIGHTS["high"].items()),
        "metodo": "rebanhos ponderados (" + "; ".join(f"{h} {pct_range(*herds[h][:2])} {herds[h][2]}"
                                                     for h in HERDS) + ")",
    }
    pop = sp["populacao_censo2022"] / _literal(DEMOGRAPHICS, "PUBLISHED_CENSO_POPULATION")
    out["Municipal solid waste"] = {"low": pop, "high": pop * MSW_PER_HEAD_UPLIFT,
                                    "metodo": f"população ({pop:.1%}) até +{MSW_PER_HEAD_UPLIFT - 1:.0%} per capita"}
    out["Wastewater"] = {"low": pop, "high": WASTEWATER_HIGH_SHARE,
                         "metodo": f"população ({pop:.1%}) até {WASTEWATER_HIGH_SHARE:.0%} (volume tratado)"}
    for group, indicador in WASTE_SEED.items():
        s = seed_share(indicador, seed)
        if s is not None:
            out[group] = {"low": s, "high": s,
                          "metodo": f"exata ({seed[indicador]['notas'].split(';')[0]}; população {pop:.1%})"}
    return out


def expected(share: dict[str, dict], bra: dict[str, float]) -> dict[str, tuple[float, float]]:
    """Map tab -> (low, high) bcme/yr that SP's share implies."""
    return {tab: (sum(bra[g] * share[g]["low"] for g in groups), sum(bra[g] * share[g]["high"] for g in groups))
            for tab, groups in TABS.items()}


def pct_range(low: float, high: float) -> str:
    return f"{low:.1%}" if low == high else f"{low:.1%}–{high:.1%}"


def position(value: float, low: float, high: float) -> str:
    if value < low:
        return f"{value / low - 1:+.0%} abaixo da faixa"
    if value > high:
        return f"{value / high - 1:+.0%} acima da faixa"
    return "dentro da faixa"


# ── Run ──────────────────────────────────────────────────────────────────────

def main() -> None:
    sp, seed, bra = sp_totals(), national_seed(), R.biogram_national("BRA")
    share = shares(sp, seed)
    exp = expected(share, bra)
    lhv = R.load_scenario_module().CH4_LHV_KWH_M3
    bcme = R.nm3_per_unit("bcme_ano", lhv)  # PILAR Nm³ in one bcme
    sp_area = R.build_areas(R.municipalities())[0]["area_km2"]
    reading, pilar = map_reading(), pilar_state()

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "participacao_sp.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["grupo_biogram", "brasil_bcme_ano", "participacao_sp_min", "participacao_sp_max",
                    "sp_esperado_min_bcme_ano", "sp_esperado_max_bcme_ano", "metodo"])
        for g, s in share.items():
            w.writerow([g, bra[g], f"{s['low']:.4f}", f"{s['high']:.4f}",
                        f"{bra[g] * s['low']:.3f}", f"{bra[g] * s['high']:.3f}", s["metodo"]])

    rows = []
    for tab, (lo, hi) in exp.items():
        s = reading.get(tab, {})
        nm3, _ = R.biogram_nm3(s, sp_area, lhv)
        mapa = nm3 / bcme if nm3 is not None else None
        raw, _ = R.biogram_nm3({**s, "biogram_area_km2": ""}, sp_area, lhv)
        bruto = raw / bcme if raw is not None else None
        n3 = float(pilar[tab]["cp2b_n3_nm3_ano"]) / bcme if pilar.get(tab, {}).get("cp2b_n3_nm3_ano") else None
        rows.append({
            "aba": tab, "aba_biogram": R.MAP_GROUPS[tab][0],
            "esperado_min_bcme": lo, "esperado_max_bcme": hi,
            "mapa_bcme": mapa, "posicao_mapa": position(mapa, lo, hi) if mapa is not None else "sem leitura",
            "mapa_bruto_bcme": bruto, "posicao_bruto": position(bruto, lo, hi) if bruto is not None else "sem leitura",
            "pilar_n3_bcme": n3,
            "esperado_sobre_n3_min": lo / n3 if n3 else None, "esperado_sobre_n3_max": hi / n3 if n3 else None,
        })
    with (OUT / "comparacao_abas.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        for r in rows:
            w.writerow({k: (f"{v:.3f}" if isinstance(v, float) else v) for k, v in r.items()})

    def f(v, d=2):
        return "—" if v is None else f"{v:.{d}f}"

    open_gaps = [r["indicador"] for r in seed.values() if not r["valor_brasil"].strip()]
    tot = next(r for r in rows if r["aba"] == R.TOTAL)
    lines = [
        "# C16 — Participação de SP no Brasil × leitura do mapa BioGRAM",
        "",
        f"Teste de cima para baixo da leitura do mapa: BioGRAM 1.2 Brasil ({bra['Total']} bcme/ano) × participação "
        f"de SP na produção agrícola, no rebanho e na população de {YEAR} (IBGE). Se o produto cai onde o "
        "polígono desenhado cai, a diferença com o PILAR não é efeito do polígono.",
        "",
        "## Por aba do mapa (bcme/ano)",
        "",
        "| Aba | Esperado pela participação | Mapa reescalado à área de SP | Posição | Mapa bruto (polígono inteiro) "
        "| Posição | PILAR N3 | Esperado ÷ N3 |",
        "|---|---:|---:|---|---:|---|---:|---:|",
    ]
    for r in rows:
        lines.append(f"| {r['aba_biogram']} | {f(r['esperado_min_bcme'])}–{f(r['esperado_max_bcme'])} | "
                     f"{f(r['mapa_bcme'])} | {r['posicao_mapa']} | {f(r['mapa_bruto_bcme'])} | {r['posicao_bruto']} | "
                     f"{f(r['pilar_n3_bcme'])} | "
                     f"{f(r['esperado_sobre_n3_min'], 1)}–{f(r['esperado_sobre_n3_max'], 1)}× |")
    lines += [
        "",
        f"SP fica com {tot['esperado_min_bcme'] / bra['Total']:.1%}–{tot['esperado_max_bcme'] / bra['Total']:.1%} "
        f"do potencial brasileiro pelo cálculo de participação; o mapa dá "
        f"{f(tot['mapa_bcme'] / bra['Total'] * 100 if tot['mapa_bcme'] else None, 1)} % reescalado e "
        f"{f(tot['mapa_bruto_bcme'] / bra['Total'] * 100 if tot['mapa_bruto_bcme'] else None, 1)} % bruto.",
        "",
        "## Por grupo do BioGRAM",
        "",
        "| Grupo | Brasil (bcme/ano) | Participação de SP | SP esperado (bcme/ano) | Método |",
        "|---|---:|---:|---:|---|",
    ]
    for g, s in share.items():
        pct = pct_range(s["low"], s["high"])
        val = (f"{bra[g] * s['low']:.2f}" if s["low"] == s["high"]
               else f"{bra[g] * s['low']:.2f}–{bra[g] * s['high']:.2f}")
        lines.append(f"| {g} | {bra[g]:.2f} | {pct} | {val} | {s['metodo']} |")
    lines += [
        "",
        "## Como ler",
        "",
        "- Mapa reescalado: valor do polígono × (área de SP ÷ área desenhada), o mesmo da reconciliação. Supõe "
        "densidade uniforme; como a borda desenhada pega vizinhos menos densos (MS, PR, sul de MG), tende a "
        "subestimar. O valor bruto do polígono inteiro tende a superestimar. SP fica entre os dois.",
        f"- 1 bcme = {bcme / 1e9:.4f} bi Nm³ de CH4 no PCI do PILAR ({lhv} kWh/Nm³; a IEA usa 36 MJ/Nm³).",
        "- Participação por tonelagem, cabeças e população. O BioGRAM pesa as culturas por fator de resíduo, "
        "então a faixa é uma régua de coerência, não um recálculo do modelo.",
        "- Dejetos: pesos bovinos 75–90 %, suínos 5–10 %, aves 5–15 % do metano de dejetos do Brasil são "
        "estimativa nossa (sólidos voláteis × B0, mesma recuperação de 65 %).",
        "",
        "## Limites e próximos dados",
        "",
        "- " + (f"Faltam totais nacionais {YEAR} em `analysis/data/08_brasil_totais_2023_seed.csv`: "
                + ", ".join(open_gaps) + ". Preenchidos, as faixas de cereais, oleaginosas, raízes e dejetos "
                "viram participação exata." if open_gaps else "Todos os totais nacionais do seed estão preenchidos."),
        "- \"Other crops\" segue como suposição: mistura café, laranja, algodão, forrageiras e hortaliças com "
        "fatores que a nota metodológica não detalha por cultura.",
        "- RSU e esgoto: o BioGRAM usa What a Waste 3.0 e HydroWASTE, não SINISA; a participação de SP é a "
        "régua, não o volume.",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
