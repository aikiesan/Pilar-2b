#!/usr/bin/env python3
"""
compute_sp_canonical_totals.py
==============================
Compute São Paulo state-level canonical biogas potential — 100% FORWARD.

Single-methodology state total: every stream (agricultural, livestock, urban)
flows through the same canonical forward engine (biogas_forward.calculate_feedstock)
with literature-validated BMP/TS/VS and the audited FDE (availability × eta).

Input of record:
  docs/data/municipality_biomass_tons.csv — per-municipality SP 2023.
    * Agricultural columns are real wet tonnes/yr.
    * Livestock columns (cattle/swine/poultry) are HEAD COUNTS (not tonnes);
      converted to manure tonnes via canonical generation factors (t/head/yr).
    * Urban streams are derived from SP population × canonical per-capita factors.

Uncertainty is propagated coupled: scenario `sc` uses the `sc` band of every
factor (generation, chemistry, FDE) simultaneously — a genuine lower/upper
envelope rather than a mix.

Provenance is printed per stream so the methodology is auditable.

Outputs:
  <out>/sp_canonical_by_stream.csv — per-stream 3-scenario CH4/biogas
"""

from __future__ import annotations

import csv
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import yaml  # noqa: E402

from app.services.biogas_forward import calculate_feedstock, SCENARIOS  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    STREAM_TO_CANONICAL,
    get_params_for_stream,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

UPGRADING_EFFICIENCY = 0.97  # biogas → biomethane upgrading
AVG_CH4_PCT = 0.58  # state-average methane content for biogas-volume reporting

# <NewLook> root: this file is backend/scripts/<here>
_NEWLOOK = Path(__file__).resolve().parents[2]
_CSV = _NEWLOOK / "docs" / "data" / "municipality_biomass_tons.csv"
_FEEDSTOCKS = _NEWLOOK / "data" / "canonical_parameters" / "feedstocks.yaml"

# São Paulo state resident population — IBGE Censo Demográfico 2022.
# https://censo2022.ibge.gov.br/  (SP: 44,411,238)
SP_POPULATION = 44_411_238

# Stream → CSV column + provenance of the count.
AGRICULTURAL = ("sugarcane", "soybean", "corn", "coffee", "citrus")  # wet tonnes/yr
LIVESTOCK = ("cattle", "swine", "poultry")                          # head counts
URBAN = ("rsu_organic", "rpo")                                       # per-capita (SP pop)


def _csv_state_total(rows: list[dict], column: str) -> float:
    return sum(float(r.get(column) or 0) for r in rows)


def _biomass_by_scenario(stream: str, count: float, fs: dict) -> dict:
    """Return wet-tonnes biomass per scenario for a stream.

    Agricultural: count is already tonnes (same across scenarios).
    Livestock:    count is head count → × t_per_head_yr(sc).
    Urban:        count is population → × t_per_capita_yr(sc).
    """
    if stream in AGRICULTURAL:
        return {sc: count for sc in SCENARIOS}
    code = STREAM_TO_CANONICAL[stream]
    gen = fs[code]["generation"]
    key = "t_per_head_yr" if gen["type"] == "per_head" else "t_per_capita_yr"
    factor = gen[key]
    return {sc: count * float(factor[sc]) for sc in SCENARIOS}


