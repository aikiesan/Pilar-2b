#!/usr/bin/env python3
"""
Observatório do financiamento, semente: quanto custa no Brasil um m³/dia de biometano?

Strategy 2027 round 2, C18. The techno-economic engine the strategy proposes
(v1 §3.3) has no Brazilian CAPEX source; the route-conversion prototype uses a
European upgrading cost. BNDES biomethane approvals are public and each press
release states the amount financed, often the total investment, and the
capacity. They live in the platform's canonical parameters
(bndes_biometano_operacoes.csv, one source URL per row, and
financiamento_biometano.yaml), and the arithmetic in
backend/app/services/financing_service.py, which this script loads: the
platform's /api/v1/financing/benchmarks and this report are one calculation.

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
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
CANONICAL = NEWLOOK / "data" / "canonical_parameters"
SERVICE = NEWLOOK / "backend" / "app" / "services" / "financing_service.py"
ROUTE_SCRIPT = ROOT / "analysis" / "build_sp_route_conversion.py"
OUT = ROOT / "analysis" / "outputs" / "bndes_capex_benchmarks"

BASIS = {
    "total": "investimento total",
    "joint_total": "investimento total conjunto",
    "financing": "só financiamento BNDES",
}


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


F = _load("financing_service", SERVICE)


def fmt(x: float, d: int = 0) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main() -> None:
    params = F.read(CANONICAL)
    s = F.summary(params)
    bm, a = s["projects"], s["assumptions"]
    rates = a["rates"]
    route = _load("sp_route", ROUTE_SCRIPT)
    upgrading = route.upgrading_cost(route.load(route.SCEN, "sp_scen"))

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "capex_por_projeto.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["projeto", "uf", "rota", "capacidade_m3_dia", "base", "capex_brl_por_m3d",
                    *[f"capex_nivelado_brl_m3_{int(100 * r)}pct" for r in rates]])
        for b in bm:
            w.writerow([b["project"], b["uf"], b["route"], round(b["capacity_m3_day"]), BASIS[b["basis"]],
                        round(b["capex_brl_per_m3d"]), *[round(lv["brl_per_m3"], 3) for lv in b["levelized"]]])

    rate_hdr = " | ".join(f"Capital nivelado a {int(100 * r)} % (R$/m³)" for r in rates)
    L = [
        "# Quanto custa um m³/dia de biometano no Brasil? (semente BNDES)",
        "",
        "Gerado por `analysis/build_bndes_capex_benchmarks.py` a partir de "
        f"`{CANONICAL.relative_to(ROOT)}/{F.DEALS_CSV}` (uma fonte por linha), com a conta de "
        "`financing_service.py`, a mesma da plataforma. Estratégia 2027, rodada 2, C18.",
        "",
        f"Capital nivelado = CAPEX por m³/dia × fator de recuperação ({a['life_years']} anos) ÷ "
        f"(365 × {int(100 * a['capacity_factor'])} % de fator de capacidade). Só capital: sem O&M, sem matéria-prima.",
        "",
        f"| Projeto | UF | Rota | Capacidade (m³/dia) | Base | CAPEX (R$ por m³/dia) | {rate_hdr} |",
        "|---|---|---|---:|---|---:|" + "---:|" * len(rates),
    ]
    for b in bm:
        mark = " (mín.)" if b["lower_bound"] else ""
        L.append(
            f"| {b['project']} | {b['uf']} | {b['route']} | {fmt(b['capacity_m3_day'])} | {BASIS[b['basis']]} | "
            f"{fmt(b['capex_brl_per_m3d'])}{mark} | "
            + " | ".join(fmt(lv["brl_per_m3"], 2) for lv in b["levelized"]) + " |"
        )
    lf, agro = s["by_route"]["aterro"], s["by_route"]["agroindustrial"]
    landfill = [b for b in bm if b["route_key"] == "aterro" and not b["lower_bound"]]
    lf_lo = min(lv["brl_per_m3"] for b in landfill for lv in b["levelized"])
    lf_hi = max(lv["brl_per_m3"] for b in landfill for lv in b["levelized"])
    L += [
        "",
        "## Leitura",
        "",
        f"1. **Os projetos de aterro custam cerca de R$ {fmt(lf['capex_min'])}–{fmt(lf['capex_max'])} por m³/dia**; "
        f"os agroindustriais, que incluem a digestão e não só a purificação, custam R$ {fmt(agro['capex_min'])}–"
        f"{fmt(agro['capex_max'])} por m³/dia, {fmt(agro['capex_min'] / lf['capex_max'], 1)} a "
        f"{fmt(agro['capex_max'] / lf['capex_min'], 1)} vezes mais. A rota define o CAPEX mais do que a escala nesta amostra.",
        f"2. **Só o capital de um projeto de aterro custa R$ {fmt(lf_lo, 2)}–{fmt(lf_hi, 2)} por m³ produzido.** "
        f"O protótipo de troca de rota usa R$ {fmt(upgrading, 2)}/m³ para a purificação **inteira** "
        "(capital e operação), a partir de uma referência europeia. O dado brasileiro sugere que esse valor é "
        "**otimista**: com O&M, a purificação no Brasil deve ficar acima dele. Isso desloca para cima o atributo "
        "de equilíbrio da troca de rota.",
        f"3. **{s['totals']['deals']} operações não são uma curva de custo.** São o começo dela. Cada nova aprovação "
        "do BNDES entra como uma linha do CSV, e o motor econômico (v1 §3.3) passa a ter uma curva brasileira com fonte.",
        "",
        "## Limites",
        "",
        "- O investimento dos projetos de aterro inclui o que cada um precisa (purificação, compressão, "
        "conexão); a captação do biogás pode já existir. Não é comparável a um projeto que começa do zero.",
        "- O projeto agroindustrial do Paraná também produz CO₂ biogênico e fertilizante, e o CAPEX inclui essas linhas.",
        "- Taxa de capital, vida útil e fator de capacidade são premissas.",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
