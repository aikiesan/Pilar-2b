#!/usr/bin/env python3
"""Normalise the extracted BMP corpus to a single unit, or refuse to.

The CP2B literature extraction (``Validacao_dados/00_DATABASES/*.db``) stores BMP
in ``chemical_parameters`` with a ``unit`` column that holds only the VOLUME unit
(``mL``, ``NmL``, ``L``, ``m3``, or the literal ``from_table``) and never the
denominator. So ``0.23`` and ``230`` can be the same measurement — m³ CH₄/kg VS
and NmL CH₄/g VS — and a mean taken over the raw column is an artifact of which
magnitudes happened to be present, not a property of the substrate.

This script converts to a single canonical unit, **NmL CH₄ / g VS** (numerically
identical to L CH₄/kg VS), using unit + magnitude together. Where that pair does
not identify the basis, the row is FLAGGED rather than coerced: a corpus that
says "I cannot place 179 rows" is usable evidence, and one that silently places
them is not.

Conversion is therefore deliberately conservative. ``from_table`` rows carry no
unit at all and are never auto-resolved, even when their magnitude looks right —
a plausible magnitude is not provenance, and these feed published BMP values.

Outputs a long-format CSV in the same shape as
``data/canonical_parameters/corpus_bmp_long.csv`` so the two can be concatenated.
"""

from __future__ import annotations

import argparse
import csv
import sqlite3
import statistics as st
from collections import defaultdict
from pathlib import Path

CANONICAL_UNIT = "NmL_CH4_gVS"

# Plausible window for BMP expressed in NmL CH₄/g VS. The floor sits at 20 rather
# than 0 because a genuine sub-20 BMP is rarer than a mis-scaled value, and the
# ceiling at 1200 clears pure lipids (~1000) with headroom.
PLAUSIBLE_LO, PLAUSIBLE_HI = 20.0, 1200.0

# Magnitude band that identifies a value already expressed per gram of VS.
PER_GVS_LO, PER_GVS_HI = 20.0, 1200.0
# Magnitude band that identifies a value expressed per kilogram of VS in m³ or L
# (i.e. 0.23 m³/kgVS -> 230 NmL/gVS). Values here are multiplied by 1000.
PER_KG_LO, PER_KG_HI = 0.02, 1.2

_VOLUMETRIC_MILLI = {"ml", "nml"}
_VOLUMETRIC_WHOLE = {"l", "m3", "m³", "m�"}


def _norm_unit(raw: str | None) -> str:
    return (raw or "").strip().lower()


def classify(value: float | None, raw_unit: str | None) -> tuple[float | None, str]:
    """Return (value_in_NmL_CH4_gVS, status).

    status is 'ok' when the conversion is determined, otherwise a short reason
    the row could not be placed. Never returns a converted value with a non-'ok'
    status — callers must drop flagged rows from any statistic.
    """
    if value is None:
        return None, "sem_valor"
    unit = _norm_unit(raw_unit)

    if unit == "from_table":
        # No unit was captured at extraction time. Magnitude alone cannot
        # distinguish NmL/gVS from a percentage, a COD-basis yield, or a raw
        # table cell, so these are never auto-resolved.
        return None, "sem_unidade(from_table)"

    if unit in _VOLUMETRIC_MILLI:
        if PER_GVS_LO <= value <= PER_GVS_HI:
            return value, "ok"
        if PER_KG_LO <= value <= PER_KG_HI:
            # mL labelled but m³/kg magnitude — the label and the number
            # disagree, so we do not trust either.
            return None, "unidade_conflita_magnitude"
        return None, "fora_de_faixa"

    if unit in _VOLUMETRIC_WHOLE:
        if PER_KG_LO <= value <= PER_KG_HI:
            return value * 1000.0, "ok"
        if PER_GVS_LO <= value <= PER_GVS_HI:
            # "L" holding 250 is L CH₄/kg VS, numerically already canonical.
            return value, "ok"
        return None, "fora_de_faixa"

    return None, f"unidade_desconhecida({unit})"


def load_rows(db_path: Path) -> list[dict]:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        cur = conn.execute("""
            SELECT rt.residue_code, cp.value_min, cp.value_mean, cp.value_max,
                   cp.unit, cp.data_quality, cp.page_number,
                   sp.title, sp.doi
            FROM chemical_parameters cp
            JOIN residue_types rt ON rt.residue_id = cp.residue_id
            LEFT JOIN scientific_papers sp ON sp.paper_id = cp.paper_id
            WHERE cp.parameter_name = 'BMP'
            """)
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("db", type=Path, nargs="+", help="SQLite extraction database(s)")
    ap.add_argument("--out", type=Path, required=True, help="normalised corpus CSV")
    ap.add_argument("--rejects", type=Path, help="CSV of rows that could not be placed")
    args = ap.parse_args()

    kept: list[dict] = []
    rejected: list[dict] = []

    for db in args.db:
        if not db.is_file():
            raise SystemExit(f"database not found: {db}")
        for r in load_rows(db):
            val, status = classify(r["value_mean"], r["unit"])
            rec = {
                "feedstock_code": r["residue_code"],
                "bmp_value": None if val is None else round(val, 2),
                "bmp_unit": CANONICAL_UNIT,
                "raw_value": r["value_mean"],
                "raw_unit": r["unit"],
                "value_min": r["value_min"],
                "value_max": r["value_max"],
                "data_quality": r["data_quality"],
                "page_number": r["page_number"],
                "citation_full": (r["title"] or "")[:160],
                "doi_link": r["doi"] or "",
                "source_db": db.name,
                "status": status,
            }
            (kept if status == "ok" else rejected).append(rec)

    args.out.parent.mkdir(parents=True, exist_ok=True)
    fields = list(kept[0].keys()) if kept else list(rejected[0].keys())
    with args.out.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=fields)
        w.writeheader()
        w.writerows(kept)
    if args.rejects and rejected:
        with args.rejects.open("w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=fields)
            w.writeheader()
            w.writerows(rejected)

    total = len(kept) + len(rejected)
    print(f"BMP rows lidas      : {total}")
    print(f"  normalizadas (ok) : {len(kept)}  ({100 * len(kept) / total:.1f}%)")
    print(f"  sinalizadas       : {len(rejected)}")
    reasons: dict[str, int] = defaultdict(int)
    for r in rejected:
        reasons[r["status"]] += 1
    for reason, n in sorted(reasons.items(), key=lambda x: -x[1]):
        print(f"      {reason:<32} {n}")

    by: dict[str, list[float]] = defaultdict(list)
    for r in kept:
        by[r["feedstock_code"]].append(r["bmp_value"])
    print(
        f"\n{'feedstock':<16}{'n':>4}{'min':>8}{'media':>9}{'mediana':>9}{'p10':>8}{'p90':>8}{'max':>8}"
    )
    print("-" * 70)
    for code in sorted(by):
        v = sorted(by[code])
        if not v:
            continue
        p10 = v[max(0, int(0.10 * (len(v) - 1)))]
        p90 = v[min(len(v) - 1, int(round(0.90 * (len(v) - 1))))]
        print(
            f"{code:<16}{len(v):>4}{min(v):>8.0f}{st.mean(v):>9.1f}"
            f"{st.median(v):>9.1f}{p10:>8.0f}{p90:>8.0f}{max(v):>8.0f}"
        )
    print(f"\nescrito: {args.out}")
    if args.rejects and rejected:
        print(f"rejeitados: {args.rejects}")


if __name__ == "__main__":
    main()
