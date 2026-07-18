#!/usr/bin/env bash
#
# load_national.sh — populate a fresh local DB with the national dataset.
#
# Takes an empty `docker compose up` database to the full national map:
# 5,571 municipalities with geometry, livestock (IBGE PPM) and urban-waste
# (SNIS) biomass, and the biogas potential the API derives from them.
#
# Run from the NewLook/ directory (the one with docker-compose.yml), AFTER
# `docker compose up --build` is healthy and AFTER you have dropped the raw
# data files (see backend/data/raw/README.md).
#
#   ./backend/scripts/load_national.sh --check     # preflight only, no writes
#   ./backend/scripts/load_national.sh --dry-run   # run each step in dry-run
#   ./backend/scripts/load_national.sh             # do the load
#
# Env overrides (defaults match docker-compose.yml):
#   DB_CONTAINER=cp2b-db-dev  BACKEND_CONTAINER=cp2b-backend-dev
#   PG_USER=postgres  PG_DB=cp2b_maps
#   PPM_FULL_SERIES=1   # promote 2008-2024 (unfed-aggregation years) instead of
#                       # just the fully-gated 2024. See promote_ibge_ppm.py.
#   WITH_INFRA=1        # also load MapBiomas infra layers (needs the override mount)
#
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-cp2b-db-dev}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-cp2b-backend-dev}"
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-cp2b_maps}"

MODE="run"
case "${1:-}" in
  --check)   MODE="check" ;;
  --dry-run) MODE="dry" ;;
  "")        MODE="run" ;;
  *) echo "usage: $0 [--check|--dry-run]" >&2; exit 2 ;;
esac

# Resolve NewLook/ (this script lives in NewLook/backend/scripts/).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MESH="backend/data/shapefiles/BR_Municipios_2025.shp"
PPM_DIR="backend/data/raw/ibge_ppm"
SNIS_DIR="backend/data/raw/snis"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$*"; }

# ── Preflight ────────────────────────────────────────────────────────────────
say "Preflight checks"
missing=0

for c in "$DB_CONTAINER" "$BACKEND_CONTAINER"; do
  if docker ps --format '{{.Names}}' | grep -qx "$c"; then
    ok "container running: $c"
  else
    bad "container not running: $c  (run: docker compose up -d)"
    missing=1
  fi
done

if [[ -f "$MESH" ]]; then
  ok "mesh geometry: $MESH"
else
  bad "MISSING mesh: $MESH  (IBGE Malha Municipal Digital 2025 — see backend/data/raw/README.md)"
  missing=1
fi

for f in TABELA_3939_PPM_2008A2024.xlsx TABELA_74_2008A2024.xlsx TABELA_3940_2008A2024.xlsx; do
  if [[ -f "$PPM_DIR/$f" ]]; then ok "IBGE PPM: $PPM_DIR/$f"
  else bad "MISSING IBGE PPM: $PPM_DIR/$f  (SIDRA tables 3939/74/3940)"; missing=1; fi
done

snis_count=$(find "$SNIS_DIR" -name '*_SNIS_ConsolidadoMunicipio.csv' 2>/dev/null | wc -l | tr -d ' ')
if [[ "$snis_count" -gt 0 ]]; then
  ok "SNIS: $snis_count year file(s) in $SNIS_DIR"
else
  bad "MISSING SNIS: no *_SNIS_ConsolidadoMunicipio.csv in $SNIS_DIR  (SNIS Série Histórica)"
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  echo
  bad "Preflight failed — supply the files above, then re-run. See backend/data/raw/README.md"
  exit 1
fi
ok "all required inputs present"
[[ "$MODE" == "check" ]] && { echo; ok "check-only: nothing loaded"; exit 0; }

# ── Helpers ──────────────────────────────────────────────────────────────────
psql_file() { docker exec -i "$DB_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" < "$1"; }
# Scripts run inside the backend container; ./backend is bind-mounted at /app.
pyrun() { docker exec -w /app "$BACKEND_CONTAINER" python "$@"; }

DRY=()
[[ "$MODE" == "dry" ]] && DRY=(--dry-run)

# ── 1. Schema migrations (idempotent: IF NOT EXISTS throughout) ───────────────
say "Applying schema migrations (backend/app/migrations/*.sql)"
if [[ "$MODE" == "dry" ]]; then
  ok "dry-run: skipping migrations (they are idempotent; run without --dry-run to apply)"
else
  for f in backend/app/migrations/*.sql; do
    printf '  • %s\n' "$(basename "$f")"
    psql_file "$f"
  done
  ok "migrations applied"
fi

# ── 2. Technology cards (small seed) ─────────────────────────────────────────
say "Seeding technology cards"
if [[ "$MODE" == "dry" ]]; then
  ok "dry-run: skipping seed_technologies_expanded.sql"
else
  psql_file backend/data/seed_technologies_expanded.sql
  ok "technology cards seeded"
fi

# ── 3. National municipality spine + geometry (5,571) ────────────────────────
say "Seeding national municipality spine + geometry"
pyrun scripts/seed_national_municipalities.py "${DRY[@]}"

# ── 4. Livestock — IBGE PPM → municipality_timeseries ────────────────────────
say "Promoting IBGE PPM (livestock)"
if [[ "${PPM_FULL_SERIES:-0}" == "1" ]]; then
  echo "  (full series 2008-2024 — pre-2024 years rely on --accept-unfed-aggregation)"
  pyrun scripts/promote_ibge_ppm.py --years 2008-2024 --accept-unfed-aggregation "${DRY[@]}"
else
  echo "  (latest fully-gated year only — set PPM_FULL_SERIES=1 for the whole series)"
  pyrun scripts/promote_ibge_ppm.py --year 2024 "${DRY[@]}"
fi

# ── 5. Urban waste — SNIS → municipality_timeseries ──────────────────────────
say "Promoting SNIS (urban waste + sewage + population)"
pyrun scripts/promote_snis.py --years 2008-2022 "${DRY[@]}"

# ── 6. Intermediate regions (CSV is in git) ──────────────────────────────────
say "Loading intermediate regions"
if [[ "$MODE" == "dry" ]]; then
  DRY_RUN=true pyrun scripts/load_national_intermediate_data.py
else
  pyrun scripts/load_national_intermediate_data.py
fi

# ── 7. Infrastructure layers (optional — needs the MapBiomas mount) ──────────
if [[ "${WITH_INFRA:-0}" == "1" ]]; then
  say "Loading MapBiomas infrastructure layers"
  pyrun scripts/load_infrastructure_layers.py "${DRY[@]}"
else
  say "Skipping infrastructure layers (set WITH_INFRA=1 + docker-compose.override.yml to load them)"
fi

echo
if [[ "$MODE" == "dry" ]]; then
  ok "DRY RUN complete — no data written. Re-run without --dry-run to load."
else
  ok "National load complete. Open http://localhost:3006/pt-BR/map"
fi
