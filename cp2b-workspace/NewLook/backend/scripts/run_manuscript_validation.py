#!/usr/bin/env python3
"""
PILAR-2b V3 — Manuscript Data Validation Runner
================================================
Combines:
  1. SQL queries against the PostGIS database (validate_manuscript_data.sql)
  2. HTTP performance benchmarks (benchmark_endpoints.py)

into a single report that can be directly compared with the hardcoded
estimates in the manuscript's Section 3.1, 3.2, and Table 4/5.

Usage
-----
    # Full run (benchmarks + SQL):
    DATABASE_URL="postgresql://..." \\
    BASE_URL="http://localhost:8000" \\
    python scripts/run_manuscript_validation.py

    # SQL only (no HTTP server required):
    DATABASE_URL="postgresql://..." \\
    SKIP_BENCHMARKS=1 \\
    python scripts/run_manuscript_validation.py

    # Benchmark only (no database required):
    BASE_URL="http://localhost:8000" \\
    SKIP_SQL=1 \\
    python scripts/run_manuscript_validation.py

Dependencies
------------
  pip install requests psycopg2-binary
  (psycopg2 is already in requirements.txt)

Environment variables
---------------------
  DATABASE_URL    — PostgreSQL connection string (falls back to settings.py)
  BASE_URL        — API base URL (default: http://localhost:8000)
  N_REQUESTS      — Requests per endpoint for benchmark (default: 100)
  CONCURRENCY     — Parallel benchmark workers (default: 5)
  SKIP_SQL        — Set to any non-empty value to skip SQL queries
  SKIP_BENCHMARKS — Set to any non-empty value to skip HTTP benchmarks
"""

import os
import sys
import json
import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Add backend to sys.path so we can import app.core.config
# ---------------------------------------------------------------------------
BACKEND_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get("DATABASE_URL")
SKIP_SQL = bool(os.environ.get("SKIP_SQL", ""))
SKIP_BENCHMARKS = bool(os.environ.get("SKIP_BENCHMARKS", ""))

# Manuscript reference values for comparison
MANUSCRIPT = {
    "total_M_m3_dia": 19.69,
    "industrial_scale_count": 125,
    "medium_count": 293,
    "sugarcane_pct_theoretical": 84.6,
    "sugarcane_pct_practical": 61.3,
    "mae_facility_pct": 20.8,
}

# Tier thresholds (m³/ano → converted from m³/dia)
TIER_THRESHOLDS = {
    "industrial_scale": 10_000 * 365,   # ≥ 10 000 m³/dia
    "medium":            1_000 * 365,   # 1 000 – 9 999 m³/dia
    "small":               100 * 365,   # 100 – 999 m³/dia
    "micro":                 1 * 365,   # 1 – 99 m³/dia
}


# ---------------------------------------------------------------------------
# SQL validation via psycopg2
# ---------------------------------------------------------------------------

def _get_db_connection():
    """Return a psycopg2 connection, trying DATABASE_URL then settings.py."""
    import psycopg2
    from psycopg2.extras import RealDictCursor

    dsn = DATABASE_URL
    if not dsn:
        try:
            from app.core.config import settings
            dsn = settings.DATABASE_URL
        except Exception as exc:
            print(f"  Could not load settings.py: {exc}")
            return None

    if not dsn or "user:password" in dsn:
        print("  No valid DATABASE_URL found — set DATABASE_URL env var.")
        return None

    try:
        conn = psycopg2.connect(dsn, cursor_factory=RealDictCursor, connect_timeout=10)
        return conn
    except Exception as exc:  # noqa: BLE001
        print(f"  DB connection failed: {exc}")
        return None


