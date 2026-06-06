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
    * Agricultural columns are IBGE PAM raw production tonnes (green cane, whole fruit, etc.)
      NOT processing residues. Residue fractions are applied here before the forward engine.
    * Livestock columns (cattle/swine/poultry) are HEAD COUNTS (not tonnes);
      converted to manure tonnes via canonical generation factors (t/head/yr).
    * Urban streams are derived from SP population × canonical per-capita factors.

Crop → residue conversions (IBGE PAM units → actual substrate):
  sugarcane_biomass_tons_year = raw green cane → decomposed into 4 industrial sub-streams
  citrus_biomass_tons_year    = whole fruit   → × 0.50 wet peel (FUNDECITRUS; FCo handles competing uses)
  soybean/corn/coffee: CSV already contains residue-equivalent tonnes from MapBiomas × yield_t_ha

Uncertainty is propagated coupled: scenario `sc` uses the `sc` band of every
factor (generation, chemistry, FDE) simultaneously — a genuine lower/upper
envelope rather than a mix.

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
    get_params,
    get_params_for_stream,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

UPGRADING_EFFICIENCY = 0.97  # biogas → biomethane upgrading (membrane/PSA)

# <NewLook> root: this file is backend/scripts/<here>
_NEWLOOK = Path(__file__).resolve().parents[2]
_CSV = _NEWLOOK / "docs" / "data" / "municipality_biomass_tons.csv"
_FEEDSTOCKS = _NEWLOOK / "data" / "canonical_parameters" / "feedstocks.yaml"

# São Paulo state resident population — IBGE Censo Demográfico 2022.
# https://censo2022.ibge.gov.br/  (SP: 44,411,238)
SP_POPULATION = 44_411_238

# ── Raw-crop → processing-residue conversion factors ────────────────────────
# The municipality CSV stores IBGE PAM raw production data (green cane tonnes,
# whole fruit tonnes). These factors convert to the actual wet substrate fed to
# the digester. Each factor is documented in feedstocks.yaml (residue_fraction
# notes) and must have a literature source.

# Citrus: whole fruit → wet processing peel/bagasse (FUNDECITRUS 2022)
# FCo in BAGACO_CITROS FDE (0.30) accounts for competing uses (feed pellets, pectin).
# Using 50% peel fraction ensures FCo is not double-applied.
CITRUS_RESIDUE_FRACTION = 0.50  # range 0.45–0.55; conservative mid-point

# Sugarcane industrial chain: 1 t green cane → 4 co-product streams.
# Residue fractions sum: 0.28 + 0.030 + 0.053 + 0.42 = 0.783 t/t cane
# (remaining ~22% = juice extracted as sugar/ethanol, water losses, etc.)
# Each entry: (stream_label, canonical_code, fraction_per_t_green_cane, provenance_note)
SUGARCANE_SUBSTREAMS: list[tuple[str, str, float, str]] = [
    (
        "cana_bagaco",
        "BAGACO",
        0.280,
        "28% wet pressed bagasse/t green cane (UNICA/CONSECANA 2022; range 0.25–0.30)",
    ),
    (
        "cana_torta",
        "TORTA_FILTRO",
        0.030,
        "3.0% wet filter cake/t green cane (CONSECANA-SP tabela de custo; range 0.028–0.035)",
    ),
    (
        "cana_palha",
        "PALHA",
        0.053,
        "12 t straw/ha × 35% collectible (Carvalho 2017, doi:10.1111/gcbb.12410) / 80 t cane/ha SP avg",
    ),
    (
        "cana_vinhaca",
        "VINHACA",
        0.420,
        "~12 Bn L EtOH/yr (UNICA SP) × 12 L vinhaça/L × 1.01 kg/L / 340 Mt cane = 0.428 t/t cane",
    ),
]

# ── Stream groupings ─────────────────────────────────────────────────────────
# Sugarcane is handled separately (SUGARCANE_SUBSTREAMS).
# Citrus is handled with CITRUS_RESIDUE_FRACTION.
# Other agricultural streams use CSV values as residue-equivalent tonnes directly.
AGRICULTURAL_DIRECT = ("soybean", "corn", "coffee")  # MapBiomas × yield_t_ha → residue tonnes
LIVESTOCK = ("cattle", "swine", "poultry")            # head counts → t/head/yr via generation
URBAN = ("rsu_organic", "rpo")                        # per-capita (SP pop)


def _csv_state_total(rows: list[dict], column: str) -> float:
    return sum(float(r.get(column) or 0) for r in rows)


