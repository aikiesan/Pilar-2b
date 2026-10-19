"""
Avoided greenhouse-gas emissions of a biogas plant (spec docs/data/ESPEC_MODULO_GEE.md).

    ER = BE_methane + BE_fossil − PE                      tCO2e/year

    BE_methane = P × MCF_baseline × (1 − capture) × ρ × GWP
                 methane the current manure/waste management would emit
    BE_fossil  = E_useful × EF_fossil
                 fossil fuel or grid power the delivered energy displaces
    PE         = (leak + slip + unburnt flare) × ρ × GWP
                 methane the project itself releases

P is the methane the digester produces (Nm³ CH4/year, the platform's VS × BMP).
It flows through the plant as:

    produced P ─┬─ leak      P × leak                   (digester, storage, valves)
                ├─ flared    P × flared_fraction        (unburnt share is emitted)
                └─ used U ──┬─ slip   U × slip          (upgrading off-gas or engine)
                            └─ delivered D = U − slip   → E_useful

Leaked and slipped methane never reaches the user, so it displaces nothing: the
losses cut BE_fossil as well as adding to PE. The combustion CO2 of the
biomethane is biogenic and counts zero (IPCC, GHG Protocol).

All parameters come from data/canonical_parameters/ghg.yaml (loaded by
canonical_loader.load_ghg_params); this module performs no I/O.
"""

from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Optional

MJ_PER_TJ = 1e6
MJ_PER_MWH = 3600.0
KG_PER_T = 1000.0


@dataclass(frozen=True)
class GhgInput:
    """One plant. Fractions in [0, 1]; None takes the ghg.yaml default."""

    ch4_produced_nm3_year: float
    baseline: str = "nao_informado"
    baseline_capture: float = 0.0
    route: str = "biometano_veicular"
    slip_technology: Optional[str] = None  # None: the route's slip_padrao
    leak: Optional[float] = None
    flared_fraction: float = 0.0
    flare_efficiency: Optional[float] = None
    electrical_efficiency: Optional[float] = None
    gwp_version: Optional[str] = None


@dataclass(frozen=True)
class GhgResult:
    be_methane_t: float
    be_fossil_t: float
    pe_leak_t: float
    pe_slip_t: float
    pe_flare_t: float
    er_net_t: float
    delivered_ch4_nm3_year: float
    useful_energy: float
    useful_energy_unit: str
    gwp_version: str
    gwp_value: float
    # Leak fraction at which ER reaches zero, other inputs fixed; None when no
    # leak in [0, 1 − flared] zeroes it.
    leak_break_even: Optional[float]
    # The values actually used, so every number can be traced back to ghg.yaml.
    assumptions: dict
    # Parameters used whose ghg.yaml status is still `conferir` or `pesquisa`.
    unverified: tuple[str, ...]

    @property
    def pe_total_t(self) -> float:
        return self.pe_leak_t + self.pe_slip_t + self.pe_flare_t


def _fraction(name: str, value: float) -> float:
    if not 0.0 <= value <= 1.0:
        raise ValueError(f"{name} must be within [0, 1], got {value}")
    return value


def _pick(table: dict, key: str, what: str) -> dict:
    if key not in table:
        raise ValueError(f"unknown {what} {key!r}; expected one of {sorted(table)}")
    return table[key]


