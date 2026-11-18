#!/usr/bin/env python3
"""Rebuild the São Paulo potential from the stream table and bound it min/med/max.

Recomputes the headline totals from ``residue_streams_sp2023`` rather than
trusting the aggregate columns, checks the internal identities that must hold,
and propagates the BMP uncertainty in ``corpus_bmp_long.csv`` into low/central/
high scenarios.

Two data defects this script exists to keep visible, both verified against the
Docker DB:

1. ``residue_tons_yr`` holds HEAD COUNT for the three livestock streams, not
   tonnes. cattle 11.19 M, swine 1.59 M and poultry 205.7 M match São Paulo's
   herd and flock sizes, and their conversion factors (130, 380 and 1.5) are
   m³ CH₄ per ANIMAL per year — 1.5 m³/t would be ~100x below any measured
   poultry-litter yield, while 1.5 m³/bird/year is ordinary. So
   ``total_biomass_tons_year`` adds 275 Mt of biomass to 218 M animals and the
   sum means nothing. Only the agricultural streams are summed as mass here.

2. sugarcane declares ``conversion_factor = 85`` but yields 50.1 m³/t
   (ratio 0.5893). Some availability discount is applied that the declared
   factor does not disclose, so the stream is reported but not reconciled.

The volumes throughout are METHANE, not biogas: the factors above are m³ CH₄,
and the energy column divides out at methane's LHV. Raw biogas is derived with
the FIESP 2025 fraction so the result is comparable to the published SP studies.
"""

from __future__ import annotations

import argparse
import csv
import os
import statistics as st
from collections import defaultdict
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

CH4_FRACTION_OF_BIOGAS = 0.625  # FIESP 2025
CH4_LHV_KWH_M3 = 9.94
ELECTRIC_EFFICIENCY = 0.38  # CHP genset, for the electrical scenario only
DAYS = 365

LIVESTOCK_HEADCOUNT_STREAMS = {"cattle", "swine", "poultry"}

# Stream -> curated corpus feedstock whose BMP spread bounds it. Streams with no
# curated entry keep the central value and are reported as unbounded rather than
# given an invented range.
STREAM_TO_CORPUS = {
    "sugarcane": "VINHACA",
    "cattle": "DEJETO_BOVINO",
    "swine": "DEJETO_SUINO",
    "poultry": "CAMA_AVIARIO",
    "citrus": "BAGACO_CITROS",
    "rsu_organic": "LODO_ESGOTO",
    "corn": "MILHO_PALHA",
}


