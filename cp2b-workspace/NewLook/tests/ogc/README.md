# OGC test suites — PILAR-2b GeoServer

Three tiers of testing for the GeoServer OGC layer, runnable locally and wired
into CI (`.github/workflows/ogc-compliance.yml`, runs on every PR to `main`).

| Tier | File(s) | What it proves | Speed | Gating |
|------|---------|----------------|-------|--------|
| **Assembly** | `test_assembly.py` | The stack comes up and serves valid WMS/WFS capabilities advertising **all** cp2b layers. | fast | blocking |
| **Acceptance** | `test_acceptance.py` | The layers actually *behave*: WMS GetMap returns a real **non-blank PNG**, WFS GetFeature returns features with the expected attributes (`municipality_name`, `total_biogas_m3_year`), correct CRS/bbox, and bad requests fail cleanly. | fast | blocking |
| **CITE conformance** | `cite/run_cite.py` | Official **OGC compliance** (WMS 1.3.0, WFS 2.0) via TEAM Engine's Executable Test Suites → EARL reports. | heavy | non-blocking (until ETS defaults confirmed live) |

All tests are **real (no mocks)** — they hit a live GeoServer. Like the backend
integration tests' `TEST_DATABASE_URL` gate, the pytest suites **skip** cleanly
when no GeoServer is reachable, so they're safe to collect anywhere.

## Run it locally

```bash
cd cp2b-workspace/NewLook

# 0. Generate throwaway credentials for the ephemeral test stack (no secrets in git)
export POSTGRES_PASSWORD=$(openssl rand -hex 12)
export GEOSERVER_DB_PASSWORD=$POSTGRES_PASSWORD     # same DB
export GEOSERVER_ADMIN_PASSWORD=$(openssl rand -base64 18)

# 1. Stand up an auto-seeded PostGIS + GeoServer (slim; no app build)
docker compose -f tests/ogc/docker-compose.ogc.yml up -d --wait

# 2. Publish the layers (idempotent) — reuses the exported credentials
set -a; GEOSERVER_REST_URL=http://localhost:8080/geoserver \
        GEOSERVER_DB_HOST=db; set +a
python scripts/geoserver/provision_geoserver.py

# 3. Assembly + acceptance
pip install -r tests/ogc/requirements.txt
cd tests/ogc && GEOSERVER_URL=http://localhost:8080/geoserver pytest -v
```

### CITE conformance (heavy)

```bash
cd cp2b-workspace/NewLook
# adds TEAM Engine to the stack
docker compose -f tests/ogc/docker-compose.ogc.yml --profile cite up -d --wait
python tests/ogc/cite/run_cite.py --list      # confirm the ETS code/version on offer
python tests/ogc/cite/run_cite.py             # run WMS13 + WFS20, fail on failures
```

> **One thing to validate live:** the ETS *version* segment and the IUT *param
> name* in the TEAM Engine REST path are version-sensitive. `run_cite.py` ships
> sensible defaults; confirm them with `--list` (and the ETS docs) on the first
> real run, then pin via the `ETS_*` env vars / `SUITES` in the script. That's
> why the CITE CI job is `continue-on-error` for now — promote it to a required
> check once it's green.

## CI

`.github/workflows/ogc-compliance.yml`:
- **`ogc-assembly-acceptance`** (blocking): compose up → provision → `pytest`.
- **`ogc-cite`** (non-blocking for now): compose up `--profile cite` → provision →
  `run_cite.py`, uploads the EARL reports as a build artifact.

## What was validated where

- ✅ pytest suites collect (29 tests) and skip-gate correctly in a plain env.
- ✅ `run_cite.py` compiles; `docker-compose.ogc.yml` and the workflow YAML parse.
- ✅ **First live run (2026-07-09, local Docker Desktop):** stack boots healthy,
  provisioning publishes all 6 layers, assembly + acceptance **29/29 pass**.
- ✅ CITE executed live. Three fixes were needed and are now in the repo:
  1. `ogccite/teamengine-production` ships **no user accounts** — REST returns
     401 until one is registered via `POST /teamengine/registrationHandler`
     (the CI workflow now has a "Register TEAM Engine user" step).
  2. This TEAM Engine build uses **versionless** run paths
     (`/rest/suites/wms13/run`); the ETS version segment defaults to empty in
     `run_cite.py` (override via `ETS_*_VERSION` if a future image needs it).
  3. `PROXY_BASE_URL` must be `http://geoserver:8080/geoserver` for CITE runs —
     the ETS follows capabilities-advertised URLs from inside the teamengine
     container (set `GEOSERVER_PROXY_BASE_URL`; the cite CI job does).
- ⚠️ CITE live tally (2026-07-09): WMS13 172 passed / 17 failed · WFS20
  274 passed / 102 failed. Remaining failures are largely conformance classes
  that require the **official CITE reference dataset** (fixtures like
  `gml:name = "Pellentesque Arcu Lorem"`) and **WFS-T transactions**, which our
  read-only layers don't serve. Full certification would need that dataset
  loaded; keep the CITE job non-blocking until then.
