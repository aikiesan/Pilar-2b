#!/usr/bin/env python3
"""
Índice de Realização (IRM) do biometano em São Paulo — série mensal 2020-2026.

IRM = biometano efetivamente produzido (ANP, mensal) ÷ potencial mobilizável.

It is the first "monitoring" indicator of the 2027 strategy
(cp2b-workspace/NewLook/docs/planning/ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md
§2.4): it moves every month, it uses only public data, and it answers the
question the state is asking — how much of the potential is being realised?

Denominators, all Nm³ CH4/yr, both read from the repository, never retyped:
  * CP2b v5.1 N4 (what the map serves as "Real") —
    EXPECTED_STATE_TOTALS in backend/scripts/load_cp2b_potential.py
  * Atlas-FDE Real (METODOLOGIA_CENARIOS_SP_2026-07-30) —
    recomputed with backend/scripts/sp_scenarios_real_ideal.py

N3 already nets out the methane existing plants recover (U), so N4 is the
potential *still available*; IRM against N4 therefore reads "produced per unit
of what is still on the table". At the values below (<1%) the distinction
changes nothing in the first two significant digits.

Biomethane is treated as ~CH4 (the ANP biomethane specification requires
≥ 90% CH4), so produced m³ are compared to Nm³ CH4 without conversion; this
overstates IRM by at most ~10%.

Scope: biomethane only. Biogas burned for electricity (ANEEL) is a separate
route and is NOT in the numerator — kW and m³/d are never conflated.

Run from the repo root:
  python3 analysis/build_sp_realization_index.py

Outputs (analysis/outputs/sp_realization_index/):
  irm_sp_mensal.csv   one row per month
  RELATORIO.md        summary
"""

from __future__ import annotations

import ast
import csv
import importlib.util
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
ANP_MONTHLY = ROOT / "analysis" / "data" / "05d_anp_biometano_production_state_monthly.csv"
ANP_PLANTS = ROOT / "analysis" / "data" / "05c_anp_biometano_plants_latest.csv"
CP2B_LOADER = NEWLOOK / "backend" / "scripts" / "load_cp2b_potential.py"
SCEN = NEWLOOK / "backend" / "scripts" / "sp_scenarios_real_ideal.py"
MASTER = NEWLOOK / "data" / "canonical_parameters" / "SP_master_residue_streams_2023_FINAL.csv"
OUT = ROOT / "analysis" / "outputs" / "sp_realization_index"


def cp2b_state_totals() -> dict[tuple[str, str], float]:
    """Read EXPECTED_STATE_TOTALS without importing the loader (it needs a DB driver)."""
    tree = ast.parse(CP2B_LOADER.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(t, ast.Name) and t.id == "EXPECTED_STATE_TOTALS" for t in node.targets
        ):
            return ast.literal_eval(node.value)
    raise RuntimeError("EXPECTED_STATE_TOTALS not found in load_cp2b_potential.py")


def atlas_real_total() -> float:
    spec = importlib.util.spec_from_file_location("sp_scen", SCEN)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    rows = list(csv.DictReader(MASTER.open(encoding="utf-8-sig")))
    return sum(mod.calcular(rows, "real").values())


def days_in_month(month: int, year: int) -> int:
    if month == 2:
        return 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28
    return 30 if month in (4, 6, 9, 11) else 31


def sp_monthly_production() -> dict[tuple[int, int], float]:
    """m³ per month, all biomethane products (pipeline + compressed) summed."""
    out: dict[tuple[int, int], float] = defaultdict(float)
    with ANP_MONTHLY.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if r["uf"] != "SP":
                continue
            mm, yyyy = r["mesano"].split("/")
            out[(int(yyyy), int(mm))] += float(r["producao_m3"] or 0)
    return dict(sorted(out.items()))


