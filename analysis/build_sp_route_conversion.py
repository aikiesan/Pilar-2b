#!/usr/bin/env python3
"""
Troca de rota, protótipo: vale converter o biogás que SP queima em biometano?

The realization index (build_sp_realization_index.py) found that SP burns about
4.9 M Nm³/d of biogas, mostly for electricity, while less than 1 % of its
potential reaches the grid as biomethane. The mandate scenarios
(build_sp_mandate_coverage.py) found that this burned biogas alone would cover
a 1 % mandate several times over. This prototype asks the next question: per
Nm³ of CH4, when does selling biomethane beat burning it for power?

  electricity route   CH4 × LHV × η_electric × electricity price
  biomethane route    molecule price + environmental attribute (CGOB or
                      equivalent) − upgrading cost

The answer is reported as the BREAK-EVEN ATTRIBUTE: the price the environmental
attribute must reach for the biomethane route to win, for each electricity
price. That is the number a regulator setting the mandate (and so the CGOB
price) can act on.

All prices are screening values with their source; replace by contract data
before quoting. CH4 LHV and electric efficiency are the scenario script's own
constants (imported, not retyped).

Run from the repo root:
  python3 analysis/build_sp_route_conversion.py

Outputs (analysis/outputs/sp_route_conversion/):
  grade_sensibilidade.csv
  RELATORIO.md
"""

from __future__ import annotations

import csv
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCEN = ROOT / "cp2b-workspace" / "NewLook" / "backend" / "scripts" / "sp_scenarios_real_ideal.py"
IRM_SCRIPT = ROOT / "analysis" / "build_sp_realization_index.py"
OUT = ROOT / "analysis" / "outputs" / "sp_route_conversion"

# R$/MWh. 185–300: CCEE daily PLD averages, SE/CO, Apr–Jul 2026. 450: a value
# closer to what a mill avoids paying when the power is self-consumed (assumed).
ELECTRICITY_BRL_MWH = (185.0, 250.0, 300.0, 450.0)
# R$/m³. Molecule in the Arsesp/Comgás Mercado Cativo Verde tariff (2026-09),
# single press source (Diário do Transporte); conferir na deliberação Arsesp.
MOLECULE_BRL_M3 = 2.25
# R$/m³ of the environmental attribute: 0 (none) up to the 1.40 the same tariff
# publication states.
ATTRIBUTE_BRL_M3 = (0.0, 0.5, 1.0, 1.40)
# Upgrading CAPEX + OPEX ≈ €19/MWh for a 250 m³/h unit (European benchmark,
# LNEG-hosted presentation) × LHV × EUR/BRL; conferir com dado brasileiro.
UPGRADING_EUR_MWH = 19.0
BRL_PER_EUR = 6.3


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def electricity_value(S, price_brl_mwh: float) -> float:
    """R$ per Nm³ CH4 burned for power."""
    return S.CH4_LHV_KWH_M3 * S.ETA_ELETRICA * price_brl_mwh / 1000.0


def upgrading_cost(S) -> float:
    """R$ per Nm³ CH4 upgraded."""
    return S.CH4_LHV_KWH_M3 / 1000.0 * UPGRADING_EUR_MWH * BRL_PER_EUR


def biomethane_value(S, attribute: float) -> float:
    return MOLECULE_BRL_M3 + attribute - upgrading_cost(S)


def breakeven_attribute(S, price_brl_mwh: float) -> float:
    """Attribute price (R$/m³) at which both routes pay the same."""
    return electricity_value(S, price_brl_mwh) - (MOLECULE_BRL_M3 - upgrading_cost(S))


def breakeven_electricity(S) -> float:
    """Electricity price (R$/MWh) below which biomethane wins with no attribute at all."""
    return (MOLECULE_BRL_M3 - upgrading_cost(S)) / (S.CH4_LHV_KWH_M3 * S.ETA_ELETRICA) * 1000.0


