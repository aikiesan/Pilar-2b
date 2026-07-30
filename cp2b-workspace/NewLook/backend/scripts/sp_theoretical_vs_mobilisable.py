#!/usr/bin/env python3
"""Split the São Paulo potential into theoretical and mobilisable, with bounds.

The headline 19.90 bi Nm3 CH4/ano has **no availability correction applied at
all**: the pipeline multiplies mass by BMP and VS and stops. Every study in the
SP comparative literature (GEF/ABiogas, IEE-USP, SEMIL, Instituto 17) publishes
a mobilisable figure — what can actually reach a digester after the residue's
competing uses, collection losses, seasonality and logistics. Comparing the two
directly overstates PILAR-2b by roughly the inverse of the FDE.

FDE = FC x FCo x FS x FL, stored per residue in ``residuos``. Each stream is
mapped to the representative residue its canonical config already names (the
config comments say "BAGACO representative", "PALHA_SOJA representative", and so
on), so the mapping is the pipeline's own, not a new assumption.

The UPPERCASE code scheme is used deliberately: it is the only one carrying
references for TS, VS, CH4 and C:N, and it holds FC/FCo/FS/FL min-medio-max
triples for all 38 rows.

**A data defect this script works around rather than hides:** the min and max
factors do not always bracket the medio — VINHACA computes FDE 1.6 / 9.3 / 7.6
and FORSU 37.0 / 32.3 / 81.2, so at least one _max sits below its _medio. Taking
the product of the mins as "the minimum" would therefore be wrong. The bound is
built as min() and max() over the three computed products, and every stream whose
triple is disordered is listed, because a disordered range is a parameter-entry
error that should be fixed at source.
"""

from __future__ import annotations

import argparse
import os

import psycopg2
from psycopg2.extras import RealDictCursor

CH4_FRACTION_OF_BIOGAS = 0.625  # FIESP 2025
CH4_LHV_KWH_M3 = 9.94
ELECTRIC_EFFICIENCY = 0.38
DAYS = 365

# Stream -> representative residue, taken from the comments in
# RESIDUE_BIOMASS_CONFIGS. rpo_pruning and aquaculture have no canonical
# representative; they are carried at the median FDE of the mapped set and
# reported separately rather than silently assigned one.
STREAM_TO_RESIDUE = {
    "sugarcane": "BAGACO",
    "soybean": "PALHA_SOJA",
    "corn": "PALHA_MILHO",
    "coffee": "CASCA_CAFE",
    "citrus": "BAGACO_CITROS",
    "cattle": "ESTERCO_BOVINO",
    "swine": "DEJETOS_SUINO",
    "poultry": "CAMA_AVIARIO",
    "rsu_organic": "FORSU",
    "forestry": "CASCA_EUCALIPTO",
}

# Published SP studies, biogas basis, bi Nm3/ano (FIESP 2025 comparative table).
BENCHMARKS = [
    ("GEF Biogas Brasil + ABiogas 2023", 24.8, 15.5),
    ("ABiogas 2020", 24.8, 13.3),
    ("IEE-USP (Coelho et al.) 2020", 16.0, 8.6),
    ("SEMIL/SP 2023", 5.7, 3.6),
    ("Instituto 17 - BEP 2021", 4.6, 3.0),
]


