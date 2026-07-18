# National data load — local Docker runbook

How to take a fresh local database from empty to the **national** map: 5,571
municipalities with geometry, livestock (IBGE PPM) and urban-waste (SNIS)
biomass, and the biogas potential the API derives from them.

> The older "645 SP municipalities" flow in `LOCAL_DOCKER_SETUP.md` is the
> single-state predecessor of this. Use this runbook for the national dataset.

## What's in git vs. what you supply

**In git (code, ready):** all migrations `backend/app/migrations/001…025`, the
ingest sources, the seed/promote scripts, the Docker stack, `feedstocks.yaml`,
and the national-aware frontend.

**Not in git (you drop locally):** the raw data. It is deliberately gitignored
(large, re-downloadable). Exact files, paths and sources are in
[`backend/data/raw/README.md`](../backend/data/raw/README.md). In short:

| Stream | File(s) → path | Source |
|---|---|---|
| Geometry | `backend/data/shapefiles/BR_Municipios_2025.shp` (+ sidecars) | IBGE Malha Municipal Digital 2025 |
| Livestock | `backend/data/raw/ibge_ppm/TABELA_{3939,74,3940}_…xlsx` | IBGE SIDRA (3939 / 74 / 3940) |
| Urban waste | `backend/data/raw/snis/<year>_SNIS_ConsolidadoMunicipio.csv` | SNIS Série Histórica |
| Infra (optional) | mounted at `/mnt/mapbiomas_infra` | MapBiomas 10.1 INFRAESTRUTURA |

> **Agriculture is still SP-only** — there is no PAM/CONAB ingest source yet, so
> outside São Paulo crop biomass renders honestly as `no_data`. Livestock and
> urban waste are what go national here.

## Steps

From the `NewLook/` directory (the one with `docker-compose.yml`):

```bash
# 0. one-time config
cp .env.docker.example .env.docker          # fill in values
# optional (infra layers only): point Docker at your MapBiomas folder
cp docker-compose.override.yml.example docker-compose.override.yml   # edit the path

# 1. bring the stack up (starts an EMPTY database)
docker compose up --build -d

# 2. drop the raw files at the paths in backend/data/raw/README.md, then:
./backend/scripts/load_national.sh --check     # verifies every input is present
./backend/scripts/load_national.sh             # migrations + seed + promotes
```

Then open **http://localhost:3006/pt-BR/map** — the choropleth should show
livestock + urban-waste biomass and biogas potential nationwide, with `no_data`
municipalities rendered in distinct grey (never the bottom of the ramp).

### Script options

```bash
./backend/scripts/load_national.sh --check     # preflight only, no writes
./backend/scripts/load_national.sh --dry-run   # run each step in dry-run mode
PPM_FULL_SERIES=1 ./backend/scripts/load_national.sh   # PPM 2008-2024 (see note)
WITH_INFRA=1      ./backend/scripts/load_national.sh   # also load infra layers
```

- **PPM years:** by default only the fully-gated latest year (2024) is promoted —
  IBGE's published national totals validate the parser to 0.01%. `PPM_FULL_SERIES=1`
  loads 2008-2024 with `--accept-unfed-aggregation`; the pre-2024 years have no
  recorded published figure, so their aggregation gate reports "cannot test",
  not "wrong" (see `promote_ibge_ppm.py`).
- **Idempotent:** every step is safe to re-run. Migrations use `IF NOT EXISTS`;
  the promotes upsert on their unique keys; the seed uses `ON CONFLICT DO NOTHING`
  and never touches the validated SP rows.

## What each step does

| Step | Script / action | Produces |
|---|---|---|
| Migrations | `backend/app/migrations/*.sql` | schema incl. spine (021), geometry LOD (022), infra (023), timeseries (024), provenance (025) |
| Spine | `seed_national_municipalities.py` | 5,571 municipalities + geometry from the 2025 mesh |
| Livestock | `promote_ibge_ppm.py` | herd/product/aquaculture rows in `municipality_timeseries` |
| Urban waste | `promote_snis.py` | measured waste/sewage/population rows (blanks dropped, not zeroed) |
| Intermediate regions | `load_national_intermediate_data.py` | 133 IBGE intermediate-region rows |
| Infra (optional) | `load_infrastructure_layers.py` | plant/substation/pipeline points via spatial join |

Biogas potential is **not** a load step — the API (`app/services/map_metrics.py`)
derives it from the promoted tonnage at read time.

## Troubleshooting

- **Map polygons missing / all grey:** the mesh didn't load. Re-run
  `--check`; confirm `BR_Municipios_2025.shp` and its `.shx/.dbf/.prj` sidecars
  are all present.
- **`container not running`:** `docker compose up -d`, wait for the db
  healthcheck, retry.
- **PPM full-series fails on a gate:** that's the aggregation gate on a year with
  no published figure — either add that year's figures to `PUBLISHED_NATIONAL`
  in `promote_ibge_ppm.py`, or stick with the default latest-year load.
- **Full reset:** `docker compose down -v` wipes the volume; re-run the load.
