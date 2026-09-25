"""
Load the CP2b method v5.1 potential for São Paulo (migration 033).

Source snapshot: data/raw/cp2b_potential/2026/
    cp2b_municipio_substrato_niveis.csv   645 x 17 substrates x 3 scenarios, N1-N4
    cp2b_municipio_resumo.csv             645 x 3, N3/N4 totals and per sector
    cp2b_parametros.csv                   calculation elements with source and status
    cp2b_fl_municipio_substrato.csv       spatial FL, variants A/B/C/D

Produced by Metodo_CP2b/cp2b_pacote_plataforma.py (outputs_v5/plataforma/).
The snapshot is immutable: a new method version needs a new dated directory and
new checksums below, never an in-place overwrite.

All volumes are Nm3 of METHANE per year. The headline CP2b figure is N3
(mobilisable), not the Atlas "Cenário Real": the two are different methods and
live in different tables.

Writes municipality_cp2b_potential, cp2b_parameters and cp2b_spatial_fl in one
transaction, replacing whatever they held. Idempotent. Refuses to write if any
gate fails or if a municipality is missing from `municipalities`.

    python -m scripts.load_cp2b_potential [--dry-run]
"""

from __future__ import annotations

import argparse
import hashlib
import math
import os
import sys
from pathlib import Path

import pandas as pd

SNAPSHOT_DIR = Path(__file__).resolve().parents[1] / "data" / "raw" / "cp2b_potential" / "2026"

METHOD_VERSION = "CP2b v5.1 (24/09/2026)"

FILES = {
    "levels": "cp2b_municipio_substrato_niveis.csv",
    "summary": "cp2b_municipio_resumo.csv",
    "parameters": "cp2b_parametros.csv",
    "fl": "cp2b_fl_municipio_substrato.csv",
}
EXPECTED_SHA256 = {
    "levels": "12c53a325842f571bc0f78cae25e36df784f9afad52f449d2fe663afef50848c",
    "summary": "e0a9106659c177a2ab9b27ccdb0f7179da74f7d13fba8d4f74996009e2fb6086",
    "parameters": "989c1cae1faec50a9426924d942564c729d094d90bdf8ac7bb4f57627fb1250e",
    "fl": "e1af8b955032cff3e4560bbef978358108ebbe4d32fc0c80451edf0ca28f99ed",
}

SOURCE_HINT = "Reposicionamento_Submissão_ESD/Metodo_CP2b/outputs_v5/plataforma/"

SP_MUNICIPALITIES = 645
SCENARIOS = ("min", "med", "max")
SECTORS = ("agricultural", "livestock", "urban")

# substrate -> (residue in the map filter vocabulary, sector, lignocellulosic).
# The method's own classification; the loader refuses a snapshot that disagrees,
# because the map's residue filter and the "without lignocellulosics" figure
# both depend on it.
SUBSTRATES = {
    "PALHA": ("sugarcane", "agricultural", True),
    "BAGACO": ("sugarcane", "agricultural", True),
    "TORTA_FILTRO": ("sugarcane", "agricultural", False),
    "VINHACA": ("sugarcane", "agricultural", False),
    "PALHA_MILHO": ("corn", "agricultural", True),
    "PALHA_SOJA": ("soybean", "agricultural", True),
    "BAGACO_CITROS": ("citrus", "agricultural", False),
    "CASCA_CAFE": ("coffee", "agricultural", False),
    "AVES_CORTE": ("poultry", "livestock", False),
    "AVES_POSTURA": ("poultry", "livestock", False),
    "BOV_LEITE": ("cattle", "livestock", False),
    "BOV_CONFINADO": ("cattle", "livestock", False),
    "BOV_PASTO_MISTO": ("cattle", "livestock", False),
    "SUINOS": ("swine", "livestock", False),
    "RSU_ORGANICO": ("rsu", "urban", False),
    "PODA_URBANA": ("rpo", "urban", False),
    "LODO_ETE": ("sewage", "urban", False),
}