def sp_authorised_capacity() -> tuple[float, str]:
    """Authorised biomethane capacity (m³/d) of SP plants reporting in the latest month."""
    rows = list(csv.DictReader(ANP_PLANTS.open(encoding="utf-8")))
    latest = max(rows, key=lambda r: (r["mesano"][3:], r["mesano"][:2]))["mesano"]
    cap = sum(float(r["cap_biometano_m3d"] or 0) for r in rows if r["uf"] == "SP" and r["mesano"] == latest)
    return cap, latest


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    n4 = cp2b_state_totals()[("med", "n4")]
    n3 = cp2b_state_totals()[("med", "n3")]
    atlas = atlas_real_total()
    denoms = {"cp2b_n4": n4 / 365, "cp2b_n3": n3 / 365, "atlas_real": atlas / 365}

    prod = sp_monthly_production()
    with (OUT / "irm_sp_mensal.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["ano", "mes", "producao_m3_mes", "producao_m3_dia",
                    "irm_pct_cp2b_n4", "irm_pct_cp2b_n3", "irm_pct_atlas_real"])
        series = []
        for (y, m), vol in prod.items():
            per_day = vol / days_in_month(m, y)
            irm = {k: 100 * per_day / d for k, d in denoms.items()}
            series.append((y, m, per_day, irm))
            w.writerow([y, m, round(vol), round(per_day),
                        f"{irm['cp2b_n4']:.3f}", f"{irm['cp2b_n3']:.3f}", f"{irm['atlas_real']:.3f}"])

    cap, cap_month = sp_authorised_capacity()
    last = series[-1]
    last12 = [s for s in series if (s[0], s[1]) > (last[0] - 1, last[1])]
    avg12 = sum(s[2] for s in last12) / len(last12)
    first = series[0]
    lines = [
        "# Índice de Realização do biometano em SP (IRM)",
        "",
        "> Gerado por `analysis/build_sp_realization_index.py` a partir dos dados abertos da ANP",
        "> (`analysis/data/05d_*`, `05c_*`). Só biometano; o biogás para eletricidade (ANEEL) fica fora.",
        "",
        "| Denominador (potencial mobilizável) | Nm³ CH₄/dia |",
        "|---|---:|",
        f"| CP2b v5.1 N4 (o \"Real\" do mapa) | {denoms['cp2b_n4'] / 1e6:.2f} M |",
        f"| CP2b v5.1 N3 (o \"Ideal\" do mapa) | {denoms['cp2b_n3'] / 1e6:.2f} M |",
        f"| Atlas-FDE Real (METODOLOGIA_CENARIOS) | {denoms['atlas_real'] / 1e6:.2f} M |",
        "",
        f"- Série: {first[1]:02d}/{first[0]} a {last[1]:02d}/{last[0]} ({len(series)} meses com produção em SP).",
        f"- Último mês ({last[1]:02d}/{last[0]}): **{last[2] / 1e3:,.0f} mil m³/dia** produzidos, "
        f"**IRM = {last[3]['cp2b_n4']:.2f} %** do Real (N4); {last[3]['atlas_real']:.2f} % do Real Atlas.",
        f"- Média dos últimos 12 meses: {avg12 / 1e3:,.0f} mil m³/dia "
        f"(IRM N4 = {100 * avg12 / denoms['cp2b_n4']:.2f} %).",
        f"- Capacidade **autorizada** pela ANP em SP ({cap_month}): {cap / 1e3:,.0f} mil m³/dia, ou "
        f"{100 * cap / denoms['cp2b_n4']:.1f} % do Real (N4). Uso da capacidade no último mês: "
        f"{100 * last[2] / cap:.0f} %.",
        "",
        "## Leitura",
        "",
        "- O estado produz **menos de 1 %** do biometano que o seu potencial mobilizável sustentaria,",
        "  e as plantas autorizadas operam bem abaixo da capacidade. A lacuna é de **realização**",
        "  (projetos, conexão, contratos), não de recurso.",
        "- Metas oficiais citadas na estratégia (0,7 a 1,3 M m³/dia até 2027) mudariam o IRM para",
        f"  cerca de {100 * 0.7e6 / denoms['cp2b_n4']:.0f}–{100 * 1.3e6 / denoms['cp2b_n4']:.0f} %."
        " Este script permite acompanhar mês a mês se isso acontece.",
        "- O CP2b N3 já desconta o metano recuperado por plantas existentes (U), então o N4 é o",
        "  potencial *ainda disponível*. Com IRM abaixo de 1 %, isso não muda os dois primeiros dígitos.",
        "- Biometano é tratado como CH₄ puro (especificação ANP ≥ 90 % CH₄), o que superestima o IRM",
        "  em no máximo ~10 %.",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
