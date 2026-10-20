"""
Biomethane mandate panel (Estratégia 2027, C26): the yearly target of the
Combustível do Futuro law against the biomethane Brazil and São Paulo produce.

    coverage = national production (m³/day, latest ANP month) ÷ target (m³/day)

A target with a published volume (vigente, proposta) is used as published. An
indicative one has no volume: it is the latest published target scaled by the
percentage, an order of magnitude only, flagged `volume_estimated`.

Route switch (C17): per Nm³ of CH4, the environmental attribute (CGOB or
equivalent) at which selling biomethane pays as much as burning the biogas for
power, at each electricity price:

    break-even attribute = CH4 × LHV × η × electricity price − (molecule − upgrading)

Inputs live in data/canonical_parameters: mandato_biometano.yaml and the ANP
monthly series it names. `read` is the only I/O; it needs nothing from the
app, so the analysis prototype loads this file directly.
"""

from __future__ import annotations

import calendar
import csv
from collections import defaultdict
from pathlib import Path

PARAMS_YAML = "mandato_biometano.yaml"


def read(directory: Path) -> dict:
    """The YAML, with the ANP rows under `producao.linhas`."""
    import yaml

    params = yaml.safe_load((directory / PARAMS_YAML).read_text(encoding="utf-8"))
    with (directory / params["producao"]["arquivo"]).open(encoding="utf-8") as fh:
        params["producao"]["linhas"] = list(csv.DictReader(fh))
    return params


def monthly_production(rows: list[dict]) -> list[dict]:
    """m³/day per month, Brazil and SP, every product (pipeline and compressed) summed."""
    br: dict[tuple[int, int], float] = defaultdict(float)
    sp: dict[tuple[int, int], float] = defaultdict(float)
    for r in rows:
        mm, yyyy = r["mesano"].split("/")
        key, volume = (int(yyyy), int(mm)), float(r["producao_m3"] or 0)
        br[key] += volume
        if r["uf"] == "SP":
            sp[key] += volume
    out = []
    for y, m in sorted(br):
        days = calendar.monthrange(y, m)[1]
        out.append(
            {
                "month": f"{y}-{m:02d}",
                "br_m3_day": br[(y, m)] / days,
                "sp_m3_day": sp[(y, m)] / days,
            }
        )
    return out


def targets(params: dict) -> list[dict]:
    """Each year's target in m³/day; indicative years scaled from the latest published one."""
    published = [t for t in params["metas"] if t.get("volume_m3_dia")]
    if not published:
        raise ValueError("no target with a published volume")
    ref = max(published, key=lambda t: t["ano"])
    per_point = ref["volume_m3_dia"] / ref["reducao_pct"]
    out = []
    for t in sorted(params["metas"], key=lambda t: t["ano"]):
        estimated = not t.get("volume_m3_dia")
        out.append(
            {
                "year": t["ano"],
                "reduction_pct": t["reducao_pct"],
                "volume_m3_day": per_point * t["reducao_pct"] if estimated else t["volume_m3_dia"],
                "volume_estimated": estimated,
                "cgob_year": t["volume_m3_ano"] / params["m3_por_cgob"] if not estimated else None,
                "status": t["status"],
                "act": t["ato"],
                "source": t["fonte"],
            }
        )
    return out


def route_switch(params: dict) -> dict:
    """Break-even attribute per electricity price, and the CH4 SP burns today."""
    p = params["troca_de_rota"]
    lhv, eta = p["pci_ch4_kwh_m3"], p["rendimento_eletrico"]
    upgrading = lhv / 1000.0 * p["purificacao_eur_mwh"] * p["brl_por_eur"]
    net_molecule = p["molecula_brl_m3"] - upgrading
    rows = []
    for price in p["precos_eletricidade"]:
        electricity = lhv * eta * price["brl_mwh"] / 1000.0
        rows.append(
            {
                "key": price["chave"],
                "electricity_brl_mwh": price["brl_mwh"],
                "electricity_route_brl_m3": electricity,
                "breakeven_attribute_brl_m3": electricity - net_molecule,
            }
        )
    low, high = p["fracao_ch4"]
    return {
        "molecule_brl_m3": p["molecula_brl_m3"],
        "upgrading_brl_m3": upgrading,
        "reference_attribute_brl_m3": p["atributo_referencia_brl_m3"],
        # Below this electricity price biomethane wins with no attribute at all.
        "threshold_brl_mwh": net_molecule / (lhv * eta) * 1000.0,
        "prices": rows,
        "sp_burned_ch4_m3_day": p["biogas_sp_m3_dia"] * (low + high) / 2,
        "sources": {
            "molecule_attribute": p["fonte_molecula_atributo"],
            "molecule_attribute_url": p["url_molecula_atributo"],
            "upgrading": p["fonte_purificacao"],
            "electricity": p["fonte_eletricidade"],
            "electricity_url": p["url_eletricidade"],
            "sp_biogas": p["fonte_biogas_sp"],
        },
    }


def panel(params: dict) -> dict:
    """Targets, the monthly series, and how far the latest month goes towards each target."""
    series = monthly_production(params["producao"]["linhas"])
    if not series:
        raise ValueError("no ANP production rows")
    latest = series[-1]
    goals = [
        {
            **t,
            "coverage": latest["br_m3_day"] / t["volume_m3_day"],
            "sp_share": latest["sp_m3_day"] / t["volume_m3_day"],
        }
        for t in targets(params)
    ]
    return {
        "version": params["versao"],
        "latest": {**latest, "sp_share_of_br": latest["sp_m3_day"] / latest["br_m3_day"]},
        "targets": goals,
        "series": series,
        "production_source": params["producao"]["fonte"],
        "cgob": {
            "public_registry": params["cgob"]["registro_publico"],
            "note": params["cgob"]["nota"],
        },
        "route_switch": route_switch(params) if "troca_de_rota" in params else None,
    }