def fmt(x, nd=0):
    return f"{x:,.{nd}f}"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dsn", default=os.environ.get("DATABASE_URL"))
    args = ap.parse_args()
    if not args.dsn:
        raise SystemExit("set --dsn or DATABASE_URL")

    with psycopg2.connect(args.dsn) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT residue_stream, SUM(biogas_m3_yr) AS ch4
                FROM residue_streams_sp2023 GROUP BY 1
                """)
            streams = {r["residue_stream"]: float(r["ch4"] or 0) for r in cur.fetchall()}
            cur.execute("""
                SELECT codigo,
                       fc_min*fcp_min*fs_min*fl_min          AS fde_min,
                       fc_medio*fcp_medio*fs_medio*fl_medio  AS fde_med,
                       fc_max*fcp_max*fs_max*fl_max          AS fde_max
                FROM residuos WHERE codigo = upper(codigo)
                """)
            fde = {r["codigo"]: r for r in cur.fetchall()}

    mapped = [f for f in STREAM_TO_RESIDUE.values() if f in fde]
    med_default = sorted(float(fde[f]["fde_med"]) for f in mapped)[len(mapped) // 2]

    print("=" * 100)
    print("  SAO PAULO — TEORICO vs MOBILIZAVEL (volumes em CH4)")
    print("=" * 100)
    print(
        f"{'fluxo':<14}{'residuo repr.':<17}{'FDE min':>9}{'FDE med':>9}{'FDE max':>9}"
        f"{'CH4 teorico':>17}{'CH4 mobiliz.':>17}"
    )
    print("-" * 100)

    th = 0.0
    mo_lo = mo_md = mo_hi = 0.0
    disordered = []
    unmapped = []

    for stream, ch4 in sorted(streams.items(), key=lambda x: -x[1]):
        th += ch4
        code = STREAM_TO_RESIDUE.get(stream)
        if code and code in fde:
            row = fde[code]
            vals = [
                float(row["fde_min"] or 0),
                float(row["fde_med"] or 0),
                float(row["fde_max"] or 0),
            ]
            lo, md, hi = min(vals), vals[1], max(vals)
            if not (vals[0] <= vals[1] <= vals[2]):
                disordered.append((code, vals))
        else:
            lo = md = hi = med_default
            code = "(mediana do conj.)"
            if ch4:
                unmapped.append(stream)
        mo_lo += ch4 * lo
        mo_md += ch4 * md
        mo_hi += ch4 * hi
        print(
            f"{stream:<14}{code:<17}{lo * 100:>8.1f}%{md * 100:>8.1f}%{hi * 100:>8.1f}%"
            f"{fmt(ch4):>17}{fmt(ch4 * md):>17}"
        )

    print("-" * 100)
    print(f"{'TOTAL':<31}{'':>27}{fmt(th):>17}{fmt(mo_md):>17}")
    print()
    print(f"  FDE efetivo do estado : {mo_md / th * 100:.1f}%  (mobilizavel / teorico)")
    if unmapped:
        print(
            f"  sem residuo representativo (usada mediana {med_default * 100:.1f}%): {', '.join(unmapped)}"
        )
    if disordered:
        print()
        print("  TRIPLAS FDE DESORDENADAS (min/med/max nao monotonicos — erro de entrada):")
        for code, v in disordered:
            print(
                f"    {code:<16} min={v[0] * 100:5.1f}%  med={v[1] * 100:5.1f}%  max={v[2] * 100:5.1f}%"
            )

    print()
    print("=" * 100)
    print("  RESULTADO CONSOLIDADO")
    print("=" * 100)
    print(f"{'grandeza':<26}{'unidade':<10}{'MINIMO':>18}{'CENTRAL':>18}{'MAXIMO':>18}")
    print("-" * 90)

    def block(label, lo, md, hi):
        print(f"{label:<26}{'Nm3/ano':<10}{fmt(lo):>18}{fmt(md):>18}{fmt(hi):>18}")
        print(
            f"{'':<26}{'Nm3/dia':<10}{fmt(lo / DAYS):>18}{fmt(md / DAYS):>18}{fmt(hi / DAYS):>18}"
        )

    block("CH4 teorico", th, th, th)
    block("CH4 mobilizavel", mo_lo, mo_md, mo_hi)
    block(
        "Biogas bruto mobilizavel",
        mo_lo / CH4_FRACTION_OF_BIOGAS,
        mo_md / CH4_FRACTION_OF_BIOGAS,
        mo_hi / CH4_FRACTION_OF_BIOGAS,
    )
    block("Biometano mobilizavel", mo_lo, mo_md, mo_hi)
    e = [v * CH4_LHV_KWH_M3 / 1e6 for v in (mo_lo, mo_md, mo_hi)]
    print(f"{'Energia termica':<26}{'GWh/ano':<10}{fmt(e[0]):>18}{fmt(e[1]):>18}{fmt(e[2]):>18}")
    print(
        f"{'Energia eletrica':<26}{'GWh/ano':<10}"
        f"{fmt(e[0] * ELECTRIC_EFFICIENCY):>18}{fmt(e[1] * ELECTRIC_EFFICIENCY):>18}"
        f"{fmt(e[2] * ELECTRIC_EFFICIENCY):>18}"
    )

    print()
    print("=" * 100)
    print("  CONTRA A LITERATURA PUBLICADA DE SP (base biogas, bi Nm3/ano)")
    print("=" * 100)
    ours_biogas = mo_md / CH4_FRACTION_OF_BIOGAS / 1e9
    ours_bm = mo_md / 1e9
    rows = BENCHMARKS + [("PILAR-2b mobilizavel (este calculo)", ours_biogas, ours_bm)]
    print(f"{'estudo':<38}{'biogas bi':>12}{'biometano bi':>15}{'Nm3 biogas/dia':>18}")
    print("-" * 84)
    for name, bg, bm in sorted(rows, key=lambda x: -x[1]):
        mark = " <<<" if name.startswith("PILAR") else ""
        print(f"{name:<38}{bg:>12.2f}{bm:>15.2f}{bg * 1e9 / DAYS:>18,.0f}{mark}")


if __name__ == "__main__":
    main()
