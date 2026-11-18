#!/usr/bin/env bash
###############################################################################
# PILAR-2b — run the CI checks on your own machine.
#
# Works in Git Bash on Windows, macOS and Linux, on the host or inside the
# Docker Desktop containers. Every step runs even if an earlier one fails; the
# summary at the end lists what passed and what did not, and the exit code is
# non-zero if anything failed.
#
# Usage, from cp2b-workspace/NewLook:
#   ./scripts/verify-local.sh                 frontend + backend, on the host
#   ./scripts/verify-local.sh frontend        frontend only
#   ./scripts/verify-local.sh backend         backend only
#   ./scripts/verify-local.sh e2e             Playwright locale test (starts `next dev`)
#   ./scripts/verify-local.sh all             frontend + backend + e2e
#   ./scripts/verify-local.sh --docker        inside the running `docker compose` services
#   ./scripts/verify-local.sh --install ...   run `npm ci` / `pip install` first
#
# Docker: start the stack first (`docker compose up -d --build`). The frontend
# image installs npm packages at build time, so rebuild it after pulling a
# branch that changes package.json: `docker compose build frontend`.
###############################################################################

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/frontend"
BACKEND="$ROOT/backend"

DOCKER=0
INSTALL=0
TARGETS=()
for arg in "$@"; do
  case "$arg" in
    --docker) DOCKER=1 ;;
    --install) INSTALL=1 ;;
    frontend|backend|e2e) TARGETS+=("$arg") ;;
    all) TARGETS+=(frontend backend e2e) ;;
    -h|--help) sed -n '2,24p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg (try --help)"; exit 2 ;;
  esac
done
[ ${#TARGETS[@]} -eq 0 ] && TARGETS=(frontend backend)

if [ -t 1 ]; then GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'
else GREEN=''; RED=''; BLUE=''; NC=''; fi

PASSED=()
FAILED=()

# step "<label>" <command...> — run, record the result, never abort.
step() {
  local label="$1"; shift
  echo ""
  echo "${BLUE}▶ ${label}${NC}"
  if "$@"; then
    PASSED+=("$label"); echo "${GREEN}✓ ${label}${NC}"
  else
    FAILED+=("$label"); echo "${RED}✖ ${label}${NC}"
  fi
}

# Placeholder values for anything the checks read but do not use; the same ones
# CI passes. Real values in your environment win.
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:8000}"
export NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://placeholder.supabase.co}"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-placeholder-anon-key-for-build}"
export SECRET_KEY="${SECRET_KEY:-test-secret-key-for-local-runs-only-xx}"
export SUPABASE_URL="${SUPABASE_URL:-https://placeholder.supabase.co}"
export SUPABASE_KEY="${SUPABASE_KEY:-placeholder-key}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-placeholder-service-key}"

# ── How to run a command in each place ──────────────────────────────────────
in_frontend() {
  if [ "$DOCKER" -eq 1 ]; then
    (cd "$ROOT" && docker compose exec -T \
      -e NEXT_PUBLIC_API_URL -e NEXT_PUBLIC_SUPABASE_URL -e NEXT_PUBLIC_SUPABASE_ANON_KEY \
      frontend "$@")
  else
    (cd "$FRONTEND" && "$@")
  fi
}

python_bin() {
  for candidate in "$BACKEND/venv/Scripts/python.exe" "$BACKEND/venv/bin/python" \
                   "$BACKEND/.venv/Scripts/python.exe" "$BACKEND/.venv/bin/python"; do
    [ -x "$candidate" ] && { echo "$candidate"; return; }
  done
  command -v python3 >/dev/null 2>&1 && { echo python3; return; }
  echo python
}

in_backend() {
  if [ "$DOCKER" -eq 1 ]; then
    (cd "$ROOT" && docker compose exec -T -e SECRET_KEY -e SUPABASE_URL -e SUPABASE_KEY \
      -e SUPABASE_SERVICE_ROLE_KEY backend "$@")
  else
    local py; py="$(python_bin)"
    # `python -m tool` finds black/isort/flake8/pytest inside the venv without
    # needing it activated — which is what trips most Git Bash setups.
    (cd "$BACKEND" && "$py" -m "$@")
  fi
}

# ── Checks ──────────────────────────────────────────────────────────────────
run_frontend() {
  echo ""; echo "${BLUE}═══ Frontend ═══${NC}"
  [ "$INSTALL" -eq 1 ] && step "npm ci" in_frontend npm ci --no-audit --no-fund
  step "Typecheck (includes every t('key') against the catalog)" in_frontend npm run typecheck
  step "Lint" in_frontend npm run lint
  step "i18n: catalog parity, hardcoded Portuguese, patch notes, scanner tests" in_frontend npm run i18n:check
  step "Unit tests" in_frontend npx jest --ci --maxWorkers=2
  step "Accessibility tests" in_frontend npm run test:a11y -- --ci --passWithNoTests
  step "Production build" in_frontend npm run build
  # `next build` rewrites next-env.d.ts between its dev and build variants;
  # restore it so the check leaves no diff behind.
  if [ "$DOCKER" -eq 0 ] && command -v git >/dev/null 2>&1; then
    (cd "$FRONTEND" && git checkout -- next-env.d.ts 2>/dev/null || true)
  fi
}

run_backend() {
  echo ""; echo "${BLUE}═══ Backend ═══${NC}"
  if [ "$INSTALL" -eq 1 ]; then
    step "pip install" in_backend pip install -q -r requirements.txt flake8
  fi
  step "Black" in_backend black . --check
  step "isort" in_backend isort . --check-only
  step "Flake8" in_backend flake8 app/ --max-line-length=100 --extend-ignore=E203,W503
  step "Unit + integration tests" in_backend pytest -q --no-cov -p no:cacheprovider
}

run_e2e() {
  echo ""; echo "${BLUE}═══ E2E (locale integrity) ═══${NC}"
  if [ "$DOCKER" -eq 1 ]; then
    echo "E2E needs a browser; run it on the host: ./scripts/verify-local.sh e2e"
    return
  fi
  echo "First run only: (cd frontend && npx playwright install chromium)"
  step "No Portuguese UI on /en/ pages" in_frontend \
    npx playwright test --project=public e2e/i18n.public.spec.ts --reporter=list
}

for target in "${TARGETS[@]}"; do
  case "$target" in
    frontend) run_frontend ;;
    backend) run_backend ;;
    e2e) run_e2e ;;
  esac
done

echo ""
echo "${BLUE}═══ Summary ═══${NC}"
for label in "${PASSED[@]+"${PASSED[@]}"}"; do echo "${GREEN}  ✓ ${label}${NC}"; done
for label in "${FAILED[@]+"${FAILED[@]}"}"; do echo "${RED}  ✖ ${label}${NC}"; done
echo ""
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "${RED}${#FAILED[@]} check(s) failed.${NC}"
  exit 1
fi
echo "${GREEN}All ${#PASSED[@]} checks passed.${NC}"
