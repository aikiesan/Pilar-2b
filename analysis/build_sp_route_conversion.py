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
before quoting. They live in data/canonical_parameters/mandato_biometano.yaml
(`troca_de_rota`) and the arithmetic in backend/app/services/mandate_service.py
(`route_switch`), which the mandate panel serves; this script loads both and
only adds the sensitivity grid and the report.

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
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
SERVICE = NEWLOOK / "backend" / "app" / "services" / "mandate_service.py"
PARAMS_DIR = NEWLOOK / "data" / "canonical_parameters"
OUT = ROOT / "analysis" / "outputs" / "sp_route_conversion"

# R$/m³ of the environmental attribute for the sensitivity grid: none, two
# steps, and the reference the tariff publishes (appended from the YAML).
ATTRIBUTE_STEPS_BRL_M3 = (0.0, 0.5, 1.0)


def load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def route() -> dict:
    """The panel's route-switch block, with the raw YAML parameters under `params`."""
    M = load(SERVICE, "mandate_service")
    params = M.read(PARAMS_DIR)
    return {**M.route_switch(params), "params": params["troca_de_rota"]}


def biomethane_value(r: dict, attribute: float) -> float:
    """R$ per Nm³ CH4 sold as biomethane."""
    return r["molecule_brl_m3"] + attribute - r["upgrading_brl_m3"]


def fmt(x: float, d: int = 2) -> str:
    return f"{x:,.{d}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def main() -> None:
    r = route()
    p = r["params"]
    attributes = sorted({*ATTRIBUTE_STEPS_BRL_M3, r["reference_attribute_brl_m3"]})
    ch4_m3_yr = r["sp_burned_ch4_m3_day"] * 365

    rows = []
    for price in r["prices"]:
        for a in attributes:
            delta = biomethane_value(r, a) - price["electricity_route_brl_m3"]
            rows.append({
                "eletricidade_brl_mwh": price["electricity_brl_mwh"],
                "atributo_brl_m3": a,
                "rota_eletrica_brl_m3": round(price["electricity_route_brl_m3"], 3),
                "rota_biometano_brl_m3": round(biomethane_value(r, a), 3),
                "vantagem_biometano_brl_m3": round(delta, 3),
                "vantagem_sp_brl_bi_ano": round(delta * ch4_m3_yr / 1e9, 3),
            })
    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "grade_sensibilidade.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    up = r["upgrading_brl_m3"]
    prices = [x["electricity_brl_mwh"] for x in r["prices"]]
    L = [
        "# Troca de rota: eletricidade ou biometano?",
        "",
        "Gerado por `analysis/build_sp_route_conversion.py`. Estratégia 2027, rodada 2 (C17).",
        "",
        f"Por Nm³ de CH₄: PCI {fmt(p['pci_ch4_kwh_m3'])} kWh e rendimento elétrico "
        f"{100 * p['rendimento_eletrico']:.0f} % "
        f"(os do script de cenários). Molécula R$ {fmt(r['molecule_brl_m3'])}/m³ (preço inicial do "
        "biometano no Mercado Cativo Verde da Comgás, Arsesp Del. 1.846/2026); "
        f"purificação R$ {fmt(up)}/m³ (referência europeia convertida). Preços de triagem em "
        "`mandato_biometano.yaml` (`troca_de_rota`), cada um com fonte.",
        "",
        "## Atributo ambiental de equilíbrio",
        "",
        "Quanto o atributo ambiental (CGOB ou equivalente) precisa valer para o biometano pagar "
        "o mesmo que a eletricidade:",
        "",
        "| Preço da eletricidade (R$/MWh) | Rota elétrica (R$/m³ CH₄) | Atributo de equilíbrio (R$/m³) |",
        "|---:|---:|---:|",
    ]
    for price in r["prices"]:
        be = price["breakeven_attribute_brl_m3"]
        L.append(f"| {fmt(price['electricity_brl_mwh'], 0)} | {fmt(price['electricity_route_brl_m3'])} | "
                 f"{'nenhum (já vence sem atributo)' if be <= 0 else 'R$ ' + fmt(be)} |")
    L += [
        "",
        "## Vantagem do biometano, por m³ de CH₄ (R$)",
        "",
        "| Eletricidade (R$/MWh) \\ Atributo (R$/m³) | " + " | ".join(fmt(a) for a in attributes) + " |",
        "|---:|" + "---:|" * len(attributes),
    ]
    for e in prices:
        cells = [fmt(r["vantagem_biometano_brl_m3"]) for r in rows if r["eletricidade_brl_mwh"] == e]
        L.append(f"| {fmt(e, 0)} | " + " | ".join(cells) + " |")
    worst = min(r["vantagem_sp_brl_bi_ano"] for r in rows)
    best = max(r["vantagem_sp_brl_bi_ano"] for r in rows)
    L += [
        "",
        f"Aplicado ao biogás que SP já produz ({r['references']['biogas_sp'][0]['publisher']}: "
        f"{fmt(p['biogas_sp_m3_dia'] / 1e6, 1)} M Nm³/dia, "
        f"meio da faixa de CH₄ = {fmt(ch4_m3_yr / 1e9)} bi Nm³ CH₄/ano), a diferença entre rotas vai de "
        f"R$ {fmt(worst)} bi a R$ {fmt(best)} bi por ano na grade acima.",
        "",
        "## Leitura",
        "",
        f"1. **Com eletricidade abaixo de cerca de R$ {fmt(r['threshold_brl_mwh'], 0)}/MWh, o biometano "
        "vence mesmo sem atributo ambiental.** O PLD SE/CO ficou em abr–jul/2026 entre cerca de "
        f"R$ {prices[0]:.0f} e {prices[2]:.0f}/MWh (boletins da CCEE), "
        + ("abaixo desse limiar: para a energia vendida ao mercado, a troca de rota já se paga."
           if prices[2] < r["threshold_brl_mwh"] else
           "em torno desse limiar: para a energia vendida ao mercado, a troca de rota já se paga "
           "ou fica perto disso."),
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
        "precisar comprar a energia que deixa de gerar, o que é exatamente o caso de preço de "
        f"{prices[-1]:.0f} R$/MWh.",
        "- Molécula e atributo = preços iniciais do Mercado Cativo Verde da Comgás, sem PIS/Cofins "
        "(Arsesp Del. 1.846/2026); o CGOB ainda não tem preço e pode valer outra coisa; purificação = "
        "referência europeia. Fontes por número em `fontes` do YAML; conferir antes de citar.",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
