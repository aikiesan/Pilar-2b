#!/usr/bin/env python3
"""
C23 v2: the blocks that already exist, municipalities that share a landfill.

The Integra Resíduos blocks (build_integra_residuos.py) wait for a sourced
member list. This script does not wait: the CETESB IQR layer says, for every
SP municipality and year, where its household waste is disposed of
(`Dispoe_em`). Grouping the municipalities by that destination gives the
landfill catchments that already work today, de facto regional blocks.

For each catchment it runs the same per-block calculation as C23 (block_row,
card and plants_near from build_integra_residuos.py, so the two routes, the
minimum scale, the digestate nutrient and the CAPEX range are the same
numbers): the methane the landfill route implies for the waste that arrives
there, and what digesting the organic fraction of the same waste would give.

Read straight from the CETESB file, nothing filled in:

  * one destination in SP     -> member of that destination's catchment
  * more than one destination -> listed apart, not split between them
                                 (CETESB weights the IQR by tonnage but the
                                 layer does not carry the tonnages)
  * destination outside SP    -> listed apart
  * empty Dispoe_em           -> listed apart; the metadata does not say why
  * name that does not match  -> listed apart and failing the tests

A destination is a municipality plus its suffix (`A.P.`, `CDR` or none), whose
meaning is not in the metadata, so `Caieiras - A.P.` and a hypothetical
`Caieiras - CDR` stay separate catchments. A municipality can still host more
than one landfill with the same suffix; the spread of the members' IQR shows it.

Run from the repo root:
  python3 analysis/build_bacias_aterro.py
  python3 analysis/build_bacias_aterro.py --ano 2023

Outputs (analysis/outputs/integra_residuos/bacias_aterro/):
  bacias.csv       one row per catchment, sorted by landfill methane
  membros.csv      one row per member municipality, with the CETESB field
  fora_das_bacias.csv  municipalities in no catchment, and why
  RELATORIO.md     summary, table, cards for the catchments at scale, sources
"""

from __future__ import annotations

import argparse
import csv
import importlib.util
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTEGRA = ROOT / "analysis" / "build_integra_residuos.py"
IQR = ROOT / "analysis" / "data" / "sources" / "cetesb" / "cetesb_iqr_sp_2022_2024.csv"
OUT = ROOT / "analysis" / "outputs" / "integra_residuos" / "bacias_aterro"
ANO = "2024"

SP_SUFFIXES = {"", "A.P.", "CDR"}
OTHER_UFS = {
    "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
    "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "TO",
}
# CETESB spelling -> IBGE spelling of the same municipality. Each target must be
# a name in the repository's IBGE list and each key must not be (tests check both).
ALIASES = {
    "Florínia": "Florínea",
    "São Luís do Paraitinga": "São Luiz do Paraitinga",
    "Sta. Rosa de Viterbo": "Santa Rosa de Viterbo",
}
NO_SCORE = -1.0  # IQR = -1 in 8 or 9 municipalities a year, meaning not in the metadata
SITUACOES = {
    "proprio": "dispõe no próprio município",
    "outro_sp": "dispõe em outro município de SP",
    "multiplo": "mais de um destino (não repartido)",
    "fora_sp": "dispõe fora de SP",
    "sem_destino": "Dispoe_em vazio na camada da CETESB",
    "nao_casado": "destino com nome que não casou com o IBGE",
}
FONTE_TITULO = "CETESB, IQR – Índice de Qualidade de Aterro de Resíduos, campo Dispoe_em"
FONTE_URL = "https://datageo.ambiente.sp.gov.br/"
SOURCES = [
    ("CETESB, IQR – Índice de Qualidade de Aterro de Resíduos 2022–2024, camadas VWM_IQR_CETESB_<ano>_POL "
     "(DataGeo; cópia e pedidos WFS em analysis/data/sources/cetesb/)", FONTE_URL),
    ("CETESB, Inventário Estadual de Resíduos Sólidos Urbanos (publicações e relatórios)",
     "https://cetesb.sp.gov.br/residuossolidos/residuos-solidos/residuos-urbanos-saude-construcao-civil/"
     "publicacoes-e-relatorios/"),
]


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


R = _load(INTEGRA, "integra_residuos")


def name_key(name: str) -> str:
    """CETESB name -> the normalised key of the IBGE name (backtick read as apostrophe)."""
    return R.norm(ALIASES.get(name, name).replace("`", "'"))


