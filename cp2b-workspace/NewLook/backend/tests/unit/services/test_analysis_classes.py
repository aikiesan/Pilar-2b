"""Python classes must match the map's TS (frontend lib/mapAnalyses.ts).

The cases live in a JSON file shared with the frontend parity test, so a drift
on either side breaks one of the two suites.
"""

import json
import os
from pathlib import Path

import pytest

from app.services.analysis_classes import (
    AxisSpec,
    axis_breaks,
    axis_class_of,
    classify_uf,
)

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures"
CASES = json.loads((FIXTURES / "analysis-breaks-cases.json").read_text())


def _frontend_fixture() -> Path | None:
    # The test container mounts the frontend fixtures read-only at /frontend-fixtures.
    candidates = []
    if os.environ.get("FRONTEND_FIXTURES"):
        candidates.append(Path(os.environ["FRONTEND_FIXTURES"]))
    candidates.append(Path("/frontend-fixtures"))
    try:
        candidates.append(
            Path(__file__).resolve().parents[4] / "frontend/src/lib/__tests__/fixtures"
        )
    except IndexError:
        pass
    for base in candidates:
        f = base / "analysis-breaks-cases.json"
        if f.exists():
            return f
    return None


@pytest.mark.parametrize("case", CASES["breaks"])
def test_axis_breaks_matches_map(case):
    got = axis_breaks(case["values"], case["method"])
    assert (list(got) if got else None) == case["breaks"]


@pytest.mark.parametrize("case", CASES["classes"])
def test_axis_class_of_matches_map(case):
    breaks = tuple(case["breaks"]) if case["breaks"] else None
    assert axis_class_of(case["value"], breaks, case["method"], case["invert"]) == case["class"]


def test_fixture_copies_are_identical():
    front = _frontend_fixture()
    if front is None:
        pytest.skip("frontend fixtures not available")
    assert front.read_bytes() == (FIXTURES / "analysis-breaks-cases.json").read_bytes()


def test_classify_uf_counts_and_no_data():
    rows = [("3500001", 1, 1), ("3500002", 5, 5), ("3500003", 9, 9), ("3500004", None, 2)]
    r = classify_uf(rows, AxisSpec("tertile", False), AxisSpec("tertile", False))
    assert r.cells["3500004"] is None and r.no_data == 1
    assert sum(r.counts) == 3
    assert len(r.counts) == 9
    # lowest on both axes is cell 0, highest is cell 8
    assert r.cells["3500001"] == 0 and r.cells["3500003"] == 8
    assert r.counts[0] == 1 and r.counts[8] == 1


def test_classify_uf_cell_is_cy_times_3_plus_cx():
    # x tertile (low, high); y fixed_count with invert so class flips
    rows = [("a", 1, 0), ("b", 5, 1), ("c", 9, 2), ("d", 9, 0)]
    r = classify_uf(rows, AxisSpec("tertile", False), AxisSpec("fixed_count", True))
    assert r.y_breaks == (1, 2)
    # x classes: a=0 b=1 c=2 d=2 ; y inverted: 0->2, 1->1, 2->0
    assert r.cells == {"a": 2 * 3 + 0, "b": 1 * 3 + 1, "c": 0 * 3 + 2, "d": 2 * 3 + 2}


def test_classify_uf_breaks_null_counts_everything_as_no_data():
    rows = [("a", 1, 1), ("b", 2, 2)]  # two values: no tertile cut
    r = classify_uf(rows, AxisSpec("tertile", False), AxisSpec("tertile", False))
    assert r.x_breaks is None and r.no_data == 2 and sum(r.counts) == 0
