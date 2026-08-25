#!/usr/bin/env python3
"""
recalculate_biogas_canonical.py
===============================
Non-destructive canonical recalculation of biogas potential for SP municipalities.

Reads the per-municipality residue tonnage table
(analysis/data/01_master_residue_streams_SP_2023.csv, column `residue_tons_yr`)
and recomputes biogas potential using the canonical forward engine
(app/services/biogas_forward.py) with parameters from the canonical YAML
(data/canonical_parameters/feedstocks.yaml).

For each AGRICULTURAL stream (citrus, coffee, corn, soybean, sugarcane) — where
residue_tons_yr is a genuine biomass mass — it computes canonical theoretical
biogas (min/medio/max) and writes a comparison row ALONGSIDE the legacy value
(residue_tons_yr × conversion_factor). Legacy values are never modified.

Livestock (m³/head/yr) and urban (pre-calculated) streams are carried through
unchanged and flagged, pending a canonical per-head / per-capita block.

Outputs:
  - <out>/biogas_canonical_comparison_by_stream.csv   (per municipality × stream)
  - <out>/biogas_canonical_state_summary.csv          (state totals: legacy vs canonical)
  - prints a state-level legacy-vs-canonical delta table

Usage:
  python scripts/recalculate_biogas_canonical.py
  python scripts/recalculate_biogas_canonical.py --csv path/to/master.csv --out path/to/dir
"""

from __future__ import annotations

import argparse
import csv
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.biogas_forward import biogas_from_ch4, calculate_feedstock  # noqa: E402
from app.services.canonical_loader import (  # noqa: E402
    STREAM_TO_CANONICAL,
    get_params_for_stream,
)

# Agricultural streams where residue_tons_yr is a true biomass mass (tons/yr).
AGRICULTURAL_STREAMS = {"citrus", "coffee", "corn", "soybean", "sugarcane"}

_DEFAULT_CSV = (
    Path(__file__).parent.parent.parent.parent.parent
    / "analysis"
    / "data"
    / "01_master_residue_streams_SP_2023.csv"
)