def _biomass_livestock(stream: str, head_count: float, fs: dict) -> dict:
    """Head count → wet tonnes/scenario using canonical t_per_head_yr."""
    code = STREAM_TO_CANONICAL[stream]
    factor = fs[code]["generation"]["t_per_head_yr"]
    return {sc: head_count * float(factor[sc]) for sc in SCENARIOS}


def _biomass_urban(stream: str, population: float, fs: dict) -> dict:
    """Population → wet tonnes/scenario using canonical t_per_capita_yr."""
    code = STREAM_TO_CANONICAL[stream]
    factor = fs[code]["generation"]["t_per_capita_yr"]
    return {sc: population * float(factor[sc]) for sc in SCENARIOS}


def _accumulate(
    totals: dict,
    out_rows: list[dict],
    stream: str,
    sector: str,
    provenance: str,
    input_count: float,
    biomass: dict,
    params,
) -> None:
    """Run forward engine, accumulate totals, append to output rows."""
    ch4: dict = {}
    biogas: dict = {}
    # biomass[sc] may differ by scenario (livestock/urban) or be constant (agricultural).
    # calculate_feedstock internally iterates over all scenarios using params.sc bands.
    # We call once per scenario so the coupled scenario band is preserved.
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
        f"  {stream:16s} [{sector:11s}|{provenance:28s}] "
        f"CH4 medio={ch4['medio']/365/1e6:6.3f} M m³/d"
    )
    out_rows.append(
        {
            "stream": stream,
            "sector": sector,
            "provenance": provenance,
            "input_count": input_count,
            "biomass_medio_t_yr": biomass["medio"],
            **{f"ch4_practical_{sc}_m3_yr": ch4[sc] for sc in SCENARIOS},
            **{f"biogas_practical_{sc}_m3_yr": biogas[sc] for sc in SCENARIOS},
        }
    )


def compute() -> tuple[dict, list[dict]]:
    rows = [
        r for r in csv.DictReader(_CSV.open(encoding="utf-8"))
        if (r.get("ibge_code") or "").strip()
    ]
    logger.info(f"Loaded {len(rows)} municipalities from {_CSV.name}")
    fs = yaml.safe_load(_FEEDSTOCKS.read_text(encoding="utf-8"))["feedstocks"]

    totals = {
        "ch4_practical": {sc: 0.0 for sc in SCENARIOS},
        "biogas_practical": {sc: 0.0 for sc in SCENARIOS},
        "biomethane": {sc: 0.0 for sc in SCENARIOS},
        "biomass_gross": {"medio": 0.0},
    }
    out_rows: list[dict] = []

    # ── 1. Sugarcane complex ─────────────────────────────────────────────────
    # IBGE PAM column = raw green cane tonnes.
    # Decomposed into 4 processing sub-streams using documented residue fractions.
    cane_raw_t = _csv_state_total(rows, "sugarcane_biomass_tons_year")
    logger.info(f"Sugarcane raw (IBGE PAM green cane): {cane_raw_t/1e6:.2f} Mt/yr")
    for sub_label, code, frac, note in SUGARCANE_SUBSTREAMS:
        sub_t = cane_raw_t * frac
        params = get_params(code)
        biomass = {sc: sub_t for sc in SCENARIOS}  # constant across scenarios (observed data)
        _accumulate(
            totals, out_rows,
            stream=sub_label,
            sector="agricultural",
            provenance=f"cana_PAM×{frac:.3f}",
            input_count=cane_raw_t,
            biomass=biomass,
            params=params,
        )

    # ── 2. Citrus with peel residue fraction ─────────────────────────────────
    # IBGE PAM column = whole fruit tonnes.
    # × CITRUS_RESIDUE_FRACTION (0.50) → wet processing peel/bagasse tonnes.
    citrus_raw_t = _csv_state_total(rows, "citrus_biomass_tons_year")
    citrus_peel_t = citrus_raw_t * CITRUS_RESIDUE_FRACTION
    logger.info(
        f"Citrus raw fruit: {citrus_raw_t/1e6:.2f} Mt/yr → "
        f"peel residue: {citrus_peel_t/1e6:.2f} Mt/yr (×{CITRUS_RESIDUE_FRACTION})"
    )
    _accumulate(
        totals, out_rows,
        stream="citrus",
        sector="agricultural",
        provenance=f"citrus_PAM×{CITRUS_RESIDUE_FRACTION}",
        input_count=citrus_raw_t,
        biomass={sc: citrus_peel_t for sc in SCENARIOS},
        params=get_params_for_stream("citrus"),
    )

    # ── 3. Other agricultural (MapBiomas × yield_t_ha → residue tonnes) ─────
    for stream in AGRICULTURAL_DIRECT:
        count = _csv_state_total(rows, f"{stream}_biomass_tons_year")
        _accumulate(
            totals, out_rows,
            stream=stream,
            sector="agricultural",
            provenance="csv_residue_tonnes",
            input_count=count,
            biomass={sc: count for sc in SCENARIOS},
            params=get_params_for_stream(stream),
        )

    # ── 4. Livestock (head count × t_per_head_yr canonical generation) ───────
    for stream in LIVESTOCK:
        count = _csv_state_total(rows, f"{stream}_biomass_tons_year")
        biomass = _biomass_livestock(stream, count, fs)
        _accumulate(
            totals, out_rows,
            stream=stream,
            sector="livestock",
            provenance="csv_head_count×EMBRAPA",
            input_count=count,
            biomass=biomass,
            params=get_params_for_stream(stream),
        )

    # ── 5. Urban (SP population × t_per_capita_yr canonical generation) ─────
    for stream in URBAN:
        biomass = _biomass_urban(stream, float(SP_POPULATION), fs)
        _accumulate(
            totals, out_rows,
            stream=stream,
            sector="urban",
            provenance="sp_population_ibge2022",
            input_count=float(SP_POPULATION),
            biomass=biomass,
            params=get_params_for_stream(stream),
        )

    return totals, out_rows


