#!/usr/bin/env python3
"""Spatial concentration of São Paulo's biogas potential, under the Atlas tiers.

The manuscript's headline spatial claim — "25.1% of municipalities account for
67.0% of mobilisable potential" — was computed under the superseded forward
engine with the multiplicative FDE, before the Atlas rework of 2026-07-30. Every
quantity it rests on (Gini, the municipality threshold, the intermediate-region
ranking) is a function of the per-municipality distribution, so all of them move
when the method changes. No script in the repository recomputed them.

This one does, reading ch4_real_m3_year / ch4_ideal_m3_year as written by
load_scenarios_real_ideal.py. Reports only; writes nothing.

Gini is computed on the discrete municipal distribution:

    G = (2 * sum(i * x_i) / (n * sum(x_i))) - (n + 1) / n

with x sorted ascending and i one-based — the standard finite-sample estimator,
not a trapezoidal approximation of the Lorenz curve, so the value is exact for
645 units rather than resolution-dependent.
"""

from __future__ import annotations

import argparse
import json
import os

import psycopg2

TIERS = ("real", "ideal")

# Limiar industrial usado na classificação do manuscrito, em m3 CH4/dia.
INDUSTRIAL_THRESHOLD_M3_DAY = 50_000
DAYS = 365


def fetch(dsn: str) -> list[dict]:
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT municipality_name,
                   intermediate_region,
                   population,
                   COALESCE(ch4_real_m3_year, 0),
                   COALESCE(ch4_ideal_m3_year, 0)
            FROM municipalities
            WHERE ibge_code::text LIKE '35%'
            """
        )
        return [
            {
                "nome": r[0],
                "rgint": r[1] or "(sem regiao)",
                "pop": r[2] or 0,
                "real": float(r[3]),
                "ideal": float(r[4]),
            }
            for r in cur.fetchall()
        ]


def gini(values: list[float]) -> float:
    xs = sorted(v for v in values)
    n = len(xs)
    total = sum(xs)
    if n == 0 or total == 0:
        return 0.0
    weighted = sum((i + 1) * x for i, x in enumerate(xs))
    return (2.0 * weighted) / (n * total) - (n + 1.0) / n


def share_thresholds(values: list[float], shares=(0.50, 0.67, 0.80, 0.90)) -> dict:
    """How many municipalities, ranked descending, to reach each share of total."""
    xs = sorted(values, reverse=True)
    total = sum(xs)
    out = {}
    for share in shares:
        acc = 0.0
        for i, x in enumerate(xs, start=1):
            acc += x
            if acc >= share * total:
                out[share] = {"municipios": i, "pct_municipios": 100.0 * i / len(xs)}
                break
    return out


def lorenz_points(values: list[float], steps: int = 20) -> list[tuple[float, float]]:
    """Lorenz curve sampled at `steps` points — for plotting, cumulative ascending."""
    xs = sorted(values)
    n, total = len(xs), sum(xs)
    pts = [(0.0, 0.0)]
    acc = 0.0
    for i, x in enumerate(xs, start=1):
        acc += x
        if i % max(1, n // steps) == 0 or i == n:
            pts.append((i / n, acc / total))
    return pts


def by_region(rows: list[dict], tier: str) -> list[dict]:
    agg: dict[str, dict] = {}
    for r in rows:
        a = agg.setdefault(r["rgint"], {"rgint": r["rgint"], "valor": 0.0, "n": 0})
        a["valor"] += r[tier]
        a["n"] += 1
    total = sum(a["valor"] for a in agg.values())
    for a in agg.values():
        a["pct"] = 100.0 * a["valor"] / total if total else 0.0
    return sorted(agg.values(), key=lambda a: -a["valor"])


def report(rows: list[dict]) -> dict:
    out: dict = {"n_municipios": len(rows)}
    print(f"\n{'=' * 92}\n  CONCENTRACAO ESPACIAL — {len(rows)} municipios de SP\n{'=' * 92}")

    for tier in TIERS:
        vals = [r[tier] for r in rows]
        total = sum(vals)
        g = gini(vals)
        thr = share_thresholds(vals)
        ranked = sorted(rows, key=lambda r: -r[tier])
        nonzero = [r for r in rows if r[tier] > 0]
        acima = [r for r in rows if r[tier] / DAYS >= INDUSTRIAL_THRESHOLD_M3_DAY]
        pot_acima = sum(r[tier] for r in acima)

        print(f"\n--- CENARIO {tier.upper()} " + "-" * 70)
        print(f"  total                       {total:>20,.0f} Nm3 CH4/ano")
        print(f"  Gini                        {g:>20.4f}")
        for share, d in thr.items():
            print(
                f"  {share:.0%} do potencial em      "
                f"{d['municipios']:>4} municipios  ({d['pct_municipios']:.1f}%)"
            )
        print(f"  municipios com potencial 0  {len(rows) - len(nonzero):>4}")
        print(
            f"  >= {INDUSTRIAL_THRESHOLD_M3_DAY:,} m3/dia          "
            f"{len(acima):>4} municipios  ({100.0 * len(acima) / len(rows):.1f}%), "
            f"{100.0 * pot_acima / total:.1f}% do potencial"
        )
        print(f"  maior:  {ranked[0]['nome']:<28} {ranked[0][tier] / DAYS:>14,.0f} m3/dia")
        menor = [r for r in ranked if r[tier] > 0][-1]
        print(f"  menor (>0): {menor['nome']:<24} {menor[tier] / DAYS:>14,.0f} m3/dia")
        print(f"  amplitude   {ranked[0][tier] / max(menor[tier], 1e-9):>20,.0f}x")

        print(f"\n  Top-10 municipios ({tier})")
        for i, r in enumerate(ranked[:10], 1):
            print(
                f"   {i:>2}. {r['nome']:<28} {r[tier] / DAYS:>12,.0f} m3/dia"
                f"   {100.0 * r[tier] / total:>5.2f}%"
            )

        regs = by_region(rows, tier)
        print(f"\n  Top-5 regioes intermediarias ({tier})")
        acc = 0.0
        for i, a in enumerate(regs[:5], 1):
            acc += a["pct"]
            print(f"   {i}. {a['rgint']:<30} {a['pct']:>6.2f}%   (acum {acc:>6.2f}%)")

        out[tier] = {
            "total_m3_ano": total,
            "gini": g,
            "limiares": {str(k): v for k, v in thr.items()},
            "municipios_zero": len(rows) - len(nonzero),
            "industrial": {
                "limiar_m3_dia": INDUSTRIAL_THRESHOLD_M3_DAY,
                "municipios": len(acima),
                "pct_municipios": 100.0 * len(acima) / len(rows),
                "pct_potencial": 100.0 * pot_acima / total,
            },
            "maior": {"nome": ranked[0]["nome"], "m3_dia": ranked[0][tier] / DAYS},
            "menor_nao_nulo": {"nome": menor["nome"], "m3_dia": menor[tier] / DAYS},
            "top10": [
                {"nome": r["nome"], "m3_dia": r[tier] / DAYS, "pct": 100.0 * r[tier] / total}
                for r in ranked[:10]
            ],
            "regioes": [
                {"rgint": a["rgint"], "pct": a["pct"], "m3_ano": a["valor"]} for a in regs
            ],
            "lorenz": lorenz_points([r[tier] for r in rows]),
        }

    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    ap.add_argument("--json", type=str, default=None, help="grava o resultado completo")
    args = ap.parse_args()

    rows = fetch(args.dsn)
    if not rows:
        raise SystemExit("nenhum municipio de SP encontrado")
    result = report(rows)

    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(result, fh, ensure_ascii=False, indent=2)
        print(f"\n[json] {args.json}")


if __name__ == "__main__":
    main()
