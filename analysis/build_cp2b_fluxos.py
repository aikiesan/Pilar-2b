#!/usr/bin/env python3
"""
CP2b × Atlas Real, step by step, for vinasse, filter cake, manure, sewage and RSU.

The platform's headline scenarios, map layers and residue filter already serve
CP2b v5.1 (migration 034: Real = N4, Ideal = N3), so they tell the same story as
the article. The analysis prototypes do not: they compute each stream with the
Atlas de Bioenergia SP 2020 "Cenário Real" chain in
backend/scripts/sp_scenarios_real_ideal.py. This script puts the two side by
side for the streams the prototypes lean on, and splits the gap into the CP2b
steps:

  Atlas Real  ->  N1 (theoretical: base × g × ST × SV × BMP)
              ->  N2 (× FC, collectable)
              ->  N3 before existing use (× FCo, competing uses)
              ->  N3 (minus existing energy use U)
              ->  N4 (× FS × FL, storage and road-network logistics)

N4 is the reference level because the platform calls it "Cenário Real". A stream
whose N4 differs from Atlas Real by more than TOL is flagged: it needs an
explanation on the platform or a note to the method team.

The base quantity (t of cane, heads, inhabitants) is the master file's, the one
Atlas Real uses. CP2b reads its own base, so N1 per unit of that base mixes the
two bases and the two yields; the CP2b parameters are listed next to the
Atlas constants so the reader can tell which.

CP2b values come only from the v5.1 snapshot with the loader's checksum
(backend/data/raw/cp2b_potential/2026/, gitignored). Without it the script still
writes the Atlas side and says the CP2b side is missing.

Run from the repo root:
  python3 analysis/build_cp2b_fluxos.py

Outputs (analysis/outputs/cp2b_fluxos/):
  passos.csv      one row per stream and per CP2b substrate, state of SP
  regioes.csv     stream × IBGE intermediate region: Atlas Real, N3, N4
  parametros.csv  CP2b parameters of these substrates and the Atlas constants
  RELATORIO.md    the step table, regions, flags and parameters
"""

from __future__ import annotations

import csv
import hashlib
import importlib.util
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECONCILIATION = ROOT / "analysis" / "build_biogram_reconciliation.py"
OUT = ROOT / "analysis" / "outputs" / "cp2b_fluxos"
TOL = 0.20  # |N4 / Atlas Real - 1| above this needs an explanation

# stream -> (label, Atlas Real flows in calcular(), CP2b substrates, master base column, base unit)
STREAMS = {
    "vinhaca": ("Vinhaça", ("vinhaça",), ("VINHACA",), "prod_t_Cana_de_açúcar", "t de cana"),
    "torta": ("Torta de filtro", ("torta de filtro",), ("TORTA_FILTRO",), "prod_t_Cana_de_açúcar", "t de cana"),
    "bovinos": ("Bovinos", ("bovinos",), ("BOV_LEITE", "BOV_CONFINADO", "BOV_PASTO_MISTO"),
                "cabecas_Bovino", "cabeça"),
    "suinos": ("Suínos", ("suínos",), ("SUINOS",), "cabecas_Suíno___total", "cabeça"),
    "aves": ("Aves", ("aves",), ("AVES_CORTE", "AVES_POSTURA"), "cabecas_Galináceos___total", "cabeça"),
    "esgoto": ("Esgoto", ("esgoto (ETE)",), ("LODO_ETE",), "populacao_total_hab", "habitante"),
    "rsu": ("RSU orgânico", ("RSU (FORSU)",), ("RSU_ORGANICO",), "populacao_total_hab", "habitante"),
}
# CP2b snapshot column -> short name, in cascade order.
STEPS = {
    "n1_ch4_nm3_year": "n1",
    "n2_ch4_nm3_year": "n2",
    "n3_before_existing_use_ch4_nm3_year": "n3_antes",
    "existing_use_subtracted_ch4_nm3_year": "uso_existente",
    "n3_ch4_nm3_year": "n3",
    "n4_ch4_nm3_year": "n4",
}
# (numerator, denominator, label): the factors whose product is N4 / Atlas Real.
FACTORS = (
    ("n1", "atlas", "N1 / Atlas"),
    ("n2", "n1", "FC"),
    ("n3_antes", "n2", "FCo"),
    ("n3", "n3_antes", "uso existente"),
    ("n4", "n3", "FS × FL"),
)


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


