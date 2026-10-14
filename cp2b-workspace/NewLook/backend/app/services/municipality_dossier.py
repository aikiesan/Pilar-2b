"""Everything PILAR-2b holds about a single municipality, in one place.

One gatherer, several renderers. The CLI export, the XLSX download and the PDF
report all read from `collect()` so they cannot drift apart: if a table starts
carrying municipal data, it is added here once and every output gains it.

Geometry is deliberately not returned as WKB. Callers that need shapes ask for
`geojson()`, which hands back GeoJSON ready for a map; the tabular sections carry
the centroid and area instead, because a 42 KB hex blob helps nobody in a
spreadsheet cell.
"""

from __future__ import annotations

from typing import Any

import psycopg2

# Every table that keys on a municipality, with the column it keys on. Order is
# the reading order of the exported workbook: identity first, then the headline
# figures, then the supporting detail.
SECTIONS: tuple[tuple[str, str, str], ...] = (
    ("municipality", "municipalities", "ibge_code"),
    ("summary", "municipality_summary", "ibge_code"),
    ("rankings", "municipality_rankings", "ibge_code"),
    ("typology", "municipality_typology", "ibge_code"),
    ("residue_streams", "residue_streams_sp2023", "ibge_code"),
    ("timeseries", "municipality_timeseries", "ibge_code"),
    ("biomass_provenance", "municipality_biomass_provenance", "ibge_code"),
    ("infrastructure", "infrastructure_features", "ibge_code"),
    ("validation_plants", "validation_plants", "ibge_code"),
    ("validation_plants_registry", "validation_plants_registry", "ibge_code"),
    # Cenário Real / Ideal: CP2b N4 / N3 per residue and sector (migration 034).
    ("cp2b", "municipality_cp2b_map", "ibge_code"),
)

# Sections whose table may not be deployed yet. The CP2b view exists only once
# migration 034 is applied; until then the section is empty rather than the whole
# dossier failing with UndefinedTable.
OPTIONAL_TABLES = frozenset({"municipality_cp2b_map"})

# Tables that carry no ibge_code and have to be reached through the name.
#
# validation_plants predates the code column: it has `municipality_id`, which is
# NULL on every row, so the only link to a municipality is the name plus the
# state. Keying it on ibge_code like the others made `collect` raise
# UndefinedColumn for EVERY municipality, which means this exporter had never
# run end to end -- the unit tests cover the renderers with fixture data, not
# the gather. Matching on the name alone would be ambiguous across states, so
# the state is part of the join.
NAME_KEYED: dict[str, tuple[str, str]] = {
    "validation_plants": ("municipality_name", "state"),
}

# PostGIS blobs. Dropped from the tabular sections; see the module docstring.
GEOMETRY_COLUMNS = frozenset(
    {"geometry", "geometry_detail", "geometry_overview", "centroid", "geom", "geom_centroid"}
)


def _cursor(conn):
    """A cursor that yields plain tuples, whatever the connection was built with.

    Every read in this module indexes rows positionally. The CLI exporter opens
    its own psycopg2.connect(), which gives tuples, but the API serves these
    reports from app.core.database.get_db(), whose pool sets
    cursor_factory=RealDictCursor. Under a dict cursor `row[0]` raises KeyError
    -- and `identity` fails worse than that: dict(zip(columns, row)) iterates a
    RealDictRow's KEYS, so it would quietly return {"uf": "uf", ...} and put
    column names where the data belongs, in a report nobody would think to
    re-check. Pinning the factory here makes the module correct for any caller
    rather than only the one it was written against.
    """
    return conn.cursor(cursor_factory=psycopg2.extensions.cursor)


