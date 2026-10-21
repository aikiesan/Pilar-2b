#!/usr/bin/env python3
"""
C23, pacote Integra Resíduos: o que cada bloco regional de SP rende em biogás.

Round-2 idea C23: for each block of the state programme Integra Resíduos
(regional PPPs for municipal solid waste, first auctions expected in 2027),
compute the organic fraction available, the methane of the two routes the
programme can choose between (anaerobic digestion of the source-separated
organic fraction, or a landfill with gas capture), whether each route reaches
the minimum scale of an upgrading project, the new nutrient the digestate
would return to the soil, and a draft of the pre-feasibility card (C2).

Which municipality belongs to which block is NOT in this repository and is
never filled in here. It is typed, row by row and each row with its source,
into analysis/data/09_integra_residuos_blocos_seed.csv (the script creates the
header-only file and never overwrites it). Until a block has members, it is
reported as waiting for its list, and a demonstration area (an IBGE
intermediate region, clearly labelled as not a programme block) runs the whole
calculation so the report can be checked end to end.

Routes, always as Nm³ CH4/yr, Cenário Real, from code already in the repo:

  digestion  FORSU = collected RSU × RSU_MO_FRACAO, × RSU_FMO_NM3_T × RSU_CH4
             (backend/scripts/sp_scenarios_real_ideal.py; the masses are the
             digestate prototype's own, so the nutrients follow the methane).
  landfill   collected RSU × the biogas per tonne implied by the Atlas
             Tabela V.6 state totals (generated / collected) × CAPTACAO_ATERRO
             × CH4_ATERRO (backend/scripts/validate_rsu_against_atlas.py, read
             without importing it, because it needs a DB driver). It is a
             state-average ratio, not a decay model of any landfill.

The two routes are alternatives for the same tonne, not a sum: organic waste
digested is no longer landfilled. Composting is the third route the programme
names and is not covered: the repository has no composting parameters.

Run from the repo root:
  python3 analysis/build_integra_residuos.py
  python3 analysis/build_integra_residuos.py --demo-rgint ""   # no demonstration area

Outputs (analysis/outputs/integra_residuos/):
  blocos.csv    one row per block (and the demonstration area)
  membros.csv   one row per member municipality
  RELATORIO.md  summary, per-block card draft and sources
"""

from __future__ import annotations

import argparse
import ast
import csv
import importlib.util
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
ATLAS_RSU = NEWLOOK / "backend" / "scripts" / "validate_rsu_against_atlas.py"
DIGESTATE = ROOT / "analysis" / "build_sp_digestate_nutrients.py"
RECONCILIATION = ROOT / "analysis" / "build_biogram_reconciliation.py"
OPPORTUNITY = ROOT / "analysis" / "build_sp_opportunity_sites.py"
PLANTS = ROOT / "analysis" / "data" / "05_biogas_plants_brazil.csv"
ANEEL_GD = ROOT / "analysis" / "data" / "05g_aneel_biogas_gd_plants.csv"
CAPEX = ROOT / "analysis" / "outputs" / "bndes_capex_benchmarks" / "capex_por_projeto.csv"
SEED = ROOT / "analysis" / "data" / "09_integra_residuos_blocos_seed.csv"
OUT = ROOT / "analysis" / "outputs" / "integra_residuos"

SEED_COLUMNS = [
    "ibge_code", "municipio", "bloco", "consorcio", "fonte_titulo", "fonte_url",
    "fonte_data", "pagina", "trecho", "conferido", "nota",
]
# Phase 1 of the programme: three modelling blocks (Semil, cartilha of April 2026).
BLOCOS = {
    "concen": "Concen (Região Central)",
    "ceriso": "Ceriso (Bacia do Sorocaba e Médio Tietê)",
    "rmc_consimares": "RMC + Consimares",
}
CONFERIDO = ("sim", "nao")
DEMO_RGINT = "Araraquara"  # 26 municipalities; any IBGE intermediate region name works
PLANT_RADIUS_KM = 50.0  # landfill and FORSU plants this close to a member are listed
LANDFILL_SECTORS = {"landfill"}
LANDFILL_FEEDSTOCKS = {"landfill_gas", "msw_forsu"}
STOPPED = {"inactive", "deactivated"}
HOURS = 8760

