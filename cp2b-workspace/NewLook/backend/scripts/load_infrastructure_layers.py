"""
Load the MapBiomas 10.1 INFRAESTRUTURA layers into `infrastructure_features`.

Run AFTER app/migrations/023_infrastructure_features.sql and after the national
municipality spine exists (021 + seed_national_municipalities.py) — point
features resolve their ibge_code by spatial join against municipalities.geometry.

    docker cp backend/scripts/load_infrastructure_layers.py cp2b-backend-dev:/tmp/
    docker exec cp2b-backend-dev python /tmp/load_infrastructure_layers.py --dry-run
    docker exec cp2b-backend-dev python /tmp/load_infrastructure_layers.py

Idempotent per layer: each layer is deleted and re-inserted inside one
transaction, so a re-run converges instead of duplicating.

WHY THE ibge_code IS RESOLVED SPATIALLY
---------------------------------------
The sources disagree on keying:
  * frigorificos      ships `cd_geocmu`  (IBGE code)  -> use it
  * SE_EXISTENTE      ships `CD_MUN`     (IBGE code)  -> use it
  * usina_biogas      ships Estado + Municipio, NO code
Matching those names against the municipality table is exactly the trap this
project keeps hitting (renames, orthographic variants, phantom lagoon rows).
Since all 5,571 polygons are now in PostGIS, a point-in-polygon join is both
exact and cheaper than any name normalisation. Codes shipped by the source are
still preferred when present — they are authoritative and free.

Lines (transmission, pipelines) legitimately cross municipalities, so their
ibge_code stays NULL by design rather than being pinned to an arbitrary one.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import geopandas as gpd
import psycopg2
from psycopg2.extras import execute_batch

# Host path is mounted read-only into the backend container by
# docker-compose.override.yml; override with MAPBIOMAS_INFRA_DIR if it moves.
INFRA_DIR = Path(os.environ.get("MAPBIOMAS_INFRA_DIR", "/mnt/mapbiomas_infra"))
# Root of SHAPEFILES_MAPBIOMAS_10.1, for the layers that live OUTSIDE
# INFRAESTRUTURA/ (protected areas, settlements, indigenous territories).
MAPBIOMAS_DIR = Path(os.environ.get("MAPBIOMAS_DIR", "/mnt/mapbiomas"))


def resolve_folder(rel: str) -> Path | None:
    """Locate a layer folder across the two mount conventions.

    The original runbook mounts INFRAESTRUTURA/ itself at /mnt/mapbiomas_infra,
    so paths there are bare folder names. The territorial layers are siblings of
    INFRAESTRUTURA, reachable only from the root. Both are tried rather than
    forcing every existing runbook to change.
    """
    for cand in (MAPBIOMAS_DIR / rel, INFRA_DIR / Path(rel).name, INFRA_DIR / rel):
        if cand.is_dir():
            return cand
    return None


# layer_id -> source folder. The .shp inside is globbed, never hardcoded: one of
# them is `Usinas_Termelétricas_UTE_Biomassa.shp` whose "é" is a decomposed
# combining accent, so a literal filename would not match.
#
# Paths are relative to the MapBiomas root. The first nine live under
# INFRAESTRUTURA/; the territorial layers added later sit beside it, which is why
# the path is stored whole rather than assumed.
LAYERS: dict[str, str] = {
    # ── energia e transporte de gás ────────────────────────────────────────
    "biogas_plant": "INFRAESTRUTURA/structure_biogas_plant",
    "biodiesel_plant": "INFRAESTRUTURA/structure_biodiesel_plant",
    "ethanol_plant": "INFRAESTRUTURA/structure_ethanol_plant",
    "slaughterhouse": "INFRAESTRUTURA/structure_slaughterhouse",
    "biomass_thermal_plant": "INFRAESTRUTURA/structure_biomass_thermal_power_plant",
    "substation": "INFRAESTRUTURA/structure_substation",
    "transmission_line": "INFRAESTRUTURA/structure_transmission_line",
    "gas_pipeline_transport": "INFRAESTRUTURA/structure_transportation_gas_pipeline",
    "gas_pipeline_distribution": "INFRAESTRUTURA/structure_distribution_gas_pipeline",
    # ── rota de escoamento do biometano ───────────────────────────────────
    # Sem estas, o mapa mostra onde o resíduo está e por onde o gasoduto passa,
    # mas não onde é possível INJETAR — que é a pergunta de quem vai investir.
    "gas_delivery_point": "INFRAESTRUTURA/structure_gas_delivery_point",
    "compression_station": "INFRAESTRUTURA/structure_compression_station",
    "gas_processing_unit": "INFRAESTRUTURA/structure_natural_gas_processing_unit",
    "gas_pipeline_outflow": "INFRAESTRUTURA/structure_outflow_gas_pipeline",
    # ── restrição de sítio: "mobilizável" não é o mesmo que "licenciável" ──
    "protected_area_state": "STATE_PROTECTED_AREAS_INTEGRAL_PROTECTION_v2",
    "indigenous_territory": "INDIGENOUS_TERRITORIES_v3",
    "settlement": "SETTLEMENTS_v3",
    # ── logística ─────────────────────────────────────────────────────────
    "highway_state": "INFRAESTRUTURA/structure_state_highway",
    "highway_federal": "INFRAESTRUTURA/structure_federal_highway",
}

# Filtro de linhas por camada, aplicado antes da carga.
#
# As rodovias vêm com leito natural, implantadas e em obras junto do pavimentado.
# Para escoamento de resíduo só o pavimentado em operação interessa, e o filtro
# corta 47.165 feições nacionais para o que de fato serve — é a diferença entre
# uma camada utilizável e uma que ninguém liga duas vezes.
ROW_FILTERS: dict[str, tuple[str, str]] = {
    "highway_state": ("revestimen", "pavimentad"),
    "highway_federal": ("revestimen", "pavimentad"),
}

# Tolerância de simplificação (graus) gravada junto da camada, para o endpoint
# saber o padrão sem que o cliente precise conhecer cada camada. 0.001 ~ 111 m.
# Medido: rodovias estaduais de SP caem de 4.727 KB para 1.620 KB (366 KB gzip)
# nessa tolerância, sem diferença visível em escala estadual.
DEFAULT_SIMPLIFY: dict[str, float] = {
    "highway_state": 0.001,
    "highway_federal": 0.001,
    "protected_area_state": 0.001,
    "indigenous_territory": 0.001,
    "settlement": 0.001,
    "gas_pipeline_outflow": 0.0005,
}

# Candidate source columns, best first. Schemas differ per layer.
CODE_FIELDS = ("CD_MUN", "cd_geocmu", "CD_GEOCMU", "cod_mun", "CD_GEOCODI")
NAME_FIELDS = ("nome_fanta", "razao_soci", "Nome", "NOME", "name", "Municipio")
UF_FIELDS = ("uf", "UF", "Estado", "SIGLA_UF")


def dsn() -> str:
    url = os.environ.get("DATABASE_URL")
    if url:
        return url
    return "postgresql://{u}:{p}@{h}:{port}/{db}".format(
        u=os.environ.get("POSTGRES_USER", "postgres"),
        p=os.environ.get("POSTGRES_PASSWORD", "password"),
        h=os.environ.get("POSTGRES_HOST", "db"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        db=os.environ.get("POSTGRES_DB", "cp2b_maps"),
    )


def _first(row, fields):
    for f in fields:
        if f in row.index:
            v = row[f]
            if v is not None and str(v).strip() not in ("", "nan", "None"):
                return str(v).strip()
    return None


def _clean_code(v):
    """Source codes arrive as '3509502', '3509502.0' or float. Normalise to 7 digits."""
    if v is None:
        return None
    s = str(v).strip().split(".")[0]
    return s.zfill(7) if s.isdigit() and len(s) <= 7 else None


def _clean_uf(raw) -> str | None:
    """A UF or nothing — never the first two letters of something else.

    This used to be `str(raw)[:2].upper()`, which is right for a column holding
    'SP' and silently wrong for one holding a state NAME: the protected-area
    layer came in as 'SÃ' (São Paulo), 'MI' (Minas Gerais), 'RI' (Rio de
    Janeiro). Those are not UFs, they match no filter, and they look like data.
    Two ASCII letters or NULL.
    """
    if raw is None:
        return None
    s = str(raw).strip().upper()
    return s if len(s) == 2 and s.isascii() and s.isalpha() else None


def load_layer(layer_id: str, folder: str):
    d = resolve_folder(folder)
    if d is None:
        print(f"  !! folder not found for {folder} — skipping")
        return None, []
    # rglob, not glob: some MapBiomas zips extract into a nested directory, and
    # __MACOSX resource forks look like shapefiles to a naive glob.
    shps = sorted(p for p in d.rglob("*.shp") if "__MACOSX" not in str(p))
    if not shps:
        print(f"  !! no .shp in {d} — skipping")
        return None, []
    shp = shps[0]
    gdf = gpd.read_file(shp, engine="pyogrio")
    if gdf.crs is not None:
        gdf = gdf.to_crs(epsg=4326)

    col_filter = ROW_FILTERS.get(layer_id)
    if col_filter:
        col, needle = col_filter
        if col in gdf.columns:
            before = len(gdf)
            gdf = gdf[gdf[col].astype(str).str.lower().str.contains(needle, na=False)]
            print(f"  filtro {col}~'{needle}': {before} -> {len(gdf)}")
        else:
            print(f"  !! coluna de filtro '{col}' ausente — carregando sem filtro")

    rows = []
    for _, r in gdf.iterrows():
        geom = r.get("geometry")
        if geom is None or geom.is_empty:
            continue
        attrs = {
            k: (None if v is None or str(v) == "nan" else str(v))
            for k, v in r.drop(labels=["geometry"]).items()
        }
        rows.append(
            {
                "layer_id": layer_id,
                "name": _first(r, NAME_FIELDS),
                "wkb": geom.wkb,
                "ibge_code": _clean_code(_first(r, CODE_FIELDS)),
                "uf": _clean_uf(_first(r, UF_FIELDS)),
                "attributes": json.dumps(attrs, ensure_ascii=False),
                "source_id": folder,
                "source_file": shp.name,
            }
        )
    return shp.name, rows


# ST_Force2D: the gas pipeline layers are PolyLineZ (3D), and the column is 2D.
# The Z values carry no information we use, and mixing dimensionality in one
# table would make every downstream query defensive. Flatten once, here.
INSERT_SQL = """
INSERT INTO infrastructure_features
    (layer_id, name, geometry, ibge_code, uf, attributes, source_id, source_file)
