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
import hashlib
import json
import logging
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import yaml  # noqa: E402

from app.services.biogas_forward import SCENARIOS, calculate_feedstock  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    STREAM_SUBPOPULATIONS,
    STREAM_TO_CANONICAL,
    biomass_tons_from_code,
    biomass_tons_from_units,
    get_params,
    get_params_for_stream,
    mill_delivery_fraction,
)
from scripts.compute_spatial_concentration import (  # noqa: E402
    compute_spatial_concentration,
    quantity,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

UPGRADING_EFFICIENCY = 0.97  # biogas → biomethane upgrading (membrane/PSA)

# <NewLook> root: this file is backend/scripts/<here>
_NEWLOOK = Path(__file__).resolve().parents[2]
_CSV = _NEWLOOK / "docs" / "data" / "municipality_biomass_tons.csv"
_MUNICIPALITY_CONTEXT = (
    _NEWLOOK.parents[1] / "analysis" / "data" / "02_municipality_summary_SP_2023.csv"
)
_FEEDSTOCKS = _NEWLOOK / "data" / "canonical_parameters" / "feedstocks.yaml"
_CANONICAL_JSON = _NEWLOOK / "docs" / "data" / "canonical_results.json"
FRONTIER_ALPHA = 0.5

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
#
# `mill_delivered` decides whether mill_delivery_fraction applies. IBGE PAM reports
# cane PRODUCED; bagaço, torta and vinhaça are generated INSIDE the mill and so exist
# only for the cane actually crushed. Straw is a FIELD residue — it exists on every
# hectare harvested, crushed or not — and multiplying it by the delivery ratio would
# discard straw that never entered a mill to begin with. promote_pam.py has applied
# the fraction on the national crop path since 2026-07-21; this closes D6, the state
# path that never did.
#
# Each entry: (stream_label, canonical_code, fraction_per_t_green_cane, mill_delivered, note)
SUGARCANE_SUBSTREAMS: list[tuple[str, str, float, bool, str]] = [
    (
        "cana_bagaco",
        "BAGACO",
        0.280,
        True,
        "28% wet pressed bagasse/t green cane (UNICA/CONSECANA 2022; range 0.25–0.30)",
    ),
    (
        "cana_torta",
        "TORTA_FILTRO",
        0.030,
        True,
        "3.0% wet filter cake/t green cane (CONSECANA-SP tabela de custo; range 0.028–0.035)",
    ),
    (
        "cana_palha",
        "PALHA",
        0.053,
        False,  # field residue: generated in the field, not in the mill
        "12 t straw/ha × 35% collectible (Carvalho 2017, doi:10.1111/gcbb.12410) / 80 t cane/ha SP avg",
    ),
    (
        "cana_vinhaca",
        "VINHACA",
        0.420,
        True,
        "~12 Bn L EtOH/yr (UNICA SP) × 12 L vinhaça/L × 1.01 kg/L / 340 Mt cane = 0.428 t/t cane",
    ),
]

# ── Stream groupings ─────────────────────────────────────────────────────────
# Sugarcane is handled separately (SUGARCANE_SUBSTREAMS).
# Citrus is handled with CITRUS_RESIDUE_FRACTION.
# Other agricultural streams use CSV values as residue-equivalent tonnes directly.
AGRICULTURAL_DIRECT = ("soybean", "corn", "coffee")  # MapBiomas × yield_t_ha → residue tonnes
# 'cattle' is NOT here: its head count splits across two canonical feedstocks, and the
# split is declared once in canonical_loader.STREAM_SUBPOPULATIONS. Listing it in both
# places is exactly how the two representations would drift apart.
LIVESTOCK_SIMPLE = ("swine", "poultry")  # head counts → t/head/yr via generation
SPLIT_LIVESTOCK = ("cattle",)  # head counts → sub-populations via STREAM_SUBPOPULATIONS
URBAN = ("rsu_organic", "rpo")  # per-capita (SP pop)


def _csv_state_total(rows: list[dict], column: str) -> float:
    return sum(float(r.get(column) or 0) for r in rows)


def _biomass_livestock(stream: str, head_count: float, fs: dict) -> dict:
    """Head count → wet tonnes/scenario using canonical t_per_head_yr.

    Delegates to canonical_loader. This used to read fs[code]["generation"]
    directly, reaching past the loader — and because that made the conversion
    private to this script, the map never performed it and rendered IBGE head
    counts as tonnes. One accessor, so the two cannot diverge again.
    """
    rng = biomass_tons_from_units(stream, head_count)
    return {sc: rng.get(sc) for sc in SCENARIOS}


def _biomass_urban(stream: str, population: float, fs: dict) -> dict:
    """Population → wet tonnes/scenario using canonical t_per_capita_yr."""
    rng = biomass_tons_from_units(stream, population)
    return {sc: rng.get(sc) for sc in SCENARIOS}


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
        r for r in csv.DictReader(_CSV.open(encoding="utf-8")) if (r.get("ibge_code") or "").strip()
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
    mdf = mill_delivery_fraction("sugarcane")
    if mdf is None:
        raise RuntimeError(
            "sugarcane has no mill_delivery_fraction in feedstocks.yaml — the industrial "
            "sub-streams would silently be computed from cane produced rather than crushed"
        )
    logger.info(f"Mill delivery fraction: {mdf.min} / {mdf.medio} / {mdf.max} (crushed ÷ produced)")
    for sub_label, code, frac, mill_delivered, note in SUGARCANE_SUBSTREAMS:
        sub_t = cane_raw_t * frac
        params = get_params(code)
        if mill_delivered:
            # Scenario-coupled, like every other factor: the sc band of the delivery
            # ratio pairs with the sc band of chemistry and FDE.
            biomass = {sc: sub_t * mdf.get(sc) for sc in SCENARIOS}
            provenance = f"cana_PAM×{frac:.3f}×mdf"
        else:
            biomass = {sc: sub_t for sc in SCENARIOS}  # field residue, all harvested cane
            provenance = f"cana_PAM×{frac:.3f}"
        _accumulate(
            totals,
            out_rows,
            stream=sub_label,
            sector="agricultural",
            provenance=provenance,
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
        totals,
        out_rows,
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
            totals,
            out_rows,
            stream=stream,
            sector="agricultural",
            provenance="csv_residue_tonnes",
            input_count=count,
            biomass={sc: count for sc in SCENARIOS},
            params=get_params_for_stream(stream),
        )

    # ── 4a. Split livestock: one head count → several canonical feedstocks ───
    for stream in SPLIT_LIVESTOCK:
        count = _csv_state_total(rows, f"{stream}_biomass_tons_year")
        subpops = STREAM_SUBPOPULATIONS[stream]
        for sub_label, code, fraction in subpops:
            sub_count = count * fraction
            rng = biomass_tons_from_code(code, sub_count)
            _accumulate(
                totals,
                out_rows,
                stream=sub_label,
                sector="livestock",
                provenance=f"csv_head_count×{fraction:.0%}×EMBRAPA",
                input_count=sub_count,
                biomass={sc: rng.get(sc) for sc in SCENARIOS},
                params=get_params(code),
            )

    # ── 4b. Livestock with a single canonical code ──────────────────────────
    for stream in LIVESTOCK_SIMPLE:
        count = _csv_state_total(rows, f"{stream}_biomass_tons_year")
        biomass = _biomass_livestock(stream, count, fs)
        _accumulate(
            totals,
            out_rows,
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
            totals,
            out_rows,
            stream=stream,
            sector="urban",
            provenance="sp_population_ibge2022",
            input_count=float(SP_POPULATION),
            biomass=biomass,
            params=get_params_for_stream(stream),
        )

    return totals, out_rows


def _forward_values(biomass: dict, params) -> tuple[dict, dict, dict]:
    ch4: dict = {}
    biogas: dict = {}
    for scenario in SCENARIOS:
        result = calculate_feedstock(biomass[scenario], params)
        ch4[scenario] = result.ch4_practical_m3[scenario]
        biogas[scenario] = result.biogas_practical_m3[scenario]
    biomethane = {
        scenario: ch4[scenario] * UPGRADING_EFFICIENCY for scenario in SCENARIOS
    }
    return ch4, biogas, biomethane


def _compute_municipality(row: dict, context: dict) -> dict:
    """Run the identical canonical equations for one municipality."""
    metrics = {
        metric: {scenario: 0.0 for scenario in SCENARIOS}
        for metric in ("ch4_practical", "biogas_practical", "biomethane")
    }
    stream_values: dict[str, dict] = {}

    def add(stream: str, biomass: dict, params) -> None:
        ch4, biogas, biomethane = _forward_values(biomass, params)
        stream_values[stream] = ch4
        for scenario in SCENARIOS:
            metrics["ch4_practical"][scenario] += ch4[scenario]
            metrics["biogas_practical"][scenario] += biogas[scenario]
            metrics["biomethane"][scenario] += biomethane[scenario]

    cane_raw = float(row.get("sugarcane_biomass_tons_year") or 0)
    mdf = mill_delivery_fraction("sugarcane")
    if mdf is None:
        raise RuntimeError("sugarcane has no mill_delivery_fraction")
    for label, code, fraction, mill_delivered, _note in SUGARCANE_SUBSTREAMS:
        base = cane_raw * fraction
        biomass = {
            scenario: base * mdf.get(scenario) if mill_delivered else base
            for scenario in SCENARIOS
        }
        add(label, biomass, get_params(code))

    citrus = float(row.get("citrus_biomass_tons_year") or 0) * CITRUS_RESIDUE_FRACTION
    add("citrus", {scenario: citrus for scenario in SCENARIOS}, get_params_for_stream("citrus"))

    for stream in AGRICULTURAL_DIRECT:
        amount = float(row.get(f"{stream}_biomass_tons_year") or 0)
        add(stream, {scenario: amount for scenario in SCENARIOS}, get_params_for_stream(stream))

    for stream in SPLIT_LIVESTOCK:
        count = float(row.get(f"{stream}_biomass_tons_year") or 0)
        for label, code, fraction in STREAM_SUBPOPULATIONS[stream]:
            generated = biomass_tons_from_code(code, count * fraction)
            add(
                label,
                {scenario: generated.get(scenario) for scenario in SCENARIOS},
                get_params(code),
            )

    for stream in LIVESTOCK_SIMPLE:
        count = float(row.get(f"{stream}_biomass_tons_year") or 0)
        add(stream, _biomass_livestock(stream, count, {}), get_params_for_stream(stream))

    population = float(context["populacao_2022"])
    for stream in URBAN:
        add(stream, _biomass_urban(stream, population, {}), get_params_for_stream(stream))

    return {
        "ibge_code": row["ibge_code"],
        "municipality_name": row["municipality_name"],
        "intermediate_region_code": context["cd_rgint"],
        "intermediate_region_name": context["nm_rgint"],
        "metrics": metrics,
        "stream_ch4": stream_values,
    }


def compute_municipalities() -> list[dict]:
    contexts = {
        row["ibge_code"]: row
        for row in csv.DictReader(_MUNICIPALITY_CONTEXT.open(encoding="utf-8-sig"))
    }
    rows = [
        row
        for row in csv.DictReader(_CSV.open(encoding="utf-8"))
        if (row.get("ibge_code") or "").strip()
    ]
    missing = sorted({row["ibge_code"] for row in rows} - contexts.keys())
    if missing:
        raise RuntimeError(f"Missing IBGE regional/population context for: {missing[:5]}")
    return [_compute_municipality(row, contexts[row["ibge_code"]]) for row in rows]


def _frontier(values: dict) -> float:
    return values["medio"] + FRONTIER_ALPHA * (values["max"] - values["medio"])


def _metric_quantities(metrics: dict) -> dict:
    units = {
        "ch4_practical": "m3_CH4/year",
        "biogas_practical": "m3_biogas/year",
        "biomethane": "m3_biomethane/year",
    }
    return {
        metric: {
            "medio": quantity(values["medio"], units[metric]),
            "frontier": quantity(_frontier(values), units[metric]),
        }
        for metric, values in metrics.items()
        if metric in units
    }


def _git_sha() -> str:
    return subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=_NEWLOOK, text=True
    ).strip()