def parse_destinations(text: str) -> list[tuple[str, str]]:
    """'Jambeiro - A.P., Santos - A.P.' -> [('Jambeiro', 'A.P.'), ('Santos', 'A.P.')]; '' -> []."""
    out = []
    for part in (p.strip() for p in text.split(",")):
        if not part:
            continue
        name, sep, suffix = part.rpartition(" - ")
        if not sep:
            name, suffix = part, ""
        name, suffix = name.strip(), suffix.strip()
        if suffix not in SP_SUFFIXES and suffix not in OTHER_UFS:
            raise ValueError(f"sufixo desconhecido em Dispoe_em: {text!r}")
        out.append((name, suffix))
    return out


def read_iqr(path: Path, ano: str, by_name: dict[str, str]) -> tuple[list[dict], list[str]]:
    """One record per municipality for `ano`, and the names (origin or destination) that did not match."""
    with path.open(encoding="utf-8") as fh:
        rows = [r for r in csv.DictReader(fh) if r["ano"] == ano]
    records, unmatched = [], []
    for r in rows:
        code = by_name.get(name_key(r["nome"]))
        if code is None:
            unmatched.append(f"origem: {r['nome']}")
            continue
        dests = []
        for name, suffix in parse_destinations(r["dispoe_em"]):
            dcode = "" if suffix in OTHER_UFS else by_name.get(name_key(name), "")
            if suffix not in OTHER_UFS and not dcode:
                unmatched.append(f"destino: {name} (de {r['nome']})")
            dests.append((dcode, name, suffix))
        if not dests:
            situacao = "sem_destino"
        elif len(dests) > 1:
            situacao = "multiplo"
        elif dests[0][2] in OTHER_UFS:
            situacao = "fora_sp"
        elif not dests[0][0]:
            situacao = "nao_casado"
        else:
            situacao = "proprio" if dests[0][0] == code else "outro_sp"
        iqr = float(r["iqr"]) if r["iqr"] not in ("", None) else None
        records.append({
            "ibge_code": code, "nome_cetesb": r["nome"], "dispoe_em": r["dispoe_em"],
            "iqr": None if iqr == NO_SCORE else iqr, "iqr_bruto": r["iqr"],
            "destinos": dests, "situacao": situacao,
        })
    return records, unmatched


def catchments(records: list[dict]) -> dict[tuple[str, str], list[dict]]:
    """(destination IBGE code, suffix) -> records with that single SP destination."""
    out: dict[tuple[str, str], list[dict]] = {}
    for r in records:
        if r["situacao"] in ("proprio", "outro_sp"):
            code, _, suffix = r["destinos"][0]
            out.setdefault((code, suffix), []).append(r)
    return out


def same_destination(records: list[dict], previous: list[dict]) -> tuple[int, int]:
    """Catchment members whose Dispoe_em is identical in the previous year, out of those present in both."""
    before = {r["ibge_code"]: r["dispoe_em"] for r in previous}
    both = [r for r in records if r["situacao"] in ("proprio", "outro_sp") and before.get(r["ibge_code"])]
    return sum(1 for r in both if before[r["ibge_code"]] == r["dispoe_em"]), len(both)


def label(names: dict[str, str], code: str, suffix: str) -> str:
    return f"{names.get(code, code)}" + (f" ({suffix})" if suffix else "")


def first_upper(s: str) -> str:
    return s[:1].upper() + s[1:]