def _scenario_print(totals: dict) -> None:
    def md(metric: str) -> tuple:
        d = totals[metric]
        return tuple(d[sc] / 365 / 1e6 for sc in SCENARIOS)

    print("\n" + "=" * 78)
    print("SP STATE — 100% FORWARD Canonical Biogas Potential")
    print("Methodology: IBGE PAM crop data → residue fractions → forward engine")
    print("=" * 78)
    print(f"\n{'Métrica':<32}{'MIN':>14}{'MÉDIO':>14}{'MAX':>14}")
    print("-" * 78)
    ch4 = md("ch4_practical")
    big = md("biogas_practical")
    bm = md("biomethane")
    print(f"{'CH₄ prático (M m³/dia)':<32}{ch4[0]:>14.2f}{ch4[1]:>14.2f}{ch4[2]:>14.2f}")
    print(f"{'Biogás prático (M m³/dia)':<32}{big[0]:>14.2f}{big[1]:>14.2f}{big[2]:>14.2f}")
    print(f"{'Biometano (M m³/dia)':<32}{bm[0]:>14.2f}{bm[1]:>14.2f}{bm[2]:>14.2f}")

    print("\n─── Benchmark FIESP ───────────────────────────────────────────────────────")
    print("  FIESP/AMPLUN 2021 (bruto, todos setores) : ~16,0 M m³/dia biogás")
    print("  SEMIL/FIESP 2024 (viável)                : ~11,4 M m³/dia biogás")
    print(f"  PILAR-2b forward (Linha de Base/Médio/Otimista): "
          f"{big[0]:.1f} / {big[1]:.1f} / {big[2]:.1f} M m³/dia biogás")

    print("\n─── Correções de unidade aplicadas nesta revisão ───────────────────────────")
    print("  Cana: CSV IBGE PAM (cana bruta) → 4 sub-fluxos com frações de resíduo")
    print("    bagaço × 0.28, torta × 0.030, palha × 0.053, vinhaça × 0.420")
    print("  Citros: CSV IBGE PAM (fruta inteira) → casca/bagaço × 0.50 (FUNDECITRUS)")
    print("  Soja/milho/café: já em toneladas de resíduo (MapBiomas × yield_t/ha)")

    print("\n─── Notas de proveniência ───────────────────────────────────────────────────")
    print("  Pecuária: contagem de cabeças × geração EMBRAPA (t/cabeça/ano) → forward.")
    print("  Urbano  : população SP (IBGE 2022) × geração per-capita (SNIS/CETESB).")
    print("  Soja    : PALHA_SOJA (palha de campo, FCo=0,15 RTRS/plantio direto).")
    print("  RPO     : PODA_URBANA (poda lignocelulósica, não lodo de ETE).")


def main():
    out_dir = Path(__file__).parent / "canonical_recalc_output"
    out_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Computing SP canonical FORWARD biogas totals...")
    totals, rows = compute()

    stream_csv = out_dir / "sp_canonical_by_stream.csv"
    with stream_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    _scenario_print(totals)
    print(f"\n  Detalhe por stream: {stream_csv}")


if __name__ == "__main__":
    main()