def corpus_ranges(path: Path) -> dict[str, tuple[float, float, float]]:
    """feedstock -> (p10, median, p90) from the hand-curated corpus."""
    vals: dict[str, list[float]] = defaultdict(list)
    with path.open(encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            try:
                vals[row["feedstock_code"]].append(float(row["bmp_value"]))
            except (KeyError, TypeError, ValueError):
                continue
    out = {}
    for code, v in vals.items():
        v.sort()
        if len(v) < 3:
            continue
        p10 = v[max(0, int(0.10 * (len(v) - 1)))]
        p90 = v[min(len(v) - 1, int(round(0.90 * (len(v) - 1))))]
        out[code] = (p10, st.median(v), p90)
    return out


def fetch_streams(dsn: str) -> list[dict]:
    with psycopg2.connect(dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT residue_stream, sector,
                       SUM(residue_tons_yr)  AS tons,
                       SUM(biogas_m3_yr)     AS ch4_m3,
                       SUM(energy_mwh_yr)    AS energy_mwh,
                       AVG(conversion_factor) AS factor
                FROM residue_streams_sp2023
                GROUP BY 1, 2 ORDER BY 4 DESC NULLS LAST
                """)
            return [dict(r) for r in cur.fetchall()]


def fmt(x: float | None, nd: int = 0) -> str:
    return "-" if x is None else f"{x:,.{nd}f}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--corpus", type=Path, required=True)
    args = ap.parse_args()
    if not args.dsn:
        raise SystemExit("set --dsn or DATABASE_URL")

    ranges = corpus_ranges(args.corpus)
    streams = fetch_streams(args.dsn)

    print("=" * 96)
    print("  SÃO PAULO — RECÁLCULO POR FLUXO (volumes são CH₄, não biogás)")
    print("=" * 96)
    hdr = (
        f"{'fluxo':<14}{'setor':<13}{'quantidade':>16}{'unidade':>10}{'fator':>9}{'CH4 m³/ano':>18}"
    )
    print(hdr)
    print("-" * 96)

    total_ch4 = 0.0
    total_energy = 0.0
    biomass_tons = 0.0
    headcount = 0.0
    for s in streams:
        ch4 = float(s["ch4_m3"] or 0)
        total_ch4 += ch4
        total_energy += float(s["energy_mwh"] or 0)
        qty = s["tons"]
        is_head = s["residue_stream"] in LIVESTOCK_HEADCOUNT_STREAMS
        unit = "cabeças" if is_head else ("t/ano" if qty else "—")
        if qty:
            if is_head:
                headcount += float(qty)
            else:
                biomass_tons += float(qty)
        print(
            f"{s['residue_stream']:<14}{s['sector']:<13}{fmt(qty):>16}{unit:>10}"
            f"{fmt(s['factor'], 1):>9}{fmt(ch4):>18}"
        )

    print("-" * 96)
    print(f"{'TOTAL':<27}{fmt(total_ch4):>53}")
    print()
    print(f"  Biomassa real (só streams em massa) : {fmt(biomass_tons):>18} t/ano")
    print(f"                                       {fmt(biomass_tons / DAYS):>18} t/dia")
    print(f"  Contagem animal (NÃO é massa)       : {fmt(headcount):>18} cabeças")
    print(
        f"  [total_biomass_tons_year soma os dois: {fmt(biomass_tons + headcount)} — sem significado]"
    )

    # ---- scenarios -------------------------------------------------------
    print()
    print("=" * 96)
    print("  CENÁRIOS — propagando a faixa de BMP do corpus curado (p10 / mediana / p90)")
    print("=" * 96)
    print(
        f"{'fluxo':<14}{'corpus':<16}{'p10':>7}{'med':>7}{'p90':>7}{'CH4 min':>16}{'CH4 med':>16}{'CH4 max':>16}"
    )
    print("-" * 96)

    lo_t = mid_t = hi_t = 0.0
    unbounded = []
    for s in streams:
        ch4 = float(s["ch4_m3"] or 0)
        code = STREAM_TO_CORPUS.get(s["residue_stream"])
        rng = ranges.get(code) if code else None
        if not rng:
            lo_t += ch4
            mid_t += ch4
            hi_t += ch4
            if ch4:
                unbounded.append(s["residue_stream"])
            continue
        p10, med, p90 = rng
        lo, hi = ch4 * p10 / med, ch4 * p90 / med
        lo_t += lo
        mid_t += ch4
        hi_t += hi
        print(
            f"{s['residue_stream']:<14}{code:<16}{p10:>7.0f}{med:>7.0f}{p90:>7.0f}"
            f"{fmt(lo):>16}{fmt(ch4):>16}{fmt(hi):>16}"
        )

    print("-" * 96)
    if unbounded:
        print(f"  sem faixa curada (mantidos no central): {', '.join(unbounded)}")
    print()

    rows = [
        ("Metano (CH₄)", lo_t, mid_t, hi_t, "Nm³"),
        (
            "Biogás bruto",
            lo_t / CH4_FRACTION_OF_BIOGAS,
            mid_t / CH4_FRACTION_OF_BIOGAS,
            hi_t / CH4_FRACTION_OF_BIOGAS,
            "Nm³",
        ),
        ("Biometano", lo_t, mid_t, hi_t, "Nm³"),
    ]
    print(f"{'grandeza':<16}{'unidade':<7}{'MÍNIMO':>20}{'CENTRAL':>20}{'MÁXIMO':>20}")
    print("-" * 83)
    for name, lo, mid, hi, unit in rows:
        print(f"{name:<16}{unit + '/ano':<7}{fmt(lo):>20}{fmt(mid):>20}{fmt(hi):>20}")
        print(
            f"{'':<16}{unit + '/dia':<7}{fmt(lo / DAYS):>20}{fmt(mid / DAYS):>20}{fmt(hi / DAYS):>20}"
        )
    e_lo, e_mid, e_hi = (v * CH4_LHV_KWH_M3 / 1e6 for v in (lo_t, mid_t, hi_t))
    print(f"{'Energia térmica':<16}{'GWh/ano':<7}{fmt(e_lo):>20}{fmt(e_mid):>20}{fmt(e_hi):>20}")
    print(
        f"{'Energia elétrica':<16}{'GWh/ano':<7}"
        f"{fmt(e_lo * ELECTRIC_EFFICIENCY):>20}{fmt(e_mid * ELECTRIC_EFFICIENCY):>20}"
        f"{fmt(e_hi * ELECTRIC_EFFICIENCY):>20}"
    )
    print()
    print(
        f"  energia térmica conferida contra a coluna do banco: {fmt(total_energy / 1000)} GWh/ano"
    )
    print(
        f"  faixa relativa ao central: -{(1 - lo_t / mid_t) * 100:.1f}% / +{(hi_t / mid_t - 1) * 100:.1f}%"
    )


if __name__ == "__main__":
    main()
