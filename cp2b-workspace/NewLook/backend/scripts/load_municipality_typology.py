"""
Load the SP+MG co-digestion typology into `municipality_typology`.

Source snapshot: data/raw/cnpq_typology/2026/SP_MG_municipios_indicadores.csv
Produced by the PILAR-2b canonical engine (p2_canon.py) for the CNPq call.

Idempotent: upserts on ibge_code, so re-running replaces values in place.

    python -m scripts.load_municipality_typology [--dry-run]
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
    / "cnpq_typology"
    / "2026"
    / "SP_MG_municipios_indicadores.csv"
)
EXPECTED_SHA256 = "601d227dd6d83d781bd3756bbe474a9608369027493c03034abef11a1435054a"

# Official IBGE municipality counts — the coverage gate.
EXPECTED_COUNTS = {"SP": 645, "MG": 853}

# C:N plausibility bounds. Cellulosic residues top out near 100; manures floor
# near 5. Anything outside is a load error, not a real municipality.
CN_MIN, CN_MAX = 5.0, 100.0

COLUMNS = [
    "ibge_code",
    "uf",
    "municipality_name",
    "cn_molar",
    "tipologia",
    "tip_dom_share",
    "regime",
    "share_c_rich",
    "share_n_rich",
    "shannon_h",
    "total_vs_t",
    "via_a",
    "via_b",
    "via_b_classe",
]


def _as_bool(series: pd.Series) -> pd.Series:
    """The canonical engine writes via_a/via_b as 0/1, True/False or blank."""
    return series.map(
        lambda v: (
            None
            if pd.isna(v)
            else (
                bool(v)
                if isinstance(v, (bool, int, float))
                else str(v).strip().lower() in {"1", "true", "sim", "yes"}
            )
        )
    )


# The raw snapshot is deliberately gitignored (backend/data/raw/*), so a fresh
# clone has to copy it in before the first load.
SOURCE_HINT = (
    "OneDrive → Documentos/01_Chamada_CNPq_Renata/"
    "ENTREGA_clusters_CNPq-20260904T123804Z-1-001/ENTREGA_clusters_CNPq/"
    "04_dados_entrada/SP_MG_municipios_indicadores.csv"
)


def load_frame() -> pd.DataFrame:
    if not SNAPSHOT.exists():
        raise SystemExit(
            f"raw snapshot missing: {SNAPSHOT}\n"
            f"Copy it from:\n  {SOURCE_HINT}\n"
            "It is gitignored on purpose (see backend/ingest/README.md), so it "
            "does not arrive with a git pull."
        )

    digest = hashlib.sha256(SNAPSHOT.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise SystemExit(
            f"snapshot checksum mismatch\n  expected {EXPECTED_SHA256}\n  got      {digest}\n"
            "The raw snapshot is immutable; a new extraction needs a new dated directory."
        )

    raw = pd.read_csv(SNAPSHOT)
    df = pd.DataFrame(
        {
            "ibge_code": raw["ibge_code"].astype(int),
            "uf": raw["uf"].astype(str).str.strip(),
            "municipality_name": raw["NM_MUN"].astype(str).str.strip(),
            "cn_molar": raw["cn_molar"].astype(float),
            "tipologia": raw["tipologia"].astype(str).str.strip(),
            "tip_dom_share": raw["tip_dom_share"].astype(float),
            "regime": raw["regime"].astype(str).str.strip(),
            "share_c_rich": raw["share_c_rich"].astype(float),
            "share_n_rich": raw["share_n_rich"].astype(float),
            "shannon_h": raw["shannon_h"].astype(float),
            "total_vs_t": raw["total_vs_t"].astype(float),
            "via_a": _as_bool(raw["via_a"]),
            "via_b": _as_bool(raw["via_b"]),
            # The engine writes an em-dash for "no pairing class".
            "via_b_classe": raw["via_b_classe"]
            .astype(str)
            .str.strip()
            .replace({"—": None, "-": None, "nan": None}),
        }
    )

    # ── Gates ────────────────────────────────────────────────────────────────
    if df["ibge_code"].duplicated().any():
        raise SystemExit("gate/schema: duplicate ibge_code")
    if (df["ibge_code"].astype(str).str.len() != 7).any():
        raise SystemExit("gate/schema: ibge_code is not 7 digits")
    if df[["cn_molar", "tipologia", "regime"]].isna().any().any():
        raise SystemExit("gate/schema: null in a NOT NULL column")

    counts = df["uf"].value_counts().to_dict()
    if counts != EXPECTED_COUNTS:
        raise SystemExit(f"gate/coverage: expected {EXPECTED_COUNTS}, got {counts}")

    lo, hi = df["cn_molar"].min(), df["cn_molar"].max()
    if lo < CN_MIN or hi > CN_MAX:
        raise SystemExit(f"gate/range: cn_molar spans [{lo}, {hi}], outside [{CN_MIN}, {CN_MAX}]")

    # A constant C:N is the exact failure mode this table exists to fix: the old
    # endpoint served 25.0 for every municipality. Refuse to load a flat column.
    if df["cn_molar"].nunique() < 100:
        raise SystemExit(
            f"gate/range: cn_molar has only {df['cn_molar'].nunique()} distinct values — looks degenerate"
        )

    return df


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="run the gates, write nothing")
    args = ap.parse_args()

    df = load_frame()
    print(f"gates passed — {len(df)} rows ({df['uf'].value_counts().to_dict()})")
    print(
        f"  cn_molar    min {df.cn_molar.min():.2f} / median {df.cn_molar.median():.2f} / max {df.cn_molar.max():.2f}"
    )
    print(f"  tipologia   {df.tipologia.nunique()} classes")
    print(f"  regime      {df.regime.value_counts().to_dict()}")

    if args.dry_run:
        print("dry run — nothing written")
        return 0

    dsn = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps")
    with psycopg2.connect(dsn) as conn, conn.cursor() as cur:
        execute_values(
            cur,
            f"""
            INSERT INTO municipality_typology ({", ".join(COLUMNS)})
            VALUES %s
            ON CONFLICT (ibge_code) DO UPDATE SET
                {", ".join(f"{c} = EXCLUDED.{c}" for c in COLUMNS if c != "ibge_code")},
                updated_at = now()
            """,
            [
                tuple(None if pd.isna(v) else v for v in row)
                for row in df[COLUMNS].itertuples(index=False)
            ],
        )
        cur.execute(
            "SELECT count(*), count(DISTINCT tipologia), round(avg(cn_molar)::numeric, 2) FROM municipality_typology"
        )
        n, classes, avg = cur.fetchone()
    print(f"loaded — {n} rows, {classes} typology classes, mean C:N {avg}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
