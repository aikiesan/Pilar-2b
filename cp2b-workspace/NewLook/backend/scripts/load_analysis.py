#!/usr/bin/env python3
"""
Load one bivariate analysis from a YAML manifest kept outside git into the
registry tables (migration 043).

The manifest names two CSVs (one value per municipality and axis), the text in
pt and en, the access level and the axis methods. Real manifests and data stay
on the maintainer's machine; the repo only carries the made-up demo_xy case.

Usage:
    DATABASE_URL=postgresql://... python scripts/load_analysis.py \\
        --manifest /path/to/analysis/manifest.yaml

    --dry-run   print the summary and write nothing; with 7-digit codes it
                needs no DATABASE_URL, 6-digit codes need it for the match

Re-running replaces values, classes and breaks. It rewrites the texts, axes,
answer cell, layers and UFs, and leaves level, opens_at, is_active and grants
as they are, because those are edited by hand after the first load.
"""

from __future__ import annotations

import argparse
import csv
import math
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

import psycopg2
import yaml

# Run as a script from backend/: make `app` importable like the other scripts.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.analysis_classes import AxisSpec, classify_uf  # noqa: E402

ID_RE = re.compile(r"^[a-z0-9_]{1,40}$")
METHODS = ("tertile_nonzero", "tertile", "fixed_count")
VALID_UFS = ("35", "31")  # São Paulo, Minas Gerais


class ManifestError(ValueError):
    """The manifest or one of its CSVs is not usable."""


@dataclass(frozen=True)
class Text:
    pt: str
    en: str


@dataclass(frozen=True)
class AxisDef:
    label: Text
    csv: Path
    key: str
    column: str
    method: str
    invert: bool


@dataclass(frozen=True)
class Manifest:
    id: str
    title: Text
    question: Text
    source: Text
    uf_prefixes: tuple[str, ...]
    answer_cell: int
    layers: tuple[str, ...]
    level: int
    x: AxisDef
    y: AxisDef


@dataclass
class LoadSummary:
    analysis_id: str
    with_cell: dict[str, int] = field(default_factory=dict)
    no_data: dict[str, int] = field(default_factory=dict)
    dropped: int = 0  # codes outside the manifest's UFs
    unmatched: int = 0  # 6-digit codes with no 7-digit municipality
    counts: list[int] = field(default_factory=lambda: [0] * 9)
    values: int = 0

    def lines(self) -> list[str]:
        out = [f"Analysis {self.analysis_id}: {self.values} municipalities loaded"]
        for uf in sorted(self.with_cell):
            out.append(
                f"  UF {uf}: {self.with_cell[uf]} with a cell, {self.no_data[uf]} without data"
            )
        out.append(
            f"  dropped (outside UFs): {self.dropped}; unmatched 6-digit codes: {self.unmatched}"
        )
        out.append("  per cell: " + " ".join(f"{i}={n}" for i, n in enumerate(self.counts)))
        return out


def _text(raw, name: str) -> Text:
    if not isinstance(raw, dict) or not all(
        isinstance(raw.get(k), str) and raw[k].strip() for k in ("pt", "en")
    ):
        raise ManifestError(f"{name} needs non-empty pt and en text")
    return Text(raw["pt"], raw["en"])


def _axis(raw, name: str, base: Path) -> AxisDef:
    if not isinstance(raw, dict):
        raise ManifestError(f"{name} must be a mapping")
    for k in ("label", "csv", "key", "column", "method"):
        if k not in raw:
            raise ManifestError(f"{name}.{k} is missing")
    if raw["method"] not in METHODS:
        raise ManifestError(f"{name}.method {raw['method']!r} not in {', '.join(METHODS)}")
    invert = raw.get("invert", False)
    if not isinstance(invert, bool):
        raise ManifestError(f"{name}.invert must be true or false")
    return AxisDef(
        label=_text(raw["label"], f"{name}.label"),
        csv=base / str(raw["csv"]),
        key=str(raw["key"]),
        column=str(raw["column"]),
        method=raw["method"],
        invert=invert,
    )