def build_canonical_results(
    totals: dict, feedstocks: list[dict], municipalities: list[dict]
) -> dict:
    municipal_totals = {
        metric: {
            scenario: sum(row["metrics"][metric][scenario] for row in municipalities)
            for scenario in SCENARIOS
        }
        for metric in ("ch4_practical", "biogas_practical", "biomethane")
    }
    for metric in municipal_totals:
        for scenario in SCENARIOS:
            if not abs(municipal_totals[metric][scenario] - totals[metric][scenario]) <= 1e-6 * max(
                1.0, totals[metric][scenario]
            ):
                raise RuntimeError(f"Municipal/state reconciliation failed: {metric}/{scenario}")

    ch4_medio_mm3_day = totals["ch4_practical"]["medio"] / 365 / 1e6
    if round(ch4_medio_mm3_day, 4) != 3.6367:
        raise RuntimeError(
            "REFACTORING REGRESSION: CH4 medio is "
            f"{ch4_medio_mm3_day:.10f} Mm3/day; expected 3.6367 Mm3/day"
        )

    by_feedstock = []
    for row in feedstocks:
        ch4_values = {
            scenario: float(row[f"ch4_practical_{scenario}_m3_yr"]) for scenario in SCENARIOS
        }
        biogas_values = {
            scenario: float(row[f"biogas_practical_{scenario}_m3_yr"]) for scenario in SCENARIOS
        }
        by_feedstock.append(
            {
                "feedstock": row["stream"],
                "sector": row["sector"],
                "biomass_medio": quantity(row["biomass_medio_t_yr"], "tonne_wet/year"),
                "ch4_practical": {
                    "medio": quantity(ch4_values["medio"], "m3_CH4/year"),
                    "frontier": quantity(_frontier(ch4_values), "m3_CH4/year"),
                },
                "biogas_practical": {
                    "medio": quantity(biogas_values["medio"], "m3_biogas/year"),
                    "frontier": quantity(_frontier(biogas_values), "m3_biogas/year"),
                },
                "provenance": row["provenance"],
            }
        )

    by_municipality = []
    spatial_input = []
    for row in municipalities:
        ch4_medio = row["metrics"]["ch4_practical"]["medio"]
        ch4_frontier = _frontier(row["metrics"]["ch4_practical"])
        by_municipality.append(
            {
                "ibge_code": row["ibge_code"],
                "municipality_name": row["municipality_name"],
                "intermediate_region_code": row["intermediate_region_code"],
                "intermediate_region_name": row["intermediate_region_name"],
                "totals": _metric_quantities(row["metrics"]),
            }
        )
        spatial_input.append(
            {
                **row,
                "ch4_medio": ch4_medio,
                "ch4_frontier": ch4_frontier,
            }
        )

    feedstocks_hash = hashlib.sha256(_FEEDSTOCKS.read_bytes()).hexdigest()
    return {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "git_sha": _git_sha(),
        "feedstocks_yaml_sha256": feedstocks_hash,
        "scenario": {
            "medio": "canonical coupled medio parameter band",
            "frontier": "medio + 0.5 * (max - medio), calculated per metric",
        },
        "totals": _metric_quantities(totals),
        "by_feedstock": by_feedstock,
        "by_municipality": by_municipality,
        "spatial_concentration": {
            "medio": compute_spatial_concentration(spatial_input, value_key="ch4_medio"),
            "frontier": compute_spatial_concentration(spatial_input, value_key="ch4_frontier"),
        },
        "provenance": {
            "generator": "backend/scripts/compute_sp_canonical_totals.py",
            "spatial_analysis": "backend/scripts/compute_spatial_concentration.py",
            "municipal_activity_input": "docs/data/municipality_biomass_tons.csv",
            "municipal_context_input": "analysis/data/02_municipality_summary_SP_2023.csv",
            "canonical_parameters": "data/canonical_parameters/feedstocks.yaml",
            "municipalities": quantity(len(municipalities), "municipality"),
            "reference_total_ch4_medio": quantity(3.6367, "Mm3_CH4/day"),
        },
    }


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

    # ── Fronteira do Biogás (4º cenário) ────────────────────────────────────────
    # Mobilização realista-alta entre Médio Prazo e Otimista: ponto médio por
    # métrica (FRONTIER_ALPHA do caminho medio→max). Representa o relaxamento dos
    # fatores de competição/coleta sob política pública dedicada, mantendo o
    # envelope de incerteza biométrico. NÃO é o teto teórico (esse é o Otimista).
    fro = tuple(
        m + FRONTIER_ALPHA * (x - m)
        for m, x in [(ch4[1], ch4[2]), (big[1], big[2]), (bm[1], bm[2])]
    )
    print(
        f"\n{'  → Fronteira do Biogás (4º cenário, mid medio↔max):':<46}"
        f"CH₄={fro[0]:.2f}  Biogás={fro[1]:.2f}  Biometano={fro[2]:.2f}  M m³/dia"
    )

    print("\n─── Benchmark FIESP ───────────────────────────────────────────────────────")
    print("  FIESP/AMPLUN 2021 (bruto, todos setores) : ~16,0 M m³/dia biogás")
    print("  SEMIL/FIESP 2024 (viável)                : ~11,4 M m³/dia biogás")
    print("  FIESP/Amplun 2025 (cana+aterro)          : 11,7 biogás / 6,4 biometano")
    print(
        f"  PILAR-2b (Base/Médio/Fronteira/Otimista biogás): "
        f"{big[0]:.1f} / {big[1]:.1f} / {fro[1]:.1f} / {big[2]:.1f} M m³/dia "
        f"— Fronteira (31 resíduos) > FIESP 6,4 biometano"
    )

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
    municipalities = compute_municipalities()
    canonical = build_canonical_results(totals, rows, municipalities)
    _CANONICAL_JSON.write_text(
        json.dumps(canonical, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    stream_csv = out_dir / "sp_canonical_by_stream.csv"
    with stream_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    _scenario_print(totals)
    print(f"\n  Detalhe por stream: {stream_csv}")
    print(f"  Fonte canônica JSON: {_CANONICAL_JSON}")


if __name__ == "__main__":
    main()
