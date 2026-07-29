from __future__ import annotations

import importlib.util
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[4] / "scripts" / "validate_canonical_consistency.py"
SPEC = importlib.util.spec_from_file_location("canonical_validator", SCRIPT)
validator = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(validator)


def test_extracts_every_numeric_leaf() -> None:
    leaves = validator.numeric_leaves({"a": 1, "b": [{"c": 2.5}], "flag": True})
    assert leaves == {"a": 1.0, "b[0].c": 2.5}


def test_marker_resolves_scale_and_precision() -> None:
    value = validator.resolve_marker(
        "totals.ch4.medio",
        "|scale=1000000|precision=4",
        {"totals.ch4.medio": 2_740_453.9081},
    )
    assert value == "2.7405"


def test_unknown_path_is_rejected() -> None:
    try:
        validator.resolve_marker("missing", "", {"present": 1.0})
    except ValueError as exc:
        assert "unknown canonical numeric path" in str(exc)
    else:
        raise AssertionError("unknown path was accepted")


def test_excessive_tolerance_is_rejected() -> None:
    try:
        validator.resolve_marker("x", "|tolerance=0.1", {"x": 1.0})
    except ValueError as exc:
        assert "outside declared limit" in str(exc)
    else:
        raise AssertionError("excessive tolerance was accepted")


def test_divergent_literal_claim_fails(tmp_path: Path) -> None:
    document = tmp_path / "README.md"
    document.write_text(
        "Total estadual canônico de CH4: 9,9999 Mm3/dia\n",
        encoding="utf-8",
    )
    errors = validator.validate_text(document, {"totals.ch4.value": 1.0})
    assert errors
    assert "copied as a numeric literal" in errors[0]