B = _load(RECONCILIATION, "biogram_reconciliation")


def num(x: float) -> str:
    """A constant as written in the source, Brazilian decimal comma."""
    return f"{x:g}".replace(".", ",")


def fmt(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def atlas_method(S) -> dict[str, str]:
    """The Atlas Real chain of each stream, written from the scenario module's own constants."""
    kg = S.KG_ESTERCO_DIA

    def manure(kind: str, vs: float, bmp: float) -> str:
        return (f"todas as cabeças × {num(kg[kind]['real'])} kg/dia coletável × SV {num(vs)} % × "
                f"BMP {num(bmp)} NmL CH₄/g SV")

    return {
        "vinhaca": (f"cana × {num(round(S.ETANOL_M3_POR_T_CANA, 4))} m³ de etanol/t × "
                    f"{num(S.BIOGAS_M3_POR_M3_ETANOL)} m³ de biogás/m³ de etanol × CH₄ {num(S.CH4_VINHACA[0])}"),
        "torta": (f"cana × {num(S.TORTA_KG_POR_T_CANA)} kg/t × SV {num(S.TORTA_VS)} % × "
                  f"BMP {num(S.TORTA_BMP)} NmL CH₄/g SV"),
        "bovinos": manure("bovino", S.BOV_VS, S.BOV_BMP),
        "suinos": manure("suino", S.SUI_VS, S.SUI_BMP),
        "aves": manure("ave", S.AVE_VS, S.AVE_BMP),
        "esgoto": (f"população × {num(S.ESGOTO_M3_HAB_DIA)} m³/hab/dia × coleta {num(S.ESGOTO_COLETA_REAL)} × "
                   f"DQO {num(S.ESGOTO_DQO_G_M3)} g/m³ × remoção {num(S.ESGOTO_EF_REM)} × "
                   f"{num(S.ESGOTO_PCH4)} Nm³ CH₄/kg DQO removida (fase líquida, não o lodo)"),
        "rsu": (f"população × per capita do Atlas por faixa × coleta {num(S.RSU_COLETA_REAL)} × "
                f"fração orgânica {num(S.RSU_MO_FRACAO)} × {num(S.RSU_FMO_NM3_T)} Nm³ de biogás/t × "
                f"CH₄ {num(S.RSU_CH4)}"),
    }


def atlas_by_municipality(S, rows: list[dict]) -> dict[str, dict[str, float]]:
    """ibge -> stream -> Atlas Real Nm³ CH4/yr."""
    out = {}
    for r in rows:
        flows = S.calcular([r], "real")
        out[r["CD_GEOCODI"].strip()] = {k: sum(flows[f] for f in v[1]) for k, v in STREAMS.items()}
    return out


def base_by_municipality(rows: list[dict]) -> dict[str, dict[str, float]]:
    """ibge -> stream -> base quantity of the master file (t of cane, heads, inhabitants)."""
    def val(r, col):
        try:
            return float((r.get(col) or "0").replace(",", "."))
        except ValueError:
            return 0.0
    return {r["CD_GEOCODI"].strip(): {k: val(r, v[3]) for k, v in STREAMS.items()} for r in rows}


def cp2b_steps() -> tuple[dict[str, dict[str, dict[str, float]]] | None, str]:
    """ibge -> CP2b substrate -> step -> Nm³ CH4/yr (scenario med), or None with the reason."""
    files = B.loader_constant("FILES")
    path = B.CP2B_SNAPSHOT / files["levels"]
    if not path.exists():
        return None, "snapshot CP2b ausente"
    if hashlib.sha256(path.read_bytes()).hexdigest() != B.loader_constant("EXPECTED_SHA256")["levels"]:
        return None, "snapshot CP2b com checksum diferente do v5.1, recusado"
    wanted = {s for v in STREAMS.values() for s in v[2]}
    out: dict = defaultdict(lambda: defaultdict(lambda: dict.fromkeys(STEPS.values(), 0.0)))
    with path.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            if r["scenario"] == "med" and r["substrate"] in wanted:
                cell = out[str(int(float(r["ibge_code"])))][r["substrate"]]
                for col, k in STEPS.items():
                    cell[k] += float(r[col] or 0)
    return out, "CP2b v5.1, cenário med"


def cp2b_parameters() -> list[dict]:
    """The snapshot's parameter rows for the substrates compared here, med with min and max."""
    path = B.CP2B_SNAPSHOT / B.loader_constant("FILES")["parameters"]
    if not path.exists():
        return []
    wanted = {s for v in STREAMS.values() for s in v[2]}
    with path.open(encoding="utf-8-sig") as fh:
        return [r for r in csv.DictReader(fh) if r.get("codigo") in wanted]


def ratio(a: float, b: float) -> float | None:
    return a / b if b else None


def factors(row: dict) -> dict[str, float | None]:
    """The step factors of one row; their product is N4 / Atlas Real."""
    return {label: ratio(row[a], row[b]) for a, b, label in FACTORS}


def main_step(f: dict[str, float | None]) -> str:
    """The factor that moves the result furthest from 1 (largest |log|)."""
    logs = {k: abs(math.log(v)) for k, v in f.items() if v}
    return max(logs, key=logs.get) if logs else ""


def sum_steps(cp: dict, codes, subs) -> dict[str, float]:
    return {k: sum(cp.get(c, {}).get(s, {}).get(k, 0.0) for c in codes for s in subs) for k in STEPS.values()}


def prototypes_on_atlas() -> list[str]:
    """Analysis scripts that read the Atlas Real chain (they call the scenario module)."""
    me = Path(__file__).name
    return sorted(p.name for p in (ROOT / "analysis").glob("build_*.py")
                  if p.name != me and "load_scenario_module(" in p.read_text(encoding="utf-8"))


def write_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(dict.fromkeys(k for r in rows for k in r)))
        w.writeheader()
        w.writerows(rows)