# State totals, Nm3 CH4/yr, as published in the v5.1 article package (Table T1).
# The method signature: a snapshot that does not reproduce them is a different
# run and must not load under this version label.
EXPECTED_STATE_TOTALS = {
    ("min", "n3"): 2.821914337487191e9,
    ("med", "n1"): 2.3642553363176816e10,
    ("med", "n2"): 1.5207558097977387e10,
    ("med", "n3"): 7.0018684636247235e9,
    ("med", "n4"): 5.971705062308847e9,
    ("max", "n3"): 1.641064413583801e10,
}
TOTALS_RTOL = 1e-9

LEVEL_COLUMNS = [
    "n1_ch4_nm3_year",
    "n2_ch4_nm3_year",
    "n3_before_existing_use_ch4_nm3_year",
    "existing_use_subtracted_ch4_nm3_year",
    "n3_ch4_nm3_year",
    "n4_ch4_nm3_year",
    "n3_biogas_eq_nm3_year",
    "n3_biomethane_eq_nm3_year",
    "n4_biogas_eq_nm3_year",
    "n4_biomethane_eq_nm3_year",
    "ch4_fraction_in_biogas",
    "fs_x_fl",
]
LEVELS_TABLE_COLUMNS = [
    "ibge_code",
    "substrate",
    "residue",
    "sector",
    "lignocellulosic",
    "scenario",
    *LEVEL_COLUMNS,
    "method_version",
]
PARAMETER_TABLE_COLUMNS = [
    "substrate",
    "residue",
    "element",
    "min_value",
    "med_value",
    "max_value",
    "unit",
    "source",
    "status",
    "method_version",
]
FL_VARIANTS = {
    # snapshot column -> table column
    "fl_codig_alocado": "fl_b_codigestion_allocated",
    "fl_codigestao": "fl_a_codigestion_coverage",
    "fl_mono": "fl_c_mono_coverage",
    "fl_mono_alocado": "fl_d_mono_allocated",
    "fl_codig_alocado_palhaqh": "fl_b_straw_any_hub",
}
FL_TABLE_COLUMNS = [
    "ibge_code",
    "substrate",
    "residuos_codigo",
    "scenario",
    *FL_VARIANTS.values(),
    "supply_n3_ch4_nm3_day",
    "method_version",
]

MONOTONIC_TOL = 1e-6


class GateError(SystemExit):
    """A refused load. SystemExit so run_migrations' seeder wrapper logs it as a decline."""


# ── Reading ──────────────────────────────────────────────────────────────────


def _read(snapshot_dir: Path, key: str, check_hash: bool) -> pd.DataFrame:
    path = snapshot_dir / FILES[key]
    if not path.exists():
        raise GateError(
            f"raw snapshot missing: {path}\n"
            f"Copy the four CSVs from:\n  {SOURCE_HINT}\n"
            "They are gitignored on purpose (backend/data/raw/*), so they do not "
            "arrive with a git pull."
        )
    if check_hash:
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != EXPECTED_SHA256[key]:
            raise GateError(
                f"snapshot checksum mismatch for {path.name}\n"
                f"  expected {EXPECTED_SHA256[key]}\n  got      {digest}\n"
                "The snapshot is immutable; a new method run needs a new dated "
                "directory and new checksums in this loader."
            )
    # utf-8-sig: two of the four files carry a BOM.
    return pd.read_csv(path, encoding="utf-8-sig")


def load_frames(snapshot_dir: Path = SNAPSHOT_DIR, check_hash: bool = True) -> dict:
    raw = {k: _read(snapshot_dir, k, check_hash) for k in FILES}

    levels = raw["levels"].copy()
    levels["ibge_code"] = levels["ibge_code"].astype(int)
    levels["lignocellulosic"] = levels["lignocellulosic"].map(
        lambda v: str(v).strip().lower() == "true"
    )

    params = raw["parameters"].rename(
        columns={
            "codigo": "substrate",
            "fluxo": "residue",
            "elemento": "element",
            "min": "min_value",
            "med": "med_value",
            "max": "max_value",
            "unidade": "unit",
            "fonte": "source",
        }
    )
    params["method_version"] = METHOD_VERSION

    fl = raw["fl"].rename(
        columns={
            "ibge": "ibge_code",
            "codigo_cp2b": "substrate",
            "cenario": "scenario",
            "oferta_l3_ch4_m3_dia": "supply_n3_ch4_nm3_day",
            **FL_VARIANTS,
        }
    )
    fl["ibge_code"] = fl["ibge_code"].astype(int)
    fl["method_version"] = METHOD_VERSION

    summary = raw["summary"].copy()
    summary["ibge_code"] = summary["ibge_code"].astype(int)

    return {"levels": levels, "summary": summary, "parameters": params, "fl": fl}


