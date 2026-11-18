#!/usr/bin/env python3
"""Reconcile São Paulo biomass mass three ways and show where the inputs disagree.

``total_biomass_tons_year`` cannot be trusted: it sums 275 Mt of agricultural
mass with 218 M head of livestock, because ``residue_tons_yr`` holds HEAD COUNT
for cattle/swine/poultry. Fixing it means deriving a real mass for every stream —
and that is only possible if the conversion factors are self-consistent, which
this script exists to test.

Three independent estimates per stream:

* **stored**       — ``residue_tons_yr`` as recorded (head count for livestock).
* **via config**   — CH₄ / (BMP x VS%/100) using RESIDUE_BIOMASS_CONFIGS, the
  canonical parameters carrying DOIs.
* **via stream**   — CH₄ / conversion_factor as declared in the stream table.

Where a stream is internally consistent the config and stream estimates agree and
the mass is trustworthy. Where they diverge, the divergence IS the finding: the
two parameter sets disagree and no single mass can be published until one wins.

For livestock the config estimate is additionally divided by head count to give
kg of manure per animal per day, which is checkable against husbandry reality —
the fastest way to see that a factor is wrong by an order of magnitude rather
than by a plausible-looking margin.

Reports only. Writes nothing.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.biomass_availability import RESIDUE_BIOMASS_CONFIGS  # noqa: E402

DAYS = 365

# Stream name in residue_streams_sp2023 -> config key.
STREAM_TO_CONFIG = {
    "sugarcane": "sugarcane",
    "soybean": "soybean",
    "corn": "corn",
    "coffee": "coffee",
    "citrus": "citrus",
    "cattle": "cattle",
    "swine": "swine",
    "poultry": "poultry",
    "aquaculture": "aquaculture",
    "rsu_organic": "rsu",
    "rpo_pruning": "rpo",
}

HEADCOUNT_STREAMS = {"cattle", "swine", "poultry"}

# Manure actually collectable per animal per day, wet basis. Ranges rather than
# points because husbandry system dominates: confined dairy yields far more
# collectable manure than extensive beef, where most is deposited on pasture and
# never reaches a digester. Used only as a plausibility band for the derived
# figure — never to overwrite it.
PLAUSIBLE_KG_PER_HEAD_DAY = {
    "cattle": (8.0, 30.0),
    "swine": (4.0, 12.0),
    "poultry": (0.02, 0.15),
}


def fmt(x, nd=0):
    return "-" if x is None else f"{x:,.{nd}f}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    args = ap.parse_args()
    if not args.dsn:
        raise SystemExit("set --dsn or DATABASE_URL")

    cfg = {c.key: c for c in RESIDUE_BIOMASS_CONFIGS}

    with psycopg2.connect(args.dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT residue_stream, sector,
                       SUM(residue_tons_yr) AS stored,
                       SUM(biogas_m3_yr)    AS ch4,
                       AVG(conversion_factor) AS stream_factor
                FROM residue_streams_sp2023
                GROUP BY 1, 2 ORDER BY 4 DESC NULLS LAST
                """)
            rows = [dict(r) for r in cur.fetchall()]

    print("=" * 104)
    print("  FATORES: canônico (BMP x VS%) vs declarado na tabela de fluxos")
    print("=" * 104)
    print(
        f"{'fluxo':<14}{'BMP':>7}{'VS%wet':>8}{'m³/t canônico':>16}{'m³/t declarado':>17}{'razão':>9}  situação"
    )
    print("-" * 104)

    for r in rows:
        c = cfg.get(STREAM_TO_CONFIG.get(r["residue_stream"], ""))
        if not c:
            continue
        canon = c.bmp * c.vs_percent / 100.0
        declared = float(r["stream_factor"]) if r["stream_factor"] else None
        if declared is None:
            print(
                f"{r['residue_stream']:<14}{c.bmp:>7.0f}{c.vs_percent:>8.1f}{canon:>16.1f}{'-':>17}{'-':>9}  sem fator"
            )
            continue
        ratio = declared / canon
        flag = (
            "OK"
            if 0.9 <= ratio <= 1.1
            else ("HEAD/ANIMAL" if r["residue_stream"] in HEADCOUNT_STREAMS else "DIVERGE")
        )
        print(
            f"{r['residue_stream']:<14}{c.bmp:>7.0f}{c.vs_percent:>8.1f}{canon:>16.1f}"
            f"{declared:>17.1f}{ratio:>9.2f}  {flag}"
        )

    print()
    print("=" * 104)
    print("  MASSA DERIVADA — CH₄ / (BMP x VS%/100), parâmetros canônicos com DOI")
    print("=" * 104)
    print(f"{'fluxo':<14}{'armazenado':>16}{'massa derivada t/ano':>22}{'t/dia':>14}   verificação")
    print("-" * 104)

    total_mass = 0.0
    suspect = []
    for r in rows:
        key = STREAM_TO_CONFIG.get(r["residue_stream"], "")
        c = cfg.get(key)
        ch4 = float(r["ch4"] or 0)
        if not c or ch4 <= 0:
            continue
        canon = c.bmp * c.vs_percent / 100.0
        mass = ch4 / canon
        total_mass += mass
        check = ""
        if r["residue_stream"] in HEADCOUNT_STREAMS and r["stored"]:
            heads = float(r["stored"])
            kg_day = mass * 1000.0 / heads / DAYS
            lo, hi = PLAUSIBLE_KG_PER_HEAD_DAY[r["residue_stream"]]
            ok = lo <= kg_day <= hi
            check = (
                f"{kg_day:,.1f} kg/cab/dia (plausível {lo:g}-{hi:g}) {'OK' if ok else '<-- FORA'}"
            )
            if not ok:
                suspect.append((r["residue_stream"], kg_day, lo, hi))
        print(
            f"{r['residue_stream']:<14}{fmt(r['stored']):>16}{fmt(mass):>22}"
            f"{fmt(mass / DAYS):>14}   {check}"
        )

    print("-" * 104)
    print(f"{'TOTAL':<14}{'':>16}{fmt(total_mass):>22}{fmt(total_mass / DAYS):>14}")
    print()
    print(
        f"  Biomassa total recalculada : {fmt(total_mass)} t/ano  ({fmt(total_mass / DAYS)} t/dia)"
    )
    print(f"  total_biomass_tons_year    : 493,618,963 t/ano  <- soma massa + cabeças, inválido")
    print(f"  dossiê                     : 2,147,266,581 t/ano")
    if suspect:
        print()
        print("  FLUXOS QUE NÃO FECHAM COM A REALIDADE ZOOTÉCNICA:")
        for name, kg, lo, hi in suspect:
            print(
                f"    {name}: {kg:,.1f} kg/cab/dia — fora da faixa {lo:g}-{hi:g}; fator m³/cabeça suspeito"
            )


if __name__ == "__main__":
    main()
