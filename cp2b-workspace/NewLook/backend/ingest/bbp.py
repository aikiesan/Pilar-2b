"""Read IBGE SIDRA tables from the Biomass Brasil Pipeline (`bbp`) schema.

The alternative to reading SIDRA workbooks from data/raw/. The Biomass Brasil
Pipeline (github.com/aikiesan/Biomass_Brasil_Pipeline) parses every PAM and PPM
export once, checks it, and loads it as a versioned release into the schema
`bbp` of this same database:

    docker compose --profile pilar2b run --rm bbp-pilar2b load --target pilar2b

`bbp.v_sidra` is the current release, long: one row per
(sidra_table, geocode, year, product, variable) with `value`, `flag` (SIDRA's
symbol: ok / zero / not_available / not_applicable / suppressed), `unit` and
`preliminary`.

`bbp.v_sanitation` holds the municipal sanitation surveys on harmonised
variables: SNIS to 2022 and SINISA from 2023 (`survey`), urban solid waste,
sewage and population (read by scripts/promote_sanitation.py).

This module turns v_sidra into the exact `{ibge_code: {product: value | None}}`
reading that the workbook readers return, so every source builds the SAME frame
and runs the SAME gates whichever way the data arrived. Value-code semantics
are unchanged: SIDRA "-" arrives as 0.0, "..", "..." and "X" as None, never 0.

PRELIMINARY. IBGE publishes the newest year of every table as preliminary
("Os dados do último ano divulgado são RESULTADOS PRELIMINARES") and revises it
at the next release. bbp flags it; promote scripts write those rows with
quality 'preliminary' so that "latest year" readers can skip them (migration
037) until the year is re-exported as final.
"""

from __future__ import annotations

import os
from collections.abc import Iterable

SCHEMA = os.environ.get("BBP_SCHEMA", "bbp")

# bbp `variable` of each SIDRA quantity this platform reads.
PAM_PRODUCTION = "production_t"
PPM_HERDS = "Efetivo dos rebanhos (Cabeças)"
PPM_ANIMAL_PRODUCTS = "Produção de origem animal"
PPM_AQUACULTURE = "Produção da aquicultura"

READ_SQL = (
    "SELECT geocode, product, value, preliminary FROM {schema}.v_sidra "
    "WHERE sidra_table = %s AND year = %s AND variable = %s"
)

# bbp.v_sanitation: SNIS (to 2022) and SINISA (from 2023) on harmonised variables,
# one row per (geocode, year, variable); only cells the municipality reported.
SANITATION_SQL = (
    "SELECT geocode, variable, value FROM {schema}.v_sanitation WHERE year = %s AND survey = %s"
)


class BbpUnavailable(RuntimeError):
    """The bbp schema is not in this database, or holds nothing for the request."""


def reading_from_rows(
    rows: Iterable[tuple],
) -> tuple[dict[str, dict[str, float | None]], bool]:
    """(geocode, product, value, preliminary) rows -> ({ibge_code: {product: value}}, preliminary).

    `preliminary` is True when any row of the slice is flagged preliminary (bbp
    flags whole table-years, so in practice all rows agree).
    """
    out: dict[str, dict[str, float | None]] = {}
    preliminary = False
    for geocode, product, value, prelim in rows:
        code = str(int(geocode))
        out.setdefault(code, {})[str(product)] = None if value is None else float(value)
        preliminary = preliminary or bool(prelim)
    return out, preliminary


def _require_view(cur, view: str) -> None:
    cur.execute("SELECT to_regclass(%s)", (f"{SCHEMA}.{view}",))
    if cur.fetchone()[0] is None:
        raise BbpUnavailable(
            f"{SCHEMA}.{view} not found in this database — load a bbp release first "
            "(Biomass Brasil Pipeline: `bbp load --target pilar2b`)"
        )


def read_year(
    conn, table: int, year: int, variable: str
) -> tuple[dict[str, dict[str, float | None]], bool]:
    """One SIDRA table-year-variable from the current bbp release."""
    with conn.cursor() as cur:
        _require_view(cur, "v_sidra")
        cur.execute(READ_SQL.format(schema=SCHEMA), (table, year, variable))
        return reading_from_rows(cur.fetchall())


def read_sanitation(conn, year: int, survey: str) -> dict[str, dict[str, float]]:
    """{ibge_code: {bbp variable: value}} of one survey ('SNIS' or 'SINISA') and year.

    A municipality or variable that is absent was not reported — never zero.
    """
    with conn.cursor() as cur:
        _require_view(cur, "v_sanitation")
        cur.execute(SANITATION_SQL.format(schema=SCHEMA), (year, survey))
        out: dict[str, dict[str, float]] = {}
        for geocode, variable, value in cur.fetchall():
            if value is not None:
                out.setdefault(str(int(geocode)), {})[str(variable)] = float(value)
        return out


def current_release(conn) -> dict | None:
    """The bbp release the views point to (for logging what a promote used)."""
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s)", (f"{SCHEMA}.release",))
        if cur.fetchone()[0] is None:
            return None
        cur.execute(
            f"SELECT release_id, version, label, git_commit, loaded_at "
            f"FROM {SCHEMA}.release WHERE is_current"
        )
        row = cur.fetchone()
    if row is None:
        return None
    keys = ("release_id", "version", "label", "git_commit", "loaded_at")
    return dict(zip(keys, row))
