"""
Load São Paulo's N-additive C:N into `municipality_typology` (SP rows only).

Source snapshot: data/raw/dossie_sp/2026/dossier_municipios.csv
The working set behind the biochemical validation dossier — 645 municipalities,
13 residue streams (sewage included), C:N by the N-additive balance.

This is the corrected counterpart to load_municipality_typology.py, whose
snapshot carries the arithmetic mean instead. Both columns live side by side;
see migration 031 for why.

Idempotent: updates the 645 SP rows in place, leaves the 853 MG rows untouched.

    python -m scripts.load_dossier_sp_indices [--dry-run]
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

SNAPSHOT = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "raw"
    / "dossie_sp"
    / "2026"
    / "dossier_municipios.csv"
)
EXPECTED_SHA256 = "bc6af196fd8a8929b60ca7129d0b057d2469f2d3024cd2ed9e86431850c95cad"

SP_MUNICIPALITIES = 645

# C:N plausibility bounds, as in the typology loader.
CN_MIN, CN_MAX = 5.0, 100.0

# The dossier's own signature. 191 municipalities land in the 20-30 window under
# the N-additive balance against 111 under the arithmetic mean, and the document
# quotes exactly that move ("sobem de 111 para 191"). A snapshot that does not
# reproduce it is either the superseded screening or a different extraction, and
# either way must not load silently.
EXPECTED_SWEET = 191
EXPECTED_CN_MEDIAN = 32.26

COLUMNS = ["ibge_code", "cn_harm", "regime_harm", "dom_stream", "d_gas_km"]

SOURCE_HINT = (
    "Projeto_Renata_CNPq/analysis-*/analysis/paper_figures/P2/canonical/"
    "dossier/dossier_municipios.csv"
)


def load_frame() -> pd.DataFrame:
    if not SNAPSHOT.exists():
        raise SystemExit(
            f"raw snapshot missing: {SNAPSHOT}\n"
            f"Copy it from:\n  {SOURCE_HINT}\n"
            "It is gitignored on purpose (backend/data/raw/*), so it does not "
            "arrive with a git pull.\n"
            "Do NOT substitute canon_municipios.csv or canon_pairs_priority.csv "
            "from the directory above — those are a superseded screening whose "
            "C:N is the arithmetic mean, and whose pairings differ."
        )

    digest = hashlib.sha256(SNAPSHOT.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(
            f"snapshot checksum mismatch\n  expected {EXPECTED_SHA256}\n"
            f"  got      {digest}\n"
            "The raw snapshot is immutable; a new extraction needs a new dated "
            "directory."
        )

    raw = pd.read_csv(SNAPSHOT)
    df = pd.DataFrame(
        {
            "ibge_code": raw["ibge_code"].astype(int),
            "cn_harm": raw["cn_harm"].astype(float),
            "regime_harm": raw["regime"].astype(str).str.strip(),
            "dom_stream": raw["dom_stream"].astype(str).str.strip(),
            "d_gas_km": raw["d_gas"].astype(float),
        }
    )

    # ── Gates ────────────────────────────────────────────────────────────────
    if len(df) != SP_MUNICIPALITIES:
        raise SystemExit(f"gate/coverage: expected {SP_MUNICIPALITIES} rows, got {len(df)}")
    if df["ibge_code"].duplicated().any():
        raise SystemExit("gate/schema: duplicate ibge_code")

    codes = df["ibge_code"].astype(str)
    if (codes.str.len() != 7).any():
        raise SystemExit("gate/schema: ibge_code is not 7 digits")
    outside_sp = ~codes.str.startswith("35")
    if outside_sp.any():
        raise SystemExit(
            f"gate/scope: {int(outside_sp.sum())} rows outside São Paulo (UF 35). "
            "This loader writes SP only."
        )

    if df[["cn_harm", "regime_harm"]].isna().any().any():
        raise SystemExit("gate/schema: null in cn_harm or regime_harm")

    lo, hi = df["cn_harm"].min(), df["cn_harm"].max()
    if lo < CN_MIN or hi > CN_MAX:
        raise SystemExit(f"gate/range: cn_harm spans [{lo}, {hi}], outside [{CN_MIN}, {CN_MAX}]")

    # ── The method gate ──────────────────────────────────────────────────────
    # This is the one that matters. The arithmetic mean is what shipped and had
    # to be withdrawn; loading it again under the corrected column name would be
    # worse than the original mistake, because the name would vouch for it.
    sweet = int(df["cn_harm"].between(20.0, 30.0).sum())
    if sweet != EXPECTED_SWEET:
        raise SystemExit(
            f"gate/method: {sweet} municipalities in C:N 20-30, expected "
            f"{EXPECTED_SWEET}.\n"
            "The dossier's N-additive balance yields 191; the superseded "
            "arithmetic mean yields 111. This snapshot is neither the expected "
            "extraction nor computed by the declared method — refusing to load.\n"
            "See docs/data/CNPQ_TYPOLOGY.md."
        )

    median = float(df["cn_harm"].median())
    if abs(median - EXPECTED_CN_MEDIAN) > 0.5:
        raise SystemExit(
            f"gate/method: cn_harm median {median:.2f}, expected "
            f"~{EXPECTED_CN_MEDIAN} (arithmetic would be ~49.19)"
        )

    return df


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="run the gates, write nothing")
    args = ap.parse_args()

    df = load_frame()
    print(f"gates passed — {len(df)} São Paulo municipalities")
    print(
        f"  cn_harm     min {df.cn_harm.min():.2f} / median {df.cn_harm.median():.2f} "
        f"/ max {df.cn_harm.max():.2f}"
    )
    print(f"  em C:N 20-30 {int(df.cn_harm.between(20.0, 30.0).sum())}")
    print(f"  regime      {df.regime_harm.value_counts().to_dict()}")

    if args.dry_run:
        print("dry run — nothing written")
        return 0

    dsn = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps")
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        execute_values(
            cur,
            """
            UPDATE municipality_typology AS t SET
                cn_harm     = v.cn_harm,
                regime_harm = v.regime_harm,
                dom_stream  = v.dom_stream,
                d_gas_km    = v.d_gas_km,
                updated_at  = now()
            FROM (VALUES %s) AS v (ibge_code, cn_harm, regime_harm, dom_stream, d_gas_km)
            WHERE t.ibge_code = v.ibge_code
            """,
            [
                tuple(None if pd.isna(x) else x for x in row)
                for row in df[COLUMNS].itertuples(index=False)
            ],
            template="(%s, %s::double precision, %s, %s, %s::double precision)",
        )
        # NOT cur.rowcount: execute_values sends the rows in pages, so rowcount
        # reports the last page only (45 of 645). Count the table instead.
        cur.execute(
            "SELECT count(*) FILTER (WHERE cn_harm IS NOT NULL), "
            "       count(*) FILTER (WHERE cn_harm IS NULL) "
            "FROM municipality_typology"
        )
        with_cn, without_cn = cur.fetchone()

    print(f"loaded — {with_cn} municipalities carry cn_harm (SP), {without_cn} do not (MG)")
    if with_cn != SP_MUNICIPALITIES:
        print(
            f"  WARNING: expected {SP_MUNICIPALITIES}. Rows matching no "
            "municipality_typology entry were skipped — run the typology loader first."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