VALUES
    (%(layer_id)s, %(name)s,
     ST_Force2D(ST_GeomFromWKB(%(wkb)s::bytea, 4326)),
     %(ibge_code)s, %(uf)s, %(attributes)s::jsonb, %(source_id)s, %(source_file)s)
"""

# Resolve ibge_code/uf for POINT features the source did not key. ST_Contains
# against the municipal spine — exact, and it sidesteps name matching entirely.
RESOLVE_SQL = """
UPDATE infrastructure_features f
SET ibge_code = m.ibge_code,
    uf        = COALESCE(f.uf, m.uf)
FROM municipalities m
WHERE f.layer_id = %s
  AND f.ibge_code IS NULL
  AND ST_GeometryType(f.geometry) IN ('ST_Point', 'ST_MultiPoint')
  AND ST_Contains(m.geometry, f.geometry)
"""

# Second pass — points that land inside NO municipal polygon but sit right on the
# edge of one. These are real: the Itaipu dam substation sits on the Paraná river
# (the international border) 1.3 km from Foz do Iguaçu, and a thermal plant sits
# on the Guaíba water 0.85 km from Guaíba/RS — water bodies are deliberately not
# municipalities (see ingest.ibge.NON_MUNICIPAL_MESH_CODES).
#
# The tolerance is intentionally tight. A point 22.78 km from the municipality its
# own attributes name is not a border case — it is a bad coordinate in the source,
# and it must stay NULL so it surfaces rather than being silently snapped to a
# plausible-looking neighbour. This is precisely the failure a name join cannot
# see: it would have matched that plant on its `Municipio` string and looked fine.
SNAP_TOLERANCE_M = 2000

# The LATERAL lives inside a derived table rather than directly in the UPDATE's
# FROM: Postgres forbids a LATERAL there from referencing the UPDATE target
# ("invalid reference to FROM-clause entry for table f"). Inside the subquery,
# f2 is an ordinary FROM entry, so the correlation is legal.
SNAP_SQL = """
UPDATE infrastructure_features f
SET ibge_code = s.ibge_code,
    uf        = COALESCE(f.uf, s.uf)