# ── Gates ────────────────────────────────────────────────────────────────────
# Each returns a list of failure messages; empty means the gate passed.


def gate_schema(frames: dict) -> list[str]:
    fails = []
    lv = frames["levels"]
    missing = [c for c in LEVELS_TABLE_COLUMNS if c not in lv.columns]
    if missing:
        return [f"schema: levels file lacks columns {missing}"]
    if lv[LEVELS_TABLE_COLUMNS].isna().any().any():
        cols = lv[LEVELS_TABLE_COLUMNS].columns[lv[LEVELS_TABLE_COLUMNS].isna().any()].tolist()
        fails.append(f"schema: nulls in levels columns {cols}")
    key = ["ibge_code", "substrate", "scenario"]
    if lv.duplicated(key).any():
        fails.append(
            f"schema: {int(lv.duplicated(key).sum())} duplicate (ibge, substrate, scenario)"
        )
    versions = set(lv["method_version"].unique())
    if versions != {METHOD_VERSION}:
        fails.append(f"schema: method_version {sorted(versions)}, expected {METHOD_VERSION!r}")

    fl = frames["fl"]
    missing = [c for c in FL_TABLE_COLUMNS if c not in fl.columns]
    if missing:
        fails.append(f"schema: FL file lacks columns {missing}")
    elif fl.duplicated(key).any():
        fails.append("schema: duplicate (ibge, substrate, scenario) in FL file")

    pr = frames["parameters"]
    missing = [c for c in PARAMETER_TABLE_COLUMNS if c not in pr.columns]
    if missing:
        fails.append(f"schema: parameters file lacks columns {missing}")
    elif pr.duplicated(["substrate", "element"]).any():
        fails.append("schema: duplicate (substrate, element) in parameters")
    return fails


def gate_coverage(frames: dict) -> list[str]:
    lv = frames["levels"]
    fails = []
    codes = lv["ibge_code"].astype(str)
    if (codes.str.len() != 7).any() or (~codes.str.startswith("35")).any():
        fails.append("coverage: ibge_code outside São Paulo (UF 35) or not 7 digits")
    n = lv["ibge_code"].nunique()
    if n != SP_MUNICIPALITIES:
        fails.append(f"coverage: {n} municipalities, expected {SP_MUNICIPALITIES}")
    expected_rows = SP_MUNICIPALITIES * len(SUBSTRATES) * len(SCENARIOS)
    if len(lv) != expected_rows:
        fails.append(f"coverage: {len(lv)} rows, expected {expected_rows} (645 x 17 x 3)")
    if set(lv["scenario"]) != set(SCENARIOS):
        fails.append(f"coverage: scenarios {sorted(set(lv['scenario']))}")
    summary_codes = set(frames["summary"]["ibge_code"])
    if summary_codes != set(lv["ibge_code"]):
        fails.append("coverage: summary and levels files cover different municipalities")
    return fails


def gate_vocabulary(frames: dict) -> list[str]:
    lv = frames["levels"]
    fails = []
    unknown = set(lv["substrate"]) - set(SUBSTRATES)
    absent = set(SUBSTRATES) - set(lv["substrate"])
    if unknown or absent:
        fails.append(f"vocabulary: unknown substrates {sorted(unknown)}, absent {sorted(absent)}")
        return fails
    declared = lv["substrate"].map(SUBSTRATES)
    for i, col in enumerate(("residue", "sector", "lignocellulosic")):
        wrong = lv[col] != declared.map(lambda t, i=i: t[i])
        if wrong.any():
            bad = sorted(lv.loc[wrong, "substrate"].unique())
            fails.append(f"vocabulary: {col} disagrees with the method classification for {bad}")
    status = set(frames["parameters"]["status"])
    if not status <= {"cp2b", "provisorio"}:
        fails.append(f"vocabulary: parameter status {sorted(status)}")
    for name in ("parameters", "fl"):
        stray = set(frames[name]["substrate"]) - set(SUBSTRATES)
        if stray:
            fails.append(f"vocabulary: {name} file names unknown substrates {sorted(stray)}")
    return fails