def _f(value: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def recalc(csv_path: Path, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    comparison_path = out_dir / "biogas_canonical_comparison_by_stream.csv"
    summary_path = out_dir / "biogas_canonical_state_summary.csv"

    # state-level accumulators per stream
    legacy_total: dict[str, float] = defaultdict(float)  # CSV biogas = theoretical/gross
    canon_theo: dict[str, float] = defaultdict(float)  # canonical theoretical (FDE=1), medio
    canon_min: dict[str, float] = defaultdict(float)  # canonical practical min
    canon_med: dict[str, float] = defaultdict(float)  # canonical practical medio
    canon_max: dict[str, float] = defaultdict(float)  # canonical practical max
    tons_total: dict[str, float] = defaultdict(float)

    rows_out = []
    with open(csv_path, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            stream = row["residue_stream"]
            tons = _f(row.get("residue_tons_yr", 0))
            legacy_biogas = _f(row.get("biogas_m3_yr", 0))
            legacy_total[stream] += legacy_biogas
            tons_total[stream] += tons

            out = {
                "ibge_code": row.get("ibge_code", ""),
                "municipality_name": row.get("municipality_name", ""),
                "residue_stream": stream,
                "residue_tons_yr": round(tons, 2),
                "legacy_biogas_m3_yr": round(legacy_biogas, 2),  # theoretical/gross
                "canonical_method": "",
                "canonical_theoretical_biogas": "",  # FDE=1 (chemistry comparison)
                "canonical_practical_min": "",  # × FDE (mobilisable)
                "canonical_practical_medio": "",
                "canonical_practical_max": "",
            }

            if stream in AGRICULTURAL_STREAMS and stream in STREAM_TO_CANONICAL:
                params = get_params_for_stream(stream)
                res = calculate_feedstock(tons, params)
                # theoretical biogas (FDE=1) for chemistry-only comparison to legacy
                theo_biogas = biogas_from_ch4(res.ch4_theoretical_m3["medio"], params.ch4_pct)
                out["canonical_method"] = f"forward:{STREAM_TO_CANONICAL[stream]}"
                out["canonical_theoretical_biogas"] = round(theo_biogas, 2)
                out["canonical_practical_min"] = res.biogas_practical_m3["min"]
                out["canonical_practical_medio"] = res.biogas_practical_m3["medio"]
                out["canonical_practical_max"] = res.biogas_practical_m3["max"]
                canon_theo[stream] += theo_biogas
                canon_min[stream] += res.biogas_practical_m3["min"]
                canon_med[stream] += res.biogas_practical_m3["medio"]
                canon_max[stream] += res.biogas_practical_m3["max"]
            else:
                # carried through unchanged; canonical per-head/per-capita TBD
                out["canonical_method"] = "legacy_carried(head/precalc)"
                canon_theo[stream] += legacy_biogas
                canon_min[stream] += legacy_biogas
                canon_med[stream] += legacy_biogas
                canon_max[stream] += legacy_biogas

            rows_out.append(out)

    # write per-stream comparison
    with open(comparison_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows_out[0].keys()))
        writer.writeheader()
        writer.writerows(rows_out)

    # write + print state summary
    streams = sorted(set(legacy_total) | set(canon_med))
    summary_rows = []
    for s in streams:
        leg = legacy_total[s]
        theo = canon_theo[s]
        med = canon_med[s]
        chem_delta = ((theo - leg) / leg * 100.0) if leg else 0.0  # theoretical vs legacy
        summary_rows.append(
            {
                "residue_stream": s,
                "method": "forward_canonical" if s in AGRICULTURAL_STREAMS else "legacy_carried",
                "total_tons_yr": round(tons_total[s], 1),
                "legacy_theoretical_biogas": round(leg, 1),
                "canonical_theoretical_biogas": round(theo, 1),
                "chemistry_delta_pct": round(chem_delta, 1),
                "canonical_practical_min": round(canon_min[s], 1),
                "canonical_practical_medio": round(med, 1),
                "canonical_practical_max": round(canon_max[s], 1),
            }
        )

    with open(summary_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(summary_rows[0].keys()))
        writer.writeheader()
        writer.writerows(summary_rows)

    return {
        "comparison_path": comparison_path,
        "summary_path": summary_path,
        "summary_rows": summary_rows,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default=str(_DEFAULT_CSV), help="master residue streams CSV")
    parser.add_argument(
        "--out",
        default=str(Path(__file__).parent / "canonical_recalc_output"),
        help="output directory",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"ERROR: master CSV not found: {csv_path}", file=sys.stderr)
        sys.exit(1)

    result = recalc(csv_path, Path(args.out))

    print(
        "\nSTATE-LEVEL BIOGAS (m³/yr): legacy=theoretical(gross) | canonical theoretical + practical"
    )
    print("=" * 104)
    print(
        f"{'stream':<13}{'legacy_theo':>16}{'canon_theo':>16}{'chem Δ%':>9}{'canon_pract_medio':>20}"
    )
    print("-" * 104)
    agri_leg = agri_theo = agri_prac = 0.0
    for r in result["summary_rows"]:
        if r["method"] != "forward_canonical":
            continue
        print(
            f"{r['residue_stream']:<13}{r['legacy_theoretical_biogas']:>16,.0f}"
            f"{r['canonical_theoretical_biogas']:>16,.0f}{r['chemistry_delta_pct']:>8.1f}%"
            f"{r['canonical_practical_medio']:>20,.0f}"
        )
        agri_leg += r["legacy_theoretical_biogas"]
        agri_theo += r["canonical_theoretical_biogas"]
        agri_prac += r["canonical_practical_medio"]
    print("-" * 104)
    chem = ((agri_theo - agri_leg) / agri_leg * 100.0) if agri_leg else 0.0
    print(
        f"{'AGRI TOTAL':<13}{agri_leg:>16,.0f}{agri_theo:>16,.0f}{chem:>8.1f}%{agri_prac:>20,.0f}"
    )
    print(f"\n  legacy_theoretical : gross potential currently in the handoff CSV (no FDE)")
    print(f"  canonical_theoretical: same gross basis, corrected BMP/TS/VS → isolates chemistry")
    print(f"  canonical_practical  : × canonical FDE (FC×FCo×FS×FL×η) = mobilisable potential")
    print(f"\nWrote:\n  {result['comparison_path']}\n  {result['summary_path']}")


if __name__ == "__main__":
    main()
