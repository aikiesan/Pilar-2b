#!/usr/bin/env python3
"""
Mandato do biometano × oferta de SP: protótipo de cenário de política (Estratégia 2027, C11 e C26).

The Combustível do Futuro law (Lei 14.993/2024, Decreto 12.614/2025) obliges
natural-gas producers and importers to cut the GHG intensity of the gas they
sell by a yearly percentage, met with biomethane and proven with CGOB
certificates. CNPE Resolução 4/2026 set 2026 at 0.5 % (exceptionally below
the 1 % the law starts from) and created a monitoring desk to bring back 1 %.

This prototype answers the territorial question a regulator asks: for each
year's target, how many m³/day of biomethane does Brazil need, and how far do
São Paulo's current production, authorised capacity, biogas burned for
electricity and mobilisable potential go towards it?

The targets and their volumes are the official ones, read through the
platform's backend/app/services/mandate_service.py (the numbers the /mandate
panel shows). The GHG-intensity conversion is kept only to state the gas base
an official volume implies.

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
NEWLOOK = ROOT / "cp2b-workspace" / "NewLook"
CANONICAL = NEWLOOK / "data" / "canonical_parameters"
SERVICE = NEWLOOK / "backend" / "app" / "services" / "mandate_service.py"
OUT = ROOT / "analysis" / "outputs" / "sp_mandate_coverage"

NATIONAL_NG_M3_DAY = 54.4e6  # Abegás, consumo 2025 (Poder360, 2026-04)
CI_BIOMETHANE = 8.55  # gCO2e/MJ, CNPE Res. 4/2026
CI_NATURAL_GAS = 66.0  # gCO2e/MJ life cycle, assumed; conferir no RenovaCalc


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def load_irm():
    return _load("sp_irm", IRM_SCRIPT)


def load_targets() -> list[dict]:
    """The official targets, as the platform serves them."""
    service = _load("mandate_service", SERVICE)
    return service.targets(service.read(CANONICAL))


def volume_share(target_pct: float) -> float:
    """Biomethane share of gas volume needed for a GHG-intensity reduction target."""
    return target_pct / 100 / (1 - CI_BIOMETHANE / CI_NATURAL_GAS)


def implied_base_m3_day(target: dict) -> float:
    """The gas volume the official biomethane volume implies, under the CI conversion."""
    return target["volume_m3_day"] / volume_share(target["reduction_pct"])


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


def fmt_pct(x: float) -> str:
    return f"{x:g} %".replace(".", ",")


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
    for t in load_targets():
        need = t["volume_m3_day"]
        row = {
            "ano": t["year"],
            "meta_gee_pct": t["reduction_pct"],
            "status": t["status"],
            "volume_estimado": t["volume_estimated"],
            "demanda_m3_dia": round(need),
            "base_implicita_m3_dia": round(implied_base_m3_day(t)),
            "brasil_producao_atual_pct": 100 * br_prod / need,
        }
        for k, v in supply.items():
            row[k] = 100 * v / need
        rows.append(row)

    OUT.mkdir(parents=True, exist_ok=True)
    with (OUT / "cobertura_por_meta.csv").open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows({k: round(v, 1) if isinstance(v, float) else v for k, v in r.items()} for r in rows)

    head = ["Ano (redução GEE)", "Biometano exigido (M m³/dia)", f"Brasil produz hoje ({br_month})"]
    head += list(supply)
    first, nxt, last = rows[0], rows[1], rows[-1]
    ratio = f"{first['base_implicita_m3_dia'] / NATIONAL_NG_M3_DAY:.1f}".replace(".", ",")
    L = [
        "# Mandato do biometano × oferta de SP",
        "",
        "Gerado por `analysis/build_sp_mandate_coverage.py`. Estratégia 2027, C11 e C26.",
        "",
        "Volumes oficiais lidos de `data/canonical_parameters/mandato_biometano.yaml` pelo "
        "`mandate_service` da plataforma (os mesmos do painel /mandate). Anos indicativos (≈) "
        "escalam o volume publicado mais recente pelo percentual.",
        "",
        "Cada célula de oferta é o % do volume da meta que aquela oferta cobriria.",
        "",
        "| " + " | ".join(head) + " |",
        "|" + "---|" + "---:|" * (len(head) - 1),
    ]
    for r in rows:
        label = f"{r['ano']} ({fmt_pct(r['meta_gee_pct'])}, {r['status']})"
        volume = ("≈ " if r["volume_estimado"] else "") + fmt_m(r["demanda_m3_dia"])
        cells = [label, volume, f"{r['brasil_producao_atual_pct']:.0f} %"]
        cells += [f"{r[k]:.0f} %" for k in supply]
        L.append("| " + " | ".join(cells) + " |")
    sp_now = "SP, biometano produzido"
    sp_burn = "SP, biogás hoje queimado (CH₄, meio da faixa)"
    sp_n4 = "SP, potencial CP2b N4"
    L += [
        "",
        "## Leitura",
        "",
        f"1. **A meta de {first['ano']} ({fmt_pct(first['meta_gee_pct'])}) pede "
        f"{fmt_m(first['demanda_m3_dia'])} M m³/dia.** O Brasil produz hoje "
        f"{first['brasil_producao_atual_pct']:.0f} % disso, e SP sozinho {first[sp_now]:.0f} %. "
        f"Para {nxt['ano']} ({fmt_pct(nxt['meta_gee_pct'])}), a produção nacional atual cobre "
        f"{nxt['brasil_producao_atual_pct']:.0f} %.",
        f"2. **O biogás que SP já queima para eletricidade cobriria {nxt[sp_burn]:.0f} % da meta de "
        f"{nxt['ano']}.** Converter a rota de projetos que já existem (purificação em vez de "
        "motor-gerador) é o caminho mais curto para o mandato; o PILAR-2b pode mapear essas plantas "
        "(ANEEL SIGA + CIBiogás) e estimar a receita de CGOB que a troca de rota destrava.",
        f"3. **O potencial N4 de SP cobriria {last[sp_n4]:.0f} % da trajetória indicativa de "
        f"{last['ano']} ({fmt_pct(last['meta_gee_pct'])}).** O recurso não limita o mandato; a "
        "realização limita.",
        f"4. **A base oficial é mais larga que o mercado distribuído.** Pela conversão de intensidade "
        f"(CI do biometano {str(CI_BIOMETHANE).replace('.', ',')}, do gás natural "
        f"{CI_NATURAL_GAS:g} gCO₂e/MJ), o volume de {first['ano']} implica uma base de "
        f"{fmt_m(first['base_implicita_m3_dia'])} M m³/dia de gás, {ratio} vezes os "
        f"{fmt_m(NATIONAL_NG_M3_DAY)} M do consumo distribuído (Abegás, 2025), o que sugere "
        "um denominador com consumo térmico e de E&P.",
        "",
        "## Limites",
        "",
        "- A meta de 2027 está em consulta pública (Portaria MME 942/2026) e pode mudar; "
        "2028–2030 são trajetória indicativa, sem volume publicado.",
        "- Oferta de SP fixa no mês mais recente; a demanda de anos futuros cresce com o mercado.",
        "- CI do gás natural assumido (conferir no RenovaCalc); só afeta a base implícita.",
        "- Biometano tratado como CH₄; biogás queimado no meio da faixa de "
        f"{100 * R.BIOGAS_CH4_FRACTION[0]:.0f}–{100 * R.BIOGAS_CH4_FRACTION[1]:.0f} % de CH₄.",
        "- O mandato é nacional e o CGOB é negociável: SP não precisa cobrir a meta sozinho. "
        "A tabela mede peso relativo, não obrigação estadual.",
        "",
    ]
    (OUT / "RELATORIO.md").write_text("\n".join(L), encoding="utf-8")
    print("\n".join(L))


if __name__ == "__main__":
    main()