def gate_range(frames: dict) -> list[str]:
    lv = frames["levels"]
    fails = []
    volumes = [c for c in LEVEL_COLUMNS if c.endswith("_year")]
    if (lv[volumes] < 0).any().any():
        fails.append("range: negative volume")
    n1, n2, n3, n4 = (lv[f"n{k}_ch4_nm3_year"] for k in (1, 2, 3, 4))
    broken = (n4 > n3 + MONOTONIC_TOL) | (n3 > n2 + MONOTONIC_TOL) | (n2 > n1 + MONOTONIC_TOL)
    if broken.any():
        fails.append(f"range: {int(broken.sum())} rows break N1 >= N2 >= N3 >= N4")
    frac = lv["ch4_fraction_in_biogas"]
    if ((frac <= 0.3) | (frac >= 0.9)).any():
        fails.append("range: CH4 fraction of biogas outside (0.3, 0.9)")
    fl = frames["fl"]
    for c in FL_VARIANTS.values():
        if c in fl.columns and ((fl[c] < -1e-9) | (fl[c] > 1 + 1e-9)).any():
            fails.append(f"range: {c} outside [0, 1]")
    return fails


def gate_state_totals(frames: dict) -> list[str]:
    lv = frames["levels"]
    fails = []
    for (scenario, level), expected in EXPECTED_STATE_TOTALS.items():
        got = float(lv.loc[lv["scenario"] == scenario, f"{level}_ch4_nm3_year"].sum())
        if not math.isclose(got, expected, rel_tol=TOTALS_RTOL):
            fails.append(
                f"totals: {level.upper()} {scenario} = {got:.6e}, expected {expected:.6e} "
                "(v5.1 article package, Table T1)"
            )
    return fails


def gate_summary_identity(frames: dict, rtol: float = 1e-9) -> list[str]:
    """The per-municipality summary must equal the sum of its substrate rows.

    Two files written by the same script from the same frame; if they disagree,
    one of them is from another run.
    """
    lv = frames["levels"]
    sm = frames["summary"].set_index(["ibge_code", "scenario"])
    fails = []
    for level in ("n3", "n4"):
        col = f"{level}_ch4_nm3_year"
        total = lv.groupby(["ibge_code", "scenario"])[col].sum()
        by_sector = (
            lv.groupby(["ibge_code", "scenario", "sector"])[col].sum().unstack(fill_value=0.0)
        )
        checks = {f"{level}_total_ch4_nm3_year": total}
        for s in SECTORS:
            checks[f"{level}_{s}_ch4_nm3_year"] = by_sector.get(s, 0.0)
        for name, series in checks.items():
            got = sm[name].reindex(series.index)
            diff = (got - series).abs() > rtol * series.abs().clip(lower=1.0)
            if diff.any():
                fails.append(
                    f"identity: {name} disagrees with the substrate rows in {int(diff.sum())} cells"
                )
    return fails


GATES = (
    gate_schema,
    gate_coverage,
    gate_vocabulary,
    gate_range,
    gate_state_totals,
    gate_summary_identity,
)


def run_gates(frames: dict) -> list[str]:
    fails: list[str] = []
    for gate in GATES:
        fails.extend(gate(frames))
        if fails and gate is gate_schema:
            break  # later gates would only repeat the schema failure
    return fails


# ── Writing ──────────────────────────────────────────────────────────────────


def _rows(df: pd.DataFrame, columns: list[str]) -> list[tuple]:
    out = []
    for row in df[columns].itertuples(index=False):
        out.append(tuple(None if (isinstance(x, float) and math.isnan(x)) else x for x in row))
    return out