def _rows(cur, table: str, key_column: str, ibge_code: str) -> list[dict[str, Any]]:
    """Read one table's rows for this municipality, minus the geometry blobs.

    The table and key names come from SECTIONS, never from a caller, so the
    identifier interpolation here cannot carry user input. The value is still
    bound as a parameter.
    """
    if table in NAME_KEYED:
        name_column, uf_column = NAME_KEYED[table]
        cur.execute(
            f"""
            SELECT t.* FROM {table} t
            JOIN municipalities m
              ON t.{name_column} = m.municipality_name
             AND t.{uf_column} = m.uf
            WHERE m.ibge_code::text = %s
            """,
            (ibge_code,),
        )
    else:
        cur.execute(f"SELECT * FROM {table} WHERE {key_column}::text = %s", (ibge_code,))
    columns = [d[0] for d in cur.description]
    keep = [i for i, c in enumerate(columns) if c not in GEOMETRY_COLUMNS]
    return [{columns[i]: row[i] for i in keep} for row in cur.fetchall()]


def collect(conn, ibge_code: str) -> dict[str, list[dict[str, Any]]]:
    """Gather every row held for `ibge_code`, section by section.

    Sections with no rows are kept as empty lists rather than dropped: "we hold
    no validated plant for this municipality" is itself a finding, and a renderer
    that silently omits the sheet would hide it.
    """
    with _cursor(conn) as cur:
        return {
            name: (
                _rows(cur, table, key, ibge_code)
                if table not in OPTIONAL_TABLES or _exists(cur, table)
                else []
            )
            for name, table, key in SECTIONS
        }


def _exists(cur, table: str) -> bool:
    """True when `table` (or view) is deployed in the search path."""
    cur.execute("SELECT to_regclass(%s)", (table,))
    return cur.fetchone()[0] is not None


def identity(conn, ibge_code: str) -> dict[str, Any] | None:
    """Name, state and region hierarchy — the header of any report."""
    with _cursor(conn) as cur:
        cur.execute(
            """
            SELECT ibge_code, municipality_name, uf, area_km2, population,
                   population_year, immediate_region, intermediate_region,
                   centroid_lat, centroid_lng, potential_category, data_confidence
            FROM municipalities WHERE ibge_code::text = %s
            """,
            (ibge_code,),
        )
        row = cur.fetchone()
        if row is None:
            return None
        return dict(zip([d[0] for d in cur.description], row))


# The three fidelities the table carries, smallest first. `overview` is tuned for
# drawing 645 municipalities at once — about a dozen points each — so it reads as
# a blob when one municipality is the subject of a report. `detail` is the right
# middle: ~1.5 KB, recognisably the real shape. `full` is ~42 KB and only needed
# for analysis.
GEOMETRY_LEVELS = {
    "overview": "geometry_overview",
    "detail": "geometry_detail",
    "full": "geometry",
}


def geojson(conn, ibge_code: str, level: str = "detail") -> str | None:
    """The municipality outline as a GeoJSON string, for a report map."""
    column = GEOMETRY_LEVELS.get(level, GEOMETRY_LEVELS["detail"])
    with _cursor(conn) as cur:
        cur.execute(
            f"SELECT ST_AsGeoJSON({column}) FROM municipalities WHERE ibge_code::text = %s",
            (ibge_code,),
        )
        row = cur.fetchone()
        return row[0] if row and row[0] else None


# State borders do not move. Dissolving 645 municipalities with ST_Union costs
# real time and returns ~200 KB, so do it once per process rather than per report.
_STATE_OUTLINE_CACHE: dict[str, str | None] = {}


def state_outline(conn, uf: str) -> str | None:
    """The dissolved outline of the state, to locate the municipality within it."""
    if uf in _STATE_OUTLINE_CACHE:
        return _STATE_OUTLINE_CACHE[uf]
    with _cursor(conn) as cur:
        cur.execute(
            """
            SELECT ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_Union(geometry_overview), 0.01))
            FROM municipalities WHERE uf = %s
            """,
            (uf,),
        )
        row = cur.fetchone()
        outline = row[0] if row and row[0] else None
    _STATE_OUTLINE_CACHE[uf] = outline
    return outline