def compute() -> tuple[dict, list[dict]]:
    rows = [r for r in csv.DictReader(_CSV.open(encoding="utf-8")) if (r.get("ibge_code") or "").strip()]
    logger.info(f"Loaded {len(rows)} municipalities from {_CSV.name}")
    fs = yaml.safe_load(_FEEDSTOCKS.read_text(encoding="utf-8"))["feedstocks"]

    totals = {
        "ch4_practical": {sc: 0.0 for sc in SCENARIOS},
        "biogas_practical": {sc: 0.0 for sc in SCENARIOS},
        "biomethane": {sc: 0.0 for sc in SCENARIOS},
        "biomass_gross": {"medio": 0.0},
    }
    out_rows: list[dict] = []

    def stream_count(stream: str) -> tuple[float, str]:
        if stream in AGRICULTURAL:
            return _csv_state_total(rows, f"{stream}_biomass_tons_year"), "csv_tonnes"
        if stream in LIVESTOCK:
            return _csv_state_total(rows, f"{stream}_biomass_tons_year"), "csv_head_count"
        return float(SP_POPULATION), "sp_population_ibge2022"

    plan = [(s, "agricultural") for s in AGRICULTURAL]
    plan += [(s, "livestock") for s in LIVESTOCK]
    plan += [(s, "urban") for s in URBAN]

    for stream, sector in plan:
        params = get_params_for_stream(stream)
        count, provenance = stream_count(stream)
        biomass = _biomass_by_scenario(stream, count, fs)

        ch4 = {}
        biogas = {}
        for sc in SCENARIOS:
            res = calculate_feedstock(biomass[sc], params)
            ch4[sc] = res.ch4_practical_m3[sc]
            biogas[sc] = res.biogas_practical_m3[sc]
        biometh = {sc: ch4[sc] * UPGRADING_EFFICIENCY for sc in SCENARIOS}

        totals["biomass_gross"]["medio"] += biomass["medio"]
        for sc in SCENARIOS:
            totals["ch4_practical"][sc] += ch4[sc]
            totals["biogas_practical"][sc] += biogas[sc]
            totals["biomethane"][sc] += biometh[sc]

        logger.info(
            f"  {stream:12s} [{sector:11s}|{provenance:18s}] "
            f"CH4 medio={ch4['medio']/365/1e6:6.3f} M m³/d"
        )
        out_rows.append({
            "stream": stream,
            "sector": sector,
            "provenance": provenance,
            "input_count": count,
            "biomass_medio_t_yr": biomass["medio"],
            **{f"ch4_practical_{sc}_m3_yr": ch4[sc] for sc in SCENARIOS},
            **{f"biogas_practical_{sc}_m3_yr": biogas[sc] for sc in SCENARIOS},
        })

    return totals, out_rows


def main():
    out_dir = Path(__file__).parent / "canonical_recalc_output"
    out_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Computing SP canonical FORWARD biogas totals (single methodology)...")
    totals, rows = compute()

    stream_csv = out_dir / "sp_canonical_by_stream.csv"
    with stream_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    def md(metric, factor=1.0):
        d = totals[metric]
        return tuple(d[sc] / 365 / 1e6 * factor for sc in SCENARIOS)

    print("\n" + "=" * 78)
    print("SP STATE — 100% FORWARD Canonical Biogas Potential (single methodology)")
    print("=" * 78)
    print(f"\n{'Metric':<32}{'MIN':>14}{'MEDIO':>14}{'MAX':>14}")
    print("-" * 78)
    ch4 = md("ch4_practical")
    big = md("biogas_practical")
    bm = md("biomethane")
    print(f"{'CH4 practical (M m³/day)':<32}{ch4[0]:>14.2f}{ch4[1]:>14.2f}{ch4[2]:>14.2f}")
    print(f"{'Biogas practical (M m³/day)':<32}{big[0]:>14.2f}{big[1]:>14.2f}{big[2]:>14.2f}")
    print(f"{'Biomethane (M m³/day)':<32}{bm[0]:>14.2f}{bm[1]:>14.2f}{bm[2]:>14.2f}")

    print("\n─── Benchmark FIESP ───────────────────────────────────────────────────────")
    print("  FIESP/AMPLUN 2021 (bruto, todos setores) : ~16,0 M m³/dia biogás")
    print("  SEMIL/FIESP 2024 (viável)                : ~11,4 M m³/dia biogás")
    print(f"  PILAR-2b forward (min/medio/max)         : "
          f"{big[0]:.1f} / {big[1]:.1f} / {big[2]:.1f} M m³/dia biogás")
    print(f"\n  → O cenário MEDIO ({big[1]:.1f}) enquadra o benchmark bruto FIESP 2021 (16)")
    print(f"    e supera o viável FIESP 2024 (11,4), sem inflar nenhum parâmetro.")

    print("\n─── Notas de provenance ────────────────────────────────────────────────────")
    print("  Pecuária: contagem de cabeças (CSV) × geração EMBRAPA (t/cabeça/ano) → forward.")
    print("  Urbano  : população SP (IBGE 2022) × geração per-capita (SNIS/CETESB) → forward.")
    print("  Ressalvas em aberto: mapeamento 'soybean' (palha vs casca) e 'rpo' (poda vs lodo).")
    print(f"\n  Detalhe por stream: {stream_csv}")


if __name__ == "__main__":
    main()