def write_csv(path: Path, rows: list[dict], fallback: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(dict.fromkeys(k for r in rows for k in r)) or fallback)
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ano", default=ANO, choices=("2022", "2023", "2024"))
    ap.add_argument("--iqr", type=Path, default=IQR)
    args = ap.parse_args()

    B = R.load(R.RECONCILIATION, "biogram_reconciliation")
    D = R.load(R.DIGESTATE, "digestate")
    S = D.load_scenario_module()
    A = R.atlas_landfill()
    min_day = float(R.literal(R.OPPORTUNITY, "MIN_SITE_NM3_DAY"))
    capex = R.landfill_capex_range()
    muns = B.municipalities()
    with D.MASTER.open(encoding="utf-8-sig") as fh:
        master = {r["CD_GEOCODI"].strip(): r for r in csv.DictReader(fh)}
    names = D.names()
    by_name = {R.norm(n): c for c, n in names.items()}
    cp2b, cp2b_note = B.cp2b_by_municipality()

    records, unmatched = read_iqr(args.iqr, args.ano, by_name)
    prev = str(int(args.ano) - 1)
    stable = same_destination(records, read_iqr(args.iqr, prev, by_name)[0]) if prev >= "2022" else None
    groups = catchments(records)
    also = Counter((d[0], d[2]) for r in records if r["situacao"] == "multiplo" for d in r["destinos"])

    rows, members, cards = [], [], []
    for (code, suffix), recs in groups.items():
        mem = [{"ibge_code": r["ibge_code"], "municipio": names.get(r["ibge_code"], r["nome_cetesb"]),
                "fonte_titulo": f"{FONTE_TITULO} {args.ano}", "fonte_url": FONTE_URL} for r in recs]
        key = f"aterro_{code}" + (f"_{suffix.strip('.').replace('.', '').lower()}" if suffix else "")
        row, mem_rows = R.block_row(S, D, A, key, label(names, code, suffix), mem, master, cp2b, min_day, capex)
        scores = [r["iqr"] for r in recs if r["iqr"] is not None]
        host = R.plants_near(B, [{"ibge_code": code}], muns, by_name)
        row.update({
            "aterro_ibge": code, "sufixo": suffix,
            "anfitriao_e_membro": "sim" if any(r["ibge_code"] == code for r in recs) else "nao",
            "recebe_tambem_de_multiplos": also.get((code, suffix), 0),
            "iqr_min": min(scores) if scores else "", "iqr_max": max(scores) if scores else "",
            "plantas_no_municipio": "; ".join(p["planta"] for p in host if p["distancia_km"] == 0),
        })
        for m, r in zip(mem_rows, recs):
            m.update({"situacao": r["situacao"], "dispoe_em": r["dispoe_em"], "iqr": r["iqr_bruto"]})
        rows.append(row)
        members += mem_rows
    rows.sort(key=lambda r: -r["ch4_aterro_nm3_dia"])
    members.sort(key=lambda m: ([r["bloco"] for r in rows].index(m["bloco"]), m["municipio"]))
    outside = [{"ibge_code": r["ibge_code"], "municipio": names.get(r["ibge_code"], ""),
                "nome_cetesb": r["nome_cetesb"], "situacao": r["situacao"], "dispoe_em": r["dispoe_em"],
                "iqr": r["iqr_bruto"]} for r in records if r["situacao"] not in ("proprio", "outro_sp")]
    outside.sort(key=lambda r: (r["situacao"], r["municipio"]))
    for r in rows:
        r["demonstracao"] = "nao"
        at_scale = r["escala_aterro_pct"] >= 100
        r["na_escala_aterro"] = "sim" if at_scale else "nao"
        if at_scale:
            mem = [{"ibge_code": m["ibge_code"]} for m in members if m["bloco"] == r["bloco"]]
            cards += R.card(r, R.plants_near(B, mem, muns, by_name), capex, min_day, False)

    OUT.mkdir(parents=True, exist_ok=True)
    write_csv(OUT / "bacias.csv", rows, ["bloco"])
    write_csv(OUT / "membros.csv", members, ["bloco", "ibge_code"])
    write_csv(OUT / "fora_das_bacias.csv", outside, ["ibge_code", "situacao"])

    count = Counter(r["situacao"] for r in records)
    fmt = R.fmt
    in_blocks = sum(r["membros"] for r in rows)
    pop_in = sum(r["populacao"] for r in rows)
    pop_all = sum(float(master[r["ibge_code"]].get("populacao_total_hab") or 0) for r in records
                  if r["ibge_code"] in master)
    shared = [r for r in rows if r["membros"] > 1]
    L = [
        f"# Bacias de aterro da CETESB ({args.ano}): os blocos que já existem (C23 v2)",
        "",
        "Gerado por `analysis/build_bacias_aterro.py`. Estratégia 2027, rodada 2, ideia C23.",
        "",
        "Os municípios agrupados pelo destino que a CETESB registra no campo `Dispoe_em` da camada do IQR "
        f"de {args.ano}. Cada bacia passa pelo mesmo cálculo dos blocos do Integra Resíduos "
        "(`build_integra_residuos.py`): RSU coletado, FORSU, metano pela rota aterro com captura e pela "
        "biodigestão da FORSU (alternativas, não somam), escala mínima, nutriente novo e CAPEX indicativo.",
        "",
        f"**{len(rows)} bacias, {len(shared)} delas com mais de um município; {in_blocks} de {len(records)} "
        f"municípios ({fmt(100 * pop_in / pop_all, 0)} % da população) estão numa bacia.**",
        "",
        "| Situação na camada da CETESB | Municípios |",
        "|---|---:|",
        *[f"| {SITUACOES[k]} | {count.get(k, 0)} |" for k in SITUACOES],
        "",
    ]
    if unmatched:
        L += ["**Nomes que não casaram com o IBGE** (corrigir em `ALIASES` só com a grafia do IBGE):", "",
              *[f"- {u}" for u in unmatched], ""]
    if stable:
        L += [f"Estabilidade: {stable[0]} de {stable[1]} membros de bacia com destino registrado em {prev} "
              f"mantiveram o mesmo `Dispoe_em` em {args.ano}.", ""]
    L += [
        "## Bacias",
        "",
        f"Escala mínima: {fmt(min_day)} Nm³ CH₄/dia. Ordenadas pelo metano da rota aterro. "
        "IQR das origens: menor e maior nota dos membros (sem as notas -1); uma faixa larga sugere mais de "
        "um aterro no mesmo município.",
        "",
        "| Destino | Municípios | População | RSU (t/ano) | CH₄ aterro (Nm³/dia) | % escala | "
        "CH₄ digestão (Nm³/dia) | % escala | IQR das origens | Plantas no município do destino |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---|---|",
    ]
    for r in rows:
        iqr = (f"{fmt(r['iqr_min'], 1)}–{fmt(r['iqr_max'], 1)}" if r["iqr_min"] != r["iqr_max"]
               else fmt(r["iqr_min"], 1)) if r["iqr_min"] != "" else "sem nota"
        L.append(f"| {r['nome']} | {r['membros']} | {fmt(r['populacao'])} | {fmt(r['rsu_coletado_t_ano'])} | "
                 f"{fmt(r['ch4_aterro_nm3_dia'])} | {fmt(r['escala_aterro_pct'], 0)} | "
                 f"{fmt(r['ch4_digestao_nm3_dia'])} | {fmt(r['escala_digestao_pct'], 0)} | {iqr} | "
                 f"{r['plantas_no_municipio'] or '—'} |")
    L += [
        "",
        "## Leitura",
        "",
        "1. **A bacia é o bloco de fato.** O resíduo já viaja até esses destinos hoje; um projeto de biogás no "
        "destino não precisa de um consórcio novo para ter escala, só de contrato com quem já está lá.",
        "2. **Rota aterro:** é o gás que a razão estadual do Atlas atribui ao resíduo que chega por ano, não o "
        "gás do resíduo já aterrado, que pode ser maior num aterro antigo. A coluna de plantas mostra onde já "
        "existe captura no cadastro do repositório.",
        "3. **Rota digestão:** é o teto se toda a fração orgânica dos membros fosse separada e levada ao mesmo "
        "destino, o que supõe coleta seletiva da FORSU.",
        "",
        "## Cartão de pré-viabilidade (rascunho), bacias na escala mínima pela rota aterro",
        "",
        *(cards or ["- Nenhuma bacia na escala mínima.", ""]),
        "## Fora das bacias",
        "",
        "Lista completa em `fora_das_bacias.csv`.",
        "",
    ]
    for k in ("multiplo", "fora_sp", "nao_casado"):
        sel = [r for r in outside if r["situacao"] == k]
        if sel:
            pairs = "; ".join(f"{r['municipio']} → {r['dispoe_em']}" for r in sel)
            L += [f"**{first_upper(SITUACOES[k])}:** {pairs}", ""]
    L += [
        f"**{first_upper(SITUACOES['sem_destino'])}:** {count.get('sem_destino', 0)} municípios. A camada traz o "
        "IQR deles, mas não o destino; o motivo não está nos metadados e o destino não é preenchido aqui.",
        "",
        "## Limites",
        "",
        "- O significado dos sufixos `A.P.` e `CDR` não está nos metadados; os destinos com sufixos diferentes "
        "ficam em bacias separadas.",
        "- Quem dispõe em mais de um destino não é repartido: a camada não traz as toneladas por destino. Esses "
        "destinos recebem mais do que a bacia mostra (coluna `recebe_tambem_de_multiplos` em `bacias.csv`).",
        "- Massa de RSU pela geração per capita do Atlas e população do master, como no C23, não pela pesagem "
        "no aterro.",
        f"- CP2b v5.1: {cp2b_note}.",
        "",
        "## Fontes",
        "",
        *[f"- [{t}]({u})" for t, u in SOURCES],
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
