#!/usr/bin/env python3
"""
Mandato do biometano × oferta de SP: protótipo de cenário de política (Estratégia 2027, C11).

The Combustível do Futuro law (Lei 14.993/2024, Decreto 12.614/2025) obliges
natural-gas producers and importers to cut the GHG intensity of the gas they
sell by a yearly percentage, met with biomethane and proven with CGOB
certificates. CNPE Resolução 4/2026 set 2026 at 0.5 % (exceptionally below
the 1 % the law starts from) and created a monitoring desk to bring back 1 %.

This prototype answers the territorial question a regulator asks: for a given
mandate level, how many m³/day of biomethane does Brazil need, and how far does
São Paulo's current production, authorised capacity, biogas burned for
electricity and mobilisable potential go towards it?

Conversion from a GHG-reduction target to a volume share:
    share = target / (1 − CI_biomethane / CI_natural_gas)
CI_biomethane is the 8.55 gCO2e/MJ CNPE 4/2026 states. CI_natural_gas is an
assumed life-cycle value (combustion 56.1 + upstream) — conferir no RenovaCalc.
The obligation falls on parties above 160 thousand m³/d (ANP Res. 995/2026),
which sell nearly all the gas, so the national consumption is used as the base.

Supply numbers are read from analysis/build_sp_realization_index.py (ANP and
CIBiogás data, CP2b N4), never retyped.

Run from the repo root:
  python3 analysis/build_sp_mandate_coverage.py

Outputs (analysis/outputs/sp_mandate_coverage/):
  cobertura_por_meta.csv
  RELATORIO.md
"""

from __future__ import annotations

import csv
import importlib.util
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IRM_SCRIPT = ROOT / "analysis" / "build_sp_realization_index.py"
OUT = ROOT / "analysis" / "outputs" / "sp_mandate_coverage"

NATIONAL_NG_M3_DAY = 54.4e6  # Abegás, consumo 2025 (Poder360, 2026-04)
CI_BIOMETHANE = 8.55  # gCO2e/MJ, CNPE Res. 4/2026
CI_NATURAL_GAS = 66.0  # gCO2e/MJ life cycle, assumed; conferir no RenovaCalc
TARGETS_PCT = {
    0.5: "meta de 2026, CNPE Res. 4/2026",
    1.0: "patamar inicial da Lei 14.993/2024",
    2.0: "",
    5.0: "",
    10.0: "",
}