def read_manifest(path: Path) -> Manifest:
    try:
        raw = yaml.safe_load(Path(path).read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as e:
        raise ManifestError(f"cannot read manifest {path}: {e}") from e
    if not isinstance(raw, dict):
        raise ManifestError("manifest must be a mapping")
    required = ("id", "title", "question", "source", "uf_prefixes", "answer_cell")
    for k in (*required, "layers", "level", "x", "y"):
        if k not in raw:
            raise ManifestError(f"{k} is missing")
    if not isinstance(raw["id"], str) or not ID_RE.fullmatch(raw["id"]):
        raise ManifestError(f"id {raw['id']!r} must match {ID_RE.pattern}")
    ufs = raw["uf_prefixes"]
    if not isinstance(ufs, list) or not ufs or any(str(u) not in VALID_UFS for u in ufs):
        raise ManifestError(f"uf_prefixes must be a non-empty list of {', '.join(VALID_UFS)}")
    if len(set(map(str, ufs))) != len(ufs):
        raise ManifestError("uf_prefixes has a duplicate")
    for k, lo, hi in (("answer_cell", 0, 8), ("level", 0, 3)):
        v = raw[k]
        if isinstance(v, bool) or not isinstance(v, int) or not lo <= v <= hi:
            raise ManifestError(f"{k} must be an integer from {lo} to {hi}")
    if not isinstance(raw["layers"], list) or not all(isinstance(s, str) for s in raw["layers"]):
        raise ManifestError("layers must be a list of strings")
    base = Path(path).resolve().parent
    return Manifest(
        id=raw["id"],
        title=_text(raw["title"], "title"),
        question=_text(raw["question"], "question"),
        source=_text(raw["source"], "source"),
        uf_prefixes=tuple(str(u) for u in ufs),
        answer_cell=raw["answer_cell"],
        layers=tuple(raw["layers"]),
        level=raw["level"],
        x=_axis(raw["x"], "x", base),
        y=_axis(raw["y"], "y", base),
    )


def read_axis(csv_path: Path, key: str, column: str) -> dict[str, float | None]:
    """{code: value or None}. Codes have 7 digits, or 6 when the source dropped
    the check digit (load() resolves those); an empty value is None."""
    out: dict[str, float | None] = {}
    try:
        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            names = reader.fieldnames or []
            if key not in names or column not in names:
                raise ManifestError(f"{Path(csv_path).name} needs columns {key} and {column}")
            for row in reader:
                code = (row[key] or "").strip()
                if not re.fullmatch(r"\d{6,7}", code):
                    raise ManifestError(
                        f"{key} {code!r} in {Path(csv_path).name} must have 6 or 7 digits"
                    )
                if code in out:
                    raise ManifestError(f"duplicate {key} {code} in {Path(csv_path).name}")
                raw = (row[column] or "").strip()
                if raw == "":
                    out[code] = None
                    continue
                try:
                    v = float(raw)
                except ValueError:
                    raise ManifestError(f"{column} for {key} {code} is not a number") from None
                if not math.isfinite(v):
                    raise ManifestError(f"{column} for {key} {code} is not finite")
                out[code] = v
    except OSError as e:
        raise ManifestError(f"cannot read {csv_path}: {e}") from e
    return out


def _resolve_six_digit(
    cur, axis: dict[str, float | None], label: str
) -> tuple[dict[str, float | None], int]:
    """Swap 6-digit codes for the 7-digit one in the canonical municipalities
    table.

    Returns the axis with 7-digit keys and how many 6-digit codes had no match.
    """
    six = [c for c in axis if len(c) == 6]
    found: dict[str, str] = {}
    if six:
        cur.execute(
            "SELECT DISTINCT ibge_code FROM municipalities" " WHERE LEFT(ibge_code, 6) = ANY(%s)",
            (six,),
        )
        for (full,) in cur.fetchall():
            found[full[:6]] = full
    out: dict[str, float | None] = {}
    unmatched = 0
    for code, v in axis.items():
        if len(code) == 7:
            full = code
        elif code in found:
            full = found[code]
        else:
            unmatched += 1
            continue
        if full in out:
            raise ManifestError(f"duplicate {full} in axis {label} after matching 6-digit codes")
        out[full] = v
    return out, unmatched


def _split_by_uf(m: Manifest, xs, ys, summary: LoadSummary):
    """Keep only the manifest's UFs (before any 6-digit lookup); count the rest."""
    kept, outside = [], set()
    for axis in (xs, ys):
        kept.append({c: v for c, v in axis.items() if c[:2] in m.uf_prefixes})
        outside |= {c for c in axis if c[:2] not in m.uf_prefixes}
    summary.dropped = len(outside)
    return kept


def _classify(m: Manifest, rows, summary: LoadSummary):
    """Yield (uf, UfResult) per UF and fill the summary counts."""
    x_spec = AxisSpec(m.x.method, m.x.invert)  # type: ignore[arg-type]
    y_spec = AxisSpec(m.y.method, m.y.invert)  # type: ignore[arg-type]
    for uf in m.uf_prefixes:
        res = classify_uf([r for r in rows if r[0].startswith(uf)], x_spec, y_spec)
        summary.with_cell[uf] = len(res.cells) - res.no_data
        summary.no_data[uf] = res.no_data
        summary.counts = [a + b for a, b in zip(summary.counts, res.counts, strict=True)]
        yield uf, res


def preview(manifest: Manifest) -> LoadSummary:
    """Dry run without a database; only possible when every code has 7 digits."""
    m = manifest
    xs = read_axis(m.x.csv, m.x.key, m.x.column)
    ys = read_axis(m.y.csv, m.y.key, m.y.column)
    summary = LoadSummary(analysis_id=m.id)
    xk, yk = _split_by_uf(m, xs, ys, summary)
    if any(len(c) == 6 for c in (*xk, *yk)):
        raise ManifestError(
            "the CSVs have 6-digit codes and matching them needs the database: set DATABASE_URL"
        )
    rows = [(c, xk.get(c), yk.get(c)) for c in sorted(set(xk) | set(yk))]
    summary.values = len(rows)
    for _ in _classify(m, rows, summary):
        pass
    return summary


def load(conn, manifest: Manifest, *, dry_run: bool = False) -> LoadSummary:
    """Write the analysis inside a savepoint; the caller commits.

    Any error (or dry_run) rolls the savepoint back, so a failure leaves nothing
    behind. Raw values are never printed, only the summary counts.
    """
    m = manifest
    xs = read_axis(m.x.csv, m.x.key, m.x.column)
    ys = read_axis(m.y.csv, m.y.key, m.y.column)
    summary = LoadSummary(analysis_id=m.id)

    with conn.cursor() as cur:
        cur.execute("SAVEPOINT load_analysis")
        try:
            kept_x, kept_y = _split_by_uf(m, xs, ys, summary)
            xk, ux = _resolve_six_digit(cur, kept_x, "x")
            yk, uy = _resolve_six_digit(cur, kept_y, "y")
            summary.unmatched = ux + uy

            cur.execute(
                """
                INSERT INTO analyses (
                    id, title_pt, title_en, question_pt, question_en,
                    x_label_pt, x_label_en, y_label_pt, y_label_en,
                    x_method, y_method, x_invert, y_invert, answer_cell, layers,
                    source_pt, source_en, uf_prefixes, level
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (id) DO UPDATE SET
                    title_pt = EXCLUDED.title_pt, title_en = EXCLUDED.title_en,
                    question_pt = EXCLUDED.question_pt, question_en = EXCLUDED.question_en,
                    x_label_pt = EXCLUDED.x_label_pt, x_label_en = EXCLUDED.x_label_en,
                    y_label_pt = EXCLUDED.y_label_pt, y_label_en = EXCLUDED.y_label_en,
                    x_method = EXCLUDED.x_method, y_method = EXCLUDED.y_method,
                    x_invert = EXCLUDED.x_invert, y_invert = EXCLUDED.y_invert,
                    answer_cell = EXCLUDED.answer_cell, layers = EXCLUDED.layers,
                    source_pt = EXCLUDED.source_pt, source_en = EXCLUDED.source_en,
                    uf_prefixes = EXCLUDED.uf_prefixes, updated_at = now()
                """,
                (
                    m.id, m.title.pt, m.title.en, m.question.pt, m.question.en,
                    m.x.label.pt, m.x.label.en, m.y.label.pt, m.y.label.en,
                    m.x.method, m.y.method, m.x.invert, m.y.invert, m.answer_cell,
                    list(m.layers), m.source.pt, m.source.en, list(m.uf_prefixes), m.level,
                ),
            )  # fmt: skip
            for table in ("analysis_values", "analysis_classes", "analysis_breaks"):
                cur.execute(f"DELETE FROM {table} WHERE analysis_id = %s", (m.id,))  # noqa: S608

            rows = [(c, xk.get(c), yk.get(c)) for c in sorted(set(xk) | set(yk))]
            cur.executemany(
                "INSERT INTO analysis_values (analysis_id, ibge_code, x, y) VALUES (%s, %s, %s, %s)",
                [(m.id, c, xv, yv) for c, xv, yv in rows],
            )
            summary.values = len(rows)

            for uf, res in _classify(m, rows, summary):
                cur.executemany(
                    "INSERT INTO analysis_classes (analysis_id, ibge_code, cell) VALUES (%s, %s, %s)",
                    [(m.id, c, cell) for c, cell in res.cells.items()],
                )
                for axis_name, br in (("x", res.x_breaks), ("y", res.y_breaks)):
                    cur.execute(
                        "INSERT INTO analysis_breaks (analysis_id, uf_prefix, axis, b1, b2)"
                        " VALUES (%s, %s, %s, %s, %s)",
                        (m.id, uf, axis_name, br[0] if br else None, br[1] if br else None),
                    )
        except BaseException:
            try:
                cur.execute("ROLLBACK TO SAVEPOINT load_analysis")
            except Exception:  # noqa: BLE001 - broken connection: keep the original error
                pass
            raise
        if dry_run:
            cur.execute("ROLLBACK TO SAVEPOINT load_analysis")
        cur.execute("RELEASE SAVEPOINT load_analysis")
    return summary


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--manifest", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url = os.getenv("DATABASE_URL")
    try:
        manifest = read_manifest(args.manifest)
        if not url:
            if not args.dry_run:
                print("ERROR: set DATABASE_URL")
                return 1
            summary = preview(manifest)  # no database needed for 7-digit data
        else:
            conn = psycopg2.connect(url)
            try:
                summary = load(conn, manifest, dry_run=args.dry_run)
                if args.dry_run:
                    conn.rollback()
                else:
                    conn.commit()
            finally:
                conn.close()
    except ManifestError as e:
        print(f"ERROR: {e}")
        return 1
    except psycopg2.Error as e:
        # Never the message: DETAIL can carry a row's values.
        print(f"ERROR: database error {type(e).__name__} (pgcode {e.pgcode})")
        return 1
    print("\n".join(summary.lines()))
    if args.dry_run:
        print("Dry run: nothing written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
