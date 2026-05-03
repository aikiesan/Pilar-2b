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
# 1. Navigate to the project root
cd A:\Pilar-2b\cp2b-workspace\NewLook

# 2. Create your local env file for Docker
cp .env.docker.example .env.docker
# Edit .env.docker if you need Supabase or Sentry keys; defaults work for
# a fully local setup.

# 3. Build images and start all services
docker compose up --build
```

The first `--build` takes 3-10 minutes (GDAL compilation + npm install).
Subsequent starts reuse cached layers and are fast.

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

| Service   | URL                              |
|-----------|----------------------------------|
| Frontend  | http://localhost:3006/pilar2b    |
| Backend   | http://localhost:8000            |
| API docs  | http://localhost:8000/docs       |
| Database  | localhost:5432 (postgres/password/cp2b_maps) |

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

| Service  | Mechanism | What triggers a refresh |
|----------|-----------|------------------------|
| Backend  | `uvicorn --reload` watches `/app` | Any `.py` file save |
| Frontend | Next.js Fast Refresh | Any `.ts/.tsx/.css` save |
| Database | n/a — persistent volume | n/a |

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