def load_irm():
    spec = importlib.util.spec_from_file_location("sp_irm", IRM_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def volume_share(target_pct: float) -> float:
    """Biomethane share of gas volume needed for a GHG-intensity reduction target."""
    return target_pct / 100 / (1 - CI_BIOMETHANE / CI_NATURAL_GAS)


def national_production_latest(R) -> tuple[float, str]:
    """Brazil biomethane m³/day in the latest ANP month, all products and states."""
    by_month: dict[tuple[int, int], float] = defaultdict(float)
    with R.ANP_MONTHLY.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            mm, yyyy = r["mesano"].split("/")
            by_month[(int(yyyy), int(mm))] += float(r["producao_m3"] or 0)
    (y, m), vol = max(by_month.items())
    return vol / R.days_in_month(m, y), f"{m:02d}/{y}"


def fmt_m(x: float) -> str:
    return f"{x / 1e6:.2f}".replace(".", ",")


def main() -> None:
    R = load_irm()
    sp_prod = R.sp_monthly_production()
    (y, m), vol = max(sp_prod.items())
    supply = {
        "SP, biometano produzido": vol / R.days_in_month(m, y),
        "SP, capacidade autorizada ANP": R.sp_authorised_capacity()[0],
        "SP, biogás hoje queimado (CH₄, meio da faixa)": R.sp_biogas_production()[0]
        * sum(R.BIOGAS_CH4_FRACTION)
        / 2,
        "SP, potencial CP2b N4": R.cp2b_state_totals()[("med", "n4")] / 365,
    }
    br_prod, br_month = national_production_latest(R)

    rows = []
    for t, note in TARGETS_PCT.items():
        need = NATIONAL_NG_M3_DAY * volume_share(t)
        row = {"meta_gee_pct": t, "nota": note, "participacao_volumetrica_pct": round(100 * volume_share(t), 3),
               "demanda_m3_dia": round(need), "brasil_producao_atual_pct": round(100 * br_prod / need, 1)}
        for k, v in supply.items():
            row[k] = round(100 * v / need, 1)
        rows.append(row)

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "cobertura_por_meta.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    head = ["Meta (redução GEE)", "Biometano exigido (M m³/dia)", f"Brasil produz hoje ({br_month})"] + list(supply)
    L = [
        "# Mandato do biometano × oferta de SP",
        "",
        "Gerado por `analysis/build_sp_mandate_coverage.py`. Estratégia 2027, C11 (cenários de política).",
        "",
        f"Base: consumo nacional de gás natural de {fmt_m(NATIONAL_NG_M3_DAY)} M m³/dia (Abegás, 2025). "
        f"Conversão de meta de GEE para volume com CI do biometano {str(CI_BIOMETHANE).replace('.', ',')} e do gás natural "
        f"{CI_NATURAL_GAS:g} gCO₂e/MJ (este último assumido; conferir).",
        "",
        "Cada célula de oferta é o % da demanda do mandato que aquela oferta cobriria.",
        "",
        "| " + " | ".join(head) + " |",
        "|" + "---|" * 2 + "---:|" * (len(head) - 2),
    ]
    for r in rows:
        label = f"{r['meta_gee_pct']:g} %".replace(".", ",") + (f" ({r['nota']})" if r["nota"] else "")
        cells = [label, fmt_m(r["demanda_m3_dia"]), f"{r['brasil_producao_atual_pct']:.0f} %"]
        cells += [f"{r[k]:.0f} %" for k in supply]
        L.append("| " + " | ".join(cells) + " |")
    r05, r1, r10 = rows[0], rows[1], rows[-1]
    sp_now = "SP, biometano produzido"
    sp_burn = "SP, biogás hoje queimado (CH₄, meio da faixa)"
    sp_n4 = "SP, potencial CP2b N4"
    L += [
        "",
        "## Leitura",
        "",
        f"1. **A meta de 2026 (0,5 %) pede cerca de {fmt_m(r05['demanda_m3_dia'])} M m³/dia.** O Brasil "
        f"produz hoje {r05['brasil_producao_atual_pct']:.0f} % disso, e SP sozinho "
        f"{r05[sp_now]:.0f} %. É coerente com o CNPE ter baixado a meta: com 1 %, a produção nacional "
        f"atual cobriria {r1['brasil_producao_atual_pct']:.0f} %.",
        f"2. **O biogás que SP já queima para eletricidade cobriria {r1[sp_burn]:.0f} % da meta de 1 %.** "
        "Converter a rota de projetos que já existem (purificação em vez de motor-gerador) é o caminho "
        "mais curto para o mandato; o PILAR-2b pode mapear essas plantas (ANEEL SIGA + CIBiogás) e "
        "estimar a receita de CGOB que a troca de rota destrava.",
        f"3. **O potencial N4 de SP cobriria {r10[sp_n4]:.0f} % de uma meta de 10 %.** "
        "O recurso não limita o mandato em nenhum patamar discutido; a realização limita.",
        "",
        "## Limites",
        "",
        "- Base nacional de consumo de 2025 mantida fixa; a demanda futura cresce com o mercado.",
        "- A base de cálculo do mandato (que volumes de gás entram no denominador) é definida pela ANP; "
        "se incluir consumo térmico e de E&P além do mercado distribuído, a demanda em m³ sobe na mesma proporção.",
        "- CI do gás natural assumido. Uma CI menor aumenta o volume exigido por ponto de meta.",
        "- Biometano tratado como CH₄; biogás queimado no meio da faixa de 55–65 % de CH₄.",
        "- O mandato é nacional e o CGOB é negociável: SP não precisa cobrir a meta sozinho. "
        "A tabela mede peso relativo, não obrigação estadual.",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
