"""
Snapshots of the IBGE SIDRA API (apisidra.ibge.gov.br), one JSON file per UF.

A municipal query for the whole country can pass the API's 100,000-value cap,
so every source asks one UF at a time and keeps each reply as an immutable
snapshot at data/raw/<source_id>/<year>/<uf code>.json. `fetch_by_uf` only
downloads a UF whose file is missing and never rewrites one: a re-run reads
exactly what the first run read.

The reply is the API's "values" JSON: a list whose first element is the header
(column labels) and the rest are data rows keyed V (value), D1C (municipality
code), D2C… (classification codes). `read_rows` drops the header and turns V
into a float, following IBGE's symbols (same as ingest/sources/ibge_ppm):
    -    absolute zero, measured          -> 0.0
    ..   not applicable   ...  not available   X  suppressed   -> None
None means "no value": callers write no row, never 0.
"""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path

from ingest.ibge import UF_BY_CODE_PREFIX

_CODE_BY_UF = {uf: code for code, uf in UF_BY_CODE_PREFIX.items()}
ALL_UFS: tuple[str, ...] = tuple(sorted(UF_BY_CODE_PREFIX))  # numeric UF codes, national
ABSENT_VALUES = {"..", "...", "X", ""}
TIMEOUT_S = 120


def uf_code(uf: str) -> str:
    """'SP' or '35' -> '35'."""
    uf = uf.strip().upper()
    if uf in UF_BY_CODE_PREFIX:
        return uf
    if uf in _CODE_BY_UF:
        return _CODE_BY_UF[uf]
    raise ValueError(f"unknown UF {uf!r}")


def snapshot_path(raw_dir: Path, source_id: str, year: int, uf: str) -> Path:
    return Path(raw_dir) / source_id / str(year) / f"{uf_code(uf)}.json"


def snapshot_files(raw_dir: Path, source_id: str, year: int) -> list[Path]:
    """Every UF snapshot present for (source, year); raises when there is none."""
    folder = Path(raw_dir) / source_id / str(year)
    files = sorted(folder.glob("*.json"))
    if not files:
        raise FileNotFoundError(f"no SIDRA snapshots under {folder} — run fetch first")
    return files


def _download(url: str) -> bytes:
    try:  # Windows hosts behind TLS inspection need the OS trust store
        import truststore

        truststore.inject_into_ssl()
    except ImportError:
        pass
    req = urllib.request.Request(url, headers={"User-Agent": "pilar2b-ingest"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_S) as resp:
        return resp.read()


def fetch_by_uf(
    url_template: str, raw_dir: Path, source_id: str, year: int, ufs: tuple[str, ...]
) -> list[Path]:
    """Snapshot paths for every UF, downloading only the missing ones.

    `url_template` carries `{uf}`, replaced by the numeric UF code.
    """
    paths = []
    for uf in ufs:
        code = uf_code(uf)
        path = snapshot_path(raw_dir, source_id, year, code)
        if not path.exists():
            body = _download(url_template.format(uf=code))
            try:
                parsed = json.loads(body.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError) as exc:
                raise ValueError(
                    f"SIDRA replied with something other than JSON for UF {code}: "
                    f"{body[:200]!r}"
                ) from exc
            if not isinstance(parsed, list):
                raise ValueError(f"SIDRA reply for UF {code} is not a list: {body[:200]!r}")
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(parsed, ensure_ascii=False), encoding="utf-8")
        paths.append(path)
    return paths


def to_value(raw: object) -> float | None:
    s = str(raw).strip() if raw is not None else ""
    if s == "-":
        return 0.0
    if s in ABSENT_VALUES:
        return None
    return float(s)


def read_rows(path: Path) -> list[dict]:
    """Data rows of one snapshot (header dropped), with V as float | None."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    rows = []
    for r in data[1:]:
        row = dict(r)
        row["V"] = to_value(r.get("V"))
        rows.append(row)
    return rows
