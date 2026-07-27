#!/usr/bin/env python3
"""Build the auditable São Paulo SNIS 2022 activity snapshot.

Inputs are the official SNIS table archives downloaded from Ministério das
Cidades.  The output is deliberately narrow: the 645 São Paulo municipalities
and only the fields consumed by the canonical pipeline.
"""

from __future__ import annotations

import argparse
import csv
import io
import zipfile
from collections import defaultdict
from pathlib import Path

import openpyxl
import xlrd


ROOT = Path(__file__).resolve().parents[2]
MUNICIPALITIES = ROOT / "docs" / "data" / "municipality_biomass_tons.csv"
CONTEXT = ROOT.parents[1] / "analysis" / "data" / "02_municipality_summary_SP_2023.csv"
DEFAULT_OUTPUT = ROOT / "data" / "canonical_parameters" / "snis_sp_activity_2022.csv"


def _number(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _load_base() -> tuple[list[dict[str, str]], dict[str, str], dict[str, float]]:
    rows = list(csv.DictReader(MUNICIPALITIES.open(encoding="utf-8")))
    six_to_seven = {row["ibge_code"][:6]: row["ibge_code"] for row in rows}
    context = {
        row["ibge_code"]: float(row["populacao_2022"])
        for row in csv.DictReader(CONTEXT.open(encoding="utf-8-sig"))
    }
    return rows, six_to_seven, context


def _read_rs(path: Path) -> dict[str, dict[str, float | None]]:
    with zipfile.ZipFile(path) as archive:
        payload = archive.read("Planilha_Informacoes_RS_2022.xlsx")
    sheet = openpyxl.load_workbook(
        io.BytesIO(payload), read_only=True, data_only=True
    ).active
    rows = sheet.iter_rows(values_only=True)
    for _ in range(11):
        next(rows)
    code_row = next(rows)
    codes = {str(value): index for index, value in enumerate(code_row) if value}
    required = ("CO111", "CO115", "CO119")
    missing = set(required) - codes.keys()
    if missing:
        raise RuntimeError(f"SNIS RS workbook is missing fields: {sorted(missing)}")

    output: dict[str, dict[str, float | None]] = {}
    for values in rows:
        if values[3] != "SP":
            continue
        ibge_code = str(values[1] or "").strip()
        if not ibge_code:
            continue
        output[ibge_code] = {
            field.lower(): _number(values[codes[field]])
            for field in required
        }
    return output


def _read_ae(path: Path, six_to_seven: dict[str, str]) -> tuple[dict[str, float], dict[str, int]]:
    es006 = defaultdict(float)
    providers = defaultdict(int)
    with zipfile.ZipFile(path) as archive:
        for nested_name in archive.namelist():
            if not nested_name.lower().endswith(".zip"):
                continue
            # São Paulo's only regional provider in this release is SABESP; the
            # microrregional archive contains no SP provider.  Local-provider
            # aggregate workbooks must all be inspected.
            is_regional = "Regionais.zip" in nested_name
            if "Microrregionais.zip" in nested_name:
                continue
            with zipfile.ZipFile(io.BytesIO(archive.read(nested_name))) as nested:
                for workbook_name in nested.namelist():
                    lowered = workbook_name.lower()
                    if not lowered.endswith(".xls") or "informacoes" not in lowered:
                        continue
                    if is_regional and "/sabesp/" not in lowered:
                        continue
                    book = xlrd.open_workbook(file_contents=nested.read(workbook_name))
                    sheet = book.sheet_by_index(0)
                    code_row = [str(value).strip() for value in sheet.row_values(11)]
                    if "ES006" not in code_row:
                        continue
                    es006_column = code_row.index("ES006")
                    for row_index in range(12, sheet.nrows):
                        values = sheet.row_values(row_index)
                        if len(values) < 4 or str(values[2]).strip() != "SP":
                            continue
                        six_digit = str(values[0]).split(".")[0].strip().zfill(6)
                        ibge_code = six_to_seven.get(six_digit)
                        measured = _number(values[es006_column])
                        if not ibge_code or measured is None or measured <= 0:
                            continue
                        es006[ibge_code] += measured
                        providers[ibge_code] += 1
    return dict(es006), dict(providers)


def build(rs_zip: Path, ae_zip: Path, output: Path) -> None:
    municipalities, six_to_seven, populations = _load_base()
    rs = _read_rs(rs_zip)
    es006, providers = _read_ae(ae_zip, six_to_seven)
    fields = (
        "ibge_code",
        "municipality_name",
        "population_2022",
        "co111_rdo_t_2022",
        "co115_rpu_t_2022",
        "co119_rdo_rpu_t_2022",
        "es006_treated_sewage_1000m3_2022",
        "es006_provider_rows",
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for municipality in municipalities:
            code = municipality["ibge_code"]
            waste = rs.get(code, {})
            writer.writerow(
                {
                    "ibge_code": code,
                    "municipality_name": municipality["municipality_name"],
                    "population_2022": populations[code],
                    "co111_rdo_t_2022": waste.get("co111", ""),
                    "co115_rpu_t_2022": waste.get("co115", ""),
                    "co119_rdo_rpu_t_2022": waste.get("co119", ""),
                    "es006_treated_sewage_1000m3_2022": es006.get(code, ""),
                    "es006_provider_rows": providers.get(code, 0),
                }
            )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--rs-zip", type=Path, required=True)
    parser.add_argument("--ae-zip", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    build(args.rs_zip, args.ae_zip, args.output)


if __name__ == "__main__":
    main()