def run_sql_validation() -> dict:
    """Execute validation queries and return a dict of results."""
    print("\n" + "=" * 70)
    print("  SQL VALIDATION — PostGIS database")
    print("=" * 70)

    conn = _get_db_connection()
    if conn is None:
        print("  SKIPPED — no database connection available.\n")
        return {"error": "no_connection"}

    results = {}

    try:
        cur = conn.cursor()

        # 1. State aggregate total
        print("\n[1] State aggregate — total biogas potential")
        cur.execute("""
            SELECT
                ROUND(SUM(total_biogas_m3_year)::numeric, 0)              AS total_m3_ano,
                ROUND(SUM(total_biogas_m3_year)::numeric / 365, 0)        AS total_m3_dia,
                ROUND(SUM(total_biogas_m3_year)::numeric / 1e6, 4)        AS total_M_m3_ano,
                ROUND(SUM(total_biogas_m3_year)::numeric / 365 / 1e6, 4)  AS total_M_m3_dia,
                COUNT(*)                                                   AS n_municipalities
            FROM municipalities
            WHERE total_biogas_m3_year > 0
        """)
        row = cur.fetchone()
        if row:
            db_val = float(row["total_M_m3_dia"])
            delta = db_val - MANUSCRIPT["total_M_m3_dia"]
            sign = "+" if delta >= 0 else ""
            print(f"    DB value : {db_val} M m³/dia")
            print(f"    Manuscript: {MANUSCRIPT['total_M_m3_dia']} M m³/dia")
            print(f"    Delta    : {sign}{delta:.4f} M m³/dia ({sign}{delta/MANUSCRIPT['total_M_m3_dia']*100:.2f}%)")
            print(f"    N muns   : {row['n_municipalities']}")
            results["state_aggregate"] = dict(row)
            results["state_aggregate"]["manuscript_M_m3_dia"] = MANUSCRIPT["total_M_m3_dia"]
            results["state_aggregate"]["delta_M_m3_dia"] = round(delta, 4)

        # 2. Municipality tier counts
        print("\n[2] Municipality tier counts")
        cur.execute("""
            SELECT
                CASE
                    WHEN total_biogas_m3_year >= 3650000 THEN 'industrial_scale'
                    WHEN total_biogas_m3_year >= 365000  THEN 'medium'
                    WHEN total_biogas_m3_year >= 36500   THEN 'small'
                    WHEN total_biogas_m3_year >= 365     THEN 'micro'
                    ELSE                                      'non_viable'
                END                                                AS tier,
                COUNT(*)                                           AS count,
                ROUND(SUM(total_biogas_m3_year)::numeric/365, 0)  AS total_m3_dia
            FROM municipalities
            GROUP BY 1
            ORDER BY
                CASE
                    WHEN total_biogas_m3_year >= 3650000 THEN 1
                    WHEN total_biogas_m3_year >= 365000  THEN 2
                    WHEN total_biogas_m3_year >= 36500   THEN 3
                    WHEN total_biogas_m3_year >= 365     THEN 4
                    ELSE 5
                END
        """)
        tier_rows = cur.fetchall()
        tier_data = {}
        for t in tier_rows:
            tier_data[t["tier"]] = {"count": t["count"], "total_m3_dia": t["total_m3_dia"]}
            note = ""
            if t["tier"] == "industrial_scale":
                note = f" (manuscript: {MANUSCRIPT['industrial_scale_count']})"
            elif t["tier"] == "medium":
                note = f" (manuscript: {MANUSCRIPT['medium_count']})"
            print(f"    {t['tier']:<20} count={t['count']:>4}{note}  "
                  f"total={int(t['total_m3_dia']):>12,} m³/dia")
        results["tier_counts"] = tier_data

        # 3. Feedstock composition
        print("\n[3] Feedstock composition")
        cur.execute("""
            SELECT
                ROUND(100.0 * SUM(COALESCE(sugarcane_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS sugarcane_pct,
                ROUND(100.0 * SUM(COALESCE(soybean_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS soybean_pct,
                ROUND(100.0 * SUM(COALESCE(corn_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS corn_pct,
                ROUND(100.0 * SUM(COALESCE(coffee_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS coffee_pct,
                ROUND(100.0 * SUM(COALESCE(citrus_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS citrus_pct,
                ROUND(100.0 * SUM(COALESCE(agricultural_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS agricultural_pct,
                ROUND(100.0 * SUM(COALESCE(livestock_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS livestock_pct,
                ROUND(100.0 * SUM(COALESCE(urban_biogas_m3_year, 0))
                    / NULLIF(SUM(total_biogas_m3_year), 0), 2)   AS urban_pct,
                COUNT(*) FILTER (WHERE total_biogas_m3_year > 0)  AS n_with_data
            FROM municipalities
        """)
        fc = cur.fetchone()
        if fc:
            results["feedstock_composition"] = dict(fc)
            sc_pct = float(fc["sugarcane_pct"] or 0)
            print(f"    Sugarcane  : {sc_pct}%  "
                  f"(manuscript theoretical={MANUSCRIPT['sugarcane_pct_theoretical']}%, "
                  f"practical={MANUSCRIPT['sugarcane_pct_practical']}%)")
            print(f"    Soybean    : {fc['soybean_pct']}%")
            print(f"    Corn       : {fc['corn_pct']}%")
            print(f"    Coffee     : {fc['coffee_pct']}%")
            print(f"    Citrus     : {fc['citrus_pct']}%")
            print(f"    Livestock  : {fc['livestock_pct']}%")
            print(f"    Urban      : {fc['urban_pct']}%")
            print(f"    Agriculture total: {fc['agricultural_pct']}%")

        # 4. Regional breakdown
        print("\n[4] Regional breakdown")
        cur.execute("""
            SELECT
                COALESCE(administrative_region, 'Unclassified') AS region,
                COUNT(*)                                          AS n_municipalities,
                ROUND(SUM(total_biogas_m3_year)::numeric/365, 0) AS total_m3_dia,
                ROUND(100.0 * SUM(total_biogas_m3_year)
                    / NULLIF((SELECT SUM(total_biogas_m3_year)
                              FROM municipalities), 0), 2)        AS pct_of_state
            FROM municipalities
            WHERE total_biogas_m3_year > 0
            GROUP BY 1
            ORDER BY total_m3_dia DESC
        """)
        regional = cur.fetchall()
        results["regional"] = [dict(r) for r in regional]
        for r in regional:
            print(f"    {r['region']:<30} n={r['n_municipalities']:>4}  "
                  f"{int(r['total_m3_dia']):>12,} m³/dia  ({r['pct_of_state']}%)")

        # 5. Column presence check (MAE validation)
        print("\n[5] Checking for validation/measured columns (MAE)")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'municipalities'
              AND column_name ILIKE ANY(ARRAY[
                  '%measured%','%observed%','%actual%',
                  '%modelled%','%predicted%','%estimated%',
                  '%reference%','%validated%'
              ])
            ORDER BY column_name
        """)
        val_cols = cur.fetchall()
        if val_cols:
            print("    Found validation columns:")
            for vc in val_cols:
                print(f"      {vc['column_name']} ({vc['data_type']})")
            results["validation_columns"] = [dict(v) for v in val_cols]
        else:
            print("    No measured/observed columns found.")
            print(f"    The 20.8% MAE (manuscript) must be verified against")
            print(f"    an external reference dataset (Table 4 source data).")
            results["validation_columns"] = []

        # 6. All municipalities column summary
        print("\n[6] Total municipality count summary")
        cur.execute("""
            SELECT
                COUNT(*)                                          AS total,
                COUNT(*) FILTER (WHERE total_biogas_m3_year > 0) AS with_data,
                COUNT(*) FILTER (WHERE total_biogas_m3_year IS NULL
                                    OR total_biogas_m3_year = 0) AS no_data,
                ROUND(MIN(total_biogas_m3_year)::numeric/365, 2) AS min_m3_dia,
                ROUND(MAX(total_biogas_m3_year)::numeric/365, 0) AS max_m3_dia,
                ROUND(AVG(total_biogas_m3_year)::numeric/365, 0) AS avg_m3_dia
            FROM municipalities
        """)
        totals = cur.fetchone()
        if totals:
            results["totals"] = dict(totals)
            print(f"    Total rows : {totals['total']}")
            print(f"    With data  : {totals['with_data']}")
            print(f"    No data    : {totals['no_data']}")
            print(f"    Range      : {totals['min_m3_dia']} – {totals['max_m3_dia']} m³/dia")
            print(f"    Mean       : {totals['avg_m3_dia']} m³/dia")

        cur.close()

    except Exception as exc:  # noqa: BLE001
        print(f"  SQL error: {exc}")
        results["sql_error"] = str(exc)
    finally:
        conn.close()

    return results


# ---------------------------------------------------------------------------
# HTTP benchmark runner (delegates to benchmark_endpoints.py logic)
# ---------------------------------------------------------------------------

def run_benchmarks() -> dict:
    """Import and call the benchmark module."""
    try:
        # Ensure the scripts dir is on the path
        scripts_dir = str(Path(__file__).parent)
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)

        # Dynamically load benchmark_endpoints to avoid __name__ == __main__ guard
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "benchmark_endpoints",
            Path(__file__).parent / "benchmark_endpoints.py"
        )
        bm = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(bm)
        return bm.run_benchmarks()
    except Exception as exc:  # noqa: BLE001
        print(f"  Benchmark error: {exc}")
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    report = {
        "generated_at": timestamp,
        "manuscript_reference_values": MANUSCRIPT,
    }

    if not SKIP_SQL:
        report["sql_validation"] = run_sql_validation()
    else:
        print("\nSKIPPING SQL validation (SKIP_SQL set).")

    if not SKIP_BENCHMARKS:
        report["benchmark"] = run_benchmarks()
    else:
        print("\nSKIPPING HTTP benchmarks (SKIP_BENCHMARKS set).")

    # Save combined report
    out_path = (
        Path(__file__).parent
        / f"manuscript_validation_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(out_path, "w", encoding="utf-8") as fh:
        # Remove raw latency arrays for brevity
        for ep in report.get("benchmark", {}).get("warm_cache_results", []):
            ep.pop("raw_latencies_s", None)
        json.dump(report, fh, indent=2, ensure_ascii=False, default=str)

    print(f"\n{'='*70}")
    print(f"  Combined report saved → {out_path}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
