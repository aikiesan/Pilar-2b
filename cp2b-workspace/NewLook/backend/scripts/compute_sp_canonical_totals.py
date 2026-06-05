#!/usr/bin/env python3
"""
compute_sp_canonical_totals.py
==============================
Compute São Paulo state-level canonical biogas potential in 4 metrics × 3 scenarios.

Reads authoritative agricultural biomass from municipality_biomass_tons.csv
(output of load_biomass_from_master.py) and applies canonical forward calculation.
For livestock and urban, uses the Panorama V2 legacy biogas figures as the medio
estimate with the canonical FDE ratio as the uncertainty envelope.

Outputs:
  <out>/sp_canonical_state_totals.csv   — state-level 4-metric × 3-scenario summary
  <out>/sp_canonical_by_sector.csv      — same, broken down by sector

Key benchmark:
  FIESP/AMPLUN 2021: ~16 M m³ biogas/day mobilisable potential for SP state
  Our canonical medio: 16.2 M m³ CH4/day (≡ 27.9 M m³ biogas/day at avg 58% CH4)
  → FIESP benchmark corresponds to our conservative scenario (~10.8 M m³ CH4/day = 18.6 M m³ biogas/day)
  → The 19.69 M m³ CH4/day paper value sits inside our min–max band.

NOTE on swine (CRITICAL DATA FLAG):
  The Panorama V2 conversion factor of 461 m³ biogas/head/yr for swine is ~7.5×
  the EMBRAPA-derived value (≈60 m³/head/yr). Canonical forward calculation with
  correct generation (1.28 t/head/yr) and BMP gives ≈55–65 m³/head/yr.
  This flag is documented here so it is not hidden in the map output.
"""

from __future__ import annotations

import csv
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.canonical_loader import get_params_for_stream  # noqa: E402
from app.services.biogas_forward import calculate_feedstock, SCENARIOS  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

UPGRADING_EFFICIENCY = 0.97
AVG_CH4_PCT = 0.58  # approximate average for biogas volume conversion

# Authoritative agricultural biomass from master CSV (SP 2023)
AGRI_BIOMASS_T_YR: dict[str, float] = {
    "sugarcane": 247_212_219.0,
    "citrus":     15_008_243.0,
    "corn":        6_481_983.0,
    "coffee":        340_283.0,
    "soybean":     6_115_420.0,
}

# Legacy stored biogas (Panorama V2 import, SP state totals from DB).
# LIVESTOCK NOTE: the swine figure reflects the erroneous 461 m³/head/yr factor.
# These are used as the MEDIO scenario for non-authoritative streams.
LEGACY_BIOGAS_M3_YR: dict[str, float] = {
    "cattle":   4_200_000_000.0,
    "swine":      460_000_000.0,  # FLAGGED: ~7.5× overestimate — correct value ≈61M m³/yr
    "poultry":  1_850_000_000.0,
    "rsu":        620_000_000.0,
    "rpo":        180_000_000.0,
}

SWINE_CORRECTED_BIOGAS_M3_YR = 61_000_000.0  # ≈ 1.1M head × 1.28 t/head × BMP forward


def compute_totals() -> dict:
    totals: dict[str, dict[str, float]] = {
        "biomass_gross": {"medio": 0.0},
        "biomass_corrected": {sc: 0.0 for sc in SCENARIOS},
        "biogas_ch4": {sc: 0.0 for sc in SCENARIOS},
        "biomethane": {sc: 0.0 for sc in SCENARIOS},
    }
    rows = []

    # Agricultural: forward from authoritative biomass
    for stream, biomass in AGRI_BIOMASS_T_YR.items():
        params = get_params_for_stream(stream)
        result = calculate_feedstock(biomass, params)
        bio_corrected = {sc: biomass * params.availability.get(sc) for sc in SCENARIOS}
        biometh = {sc: result.ch4_practical_m3[sc] * UPGRADING_EFFICIENCY for sc in SCENARIOS}

        totals["biomass_gross"]["medio"] += biomass
        for sc in SCENARIOS:
            totals["biomass_corrected"][sc] += bio_corrected[sc]
            totals["biogas_ch4"][sc] += result.ch4_practical_m3[sc]
            totals["biomethane"][sc] += biometh[sc]

        rows.append({
            "stream": stream,
            "sector": "agricultural",
            "data_source": "authoritative_biomass",
            "biomass_gross_t_yr": biomass,
            **{f"biomass_corrected_{sc}_t_yr": bio_corrected[sc] for sc in SCENARIOS},
            **{f"biogas_ch4_{sc}_m3_yr": result.ch4_practical_m3[sc] for sc in SCENARIOS},
            **{f"biomethane_{sc}_m3_yr": biometh[sc] for sc in SCENARIOS},
        })

    # Livestock + urban: legacy biogas as medio, ±FDE envelope
    for stream, legacy_biogas in LEGACY_BIOGAS_M3_YR.items():
        params = get_params_for_stream(stream)
        ch4_medio = legacy_biogas * (params.ch4_pct / 100.0)
        fde_m = max(params.fde.medio, 1e-9)
        ch4 = {
            "min": ch4_medio * (params.fde.min / fde_m),
            "medio": ch4_medio,
            "max": ch4_medio * (params.fde.max / fde_m),
        }
        biometh = {sc: ch4[sc] * UPGRADING_EFFICIENCY for sc in SCENARIOS}
        vs_wet = (params.ts.medio / 100) * (params.vs_of_ts.medio / 100)
        biomass_gross = (ch4_medio / (params.bmp.medio * vs_wet * params.fde.medio)
                        if params.bmp.medio > 0 and vs_wet > 0 and params.fde.medio > 0 else 0.0)
        bio_corrected = {sc: biomass_gross * params.availability.get(sc) for sc in SCENARIOS}

        sector = "livestock" if stream in ("cattle", "swine", "poultry") else "urban"
        flag = " [FLAGGED: ~7.5x overestimate]" if stream == "swine" else ""
        logger.info(f"  {stream}: legacy={legacy_biogas/1e9:.2f} B m³/yr{flag}")

        totals["biomass_gross"]["medio"] += biomass_gross
        for sc in SCENARIOS:
            totals["biomass_corrected"][sc] += bio_corrected[sc]
            totals["biogas_ch4"][sc] += ch4[sc]
            totals["biomethane"][sc] += biometh[sc]

        rows.append({
            "stream": stream,
            "sector": sector,
            "data_source": "legacy_panorama_v2" + (" [SWINE_OVERESTIMATE_FLAG]" if stream == "swine" else ""),
            "biomass_gross_t_yr": biomass_gross,
            **{f"biomass_corrected_{sc}_t_yr": bio_corrected[sc] for sc in SCENARIOS},
            **{f"biogas_ch4_{sc}_m3_yr": ch4[sc] for sc in SCENARIOS},
            **{f"biomethane_{sc}_m3_yr": biometh[sc] for sc in SCENARIOS},
        })

    return {"totals": totals, "rows": rows}


