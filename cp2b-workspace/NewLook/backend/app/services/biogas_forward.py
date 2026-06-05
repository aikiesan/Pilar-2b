"""
Forward biogas calculation — canonical parameters → biogas potential.

This is the authoritative biomass→biogas path. The historical pipeline stored
biogas as static imported values and *reverse*-derived biomass from them, which
meant corrections to BMP/VS never reached the map totals. This module inverts
that: per-municipality available biomass (the input of record) is multiplied by
canonical chemical parameters to produce biogas potential, with min/medio/max
uncertainty bands.

Unit derivation (why the constants cancel):
    biomass_tons_wet × 1e6 g/ton                       → g wet
        × (TS/100)                                      → g total solids
        × (VS_of_TS/100)                                → g volatile solids
        × BMP [NmL CH4 / g VS]                          → NmL CH4
        × 1e-6 m3/NmL                                   → m3 CH4
    The 1e6 and 1e-6 cancel, so:

        m3_CH4 = biomass_tons_wet × (TS/100) × (VS_of_TS/100) × BMP

    Practical (mobilisable) potential applies the Effective Availability Factor:

        m3_CH4_practical = m3_CH4_theoretical × FDE
        where FDE = FC × FCo × FS × FL × eta   (each in [0, 1])

    Biogas volume (vs. pure CH4) divides by the methane content:

        m3_biogas = m3_CH4 / (CH4_pct / 100)

All inputs come from data/canonical_parameters/feedstocks.yaml via the canonical
adapter; this module performs no I/O so it is trivially unit-testable.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Scenario = Literal["min", "medio", "max"]
SCENARIOS: tuple[Scenario, ...] = ("min", "medio", "max")


@dataclass(frozen=True)
class Range:
    """A parameter expressed as a conservative/realistic/optimistic triple."""
    min: float
    medio: float
    max: float

    def get(self, scenario: Scenario) -> float:
        return getattr(self, scenario)

    @classmethod
    def constant(cls, value: float) -> "Range":
        return cls(value, value, value)


@dataclass(frozen=True)
class FeedstockParams:
    """Canonical chemical + availability parameters for one feedstock.

    bmp          : Range, NmL CH4/gVS (dry-weight VS basis)
    ts           : Range, % wet weight
    vs_of_ts     : Range, % of TS (dry-weight basis)
    ch4_pct      : float, % methane in biogas (single value; used for biogas volume)
    fde          : Range, effective availability factor = FC×FCo×FS×FL×eta in [0, 1]
                   Defaults to 1.0 → theoretical potential.
    availability : Range, physical-availability factor = FC×FCo×FS×FL (without eta)
                   Used to compute biomass_corrected (the fraction mobilisable for biogas).
                   Defaults to 1.0 when FDE has no structured availability block.
    """
    bmp: Range
    ts: Range
    vs_of_ts: Range
    ch4_pct: float = 60.0
    fde: Range = Range(1.0, 1.0, 1.0)
    availability: Range = Range(1.0, 1.0, 1.0)


@dataclass(frozen=True)
class BiogasResult:
    """Per-scenario biogas/methane output for one feedstock at one location."""
    ch4_theoretical_m3: dict[Scenario, float]
    ch4_practical_m3: dict[Scenario, float]
    biogas_practical_m3: dict[Scenario, float]


def _round(x: float, ndigits: int = 2) -> float:
    return round(x, ndigits)


def theoretical_ch4_m3(biomass_tons_wet: float, bmp: float, ts_pct: float, vs_of_ts_pct: float) -> float:
    """m3 CH4 = biomass_wet_tons × (TS/100) × (VS_of_TS/100) × BMP. Never negative."""
    if biomass_tons_wet <= 0 or bmp <= 0 or ts_pct <= 0 or vs_of_ts_pct <= 0:
        return 0.0
    return biomass_tons_wet * (ts_pct / 100.0) * (vs_of_ts_pct / 100.0) * bmp


def biogas_from_ch4(ch4_m3: float, ch4_pct: float) -> float:
    """Convert methane volume to total biogas volume via methane content."""
    if ch4_m3 <= 0 or ch4_pct <= 0:
        return 0.0
    return ch4_m3 / (ch4_pct / 100.0)


def calculate_feedstock(biomass_tons_wet: float, params: FeedstockParams) -> BiogasResult:
    """Compute theoretical + practical CH4 and biogas across all three scenarios.

    Scenario mapping is conservative-aligned: the 'min' scenario uses the min of
    every factor (lowest yield), 'max' uses the max of every factor (highest
    yield). This produces a genuine lower/upper envelope rather than mixing.
    """
    ch4_theo: dict[Scenario, float] = {}
    ch4_prac: dict[Scenario, float] = {}
    biogas_prac: dict[Scenario, float] = {}

    for sc in SCENARIOS:
        theo = theoretical_ch4_m3(
            biomass_tons_wet,
            params.bmp.get(sc),
            params.ts.get(sc),
            params.vs_of_ts.get(sc),
        )
        fde = max(0.0, min(1.0, params.fde.get(sc)))
        prac = theo * fde
        ch4_theo[sc] = _round(theo)
        ch4_prac[sc] = _round(prac)
        biogas_prac[sc] = _round(biogas_from_ch4(prac, params.ch4_pct))

    return BiogasResult(
        ch4_theoretical_m3=ch4_theo,
        ch4_practical_m3=ch4_prac,
        biogas_practical_m3=biogas_prac,
    )


def aggregate(results: dict[str, BiogasResult]) -> BiogasResult:
    """Sum multiple per-feedstock results (e.g. all residues in a municipality)
    scenario-by-scenario. Returns zeros for an empty mapping."""
    ch4_theo: dict[Scenario, float] = {sc: 0.0 for sc in SCENARIOS}
    ch4_prac: dict[Scenario, float] = {sc: 0.0 for sc in SCENARIOS}
    biogas_prac: dict[Scenario, float] = {sc: 0.0 for sc in SCENARIOS}

    for res in results.values():
        for sc in SCENARIOS:
            ch4_theo[sc] += res.ch4_theoretical_m3[sc]
            ch4_prac[sc] += res.ch4_practical_m3[sc]
            biogas_prac[sc] += res.biogas_practical_m3[sc]

    return BiogasResult(
        ch4_theoretical_m3={sc: _round(ch4_theo[sc]) for sc in SCENARIOS},
        ch4_practical_m3={sc: _round(ch4_prac[sc]) for sc in SCENARIOS},
        biogas_practical_m3={sc: _round(biogas_prac[sc]) for sc in SCENARIOS},
    )