def fmt(x: float, d: int = 2) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main() -> None:
    S = load(SCEN, "sp_scen")
    R = load(IRM_SCRIPT, "sp_irm")
    biogas, year, source = R.sp_biogas_production()
    ch4_m3_yr = biogas * sum(R.BIOGAS_CH4_FRACTION) / 2 * 365

    rows = []
    for e in ELECTRICITY_BRL_MWH:
        for a in ATTRIBUTE_BRL_M3:
            delta = biomethane_value(S, a) - electricity_value(S, e)
            rows.append({
                "eletricidade_brl_mwh": e,
                "atributo_brl_m3": a,
                "rota_eletrica_brl_m3": round(electricity_value(S, e), 3),
                "rota_biometano_brl_m3": round(biomethane_value(S, a), 3),
                "vantagem_biometano_brl_m3": round(delta, 3),
                "vantagem_sp_brl_bi_ano": round(delta * ch4_m3_yr / 1e9, 3),
            })
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "grade_sensibilidade.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    up = upgrading_cost(S)
    L = [
        "# Troca de rota: eletricidade ou biometano?",
        "",
        "Gerado por `analysis/build_sp_route_conversion.py`. Estratégia 2027, rodada 2 (C16).",
        "",
        f"Por Nm³ de CH₄: PCI {fmt(S.CH4_LHV_KWH_M3)} kWh e rendimento elétrico {100 * S.ETA_ELETRICA:.0f} % "
        f"(constantes do script de cenários). Molécula de biometano R$ {fmt(MOLECULE_BRL_M3)}/m³; "
        f"purificação R$ {fmt(up)}/m³ (referência europeia convertida). Preços de triagem; ver o script.",
        "",
        "## Atributo ambiental de equilíbrio",
        "",
        "Quanto o atributo ambiental (CGOB ou equivalente) precisa valer para o biometano pagar "
        "o mesmo que a eletricidade:",
        "",
        "| Preço da eletricidade (R$/MWh) | Rota elétrica (R$/m³ CH₄) | Atributo de equilíbrio (R$/m³) |",
        "|---:|---:|---:|",
    ]
    for e in ELECTRICITY_BRL_MWH:
        be = breakeven_attribute(S, e)
        L.append(f"| {fmt(e, 0)} | {fmt(electricity_value(S, e))} | "
                 f"{'nenhum (já vence sem atributo)' if be <= 0 else 'R$ ' + fmt(be)} |")
    L += [
        "",
        "## Vantagem do biometano, por m³ de CH₄ (R$)",
        "",
        "| Eletricidade (R$/MWh) \\ Atributo (R$/m³) | " + " | ".join(fmt(a) for a in ATTRIBUTE_BRL_M3) + " |",
        "|---:|" + "---:|" * len(ATTRIBUTE_BRL_M3),
    ]
    for e in ELECTRICITY_BRL_MWH:
        cells = [fmt(r["vantagem_biometano_brl_m3"]) for r in rows if r["eletricidade_brl_mwh"] == e]
        L.append(f"| {fmt(e, 0)} | " + " | ".join(cells) + " |")
    worst = min(r["vantagem_sp_brl_bi_ano"] for r in rows)
    best = max(r["vantagem_sp_brl_bi_ano"] for r in rows)
    L += [
        "",
        f"Aplicado ao biogás que SP já produz ({source}: {fmt(biogas / 1e6, 1)} M Nm³/dia, "
        f"meio da faixa de CH₄ = {fmt(ch4_m3_yr / 1e9)} bi Nm³ CH₄/ano), a diferença entre rotas vai de "
        f"R$ {fmt(worst)} bi a R$ {fmt(best)} bi por ano na grade acima.",
        "",
        "## Leitura",
        "",
        f"1. **Com eletricidade abaixo de cerca de R$ {fmt(breakeven_electricity(S), 0)}/MWh, o biometano "
        "vence mesmo sem atributo ambiental.** O PLD SE/CO ficou na maior parte de abr–jul/2026 entre "
        "R$ 185 e 300/MWh, ou seja, em torno desse limiar: para a energia vendida ao mercado, a troca de rota "
        "já se paga ou fica perto disso.",
        "2. **Quando a eletricidade é autoconsumida e vale perto da tarifa evitada, o atributo decide.** "
        "É o caso típico da usina, que usa o biogás para não comprar energia. Ali, o CGOB precisa "
        "valer algo como o atributo de equilíbrio da última linha da primeira tabela.",
        "3. **Isso liga o mandato à troca de rota.** O patamar do mandato define a escassez e, com ela, "
        "o preço do CGOB; o preço do CGOB define quantas usinas trocam o motor-gerador pela purificação. "
        "O PILAR-2b pode mostrar essa curva por planta, com o biogás de cada uma (ANEEL SIGA, CIBiogás).",
        "",
        "## Limites",
        "",
        "- Não inclui o custo de conexão à rede (TUSD-Verde, gasoduto dedicado ou caminhão), que pode "
        "dominar para plantas longe da malha. O Mapa de Oportunidades (§3.2) é onde essa distância entra.",
        "- Ignora o motor-gerador já pago (custo afundado) e o O&M dele; também ignora que a usina pode "
        "precisar comprar a energia que deixa de gerar, o que é exatamente o caso de preço de 450 R$/MWh.",
        "- Molécula, atributo e purificação vêm de fonte única ou estrangeira. Conferir antes de citar.",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
