# Local Docker Development Setup

Run the entire PILAR-2b stack (PostgreSQL/PostGIS + FastAPI backend + Next.js
frontend) inside Docker Desktop with a single command.  All three services
support hot-reloading — save a file in your IDE and the container updates
instantly without a rebuild.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed
  and running (WSL 2 backend recommended on Windows)
- Ports **5432**, **8000**, and **3006** free on your machine

## First-time setup

```bash
# 1. Navigate to the NewLook workspace root
cd cp2b-workspace/NewLook

# 2. Create your local env file for Docker
cp .env.docker.example .env.docker
# Edit .env.docker — the only required change is SECRET_KEY (≥ 32 chars).
# Generate one with: openssl rand -hex 32

# 3. Build images and start all services
docker compose up --build
```

The first `--build` takes 3-10 minutes (GDAL compilation + npm install).
Subsequent starts reuse cached layers and are fast.

## Database seeding (one-time, after first `docker compose up --build`)

The PostgreSQL container starts empty. There are two seeding paths:

### National dataset (5,571 municipalities) — recommended

Run the orchestrator, which applies migrations, seeds the national municipality
spine + geometry, and promotes the livestock (IBGE PPM) and urban-waste (SNIS)
data. It first checks that the required raw files are present and tells you
exactly what's missing if not.

```bash
# 1. drop the raw files at the paths in backend/data/raw/README.md, then:
./backend/scripts/load_national.sh --check     # verify inputs are present
./backend/scripts/load_national.sh             # do the load
```

Full instructions, the data manifest, and troubleshooting live in
[`docs/NATIONAL_DATA_LOAD.md`](./NATIONAL_DATA_LOAD.md).

### SP-only dataset (645 municipalities) — legacy / quick start

If you only need São Paulo (no national raw drops required):

```bash
# Run all schema migrations in order
for f in backend/app/migrations/*.sql; do
  echo "Running $f..."
  cat "$f" | docker exec -i cp2b-db-dev psql -U postgres -d cp2b_maps
done

# Seed technology cards
cat backend/data/seed_technologies_expanded.sql | \
  docker exec -i cp2b-db-dev psql -U postgres -d cp2b_maps

# Import 645 SP municipalities with biogas data
python backend/scripts/import_v2_municipalities.py
```

After seeding, the map at http://localhost:3006/pt-BR/map shows colored
municipalities with real biogas potentials.

## Infrastructure layers (one-time, Docker Desktop)

Infrastructure vectors are intentionally excluded from Git because the source
drop is hundreds of megabytes. After the database seed, load the MapBiomas
layers and the legacy SP ETE/road bundles with the optional Compose profile:

```bash
# Default: reads the archive drop stored beside this repository at
# ../../00_Fontes_Primarias-20260802T093400Z-1-001/
docker compose --profile infrastructure run --rm infrastructure-loader

# If the original ZIP files live elsewhere:
MAPBIOMAS_ARCHIVE_DIR=/absolute/path/to/shapefiles_infraestrutura_mapbiomas \
  docker compose --profile infrastructure run --rm infrastructure-loader
```

The loader reads the original ZIP files directly, downloads missing legacy SP
sidecars from the pinned `aikiesan/project_map` source, and performs idempotent
per-layer replacement in the existing PostGIS volume. It does not recreate the
database or delete Docker volumes. Re-running the command is safe.

Verify the catalog after loading:

```bash
curl http://localhost:8000/api/v1/infrastructure/layers
```

If a source ZIP is not present, the loader reports that layer explicitly. The
current local archive does not contain `SETTLEMENTS_v3`; that optional layer
remains unavailable until its authoritative source bundle is supplied.

## Daily workflow

```bash
# Start (detached — logs visible in Docker Desktop)
docker compose up -d

# Start with live logs in the terminal
docker compose up

# Rebuild only one service after a deps change (e.g. new Python package)
docker compose up --build backend

# Stop all containers (data volume is preserved)
docker compose down

# Stop and wipe the database volume (full reset)
docker compose down -v
```

## Accessing the services

| Service   | URL                                   |
|-----------|---------------------------------------|
| Frontend  | http://localhost:3006/pt-BR/map       |
| Backend   | http://localhost:8000                 |
| API docs  | http://localhost:8000/docs            |
| Database  | localhost:5432 (postgres/password/cp2b_maps) |

## Production parity — Docker dev vs. VM

The VM runs processes directly (PM2 + native PostgreSQL), not via Docker.
The environments are intentionally kept separate but the key vars are aligned:

| Setting            | Docker dev (this setup)       | VM production                          |
|--------------------|-------------------------------|----------------------------------------|
| Backend port       | 8000                          | 8001 (Apache proxies `/api/` → :8001)  |
| Frontend port      | 3006                          | 3002 (`ecosystem.config.js` PORT=3002) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000`    | `https://cp2b.unicamp.br/pilar2b`      |
| Database           | containerized PostGIS         | local PostgreSQL on the VM             |
| Static assets      | Next.js dev server            | Apache `Alias` → `.next/standalone/`  |
| Deploy path        | `docker compose up`           | `frontend/deploy.sh`                   |

**The only supported deploy path on the VM is `frontend/deploy.sh`.**
It builds, copies static assets, and restarts PM2 with the correct PORT.
Do not use `pm2 restart` directly — it reuses a stale in-memory config.

## Viewing logs in Docker Desktop

1. Open **Docker Desktop → Containers**.
2. Click the `cp2b-*-dev` row to open its log stream.
3. To see all three services in one pane, click the parent
   **`newlook`** compose group and switch to the **Logs** tab.

From the terminal:

```bash
docker compose logs -f              # tail all services
docker compose logs -f backend      # tail one service
docker compose logs --tail=100 db   # last 100 lines from db
```

## Hot-reloading explained

| Service  | Mechanism                  | What triggers a refresh       |
|----------|----------------------------|-------------------------------|
| Backend  | `uvicorn --reload`         | Any `.py` file save           |
| Frontend | Next.js Fast Refresh       | Any `.ts/.tsx/.css` save      |
| Database | n/a — persistent volume    | n/a                           |

`node_modules` inside the frontend container is isolated from the host via
an anonymous Docker volume.  If you add a new npm package:

```bash
# Option A — rebuild the frontend image (installs via npm ci)
docker compose up --build frontend

# Option B — install inside the running container
docker compose exec frontend npm install <package>
```

## Running backend tests inside Docker

```bash
docker compose exec backend pytest tests/ -v
```

## Common issues

**`GDAL not found` or import errors on backend startup**
The dev image installs GDAL at build time.  If you see this after pulling new
changes to `requirements.txt`, rebuild: `docker compose up --build backend`.

**Frontend shows stale JS after a Next.js upgrade**
Rebuild the frontend image to refresh `node_modules`:
`docker compose up --build frontend`.

**Port already in use**
Another process is using 5432, 8000, or 3006.  Find and stop it, or change
the host-side port in `docker-compose.yml`
(e.g., `"5433:5432"` for the database).

**Slow file-watching on Windows (WSL 2)**
Next.js and uvicorn use inotify for change detection.  Ensure your project
lives inside the WSL 2 filesystem (`\\wsl$\...`) rather than on a Windows
drive (`C:\...`) for best performance.  If you must work from a Windows path,
add `CHOKIDAR_USEPOLLING=1` to the frontend environment in `docker-compose.yml`.