def write(conn, frames: dict) -> dict:
    from psycopg2.extras import execute_values

    lv = frames["levels"]
    with conn.cursor() as cur:
        cur.execute(
            "SELECT ibge_code::integer FROM municipalities WHERE ibge_code::text LIKE '35%%'"
        )
        known = {r[0] for r in cur.fetchall()}
        unmatched = sorted(set(lv["ibge_code"]) - known)
        if unmatched:
            raise GateError(
                f"gate/resolution: {len(unmatched)} ibge codes not in municipalities "
                f"(first: {unmatched[:5]}). Seed the municipalities first."
            )

        cur.execute("DELETE FROM municipality_cp2b_potential")
        execute_values(
            cur,
            f"INSERT INTO municipality_cp2b_potential ({', '.join(LEVELS_TABLE_COLUMNS)}) VALUES %s",
            _rows(lv, LEVELS_TABLE_COLUMNS),
            page_size=2000,
        )
        cur.execute("DELETE FROM cp2b_parameters")
        execute_values(
            cur,
            f"INSERT INTO cp2b_parameters ({', '.join(PARAMETER_TABLE_COLUMNS)}) VALUES %s",
            _rows(frames["parameters"], PARAMETER_TABLE_COLUMNS),
        )
        cur.execute("DELETE FROM cp2b_spatial_fl")
        execute_values(
            cur,
            f"INSERT INTO cp2b_spatial_fl ({', '.join(FL_TABLE_COLUMNS)}) VALUES %s",
            _rows(frames["fl"], FL_TABLE_COLUMNS),
            page_size=2000,
        )

        # Re-read what was written rather than trusting rowcount (execute_values
        # pages, so rowcount reports the last page only).
        cur.execute(
            "SELECT count(*), count(DISTINCT ibge_code), "
            "       sum(n3_ch4_nm3_year) FILTER (WHERE scenario = 'med'), "
            "       sum(n4_ch4_nm3_year) FILTER (WHERE scenario = 'med') "
            "FROM municipality_cp2b_potential"
        )
        rows, municipalities, n3, n4 = cur.fetchone()
        cur.execute("SELECT count(*) FROM cp2b_parameters")
        n_params = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM cp2b_spatial_fl")
        n_fl = cur.fetchone()[0]

    if rows != len(lv) or not math.isclose(n3, EXPECTED_STATE_TOTALS[("med", "n3")], rel_tol=1e-9):
        conn.rollback()
        raise GateError(f"post-write check failed: {rows} rows, N3 med {n3:.6e} — rolled back")
    conn.commit()
    return {
        "rows": rows,
        "municipalities": municipalities,
        "n3_med": n3,
        "n4_med": n4,
        "parameters": n_params,
        "fl_rows": n_fl,
    }


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="run the gates, write nothing")
    ap.add_argument("--snapshot-dir", type=Path, default=SNAPSHOT_DIR)
    args = ap.parse_args(argv)

    frames = load_frames(args.snapshot_dir)
    fails = run_gates(frames)
    if fails:
        raise GateError("CP2b load refused:\n  " + "\n  ".join(fails))

    lv = frames["levels"]
    med = lv[lv["scenario"] == "med"]
    print(f"gates passed — {METHOD_VERSION}")
    print(
        f"  {len(lv)} rows, {lv['ibge_code'].nunique()} municipalities, {lv['substrate'].nunique()} substrates"
    )
    for level in ("n1", "n2", "n3", "n4"):
        print(
            f"  {level.upper()} med  {med[f'{level}_ch4_nm3_year'].sum() / 365e6:7.2f} M Nm3 CH4/day"
        )
    provisional = frames["parameters"].query("status == 'provisorio'")["substrate"].nunique()
    print(f"  {provisional} substrates with provisional parameters")

    if args.dry_run:
        print("dry run — nothing written")
        return 0

    import psycopg2

    dsn = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/cp2b_maps")
    conn = psycopg2.connect(dsn)
    try:
        result = write(conn, frames)
    finally:
        conn.close()
    print(
        f"loaded — {result['rows']} rows ({result['municipalities']} municipalities), "
        f"{result['parameters']} parameters, {result['fl_rows']} FL rows; "
        f"N3 med {result['n3_med'] / 365e6:.2f}, N4 med {result['n4_med'] / 365e6:.2f} M Nm3 CH4/day"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