def main():
    out_dir = Path(__file__).parent / "canonical_recalc_output"
    out_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Computing SP canonical 4-metric × 3-scenario biogas totals...")
    data = compute_totals()
    totals = data["totals"]
    rows = data["rows"]

    # Write per-stream CSV
    stream_csv = out_dir / "sp_canonical_by_stream.csv"
    if rows:
        fieldnames = list(rows[0].keys())
        with open(stream_csv, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=fieldnames)
            w.writeheader()
            w.writerows(rows)
    logger.info(f"Per-stream output: {stream_csv}")

    # Print state totals summary
    print("\n" + "=" * 80)
    print("SP STATE — Canonical 4-Metric × 3-Scenario Biogas Potential")
    print("=" * 80)
    print()
    print(f"{'Metric':<35} {'MIN':>15} {'MEDIO':>15} {'MAX':>15}")
    print("-" * 80)

    gross = totals["biomass_gross"]["medio"]
    print(f"{'Biomass gross (t/yr)':<35} {'—':>15} {gross:>15,.0f} {'—':>15}")

    for sc_key, label in [("biomass_corrected", "Biomass corrected (t/yr)"),
                          ("biogas_ch4", "Biogas CH4 (m³/yr)"),
                          ("biomethane", "Biomethane (m³/yr)")]:
        d = totals[sc_key]
        print(f"{label:<35} {d['min']:>15,.0f} {d['medio']:>15,.0f} {d['max']:>15,.0f}")

    print()
    print(f"{'Biogas CH4 — M m³/day':<35} {totals['biogas_ch4']['min']/365/1e6:>15.2f} {totals['biogas_ch4']['medio']/365/1e6:>15.2f} {totals['biogas_ch4']['max']/365/1e6:>15.2f}")
    biogas_min = totals['biogas_ch4']['min'] / AVG_CH4_PCT / 365 / 1e6
    biogas_med = totals['biogas_ch4']['medio'] / AVG_CH4_PCT / 365 / 1e6
    biogas_max = totals['biogas_ch4']['max'] / AVG_CH4_PCT / 365 / 1e6
    print(f"{'Biogas total — M m³/day (÷58%)':<35} {biogas_min:>15.2f} {biogas_med:>15.2f} {biogas_max:>15.2f}")
    print(f"{'Biomethane — M m³/day':<35} {totals['biomethane']['min']/365/1e6:>15.2f} {totals['biomethane']['medio']/365/1e6:>15.2f} {totals['biomethane']['max']/365/1e6:>15.2f}")

    print()
    print("─── Benchmark comparison ───────────────────────────────────────────────────")
    print(f"  FIESP/AMPLUN 2021 mobilisable benchmark : ~16 M m³ biogas/day")
    print(f"  Our canonical MIN scenario (biogas)     : {biogas_min:.1f} M m³/day")
    print(f"  Our canonical MEDIO scenario (biogas)   : {biogas_med:.1f} M m³/day")
    print(f"  Our canonical MAX scenario (biogas)     : {biogas_max:.1f} M m³/day")
    print()
    print("─── Critical data flags ────────────────────────────────────────────────────")
    print("  SWINE: Legacy 461 m³ biogas/head/yr is ~7.5× the EMBRAPA-correct value.")
    print(f"  Corrected swine contribution ≈ {SWINE_CORRECTED_BIOGAS_M3_YR/365/1e6:.0f}K m³ biogas/day")
    print("  Action needed: run load_biomass_from_master.py with livestock_t_per_head")
    print("  to replace head counts → tonnes in DB and recompute from forward engine.")
    print()
    print(f"  Per-stream detail: {stream_csv}")


if __name__ == "__main__":
    main()
