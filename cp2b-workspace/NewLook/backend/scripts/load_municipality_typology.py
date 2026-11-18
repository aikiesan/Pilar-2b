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


# Per-stream molar C:N, from the canonical engine's BIOCHEMICAL_DB (p2_canon.py
# l. 43-55) and Section 4 of the validation dossier. Used ONLY by the method gate
# below, never to compute a served value.
STREAM_CN = {
    "sugarcane": 65.0,
    "corn": 59.9,
    "soybean": 20.0,
    "citrus": 60.4,
    "coffee": 17.5,
    "forestry": 70.0,
    "cattle": 14.85,
    "swine": 10.64,
    "poultry": 11.5,
    "rsu_organic": 21.5,
    "rpo_pruning": 45.0,
    "aquaculture": 12.0,
}


def _gate_cn_method(raw: pd.DataFrame, df: pd.DataFrame) -> None:
    """Refuse a snapshot whose cn_molar is the arithmetic mean of the ratios.

    Nitrogen is additive, so the C:N of a mixture is ΣVS / Σ(VS/CN) — the
    N-additive mass balance the validation dossier declares as the method. The
    SV-weighted *arithmetic* mean of the per-stream ratios is a different, wrong
    number: it ran a median 1.43x high over the 1498 municipalities of the 2026
    snapshot, and `regime`, a pure threshold on it, misclassified 44% of them.

    That snapshot shipped and had to be withdrawn from the map. This gate exists
    so the same file cannot load again unnoticed.

    It only fires on a POSITIVE identification of the arithmetic mean, not
    whenever cn_molar fails to match a recomputation — the biochemical table
    changes over time, and a gate that demanded exact agreement would block
    legitimate updates.
    """
    cols = [f"vs_{s}" for s in STREAM_CN]
    if not all(c in raw.columns for c in cols):
        # A snapshot without the per-stream breakdown cannot be checked here.
        print("gate/cn-method: no vs_* columns — method not verifiable, skipping")
        return

    vs = raw[cols].astype(float).fillna(0.0)
    total = vs.sum(axis=1)
    cn = pd.Series(list(STREAM_CN.values()), index=cols)

    arithmetic = (vs * cn).sum(axis=1) / total
    n_additive = total / (vs / cn).sum(axis=1)

    ok = total > 0
    served = df["cn_molar"][ok]
    gap_arith = (served - arithmetic[ok]).abs().max()
    gap_nadd = (served - n_additive[ok]).abs().max()

    if gap_arith < 0.01:
        raise SystemExit(
            "gate/cn-method: cn_molar is the SV-weighted ARITHMETIC mean of the "
            f"per-stream C:N ratios (max deviation {gap_arith:.6f}).\n"
            "That is not the C:N of a mixture. Nitrogen is additive, so the blend "
            "ratio is  SUM(VS) / SUM(VS/CN).\n"
            f"This snapshot's N-additive median is {n_additive[ok].median():.2f} "
            f"against the {served.median():.2f} it carries.\n"
            "Re-export from the canonical pipeline with the N-additive balance "
            "(see docs/data/CNPQ_TYPOLOGY.md), then load again."
        )

    print(
        f"gate/cn-method: passed — deviation from arithmetic {gap_arith:.3f}, "
        f"from N-additive {gap_nadd:.3f}"
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
    _gate_cn_method(raw, df)

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