SOURCES = [
    ("Semil-SP, Integra Resíduos lança cartilha e apresenta solução regional para "
     "transformar a gestão de resíduos em mais de 60 municípios do Estado de SP (abr. 2026)",
     "https://semil.sp.gov.br/2026/04/integra-residuos-lanca-cartilha-e-apresenta-solucao-regional-"
     "para-transformar-a-gestao-de-residuos-em-mais-de-60-municipios-do-estado-de-sp/"),
    ("Agência iNFRA, SP adia previsão de leilões de resíduos sólidos para começo de 2027 (24 abr. 2026)",
     "https://agenciainfra.com/blog/sp-adia-previsao-de-leiloes-de-residuos-solidos-para-comeco-de-2027/"),
    ("Semil-SP, Semil inicia nova etapa do Integra Resíduos com foco em soluções regionais (ago. 2025)",
     "https://semil.sp.gov.br/2025/08/semil-inicia-nova-etapa-do-integra-residuos-com-foco-em-solucoes-regionais/"),
    ("Programa Integra Resíduos, apresentação de fevereiro de 2025 (Semil-SP)",
     "https://smastr16.blob.core.windows.net/home/2025/03/Programa-Integra-Residuos-Site.pdf"),
]


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def literal(path: Path, name: str):
    """Read a module-level literal without importing the file."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise RuntimeError(f"{name} not found in {path.name}")


def atlas_landfill() -> dict[str, float]:
    """Atlas Cap. V landfill constants, as validate_rsu_against_atlas.py states them."""
    names = ("ATLAS_RSU_COLETADO_T", "ATLAS_BIOGAS_ATERRO_GERADO", "ATLAS_BIOGAS_ATERRO_CAPTADO",
             "ATLAS_BIOMETANO_ATERRO", "CAPTACAO_ATERRO", "CH4_ATERRO", "PUREZA_BIOMETANO", "PCI_CH4_KWH")
    return {n: float(literal(ATLAS_RSU, n)) for n in names}


def landfill_ch4_per_t(A: dict[str, float]) -> float:
    """Nm³ CH4 captured per tonne of collected RSU, implied by the Atlas state totals."""
    return A["ATLAS_BIOGAS_ATERRO_GERADO"] / A["ATLAS_RSU_COLETADO_T"] * A["CAPTACAO_ATERRO"] * A["CH4_ATERRO"]


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().upper()
    return " ".join(s.replace("-", " ").replace("'", " ").split())


# ── Seed ─────────────────────────────────────────────────────────────────────

def ensure_seed(path: Path = SEED) -> None:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", newline="", encoding="utf-8") as fh:
            csv.writer(fh).writerow(SEED_COLUMNS)


def read_seed(path: Path, known: set[str]) -> list[dict]:
    """Validated member rows. Refuses anything that would put a municipality in a block without a source."""
    with path.open(encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames != SEED_COLUMNS:
            raise SystemExit(f"{path.name}: cabeçalho esperado {','.join(SEED_COLUMNS)}")
        rows = [{k: (v or "").strip() for k, v in r.items()} for r in reader]
    errors, seen = [], {}
    for i, r in enumerate(rows, start=2):
        where = f"{path.name}:{i}"
        if not any(r.values()):
            continue
        if r["bloco"] not in BLOCOS:
            errors.append(f"{where}: bloco '{r['bloco']}' fora de {', '.join(BLOCOS)}")
        if r["ibge_code"] not in known:
            errors.append(f"{where}: código IBGE '{r['ibge_code']}' não é um município de SP")
        if not r["fonte_titulo"] or not r["fonte_url"]:
            errors.append(f"{where}: sem fonte (fonte_titulo e fonte_url são obrigatórios)")
        if r["conferido"] not in CONFERIDO:
            errors.append(f"{where}: conferido deve ser sim ou nao")
        if r["ibge_code"] in seen:
            errors.append(f"{where}: {r['ibge_code']} já está na linha {seen[r['ibge_code']]}")
        seen[r["ibge_code"]] = i
    if errors:
        raise SystemExit("\n".join(errors))
    return [r for r in rows if any(r.values())]


# ── Per municipality and per block ───────────────────────────────────────────

def member_flows(S, D, A: dict[str, float], row: dict) -> dict[str, float]:
    """RSU, FORSU, the two routes and the new nutrient for one municipality, Cenário Real."""
    forsu = D.feedstock_tonnes(S, row, "real")["RSU (FORSU)"]
    rsu = forsu / S.RSU_MO_FRACAO
    nut = D.digestate_nutrients({"RSU (FORSU)": forsu})["RSU (FORSU)"]
    return {
        "populacao": float(row.get("populacao_total_hab") or 0),
        "rsu_coletado_t": rsu,
        "forsu_t": forsu,
        "ch4_digestao_nm3_ano": forsu * S.RSU_FMO_NM3_T * S.RSU_CH4,
        "ch4_aterro_nm3_ano": rsu * landfill_ch4_per_t(A),
        **{f"{n}_novo_t": nut[n] for n in D.NUTRIENTS},
    }


def landfill_capex_range() -> tuple[float, float] | None:
    """R$ per m³/d of biomethane, BNDES landfill projects priced on their whole investment."""
    if not CAPEX.exists():
        return None
    with CAPEX.open(encoding="utf-8-sig") as fh:
        vals = [float(r["capex_brl_por_m3d"]) for r in csv.DictReader(fh)
                if r["rota"].startswith("aterro") and r["base"].startswith("investimento total")]
    return (min(vals), max(vals)) if vals else None


def plants_near(B, members: list[dict], muns: dict[str, dict], by_name: dict[str, str]) -> list[dict]:
    """Landfill/FORSU plants in a member municipality or within PLANT_RADIUS_KM of one."""
    pts = [(muns[m["ibge_code"]]["lat"], muns[m["ibge_code"]]["lon"]) for m in members]
    codes = {m["ibge_code"] for m in members}
    out = []

    def near(lat: float, lon: float, code: str) -> float | None:
        d = min(B.haversine_km(lat, lon, a, b) for a, b in pts)
        return 0.0 if code in codes else (d if d <= PLANT_RADIUS_KM else None)

    with PLANTS.open(encoding="utf-8-sig") as fh:
        seen = set()
        for r in csv.DictReader(fh):
            if r["uf"] != "SP" or r["plant_id"] in seen:
                continue
            if r["sector"] not in LANDFILL_SECTORS and r["feedstock"] not in LANDFILL_FEEDSTOCKS:
                continue
            seen.add(r["plant_id"])
            code = by_name.get(norm(r["municipality"]), "")
            d = near(float(r["lat"]), float(r["lon"]), code)
            if d is None:
                continue
            if r["biomethane_nm3_day"]:
                cap = f"{fmt(float(r['biomethane_nm3_day']))} m³/d biometano"
            else:
                cap = f"{r['elec_capacity_mw']} MW" if r["elec_capacity_mw"] else ""
            out.append({"planta": r["plant_name"], "municipio": r["municipality"], "fonte": "ANP/levantamento",
                        "status": r["status"], "distancia_km": d, "capacidade": cap})
    with ANEEL_GD.open(encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            if r["uf"] != "SP" or r["feedstock"] != "msw_landfill":
                continue
            d = near(float(r["lat"]), float(r["lon"]), r["ibge_code"].strip())
            if d is None:
                continue
            out.append({"planta": r["operator"], "municipio": r["municipality"], "fonte": "ANEEL GD",
                        "status": "conectada", "distancia_km": d,
                        "capacidade": f"{fmt(float(r['elec_capacity_kw'] or 0))} kW"})
    return sorted(out, key=lambda p: (p["distancia_km"], p["planta"]))


def block_row(S, D, A, key: str, label: str, members: list[dict], master: dict[str, dict],
              cp2b: dict | None, min_day: float, capex: tuple[float, float] | None) -> tuple[dict, list[dict]]:
    flows = {m["ibge_code"]: member_flows(S, D, A, master[m["ibge_code"]]) for m in members}
    tot = {k: sum(f[k] for f in flows.values()) for k in next(iter(flows.values()))} if flows else {}
    eta = S.ETA_ELETRICA
    row = {"bloco": key, "nome": label, "membros": len(members),
           "membros_a_conferir": sum(1 for m in members if m.get("conferido") == "nao")}
    if flows:
        dig_d = tot["ch4_digestao_nm3_ano"] / S.DAYS
        att_d = tot["ch4_aterro_nm3_ano"] / S.DAYS
        row.update({
            "populacao": round(tot["populacao"]),
            "rsu_coletado_t_ano": round(tot["rsu_coletado_t"]),
            "forsu_t_ano": round(tot["forsu_t"]),
            "ch4_digestao_nm3_dia": round(dig_d),
            "ch4_aterro_nm3_dia": round(att_d),
            "biometano_digestao_m3_dia": round(dig_d / A["PUREZA_BIOMETANO"]),
            "biometano_aterro_m3_dia": round(att_d / A["PUREZA_BIOMETANO"]),
            "escala_digestao_pct": round(100 * dig_d / min_day, 1),
            "escala_aterro_pct": round(100 * att_d / min_day, 1),
            "kw_medio_digestao": round(tot["ch4_digestao_nm3_ano"] * A["PCI_CH4_KWH"] * eta / HOURS),
            "kw_medio_aterro": round(tot["ch4_aterro_nm3_ano"] * A["PCI_CH4_KWH"] * eta / HOURS),
            **{f"{n}_novo_t_ano": round(tot[f"{n}_novo_t"], 1) for n in D.NUTRIENTS},
            "nutriente_novo_mi_brl_ano": round(D.value_brl({n: tot[f"{n}_novo_t"] for n in D.NUTRIENTS}) / 1e6, 3),
            "capex_aterro_mi_brl_min": round(capex[0] * att_d / A["PUREZA_BIOMETANO"] / 1e6, 1) if capex else "",
            "capex_aterro_mi_brl_max": round(capex[1] * att_d / A["PUREZA_BIOMETANO"] / 1e6, 1) if capex else "",
        })
        if cp2b is not None:
            for lv in ("n3", "n4"):
                v = sum(cp2b.get(c, {}).get("rsu", {}).get(lv, 0.0) for c in flows)
                row[f"cp2b_rsu_{lv}_nm3_dia"] = round(v / S.DAYS)
    mem_rows = []
    for m in members:
        f = flows[m["ibge_code"]]
        mem_rows.append({
            "bloco": key, "ibge_code": m["ibge_code"], "municipio": m["municipio"],
            "consorcio": m.get("consorcio", ""), "conferido": m.get("conferido", ""),
            "populacao": round(f["populacao"]), "forsu_t_ano": round(f["forsu_t"]),
            "ch4_digestao_nm3_dia": round(f["ch4_digestao_nm3_ano"] / S.DAYS),
            "ch4_aterro_nm3_dia": round(f["ch4_aterro_nm3_ano"] / S.DAYS),
            "fonte_titulo": m.get("fonte_titulo", ""), "fonte_url": m.get("fonte_url", ""),
        })
    return row, mem_rows


def fmt(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def card(row: dict, plants: list[dict], capex, min_day: float, demo: bool) -> list[str]:
    """Markdown draft of the C2 card for one block."""
    head = f"### {row['nome']}" + (" (DEMONSTRAÇÃO, não é um bloco do programa)" if demo else "")
    if not row["membros"]:
        return [head, "", f"Aguardando a lista de municípios em `{SEED.relative_to(ROOT).as_posix()}`.", ""]
    L = [head, ""]
    if row["membros_a_conferir"]:
        L += [f"> {row['membros_a_conferir']} de {row['membros']} membros com `conferido=nao`: "
              "a soma muda se a lista mudar.", ""]
    L += [
        "| Item | Valor |",
        "|---|---:|",
        f"| Municípios | {row['membros']} |",
        f"| População (hab) | {fmt(row['populacao'])} |",
        f"| RSU coletado (t/ano) | {fmt(row['rsu_coletado_t_ano'])} |",
        f"| FORSU (t/ano) | {fmt(row['forsu_t_ano'])} |",
        f"| CH₄, biodigestão da FORSU (Nm³/dia) | {fmt(row['ch4_digestao_nm3_dia'])} "
        f"({fmt(row['escala_digestao_pct'], 0)} % da escala mínima) |",
        f"| CH₄ captado, aterro (Nm³/dia) | {fmt(row['ch4_aterro_nm3_dia'])} "
        f"({fmt(row['escala_aterro_pct'], 0)} % da escala mínima) |",
        f"| Alternativa elétrica, potência média (kW): digestão / aterro | "
        f"{fmt(row['kw_medio_digestao'])} / {fmt(row['kw_medio_aterro'])} |",
        f"| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | {fmt(row['N_novo_t_ano'])} / "
        f"{fmt(row['P2O5_novo_t_ano'])} / {fmt(row['K2O_novo_t_ano'])} |",
        f"| Valor do nutriente novo a preço de importação (R$ mi/ano) | {fmt(row['nutriente_novo_mi_brl_ano'], 2)} |",
    ]
    if capex:
        L.append(f"| CAPEX indicativo, rota aterro (R$ mi) | {fmt(row['capex_aterro_mi_brl_min'], 1)}–"
                 f"{fmt(row['capex_aterro_mi_brl_max'], 1)} |")
    if "cp2b_rsu_n3_nm3_dia" in row:
        L.append(f"| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | {fmt(row['cp2b_rsu_n3_nm3_dia'])} / "
                 f"{fmt(row['cp2b_rsu_n4_nm3_dia'])} |")
    L += ["", f"Plantas de aterro ou FORSU nos municípios do bloco ou a até {PLANT_RADIUS_KM:.0f} km de um deles:", ""]
    if plants:
        L += ["| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |", "|---|---|---|---|---:|---|"]
        L += [f"| {p['planta']} | {p['municipio']} | {p['fonte']} | {p['status']} | {fmt(p['distancia_km'])} | "
              f"{p['capacidade']} |" for p in plants]
    else:
        L.append("- Nenhuma no cadastro do repositório.")
    return L + [""]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--seed", type=Path, default=SEED)
    ap.add_argument("--demo-rgint", default=DEMO_RGINT,
                    help="IBGE intermediate region run as a labelled demonstration; empty string for none")
    args = ap.parse_args()

    B = load(RECONCILIATION, "biogram_reconciliation")
    D = load(DIGESTATE, "digestate")
    S = D.load_scenario_module()
    A = atlas_landfill()
    min_day = float(literal(OPPORTUNITY, "MIN_SITE_NM3_DAY"))
    capex = landfill_capex_range()
    muns = B.municipalities()
    with D.MASTER.open(encoding="utf-8-sig") as fh:
        master = {r["CD_GEOCODI"].strip(): r for r in csv.DictReader(fh)}
    names = D.names()
    by_name = {norm(n): c for c, n in names.items()}
    known = set(master) & set(muns)

    if args.seed == SEED:
        ensure_seed()
    seed = read_seed(args.seed, known)
    cp2b, cp2b_note = B.cp2b_by_municipality()

    areas = [(k, v, [r for r in seed if r["bloco"] == k], False) for k, v in BLOCOS.items()]
    if args.demo_rgint:
        demo = sorted(c for c, m in muns.items() if m["nm_rgint"] == args.demo_rgint and c in known)
        if not demo:
            raise SystemExit(f"região intermediária '{args.demo_rgint}' não encontrada")
        areas.append(("demo_rgint", f"Região intermediária IBGE de {args.demo_rgint}",
                      [{"ibge_code": c, "municipio": names.get(c, "")} for c in demo], True))

    rows, members, cards = [], [], []
    for key, label, mem, is_demo in areas:
        row, mem_rows = block_row(S, D, A, key, label, mem, master, cp2b, min_day, capex)
        row["demonstracao"] = "sim" if is_demo else "nao"
        rows.append(row)
        members += mem_rows
        cards += card(row, plants_near(B, mem, muns, by_name) if mem else [], capex, min_day, is_demo)

    OUT.mkdir(parents=True, exist_ok=True)
    fields = list(dict.fromkeys(k for r in rows for k in r))
    with (OUT / "blocos.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    with (OUT / "membros.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(members[0]) if members else ["bloco", "ibge_code"])
        w.writeheader()
        w.writerows(members)

    ratio = A["ATLAS_BIOGAS_ATERRO_GERADO"] / A["ATLAS_RSU_COLETADO_T"]
    dig_t = S.RSU_MO_FRACAO * S.RSU_FMO_NM3_T * S.RSU_CH4
    waiting = [BLOCOS[k] for k, _, mem, d in areas if not d and not mem]
    L = [
        "# Pacote Integra Resíduos (C23): protótipo",
        "",
        "Gerado por `analysis/build_integra_residuos.py`. Estratégia 2027, rodada 2, ideia C23.",
        "",
        "Cenário Real (Atlas-FDE). Para cada bloco: FORSU disponível, metano das duas rotas, "
        "escala mínima, nutriente novo e o rascunho do cartão de pré-viabilidade (C2).",
        "",
    ]
    if waiting:
        L += [f"**Blocos aguardando a lista de municípios:** {', '.join(waiting)}. A composição dos blocos não "
              "está no repositório e não é preenchida de memória: cada linha de "
              "`analysis/data/09_integra_residuos_blocos_seed.csv` precisa de fonte.", ""]
    L += [
        "## Método",
        "",
        f"- **Biodigestão:** FORSU = RSU coletado × {fmt(S.RSU_MO_FRACAO, 4)}; "
        f"× {fmt(S.RSU_FMO_NM3_T, 1)} Nm³ biogás/t × {fmt(S.RSU_CH4, 2)} CH₄ = "
        f"{fmt(dig_t, 1)} Nm³ CH₄ por t de RSU coletado (Atlas, Eq. V.5–V.6).",
        f"- **Aterro com captura:** {fmt(ratio, 1)} Nm³ de biogás gerado por t de RSU coletado, razão entre os "
        f"totais estaduais da Tabela V.6 do Atlas (ano-base 2017), × {fmt(A['CAPTACAO_ATERRO'], 2)} captado × "
        f"{fmt(A['CH4_ATERRO'], 2)} CH₄ = {fmt(landfill_ch4_per_t(A), 1)} Nm³ CH₄ por t. É uma média estadual, "
        "não um modelo de decaimento de um aterro específico.",
        f"- **Escala mínima:** {fmt(min_day)} Nm³ CH₄/dia, o corte por planta do Mapa de Oportunidades "
        "(`build_sp_opportunity_sites.py`). A potência média elétrica usa PCI "
        f"{fmt(A['PCI_CH4_KWH'], 2)} kWh/Nm³ e rendimento {fmt(S.ETA_ELETRICA, 2)}.",
        "- **Nutriente novo:** o N-P-K da FORSU no digestato (protótipo de digestato, com a perda de N no "
        "armazenamento). Só a FORSU gera nutriente novo, porque hoje vai para aterro.",
    ]
    if capex:
        L.append(f"- **CAPEX:** R$ {fmt(capex[0])}–{fmt(capex[1])} por m³/dia de biometano, projetos de aterro "
                 "aprovados pelo BNDES com investimento total (`outputs/bndes_capex_benchmarks/`). Só para a rota "
                 "aterro: não há referência brasileira pública de CAPEX para biodigestão de FORSU no repositório.")
    L += [
        f"- **CP2b v5.1:** {cp2b_note}.",
        "",
        "## Leitura",
        "",
        f"1. **As rotas são alternativas, não somam.** A FORSU biodigerida deixa de ir para o aterro. "
        f"Por tonelada de RSU coletado, o aterro com captura rende {fmt(landfill_ch4_per_t(A), 1)} Nm³ de CH₄ "
        f"contra {fmt(dig_t, 1)} da biodigestão da FORSU, porque a razão do Atlas conta todo o carbono "
        "degradável (papel, madeira, têxteis), não só a fração orgânica separada, e o gás de um aterro sai ao longo "
        "de décadas. A biodigestão devolve o nutriente novo e o gás imediatamente; o aterro, não.",
        "2. **Escala:** um bloco abaixo de 100 % da escala mínima pela biodigestão é candidato a geração elétrica "
        "ou a codigestão com outros fluxos do entorno, não a uma planta de biometano dedicada.",
        "3. **Compostagem**, a terceira rota do programa, não está coberta: o repositório não tem parâmetros de "
        "compostagem.",
        "",
        "## Cartão de pré-viabilidade por bloco (rascunho)",
        "",
        *cards,
        "## Limites",
        "",
        "- Massa de RSU pela geração per capita do Atlas (Tabela V.2) e população do master, não pela pesagem "
        "municipal: a tonelagem do SNIS no repositório está quebrada (auditoria de 2026-08-21).",
        "- A FORSU supõe coleta seletiva da fração orgânica, a premissa mais frágil do fluxo.",
        "- Aterros que recebem resíduo de mais de um bloco não são repartidos; o cadastro de aterros com situação "
        "da captura (C12) ainda não existe.",
        "",
        "## Fontes sobre o programa",
        "",
        *[f"- [{t}]({u})" for t, u in SOURCES],
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
