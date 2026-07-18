# `data/raw/` — local raw-data drops (gitignored)

These files are **deliberately not committed** (large, and re-downloadable from
their official portals). The ingest/promote scripts read from here; `fetch()`
never downloads silently — taking a snapshot is a dated, recorded act.

Drop the files at the exact paths below, then run
`scripts/load_national.sh` (see `docs/NATIONAL_DATA_LOAD.md`).

Since `docker-compose.yml` bind-mounts `./backend` to `/app`, everything under
`backend/data/` is visible inside the backend container at `/app/data/`.

## Required for the national map

### 1. National municipality mesh (geometry) — **without this the map has no polygons**

```
backend/data/shapefiles/BR_Municipios_2025.shp   (+ .shx .dbf .prj sidecars)
```

- Source: IBGE — Malha Municipal Digital **2025** (`BR_Municipios_2025`)
  https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/
- Consumed by: `scripts/seed_national_municipalities.py`
  (override the path with `MESH_PATH` if you store it elsewhere)
- Note: the mesh ships 5,573 records; two are non-municipal lagoon polygons that
  the seeder filters by code (`ingest.ibge.NON_MUNICIPAL_MESH_CODES`) → 5,571.

### 2. IBGE PPM — livestock (herds / products / aquaculture)

```
backend/data/raw/ibge_ppm/TABELA_3939_PPM_2008A2024.xlsx    # herds
backend/data/raw/ibge_ppm/TABELA_74_2008A2024.xlsx          # animal products
backend/data/raw/ibge_ppm/TABELA_3940_2008A2024.xlsx        # aquaculture (2013+)
```

- Source: IBGE SIDRA — tables **3939** (Pesquisa da Pecuária Municipal), **74**
  (Produção de origem animal), **3940** (Produção da aquicultura), whole series.
  https://sidra.ibge.gov.br
- Consumed by: `scripts/promote_ibge_ppm.py`

### 3. SNIS — urban solid waste + sewage + population

```
backend/data/raw/snis/2008_SNIS_ConsolidadoMunicipio.csv
backend/data/raw/snis/2009_SNIS_ConsolidadoMunicipio.csv
...
backend/data/raw/snis/2022_SNIS_ConsolidadoMunicipio.csv
```

- Source: SNIS — Série Histórica, "Consolidado por Município".
  http://app4.mdr.gov.br/serieHistorica/
- Consumed by: `scripts/promote_snis.py`
- Only measured values are promoted (`quality='measured'`); blank cells are
  dropped, never written as zero (only ~24% of municipalities report tonnage).

## Optional — infrastructure point layers (biogas/ethanol plants, substations…)

MapBiomas 10.1 **INFRAESTRUTURA** vectors. These live **outside** `backend/`, so
they are mounted into the container separately — copy
`docker-compose.override.yml.example` to `docker-compose.override.yml` and point
it at your local MapBiomas folder (mounted read-only at `/mnt/mapbiomas_infra`).

- Consumed by: `scripts/load_infrastructure_layers.py`
  (override the path with `MAPBIOMAS_INFRA_DIR`)
- Not needed for the core biomass/biogas choropleth.

## Not yet national

Agricultural biomass (crops) still comes from the SP-only dataset — there is no
PAM/CONAB ingest source yet, so outside São Paulo agriculture renders honestly as
`no_data`. Livestock and urban waste are the two streams that go national here.