def build(S, rows, muns, cp) -> tuple[list[dict], list[dict]]:
    """(state rows per stream and substrate, region rows per stream)."""
    atlas = atlas_by_municipality(S, rows)
    base = base_by_municipality(rows)
    codes = list(atlas)
    state, regions = [], []
    for key, (label, _, subs, _, unit) in STREAMS.items():
        a = sum(atlas[c][key] for c in codes)
        b = sum(base[c][key] for c in codes)
        row = {"fluxo": key, "nome": label, "substrato": "", "atlas_real": a, "base": b, "base_unidade": unit,
               "atlas_por_unidade": ratio(a, b)}
        if cp is not None:
            row.update(sum_steps(cp, codes, subs))
            f = factors({**row, "atlas": a})
            row.update({"n1_por_unidade": ratio(row["n1"], b), **{k: v for k, v in f.items()},
                        "n3_sobre_atlas": ratio(row["n3"], a), "n4_sobre_atlas": ratio(row["n4"], a),
                        "passo_dominante": main_step(f)})
            row["explicar"] = row["n4_sobre_atlas"] is not None and abs(row["n4_sobre_atlas"] - 1) > TOL
        state.append(row)
        if cp is not None and len(subs) > 1:
            for s in subs:
                sr = {"fluxo": key, "nome": label, "substrato": s, **sum_steps(cp, codes, (s,))}
                sr.update({k: v for k, v in factors({**sr, "atlas": 0.0}).items() if k != "N1 / Atlas"})
                state.append(sr)
        by_region = defaultdict(list)
        for c in codes:
            by_region[muns.get(c, {}).get("nm_rgint", "?")].append(c)
        for reg, cs in sorted(by_region.items()):
            ra = sum(atlas[c][key] for c in cs)
            rr = {"fluxo": key, "regiao_intermediaria": reg, "atlas_real": ra}
            if cp is not None:
                st = sum_steps(cp, cs, subs)
                rr.update({"n3": st["n3"], "n4": st["n4"], "uso_existente": st["uso_existente"],
                           "n4_sobre_atlas": ratio(st["n4"], ra)})
            regions.append(rr)
    return state, regions


