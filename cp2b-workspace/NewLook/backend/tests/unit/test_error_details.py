"""API error responses never carry exception text (CWE-209).

A driver or library message can name hosts, users, tables, SQL or file paths.
Handlers log it and answer with a fixed message; this scan of the application
code keeps it that way.
"""

import re
from pathlib import Path

import pytest

APP = Path(__file__).resolve().parents[2] / "app"

# detail=str(e) | detail=f"...{e}" | {str(e)} | {repr(e)} | {type(e).__name__}
LEAK = re.compile(
    r"detail\s*=\s*(?:str\((?:e|exc|err|error|ex)\)"
    r"|f[\"'][^\"']*\{(?:str\(|repr\(|type\()?(?:e|exc|err|error|ex)\b)"
)


@pytest.mark.unit
def test_no_http_error_detail_carries_exception_text():
    offenders = [
        f"{path.relative_to(APP.parent)}:{number}: {line.strip()}"
        for path in sorted(APP.rglob("*.py"))
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1)
        if LEAK.search(line)
    ]
    assert not offenders, "exception text in an HTTP error detail:\n" + "\n".join(offenders)


@pytest.mark.unit
@pytest.mark.parametrize(
    "line",
    [
        'raise HTTPException(status_code=500, detail=str(e))',
        'raise HTTPException(status_code=500, detail=f"Database error: {e}")',
        'raise HTTPException(status_code=500, detail=f"Clustering error: {str(e)}")',
        'raise HTTPException(status_code=500, detail=f"Error: {type(e).__name__}")',
    ],
)
def test_the_scan_catches_each_form(line):
    assert LEAK.search(line)


@pytest.mark.unit
def test_the_scan_allows_parameters_in_a_message():
    assert not LEAK.search('detail=f"Value must be at least {min_value}"')
    assert not LEAK.search('detail="Failed to fetch municipalities"')
