"""Bivariate axis classes, a direct port of frontend/src/lib/mapAnalyses.ts.

The map and the API must cut every axis identically, so this mirrors the TS
line by line (same floor(q * n) rank, same "move up to the next distinct
value" rule). The shared cases in tests/unit/fixtures pin both sides.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Literal

AxisMethod = Literal["tertile_nonzero", "tertile", "fixed_count"]
Breaks = tuple[float, float]


@dataclass(frozen=True)
class AxisSpec:
    method: AxisMethod
    invert: bool = False


@dataclass(frozen=True)
class UfResult:
    x_breaks: Breaks | None
    y_breaks: Breaks | None
    # ibge code -> cell (cy * 3 + cx), None when either axis has no data
    cells: dict[str, int | None]
    counts: list[int]
    no_data: int


def _quantile(sorted_values: Sequence[float], q: float) -> float:
    i = min(len(sorted_values) - 1, max(0, math.floor(q * len(sorted_values))))
    return sorted_values[i]


def axis_breaks(values: Sequence[float], method: AxisMethod) -> Breaks | None:
    """The two inner breaks of an axis, or None when there are too few to cut."""
    if method == "fixed_count":
        return (1, 2)
    pool = sorted(v for v in values if v > 0) if method == "tertile_nonzero" else sorted(values)
    if len(pool) < 3:
        return None

    def above(v: float) -> float | None:
        return next((x for x in pool if x > v), None)

    low = _quantile(pool, 1 / 3)
    if low <= pool[0]:
        nxt = above(pool[0])
        if nxt is None:
            return None  # every value the same: nothing to cut
        low = nxt
    high = _quantile(pool, 2 / 3)
    if high <= low:
        nxt = above(low)
        high = nxt if nxt is not None else low
    return (low, high)


def axis_class_of(
    value: float | None, breaks: Breaks | None, method: AxisMethod, invert: bool
) -> int | None:
    """Class 0-2. A value equal to a break goes to the class above."""
    if value is None or not math.isfinite(value) or breaks is None:
        return None
    if method == "tertile_nonzero" and value == 0:
        c = 0
    elif value < breaks[0]:
        c = 0
    elif value < breaks[1]:
        c = 1
    else:
        c = 2
    return 2 - c if invert else c


def _known(vals: Sequence[float | None]) -> list[float]:
    return [v for v in vals if v is not None and math.isfinite(v)]


def classify_uf(
    rows: Sequence[tuple[str, float | None, float | None]], x: AxisSpec, y: AxisSpec
) -> UfResult:
    """Classify one state's municipalities; rows are (ibge_code, x, y)."""
    x_breaks = axis_breaks(_known([r[1] for r in rows]), x.method)
    y_breaks = axis_breaks(_known([r[2] for r in rows]), y.method)
    cells: dict[str, int | None] = {}
    counts = [0] * 9
    no_data = 0
    for code, xv, yv in rows:
        cx = axis_class_of(xv, x_breaks, x.method, x.invert)
        cy = axis_class_of(yv, y_breaks, y.method, y.invert)
        if cx is None or cy is None:
            cells[code] = None
            no_data += 1
        else:
            cell = cy * 3 + cx
            cells[code] = cell
            counts[cell] += 1
    return UfResult(x_breaks, y_breaks, cells, counts, no_data)