def report(state, regions, params, S, note, cp_ok) -> list[str]:
    method = atlas_method(S)
    d = S.DAYS
    L = [
        "# CP2b × Atlas Real, passo a passo por fluxo",
        "",
        "> Gerado por `analysis/build_cp2b_fluxos.py`. Estado de SP, Nm³ CH₄/dia.",
        "",
        "Os cenários Real e Ideal da plataforma, as camadas do mapa e o filtro de resíduos já servem o CP2b "
        "(Real = N4, Ideal = N3), os mesmos números do artigo. Os protótipos de análise calculam os fluxos pela "
        "cadeia do Atlas de Bioenergia SP 2020, Cenário Real (`backend/scripts/sp_scenarios_real_ideal.py`). "
        "Este relatório compara as duas, fluxo a fluxo.",
        "",
        f"Protótipos que leem a cadeia do Atlas: {', '.join(f'`{p}`' for p in prototypes_on_atlas())}.",
        "",
        f"- CP2b: {note}.",
        f"- Referência: N4, o que a plataforma chama de Cenário Real. Diferença acima de {fmt(100 * TOL)} % "
        "precisa de explicação na plataforma ou de nota à equipe do método.",
        "",
    ]
    streams = [r for r in state if not r["substrato"]]
    if not cp_ok:
        L += ["**Sem o snapshot CP2b verificado, só o lado do Atlas.**", "",
              "| Fluxo | Atlas Real | Base | Atlas por unidade da base (Nm³ CH₄/ano) |", "|---|---:|---:|---:|"]
        L += [f"| {r['nome']} | {fmt(r['atlas_real'] / d)} | {fmt(r['base'])} {r['base_unidade']} | "
              f"{fmt(r['atlas_por_unidade'] or 0, 2)} |" for r in streams]
        return L + ["", *method_table(method)]

    def fx(v):
        return f"× {fmt(v, 2)}" if v is not None else "—"

    L += [
        "## Passo a passo",
        "",
        "| Fluxo | Atlas Real | N1 | N2 | N3 antes | Uso existente | N3 | N4 | N4 ÷ Atlas | Passo dominante |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---:|---|",
        *[f"| {'**' + r['nome'] + '**' if r['explicar'] else r['nome']} | {fmt(r['atlas_real'] / d)} | "
          f"{fmt(r['n1'] / d)} | {fmt(r['n2'] / d)} | {fmt(r['n3_antes'] / d)} | {fmt(r['uso_existente'] / d)} | "
          f"{fmt(r['n3'] / d)} | {fmt(r['n4'] / d)} | {fx(r['n4_sobre_atlas'])} | {r['passo_dominante']} |"
          for r in streams],
        "",
        "Fatores de cada passo (o produto é N4 ÷ Atlas):",
        "",
        "| Fluxo | " + " | ".join(lbl for _, _, lbl in FACTORS) + " | N4 ÷ Atlas |",
        "|---|" + "---:|" * (len(FACTORS) + 1),
        *[f"| {r['nome']} | " + " | ".join(fx(r[lbl]) for _, _, lbl in FACTORS) + f" | {fx(r['n4_sobre_atlas'])} |"
          for r in streams],
        "",
        "Por unidade da base do master (a mesma do Atlas), Nm³ CH₄/ano. N1 por unidade mistura a base e o "
        "rendimento do CP2b:",
        "",
        "| Fluxo | Base | Atlas Real | CP2b N1 |",
        "|---|---:|---:|---:|",
        *[f"| {r['nome']} | {fmt(r['base'])} {r['base_unidade']} | {fmt(r['atlas_por_unidade'] or 0, 2)} | "
          f"{fmt(r['n1_por_unidade'] or 0, 2)} |" for r in streams],
        "",
    ]
    subs = [r for r in state if r["substrato"]]
    if subs:
        L += ["Substratos do CP2b dentro de um fluxo (o Atlas tem um número só para o fluxo):", "",
              "| Fluxo | Substrato | N1 | N2 | N3 | N4 | FC | FCo | Uso existente | FS × FL |",
              "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
        L += [f"| {r['nome']} | {r['substrato']} | {fmt(r['n1'] / d)} | {fmt(r['n2'] / d)} | {fmt(r['n3'] / d)} | "
              f"{fmt(r['n4'] / d)} | {fx(r['FC'])} | {fx(r['FCo'])} | {fx(r['uso existente'])} | "
              f"{fx(r['FS × FL'])} |" for r in subs]
        L.append("")
    L += ["## Por região intermediária", "", "N4 ÷ Atlas Real em cada região. Se o fator é parecido em todas, a "
          "diferença vem de parâmetro; se varia, vem da base municipal, do uso existente ou da logística.", ""]
    regs = sorted({r["regiao_intermediaria"] for r in regions})
    L += ["| Região | " + " | ".join(r["nome"] for r in streams) + " |", "|---|" + "---:|" * len(streams)]
    cell = {(r["fluxo"], r["regiao_intermediaria"]): r for r in regions}
    for reg in regs:
        vals = []
        for s in streams:
            v = cell.get((s["fluxo"], reg), {}).get("n4_sobre_atlas")
            vals.append(fmt(v, 2) if v is not None else "—")
        L.append(f"| {reg} | " + " | ".join(vals) + " |")
    flagged = [r["nome"] for r in streams if r["explicar"]]
    L += ["", "## Para explicar", "",
          (f"Diferença acima de {fmt(100 * TOL)} %: {', '.join(flagged)}." if flagged
           else f"Nenhum fluxo passa de {fmt(100 * TOL)} %."), "",
          "A causa provável de cada um está no passo dominante e nos parâmetros abaixo. É uma primeira leitura: "
          "confirmar com a equipe do método antes de escrever na plataforma.", ""]
    L += method_table(method)
    if params:
        L += ["", "## Parâmetros do CP2b (snapshot, cenário med com min e max)", "",
              "| Substrato | Elemento | min | med | max | Unidade | Status | Fonte |",
              "|---|---|---:|---:|---:|---|---|---|"]
        L += [f"| {p.get('codigo', '')} | {p.get('elemento', '')} | {p.get('min', '')} | {p.get('med', '')} | "
              f"{p.get('max', '')} | {p.get('unidade', '')} | {p.get('status', '')} | "
              f"{(p.get('fonte') or '').replace('|', '/')[:160]} |" for p in params]
    return L


def method_table(method: dict[str, str]) -> list[str]:
    return ["## Cadeia do Atlas Real (constantes do `sp_scenarios_real_ideal.py`)", "",
            "| Fluxo | Cálculo |", "|---|---|",
            *[f"| {STREAMS[k][0]} | {v} |" for k, v in method.items()]]


def main() -> None:
    S = B.load_scenario_module()
    rows = list(csv.DictReader(B.MASTER.open(encoding="utf-8-sig")))
    muns = B.municipalities()
    cp, note = cp2b_steps()
    params = cp2b_parameters() if cp is not None else []
    state, regions = build(S, rows, muns, cp)
    OUT.mkdir(parents=True, exist_ok=True)
    write_csv(OUT / "passos.csv", state)
    write_csv(OUT / "regioes.csv", regions)
    method = atlas_method(S)
    write_csv(OUT / "parametros.csv",
              [{"origem": "Atlas Real", "substrato": k, "elemento": "cadeia", "med": v} for k, v in method.items()]
              + [{"origem": "CP2b", "substrato": p.get("codigo", ""), "elemento": p.get("elemento", ""),
                  "min": p.get("min", ""), "med": p.get("med", ""), "max": p.get("max", ""),
                  "unidade": p.get("unidade", ""), "status": p.get("status", ""), "fonte": p.get("fonte", "")}
                 for p in params])
    text = "\n".join(report(state, regions, params, S, note, cp is not None)) + "\n"
    (OUT / "RELATORIO.md").write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
