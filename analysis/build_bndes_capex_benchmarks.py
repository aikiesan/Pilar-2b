#!/usr/bin/env python3
"""
Observatório do financiamento, semente: quanto custa no Brasil um m³/dia de biometano?

Strategy 2027 round 2, C18. The techno-economic engine the strategy proposes
(v1 §3.3) has no Brazilian CAPEX source; the route-conversion prototype uses a
European upgrading cost. BNDES biomethane approvals are public and each press
release states the amount financed, often the total investment, and the
capacity. analysis/data/06_bndes_biomethane_deals_seed.csv holds the first five,
one source URL per row.

For each project, or project pair when only a joint total was published:
  capex_per_m3d   total investment ÷ capacity (R$ per m³/d). When only the
                  financing is known it is a LOWER bound and is marked so.
  levelized       capex_per_m3d × CRF(rate, life) ÷ (365 × capacity factor),
                  R$ per m³ produced, capital only (no O&M, no feedstock).

The levelized capital cost is then compared with the all-in upgrading cost
assumed in build_sp_route_conversion.py (read from it, not retyped).

Run from the repo root:
  python3 analysis/build_bndes_capex_benchmarks.py

Outputs (analysis/outputs/bndes_capex_benchmarks/):
  capex_por_projeto.csv
  RELATORIO.md
"""

from __future__ import annotations

import csv
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEALS = ROOT / "analysis" / "data" / "06_bndes_biomethane_deals_seed.csv"
ROUTE_SCRIPT = ROOT / "analysis" / "build_sp_route_conversion.py"
OUT = ROOT / "analysis" / "outputs" / "bndes_capex_benchmarks"

RATES = (0.10, 0.12)  # real cost of capital, assumed range
LIFE_YEARS = 20
CAPACITY_FACTOR = 0.90
# Projects whose total investment was only published jointly.
JOINT_TOTALS_MI_BRL = {("GNR Mauá (Lara + MDC Energia)", "GNR Vila Velha (Lara + MDC Energia)"): 245.0}


def crf(rate: float, years: int) -> float:
    """Capital recovery factor."""
    return rate / (1 - (1 + rate) ** -years)


def levelized(capex_per_m3d: float, rate: float) -> float:
    return capex_per_m3d * crf(rate, LIFE_YEARS) / (365 * CAPACITY_FACTOR)


def load_deals() -> list[dict]:
    with DEALS.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def benchmarks(deals: list[dict]) -> list[dict]:
    """One entry per project, or per joint-total group, with R$ per m³/d."""
    by_name = {d["projeto"]: d for d in deals}
    grouped = {n for names in JOINT_TOTALS_MI_BRL for n in names}
    out = []
    for names, total in JOINT_TOTALS_MI_BRL.items():
        cap = sum(float(by_name[n]["capacidade_m3_dia"]) for n in names)
        out.append({
            "projeto": " + ".join(names),
            "uf": "/".join(by_name[n]["uf"] for n in names),
            "rota": by_name[names[0]]["rota"],
            "capacidade_m3_dia": cap,
            "base": "investimento total conjunto",
            "capex_por_m3d": total * 1e6 / cap,
            "limite_inferior": False,
        })
    for d in deals:
        if d["projeto"] in grouped:
            continue
        cap = float(d["capacidade_m3_dia"])
        total = d["investimento_total_mi_brl"]
        value = float(total) if total else float(d["financiamento_bndes_mi_brl"])
        out.append({
            "projeto": d["projeto"],
            "uf": d["uf"],
            "rota": d["rota"],
            "capacidade_m3_dia": cap,
            "base": "investimento total" if total else "só financiamento BNDES",
            "capex_por_m3d": value * 1e6 / cap,
            "limite_inferior": not total,
        })
    return sorted(out, key=lambda b: b["capex_por_m3d"])