def estimate(params: dict, inp: GhgInput) -> GhgResult:
    """Avoided emissions for one plant. Raises ValueError on unknown keys or bad fractions."""
    if inp.ch4_produced_nm3_year < 0:
        raise ValueError("ch4_produced_nm3_year must not be negative")

    unverified: list[str] = []

    def used(label: str, entry: dict) -> dict:
        if entry.get("status") in ("conferir", "pesquisa"):
            unverified.append(label)
        return entry

    k = params["constantes"]
    rho_t_nm3 = k["rho_ch4_kg_nm3"]["valor"] / KG_PER_T
    lhv_mj = k["pci_ch4_mj_nm3"]["valor"]

    gwp_version = inp.gwp_version or params["gwp_ch4"]["padrao"]
    gwp = _pick(params["gwp_ch4"]["versoes"], gwp_version, "GWP version")["valor"]
    t_per_nm3 = rho_t_nm3 * gwp  # tCO2e per Nm³ of methane released

    base = used(
        f"linhas_de_base.{inp.baseline}",
        _pick(params["linhas_de_base"], inp.baseline, "baseline"),
    )
    route = used(f"rotas.{inp.route}", _pick(params["rotas"], inp.route, "route"))

    pe = params["emissoes_projeto"]
    slip_key = inp.slip_technology or route.get("slip_padrao")
    slip = 0.0
    if slip_key:
        slip = used(
            f"emissoes_projeto.slip.{slip_key}",
            _pick(pe["slip"], slip_key, "slip technology"),
        )["padrao"]
    if inp.leak is None:
        used("emissoes_projeto.vazamento", pe["vazamento"])
    leak = _fraction("leak", pe["vazamento"]["padrao"] if inp.leak is None else inp.leak)
    flared = _fraction("flared_fraction", inp.flared_fraction)
    if leak + flared > 1.0:
        raise ValueError("leak + flared_fraction must not exceed 1")
    flare_eff = _fraction(
        "flare_efficiency",
        pe["flare"]["eficiencia_padrao"] if inp.flare_efficiency is None else inp.flare_efficiency,
    )
    capture = _fraction("baseline_capture", inp.baseline_capture)
    mcf = base["mcf"]

    if "ef_tco2_mwh" in route:
        eff = _fraction(
            "electrical_efficiency",
            (
                route["eficiencia_eletrica"]
                if inp.electrical_efficiency is None
                else inp.electrical_efficiency
            ),
        )
        energy_per_nm3, energy_unit = lhv_mj * eff / MJ_PER_MWH, "MWh"
        ef = route["ef_tco2_mwh"]
    else:
        eff = None
        energy_per_nm3, energy_unit = lhv_mj / MJ_PER_TJ, "TJ"
        ef = route["ef_tco2_tj"]

    p = inp.ch4_produced_nm3_year
    be_methane = p * mcf * (1.0 - capture) * t_per_nm3

    def flows(leak_fraction: float) -> tuple[float, float, float, float]:
        """(delivered Nm³, leak t, slip t, flare t) for a given leak fraction."""
        used_nm3 = p * (1.0 - leak_fraction - flared)
        slipped = used_nm3 * slip
        return (
            used_nm3 - slipped,
            p * leak_fraction * t_per_nm3,
            slipped * t_per_nm3,
            p * flared * (1.0 - flare_eff) * t_per_nm3,
        )

    def net(leak_fraction: float) -> float:
        delivered, *losses = flows(leak_fraction)
        return be_methane + delivered * energy_per_nm3 * ef - sum(losses)

    delivered, pe_leak, pe_slip, pe_flare = flows(leak)
    useful = delivered * energy_per_nm3
    be_fossil = useful * ef

    # ER is linear in the leak fraction, so two points give the root.
    at_zero, at_one = net(0.0), net(1.0)
    break_even = at_zero / (at_zero - at_one) if at_zero > at_one else None
    if break_even is not None and not 0.0 <= break_even <= 1.0 - flared:
        break_even = None

    return GhgResult(
        be_methane_t=be_methane,
        be_fossil_t=be_fossil,
        pe_leak_t=pe_leak,
        pe_slip_t=pe_slip,
        pe_flare_t=pe_flare,
        er_net_t=be_methane + be_fossil - (pe_leak + pe_slip + pe_flare),
        delivered_ch4_nm3_year=delivered,
        useful_energy=useful,
        useful_energy_unit=energy_unit,
        gwp_version=gwp_version,
        gwp_value=gwp,
        leak_break_even=break_even,
        assumptions={
            "baseline": inp.baseline,
            "route": inp.route,
            "mcf": mcf,
            "baseline_capture": capture,
            "leak": leak,
            "slip_technology": slip_key,
            "slip": slip,
            "flared_fraction": flared,
            "flare_efficiency": flare_eff,
            "electrical_efficiency": eff,
            "displaces": route["desloca"],
            "ef_fossil": ef,
            "ef_fossil_unit": f"tCO2/{energy_unit}",
            "rho_ch4_kg_nm3": k["rho_ch4_kg_nm3"]["valor"],
            "lhv_ch4_mj_nm3": lhv_mj,
            "ghg_parameters_version": params["versao"],
        },
        unverified=tuple(unverified),
    )


def estimate_substrates(
    params: dict, ch4_by_substrate: dict[str, float], template: GhgInput
) -> dict[str, GhgResult]:
    """One estimate per CP2b substrate, each with its default baseline from ghg.yaml.

    `template` carries the route, losses and GWP shared by every substrate; its
    baseline and volume are replaced per substrate.
    """
    defaults = params["substratos_linha_de_base"]
    return {
        code: estimate(
            params,
            replace(
                template,
                ch4_produced_nm3_year=ch4,
                baseline=_pick(defaults, code, "CP2b substrate"),
            ),
        )
        for code, ch4 in ch4_by_substrate.items()
    }
