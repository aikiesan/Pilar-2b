#!/usr/bin/env python3
"""Validate published numeric claims against canonical_results.json.

Canonical claims use this inline, language-neutral contract:

    {{canonical:totals.ch4_practical.medio.value|scale=365000000|precision=4}}

The marker itself is the published value.  Renderers may replace it at build
time; source files must not copy the resulting number by hand.  ``scale``
defaults to 1 and ``precision`` is optional.  A declared absolute ``tolerance``
may be supplied, but may not exceed the repository-wide limit.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path
from typing import Any, Iterable

ROOT = Path(__file__).resolve().parents[1]
CANONICAL = ROOT / "docs" / "data" / "canonical_results.json"
EXCLUSIONS = ROOT / "docs" / "data" / "validator_exclusions.json"
ABSOLUTE_TOLERANCE = 1e-6
RELATIVE_TOLERANCE = 1e-9

MARKER = re.compile(r"\{\{canonical:([^}|]+)((?:\|[^}]+)*)\}\}")
CANONICAL_CONTEXT = re.compile(
    r"(?i)(?:can[oô]nic[oa]|total\s+estadual|estado\s+de\s+s[aã]o\s+paulo)"
)
RESULT_WITH_UNIT = re.compile(
    r"(?i)(?:ch4|ch₄|biog[aá]s|biometano|biomassa|bioenergia)"
    r".{0,80}[-+]?\d+(?:[.,]\d+)?"
    r".{0,20}(?:mm[³3]/(?:dia|ano)|m[³3]/(?:dia|ano)|mt/ano|twh/ano|pj/ano)"
    r"|[-+]?\d+(?:[.,]\d+)?.{0,20}(?:mm[³3]/(?:dia|ano)|m[³3]/(?:dia|ano)|"
    r"mt/ano|twh/ano|pj/ano).{0,80}(?:ch4|ch₄|biog[aá]s|biometano|biomassa|bioenergia)"
)
NUMBER = re.compile(r"(?<![\w/.-])[-+]?\d+(?:[.,]\d+)?(?:[eE][-+]?\d+)?")
TARGET_SUFFIXES = {".md", ".mdx", ".rst", ".txt", ".tsx", ".ts", ".jsx", ".js"}


def numeric_leaves(value: Any, path: str = "") -> dict[str, float]:
    """Extract every finite numeric JSON leaf, keyed by an unambiguous path."""
    leaves: dict[str, float] = {}
    if isinstance(value, bool):
        return leaves
    if isinstance(value, (int, float)):
        if not math.isfinite(float(value)):
            raise ValueError(f"non-finite canonical number at {path}")
        leaves[path] = float(value)
    elif isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}" if path else str(key)
            leaves.update(numeric_leaves(child, child_path))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            leaves.update(numeric_leaves(child, f"{path}[{index}]"))
    return leaves


def exclusions() -> list[tuple[str, bool]]:
    raw = json.loads(EXCLUSIONS.read_text(encoding="utf-8"))
    return [(item["path"].replace("\\", "/").lstrip("./"), item["recursive"])
            for item in raw["exclusions"]]


def is_excluded(relative: str, rules: Iterable[tuple[str, bool]]) -> bool:
    relative = relative.replace("\\", "/")
    for path, recursive in rules:
        # Older entries included the monorepo prefix; normalize it away.
        marker = "cp2b-workspace/NewLook/"
        if path.startswith(marker):
            path = path[len(marker):]
        path = path.rstrip("/")
        if relative == path or (recursive and relative.startswith(path + "/")):
            return True
    return False


def target_files() -> Iterable[Path]:
    candidates = [ROOT / "README.md"]
    candidates.extend((ROOT / "docs").rglob("*"))
    candidates.extend((ROOT / "frontend" / "src").rglob("*"))
    rules = exclusions()
    for path in candidates:
        if not path.is_file() or path.suffix.lower() not in TARGET_SUFFIXES:
            continue
        rel = path.relative_to(ROOT).as_posix()
        if not is_excluded(rel, rules):
            yield path


def options(raw: str) -> dict[str, str]:
    result: dict[str, str] = {}
    for fragment in raw.split("|"):
        if not fragment:
            continue
        if "=" not in fragment:
            raise ValueError(f"invalid marker option {fragment!r}")
        key, value = fragment.split("=", 1)
        result[key.strip()] = value.strip()
    unknown = set(result) - {"scale", "precision", "tolerance"}
    if unknown:
        raise ValueError(f"unknown marker option(s): {', '.join(sorted(unknown))}")
    return result


def resolve_marker(path: str, raw_options: str, leaves: dict[str, float]) -> str:
    if path not in leaves:
        raise ValueError(f"unknown canonical numeric path {path!r}")
    opts = options(raw_options)
    scale = float(opts.get("scale", "1"))
    precision = int(opts["precision"]) if "precision" in opts else None
    tolerance = float(opts.get("tolerance", str(ABSOLUTE_TOLERANCE)))
    if tolerance < 0 or tolerance > ABSOLUTE_TOLERANCE:
        raise ValueError(
            f"tolerance {tolerance:g} outside declared limit "
            f"[0, {ABSOLUTE_TOLERANCE:g}]"
        )
    value = leaves[path] / scale
    return f"{value:.{precision}f}" if precision is not None else f"{value:.12g}"


def validate_text(path: Path, leaves: dict[str, float]) -> list[str]:
    errors: list[str] = []
    text = path.read_text(encoding="utf-8")
    try:
        rel = path.relative_to(ROOT).as_posix()
    except ValueError:
        rel = path.as_posix()
    for lineno, line in enumerate(text.splitlines(), 1):
        if "canonical-ignore:" in line:
            continue
        matches = list(MARKER.finditer(line))
        for match in matches:
            try:
                resolve_marker(match.group(1), match.group(2), leaves)
            except (ValueError, OverflowError) as exc:
                errors.append(f"{rel}:{lineno}: {exc}")
        # A numerical statewide/canonical result typed by hand is precisely the
        # regression this gate prevents. Parameter discussions and citations do
        # not match this semantic predicate.
        without_markers = MARKER.sub("", line)
        if (
            CANONICAL_CONTEXT.search(without_markers)
            and RESULT_WITH_UNIT.search(without_markers)
            and NUMBER.search(without_markers)
        ):
            errors.append(
                f"{rel}:{lineno}: canonical result copied as a numeric literal; "
                "use {{canonical:<json-path>|scale=<unit-scale>|precision=<n>}} "
                "or a justified canonical-ignore annotation"
            )
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--canonical", type=Path, default=CANONICAL)
    parser.add_argument("--check-file", type=Path, action="append", default=[])
    parser.add_argument("--print-value", help="resolve one numeric JSON path")
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument("--precision", type=int)
    args = parser.parse_args(argv)

    data = json.loads(args.canonical.read_text(encoding="utf-8"))
    leaves = numeric_leaves(data)
    if args.print_value:
        marker_opts = f"|scale={args.scale}"
        if args.precision is not None:
            marker_opts += f"|precision={args.precision}"
        print(resolve_marker(args.print_value, marker_opts, leaves))
        return 0

    files = args.check_file or list(target_files())
    errors: list[str] = []
    for path in files:
        errors.extend(validate_text(path.resolve(), leaves))
    if errors:
        print("Canonical consistency validation failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    print(
        f"Canonical consistency OK: {len(leaves)} numeric leaves, "
        f"{len(files)} files; abs_tol={ABSOLUTE_TOLERANCE:g}, "
        f"rel_tol={RELATIVE_TOLERANCE:g}."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