def load_route():
    spec = importlib.util.spec_from_file_location("sp_route", ROUTE_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def fmt(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main() -> None:
    bm = benchmarks(load_deals())
    route = load_route()
    S = route.load(route.SCEN, "sp_scen")
    upgrading = route.upgrading_cost(S)

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "capex_por_projeto.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["projeto", "uf", "rota", "capacidade_m3_dia", "base", "capex_brl_por_m3d",
                    *[f"capex_nivelado_brl_m3_{int(100 * r)}pct" for r in RATES]])
        for b in bm:
            w.writerow([b["projeto"], b["uf"], b["rota"], round(b["capacidade_m3_dia"]), b["base"],
                        round(b["capex_por_m3d"]), *[round(levelized(b["capex_por_m3d"], r), 3) for r in RATES]])

    rate_hdr = " | ".join(f"Capital nivelado a {int(100 * r)} % (R$/m³)" for r in RATES)
    L = [
        "# Quanto custa um m³/dia de biometano no Brasil? (semente BNDES)",
        "",
        "Gerado por `analysis/build_bndes_capex_benchmarks.py` a partir de "
        "`analysis/data/06_bndes_biomethane_deals_seed.csv` (uma fonte por linha). Estratégia 2027, rodada 2, C18.",
        "",
        f"Capital nivelado = CAPEX por m³/dia × fator de recuperação ({LIFE_YEARS} anos) ÷ "
        f"(365 × {int(100 * CAPACITY_FACTOR)} % de fator de capacidade). Só capital: sem O&M, sem matéria-prima.",
        "",
        f"| Projeto | UF | Rota | Capacidade (m³/dia) | Base | CAPEX (R$ por m³/dia) | {rate_hdr} |",
        "|---|---|---|---:|---|---:|" + "---:|" * len(RATES),
    ]
    for b in bm:
        mark = " (mín.)" if b["limite_inferior"] else ""
        L.append(
            f"| {b['projeto']} | {b['uf']} | {b['rota']} | {fmt(b['capacidade_m3_dia'])} | {b['base']} | "
            f"{fmt(b['capex_por_m3d'])}{mark} | "
            + " | ".join(fmt(levelized(b["capex_por_m3d"], r), 2) for r in RATES) + " |"
        )
    landfill = [b for b in bm if b["rota"].startswith("aterro") and not b["limite_inferior"]]
    agro = [b for b in bm if b["rota"].startswith("agro")]
    lf_lo = min(levelized(b["capex_por_m3d"], RATES[0]) for b in landfill)
    lf_hi = max(levelized(b["capex_por_m3d"], RATES[-1]) for b in landfill)
    L += [
        "",
        "## Leitura",
        "",
        f"1. **Os projetos de aterro custam cerca de R$ {fmt(min(b['capex_por_m3d'] for b in landfill))}–"
        f"{fmt(max(b['capex_por_m3d'] for b in landfill))} por m³/dia**; o projeto agroindustrial, que inclui "
        f"a digestão e não só a purificação, custa cerca de R$ {fmt(agro[0]['capex_por_m3d'])} por m³/dia, "
        "2 a 3 vezes mais. A rota define o CAPEX mais do que a escala nesta amostra.",
        f"2. **Só o capital de um projeto de aterro custa R$ {fmt(lf_lo, 2)}–{fmt(lf_hi, 2)} por m³ produzido.** "
        f"O protótipo de troca de rota usa R$ {fmt(upgrading, 2)}/m³ para a purificação **inteira** "
        "(capital e operação), a partir de uma referência europeia. O dado brasileiro sugere que esse valor é "
        "**otimista**: com O&M, a purificação no Brasil deve ficar acima dele. Isso desloca para cima o atributo "
        "de equilíbrio da troca de rota.",
        "3. **Cinco operações não são uma curva de custo.** São o começo dela. Cada nova aprovação do BNDES "
        "entra como uma linha do CSV, e o motor econômico (v1 §3.3) passa a ter uma curva brasileira com fonte.",
        "",
        "## Limites",
        "",
        "- O investimento dos projetos de aterro inclui o que cada um precisa (purificação, compressão, "
        "conexão); a captação do biogás pode já existir. Não é comparável a um projeto que começa do zero.",
        "- O projeto agroindustrial também produz CO₂ biogênico e fertilizante, e o CAPEX inclui essas linhas.",
        "- Taxa de capital, vida útil e fator de capacidade são premissas.",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