FROM (
    SELECT f2.id, m.ibge_code, m.uf
    FROM infrastructure_features f2
    CROSS JOIN LATERAL (
        SELECT mm.ibge_code, mm.uf
        FROM municipalities mm
        WHERE ST_DWithin(f2.geometry::geography, mm.geometry::geography, %s)
        ORDER BY mm.geometry <-> f2.geometry
        LIMIT 1
    ) m
    WHERE f2.layer_id = %s
      AND f2.ibge_code IS NULL
      AND ST_GeometryType(f2.geometry) IN ('ST_Point', 'ST_MultiPoint')
) s
WHERE f.id = s.id
"""

# Anything still unresolved after both passes is reported, never silently dropped.
SUSPECT_SQL = """
SELECT f.name, m.municipality_name || '/' || m.uf AS nearest,
       round((ST_Distance(f.geometry::geography, m.geometry::geography)/1000)::numeric, 2) AS km,
       f.attributes->>'Municipio' AS claims_municipio
FROM infrastructure_features f
CROSS JOIN LATERAL (
    SELECT municipality_name, uf, geometry FROM municipalities
    ORDER BY municipalities.geometry <-> f.geometry LIMIT 1
) m
WHERE f.layer_id = %s AND f.ibge_code IS NULL
  AND ST_GeometryType(f.geometry) IN ('ST_Point', 'ST_MultiPoint')
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--layer", help="load a single layer_id")
    args = ap.parse_args()

    targets = {args.layer: LAYERS[args.layer]} if args.layer else LAYERS
    conn = psycopg2.connect(dsn())
    try:
        for layer_id, folder in targets.items():
            fname, rows = load_layer(layer_id, folder)
            if fname is None:
                continue
            keyed = sum(1 for r in rows if r["ibge_code"])
            print(f"{layer_id:26s} {len(rows):5d} features  ({keyed} pre-keyed)  [{fname}]")
            if args.dry_run or not rows:
                continue
            with conn.cursor() as cur:
                cur.execute("DELETE FROM infrastructure_features WHERE layer_id = %s", (layer_id,))
                execute_batch(cur, INSERT_SQL, rows, page_size=200)
                cur.execute(RESOLVE_SQL, (layer_id,))
                resolved = cur.rowcount
                cur.execute(SNAP_SQL, (SNAP_TOLERANCE_M, layer_id))
                snapped = cur.rowcount
                cur.execute(SUSPECT_SQL, (layer_id,))
                suspects = cur.fetchall()
                cur.execute(
                    "SELECT count(*), count(ibge_code) FROM infrastructure_features "
                    "WHERE layer_id = %s",
                    (layer_id,),
                )
                total, with_muni = cur.fetchone()
            conn.commit()
            print(
                f"{'':26s}   -> stored {total}, municipality-keyed {with_muni} "
                f"(contains={resolved}, snapped<={SNAP_TOLERANCE_M}m={snapped})"
            )
            for name, nearest, km, claims in suspects:
                print(
                    f"{'':26s}   !! UNRESOLVED {name!r}: {km} km from {nearest}"
                    f"{f', source claims {claims!r}' if claims else ''}"
                    " — suspect source coordinate"
                )
        if args.dry_run:
            print("\n[dry-run] nothing written")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
