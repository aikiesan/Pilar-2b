# GeoServer 3.0 Integration — PILAR-2b

> **Status:** local/testing scaffold, **additive**. GeoServer is an optional
> standards-based map-serving layer (WMS / WFS / WMTS) on top of the existing
> PILAR-2b PostGIS database. It does **not** replace or refactor any FastAPI
> endpoint. Nothing here is wired into production yet — see the
> [Production checklist](#production-checklist).

## Why GeoServer

The platform already serves map data through FastAPI (GeoJSON, tiles). GeoServer
adds the **OGC standard services** (WMS/WFS/WMTS) on the *same* PostGIS tables,
so external clients — QGIS, ArcGIS, Google Earth Engine, the World Biogas Atlas,
DBFZ partners — can consume layers directly without us re-implementing those
protocols in FastAPI. It is purely additive: FastAPI keeps doing what it does.

## Architecture

```
                 ┌──────────────────────────────────────────────┐
 Browser  ─────▶ │ Apache (cp2b.unicamp.br)                      │
 QGIS/GEE ─────▶ │  /api/            → FastAPI  (PM2 :8001)       │  unchanged
                 │  /pilar2b/        → Next.js  (PM2 :3002)       │  unchanged
                 │  /pilar2b/geoserver/ → GeoServer (:8080)  ◀────┼── NEW (additive)
                 └───────────────┬──────────────────────────────┘
                                 │ reads (PostGIS protocol)
                          ┌──────▼───────┐
                          │  PostGIS DB  │  cp2b_maps  (shared, read-only for GS)
                          └──────────────┘
```

GeoServer connects to the **existing** `cp2b_maps` PostGIS database and publishes
its spatial tables as OGC layers. Give it a **read-only** DB role in production.

---

## 1. Data model — what gets published

From `backend/app/migrations/001_initial_schema.sql`. All geometries are
**EPSG:4326**. These are the layers the provisioning script publishes:

| Table (native name)          | Geometry column | Geometry type        | Layer purpose                         |
|------------------------------|-----------------|----------------------|---------------------------------------|
| `municipalities`             | `geometry`      | `MultiPolygon`       | Municipality boundaries + biogas potential (the main choropleth source: `total_biogas_m3_year`, sector/substrate columns) |
| `municipalities`             | `centroid`      | `Point`              | Municipality centroids (secondary geometry — see [SQL views](#publishing-a-second-geometry--sql-views)) |
| `biogas_plants`              | `location`      | `Point`              | Biogas plants (status, capacity)      |
| `gas_pipelines`              | `geometry`      | `MultiLineString`    | Gas pipelines                         |
| `power_transmission_lines`   | `geometry`      | `MultiLineString`    | Power transmission lines              |
| `power_substations`          | `location`      | `Point`              | Power substations                     |
| `wastewater_treatment_plants`| `location`      | `Point`              | Wastewater treatment plants (ETEs)    |

> **Multi-geometry caveat:** `municipalities` has two geometry columns
> (`geometry` polygon + `centroid` point). A GeoServer feature type exposes one
> default geometry; the script publishes the polygon. Publish the centroid as a
> separate layer via a SQL view (below).

Other spatial-ish tables (`analysis_results`, `user_preferences.default_map_center`)
are app-internal and intentionally **not** published.

---

## 2. Run GeoServer locally

Files: `docker-compose.geoserver.yml`, `.env.geoserver.example`.

```bash
cd cp2b-workspace/NewLook

# 1. Configure (admin password is REQUIRED; the image default is admin/geoserver)
cp .env.geoserver.example .env.geoserver
$EDITOR .env.geoserver            # set GEOSERVER_ADMIN_PASSWORD, DB creds, PROXY_BASE_URL

# 2. Start GeoServer alongside the existing dev stack (reuses the `db` service)
docker compose -f docker-compose.yml -f docker-compose.geoserver.yml up -d

# 3. Wait for it to come up (cold JVM + data-dir init is slow on first boot)
#    Web UI:  http://localhost:8080/geoserver/web   (log in with your admin creds)
```

The GeoServer **data directory** is persisted in the named volume
`cp2b_geoserver_data` (mounted at `/opt/geoserver_data`), so workspaces, stores
and styles survive restarts and rebuilds.

**Standalone** (point GeoServer at an existing/external dev DB instead of the
compose `db`): set `GEOSERVER_DB_HOST` in `.env.geoserver` (e.g.
`host.docker.internal`) and run `docker compose -f docker-compose.geoserver.yml up -d`.

### Environment variables

| Var | Purpose |
|-----|---------|
| `GEOSERVER_ADMIN_USER` / `GEOSERVER_ADMIN_PASSWORD` | Admin login. **Always override the admin/geoserver default.** |
| `GEOSERVER_INITIAL_MEMORY` / `GEOSERVER_MAXIMUM_MEMORY` | JVM heap (`INITIAL_MEMORY`/`MAXIMUM_MEMORY`). `1G`/`2G` is fine for a few layers. |
| `GEOSERVER_PROXY_BASE_URL` | **Public** GeoServer URL baked into GetCapabilities/GetMap responses. Must equal the path clients hit behind the proxy. |
| `GEOSERVER_CORS_ENABLED` | Allow the Next.js dev origin to fetch WMS/WFS during testing. |
| `GEOSERVER_SKIP_DEMO_DATA` | Drop the bundled demo workspaces. |
| `GEOSERVER_PORT` | Host port mapping (default 8080). Don't expose publicly in prod. |
| `GEOSERVER_DB_HOST/PORT/NAME/SCHEMA/USER/PASSWORD` | PostGIS target for the provisioning script. |
| `GEOSERVER_REST_URL`, `GEOSERVER_WORKSPACE`, `GEOSERVER_DATASTORE` | Where/what the provisioning script provisions. |

> Env-var **names** are those of the official `docker.osgeo.org/geoserver`
> image. Confirm them against the README for the exact `3.0.x` tag you pull, as
> the image occasionally renames knobs between releases.

---

## 3. Connect GeoServer to PostGIS (scripted, reproducible)

Prefer the script over UI clicks so the same config can be replayed in
staging/production. `scripts/geoserver/provision_geoserver.py` is **idempotent**
(safe to re-run) and uses GeoServer's REST API.

```bash
cd cp2b-workspace/NewLook
set -a; source .env.geoserver; set +a          # load config into the env
pip install requests                            # only dependency
python scripts/geoserver/provision_geoserver.py --dry-run    # preview
python scripts/geoserver/provision_geoserver.py              # apply
```

It will:
1. create the workspace (`cp2b`),
2. create the PostGIS datastore (`cp2b_postgis`) pointed at `cp2b_maps`,
3. publish the feature-type layers from the [table above](#1-data-model--what-gets-published),
4. print the WMS/WFS GetCapabilities URLs to verify.

### Equivalent raw REST calls (for reference / curl)

```bash
GS=http://localhost:8080/geoserver/rest
AUTH=admin:$GEOSERVER_ADMIN_PASSWORD

# 1. workspace
curl -u "$AUTH" -XPOST -H 'Content-Type: application/json' "$GS/workspaces" \
  -d '{"workspace":{"name":"cp2b"}}'

# 2. PostGIS datastore
curl -u "$AUTH" -XPOST -H 'Content-Type: application/json' \
  "$GS/workspaces/cp2b/datastores" -d '{
    "dataStore": {"name":"cp2b_postgis","connectionParameters":{"entry":[
      {"@key":"dbtype","$":"postgis"},
      {"@key":"host","$":"db"},{"@key":"port","$":"5432"},
      {"@key":"database","$":"cp2b_maps"},{"@key":"schema","$":"public"},
      {"@key":"user","$":"postgres"},{"@key":"passwd","$":"password"}
    ]}}}'

# 3. publish one layer
curl -u "$AUTH" -XPOST -H 'Content-Type: application/json' \
  "$GS/workspaces/cp2b/datastores/cp2b_postgis/featuretypes" \
  -d '{"featureType":{"name":"municipalities","srs":"EPSG:4326"}}'
```

### Verify

```bash
# WMS capabilities (should list the cp2b:* layers)
curl "http://localhost:8080/geoserver/cp2b/wms?service=WMS&version=1.3.0&request=GetCapabilities"
# A WMS image of the municipalities layer
curl -o out.png "http://localhost:8080/geoserver/cp2b/wms?service=WMS&version=1.3.0\
&request=GetMap&layers=cp2b:municipalities&bbox=-53.1,-25.3,-44.2,-19.8\
&width=800&height=600&srs=EPSG:4326&format=image/png&transparent=true"
```

### Publishing a second geometry / SQL views

To publish municipality **centroids** (the second geometry on `municipalities`),
or any custom/joined layer, register a SQL view as the feature type — e.g. a view
selecting `id, municipality_name, total_biogas_m3_year, centroid AS geom`. In the
REST datastore call this becomes a feature type with a `virtualTable` entry; in
the UI it's *New Layer → Configure new SQL view*. Keep view SQL parameter-free or
use GeoServer's typed view parameters to avoid injection.

---

## 4. Reverse proxy (Apache) — draft

**Draft, not applied:** `apache/pilar2b-geoserver.conf.draft`. It adds
`/pilar2b/geoserver/ → 127.0.0.1:8080/geoserver/`, consistent with how
`apache/pilar2b.conf` proxies `/api/` and `/pilar2b/`.

```apache
    # add inside the existing <VirtualHost *:80> in apache/pilar2b.conf
    ProxyPass        /pilar2b/geoserver/ http://127.0.0.1:8080/geoserver/
    ProxyPassReverse /pilar2b/geoserver/ http://127.0.0.1:8080/geoserver/
    ProxyTimeout 120
```

**Critical — `PROXY_BASE_URL`.** Behind a path-based proxy, GeoServer must emit
absolute URLs that match the public path, or GetCapabilities/GetMap links break.
Set it to the public GeoServer URL:

```
GEOSERVER_PROXY_BASE_URL=https://cp2b.unicamp.br/pilar2b/geoserver
```

> **Origin mismatch to resolve before production:** the live `apache/pilar2b.conf`
> actually serves the **subdomain** `pilar2b.cp2b.unicamp.br` (with Next.js
> `basePath=/pilar2b`), whereas this task describes the path
> `cp2b.unicamp.br/pilar2b/geoserver/`. Pick one public URL and make the Apache
> block **and** `PROXY_BASE_URL` agree on it:
> - path style → `https://cp2b.unicamp.br/pilar2b/geoserver`
> - subdomain style → `https://pilar2b.cp2b.unicamp.br/geoserver`
>
> The draft also shows how to restrict `/geoserver/web` and `/geoserver/rest`
> (admin UI + config API) to the UNICAMP network while leaving the OGC services
> public.

---

## 5. Frontend example (isolated)

The frontend uses **Leaflet + react-leaflet** (`react-leaflet@^4.2.1`). The
example consumes a GeoServer WMS layer via `<WMSTileLayer>` — no custom protocol
code needed. It is isolated and does **not** modify the production map.

- `frontend/src/components/map/examples/GeoServerWMSLayer.tsx` — wraps `WMSTileLayer`.
- `frontend/src/components/map/examples/GeoServerDemoMap.tsx` — OSM base + the WMS overlay + a layer/opacity control.
- `frontend/src/app/[locale]/geoserver-demo/page.tsx` — the demo page (`/{locale}/geoserver-demo`), client-only via `next/dynamic`.

Configure the browser-facing GeoServer base URL:

```bash
# frontend/.env.local
NEXT_PUBLIC_GEOSERVER_URL=http://localhost:8080/geoserver      # local
# NEXT_PUBLIC_GEOSERVER_URL=https://cp2b.unicamp.br/pilar2b/geoserver   # prod
```

Run `npm install && npm run dev`, open `/pt-BR/geoserver-demo`, and the
`cp2b:municipalities` WMS layer should render over OSM. (Typecheck the example
with `npx tsc --noEmit` once deps are installed — it wasn't run in the scaffold
sandbox because `node_modules` wasn't present.)

---

## 6. OGC testing (assembly · acceptance · CITE conformance)

Three real, no-mock test tiers verify the GeoServer layer, runnable locally and
on every PR via `.github/workflows/ogc-compliance.yml`:

- **Assembly** (`tests/ogc/test_assembly.py`) — stack up; WMS/WFS capabilities
  valid and advertising all cp2b layers.
- **Acceptance** (`tests/ogc/test_acceptance.py`) — WMS GetMap returns a real
  non-blank PNG; WFS GetFeature returns the expected attributes/CRS/bbox; bad
  requests fail with OGC ServiceExceptions.
- **CITE conformance** (`tests/ogc/cite/run_cite.py`) — official OGC Executable
  Test Suites (WMS 1.3.0, WFS 2.0) via TEAM Engine → EARL reports.

A slim, auto-seeded stack (`tests/ogc/docker-compose.ogc.yml`) provides PostGIS +
GeoServer (+ TEAM Engine under `--profile cite`). See `tests/ogc/README.md`.

## GeoServer 3.0 vs 2.x — things to know

- **JDK 17 required.** 3.0 runs on Jakarta EE 9+ (Tomcat 11 / Jetty 12). The
  official Docker image bundles a compatible runtime, so the container "just
  works"; only relevant if you deploy the WAR into your own servlet container.
- **H2 datastore dropped** from the default build. Don't rely on H2 for anything
  (incl. the old demo data). We use **PostGIS** exclusively → unaffected.
- **REST API paths are unchanged** (`/geoserver/rest/workspaces`, `/datastores`,
  `/featuretypes`, …) — the provisioning script works against 2.x and 3.0.
- **GeoWebCache** is integrated; WMTS/tile caching is configured per layer.
- Extensions install via `INSTALL_EXTENSIONS=true` + `STABLE_EXTENSIONS=...`
  (e.g. OIDC/`web-resource` for institutional auth) on the official image.

> These notes are written for 3.0; verify exact image env-var names against the
> README of the specific `docker.osgeo.org/geoserver:3.0.x` tag you pull.

---

## Production checklist

Before fronting any of this on `cp2b.unicamp.br`:

- [ ] **Strong admin password** set (`GEOSERVER_ADMIN_PASSWORD`); never ship the
      `admin/geoserver` default. Consider disabling the master `root` account.
- [ ] **Read-only PostGIS role** for GeoServer (it only needs `SELECT` on the
      published tables). Don't reuse the app's read-write credentials.
- [ ] **`PROXY_BASE_URL`** matches the chosen public URL exactly (path vs
      subdomain decided — see §4).
- [ ] **Apache block reviewed & applied**; port 8080 **not** exposed publicly
      (only Apache/loopback reaches it).
- [ ] **Lock down `/geoserver/web` and `/geoserver/rest`** to the UNICAMP network
      (or behind auth); leave only `wms`/`wfs`/`wmts` public.
- [ ] **CORS** restricted to the real frontend origin (not `*`).
- [ ] **GeoWebCache** tile caching configured for the heavy layers
      (`municipalities`) — big WMS perf win; set cache formats/gridsets.
- [ ] **Styles (SLD)** authored for the published layers (choropleth for biogas
      potential, point styles for plants/substations) instead of GeoServer
      defaults.
- [ ] **OIDC / institutional auth** (optional): install the OIDC extension if you
      want UNICAMP SSO for the admin UI — pairs with the platform's internal-auth
      work (`docs/compliance/INTERNAL_AUTH_LGPD.md`).
- [ ] **JVM heap** sized for the VM (`MAXIMUM_MEMORY`); monitor under WMS load.
- [ ] **Backups** of the GeoServer data directory volume (`cp2b_geoserver_data`).
- [ ] **License/attribution**: GeoServer is GPL-2.0; running it as a separate
      service alongside the GPL-3.0 platform is fine (no code linking). Keep the
      data-attribution string on served layers.

---

## What was validated in the scaffold sandbox (and what wasn't)

- ✅ Data model / geometry columns confirmed against `001_initial_schema.sql`.
- ✅ Frontend map library confirmed (Leaflet/react-leaflet) from `package.json`.
- ✅ Provisioning script syntax-checked and exercised with `--dry-run`
  (prints the exact workspace/datastore/featuretype REST calls).
- ⚠️ **Not run live:** `docker compose up` (no Docker daemon in the sandbox) and
  `tsc`/`npm run dev` (no `node_modules`). First real `docker compose up` +
  provision + `/geoserver-demo` render should be done on your machine/VM.
