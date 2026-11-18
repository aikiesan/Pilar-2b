#!/usr/bin/env bash
# PILAR-2b — frontend deploy on the production VM (Apache + PM2).
#
#   cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/frontend
#   ./deploy.sh                 # pull main, build, test, swap in, restart, verify
#   ./deploy.sh --no-pull       # deploy the checkout as it stands
#   ./deploy.sh --rollback      # put the previous build back (run again to undo)
#   ./deploy.sh --recreate-pm2  # also (re)create the pilar-frontend PM2 process
#
# Why the build runs somewhere else: `next build` deletes .next/ as its first
# step, and .next/standalone is what PM2 runs and what Apache serves at
# /pilar2b/_next. Building in place takes every stylesheet and script away from
# the live site for the whole build, and leaves it that way if the build fails.
# Here the build runs in ../.deploy/build, the result is started and checked on
# a spare port, and only then does it replace .next, with one rename. The
# build it replaced stays in ../.deploy/previous for --rollback, and a check that
# fails after the swap puts it back on its own.
#
# The backend (pip, migrations, data loads) is not touched; the pull lists what
# changed there, and docs/VM_UPDATE_GUIDE.md has those steps.
#
# Settings (environment variables, all optional):
#   DEPLOY_BRANCH     branch to pull                       main
#   API_INTERNAL_URL  where the Next server reads the API   http://127.0.0.1:8001
#   SMOKE_PORT        spare port for the pre-swap check     3012
#   APACHE_URL        Apache on this machine                http://127.0.0.1
#   APACHE_HOST       virtual host that proxies /pilar2b    cp2b.unicamp.br

set -Eeuo pipefail

FRONTEND="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NEWLOOK="$(dirname "$FRONTEND")"
DEPLOY_DIR="$NEWLOOK/.deploy"
STAGE="$DEPLOY_DIR/build"
PREVIOUS="$DEPLOY_DIR/previous"

BRANCH="${DEPLOY_BRANCH:-main}"
APP=pilar-frontend
LIVE_PORT=3002
SMOKE_PORT="${SMOKE_PORT:-3012}"
API_INTERNAL_URL="${API_INTERNAL_URL:-http://127.0.0.1:8001}"
APACHE_URL="${APACHE_URL:-http://127.0.0.1}"
APACHE_HOST="${APACHE_HOST:-cp2b.unicamp.br}"
BASE_PATH=/pilar2b
# next 16 refuses older Node (package.json "engines" of next).
MIN_NODE=20.9.0
# A build needs ~1 GB; a first npm ci in the build directory another ~1 GB.
MIN_FREE_MB=2048

PULL=1
ROLLBACK=0
RECREATE_PM2=0
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    --rollback) ROLLBACK=1 ;;
    --recreate-pm2) RECREATE_PM2=1 ;;
    -h | --help) sed -n '2,27p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown option: $arg (see --help)" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
ok() { printf '    ok    %s\n' "$*"; }
warn() { printf '    \033[33mWARN\033[0m  %s\n' "$*"; }
die() { printf '\n\033[31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

# The environment the frontend process runs with. Exported so that
# `pm2 restart --update-env` stores exactly these values. HOSTNAME is what
# server.js binds to, and it must not be 127.0.0.1: Next 16 then treats the
# locale rewrites of src/proxy.ts as external, proxies them to localhost:PORT and
# every page answers 500 (verified on 16.4.0; 0.0.0.0, localhost or unset work).
# Set explicitly so an exported shell HOSTNAME (the machine's name) never leaks in.
export NODE_ENV=production PORT=$LIVE_PORT HOSTNAME=0.0.0.0 API_INTERNAL_URL
export NEXT_TELEMETRY_DISABLED=1

http_code() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$@" || true; }

wait_for() { # url seconds
  local i
  for ((i = 0; i < $2; i++)); do
    [[ "$(http_code "$1")" == 200 ]] && return 0
    sleep 1
  done
  return 1
}

# Checks one bundle: pages answer 200 from the Node server at $1, and every
# /_next/static file the landing page asks for, and every font those
# stylesheets load, exists under $2/.next/static, which is where Apache reads
# them from (Alias /pilar2b/_next → .next/standalone/.next).
check_bundle() {
  local origin="$1" standalone="$2" failed=0 page code html assets asset css ref resolved
  for page in /pt-BR /en /pt-BR/map /pt-BR/data /pt-BR/municipalities /pt-BR/guide /pt-BR/cite; do
    code="$(http_code "$origin$BASE_PATH$page")"
    if [[ "$code" == 200 ]]; then ok "$code $BASE_PATH$page"; else warn "$code $BASE_PATH$page"; failed=1; fi
  done

  # The readable municipality pages resolve their slug through the API from the
  # Node server. Only meaningful when the API itself answers.
  if [[ "$(http_code "$API_INTERNAL_URL/api/v1/municipalities/names?limit=6000")" == 200 ]]; then
    code="$(http_code "$origin$BASE_PATH/pt-BR/municipalities/campinas-sp")"
    if [[ "$code" == 200 ]]; then ok "$code $BASE_PATH/pt-BR/municipalities/campinas-sp"
    else warn "$code $BASE_PATH/pt-BR/municipalities/campinas-sp (API answers, page does not)"; failed=1; fi
  else
    warn "API at $API_INTERNAL_URL does not answer /municipalities/names?limit=6000:"
    warn "municipality pages (/municipalities/<name>-sp) will fail until the backend is updated"
  fi

  html="$(curl -s --max-time 20 "$origin$BASE_PATH/pt-BR" || true)"
  assets="$(grep -oE "$BASE_PATH/_next/static/[^\"'<> )\\\\]+" <<<"$html" | sort -u || true)"
  if [[ -z "$assets" ]]; then
    warn "the landing page references no $BASE_PATH/_next/static files"; return 1
  fi
  local n=0
  while read -r asset; do
    [[ -f "$standalone/.next/static/${asset#"$BASE_PATH"/_next/static/}" ]] || { warn "missing on disk: $asset"; failed=1; }
    n=$((n + 1))
  done <<<"$assets"
  ok "$n files from the landing page are on disk where Apache serves them"

  n=0
  while read -r css; do
    [[ "$css" == *.css ]] || continue
    css="$standalone/.next/static/${css#"$BASE_PATH"/_next/static/}"
    [[ -f "$css" ]] || continue
    while read -r ref; do
      [[ -n "$ref" ]] || continue
      resolved="$(realpath -m "$(dirname "$css")/$ref")"
      [[ -f "$resolved" ]] || { warn "missing font/image: $ref (from ${css##*/})"; failed=1; }
      n=$((n + 1))
    done < <(grep -oE 'url\([^)]+\)' "$css" | sed -E 's/^url\(["'\'']?//; s/["'\'']?\)$//' \
      | grep -vE '^(data:|https?:|#|/)' | sed 's/[?#].*//' | sort -u)
  done <<<"$assets"
  ok "$n fonts/images referenced by the stylesheets are on disk"

  return $failed
}

# Through Apache, as a visitor gets it: the page, one stylesheet and one font.
check_apache() {
  local html css font code
  code="$(http_code -H "Host: $APACHE_HOST" "$APACHE_URL$BASE_PATH/pt-BR")"
  if [[ "$code" == 000 ]]; then
    warn "Apache not reachable at $APACHE_URL; skipped"; return 0
  fi
  [[ "$code" == 200 ]] || { warn "Apache: $code for $BASE_PATH/pt-BR"; return 1; }
  ok "Apache: 200 $BASE_PATH/pt-BR"
  html="$(curl -s --max-time 20 -H "Host: $APACHE_HOST" "$APACHE_URL$BASE_PATH/pt-BR")"
  css="$(grep -oE "$BASE_PATH/_next/static/[^\"'<> ]+\.css" <<<"$html" | head -1 || true)"
  [[ -n "$css" ]] || { warn "Apache: the page lists no stylesheet"; return 1; }
  code="$(http_code -H "Host: $APACHE_HOST" "$APACHE_URL$css")"
  [[ "$code" == 200 ]] || { warn "Apache: $code for $css"; return 1; }
  ok "Apache: 200 $css"
  font=""
  for font in "$FRONTEND"/.next/standalone/.next/static/media/*.woff2; do break; done
  font="${font##*/}"
  if [[ -n "$font" && "$font" != '*.woff2' ]]; then
    code="$(http_code -H "Host: $APACHE_HOST" "$APACHE_URL$BASE_PATH/_next/static/media/$font")"
    [[ "$code" == 200 ]] || { warn "Apache: $code for /_next/static/media/$font"; return 1; }
    ok "Apache: 200 $BASE_PATH/_next/static/media/$font"
  fi
}

pm2_script() { # the script path PM2 runs for $APP, empty when there is no such process
  pm2 jlist 2>/dev/null | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try {
        // pm2 can print a warning ("In-memory PM2 is out-of-date") before the JSON.
        const app = JSON.parse(s.slice(s.indexOf("["))).find((p) => p.name === process.argv[1]);
        process.stdout.write(app ? app.pm2_env.pm_exec_path || "" : "");
      } catch { /* not JSON */ }
    });' "$APP"
}

restart_frontend() {
  if [[ $RECREATE_PM2 == 1 ]]; then
    # The definition in ecosystem.config.js: server.js, port, HOSTNAME, API_INTERNAL_URL.
    pm2 delete "$APP" >/dev/null 2>&1 || true
    pm2 start "$NEWLOOK/ecosystem.config.js" --only "$APP" >/dev/null
  else
    pm2 restart "$APP" --update-env >/dev/null
  fi
}

swap_previous_in() { # exchanges .next and the previous build
  local tmp="$DEPLOY_DIR/swap.$$"
  mv "$FRONTEND/.next" "$tmp"
  mv "$PREVIOUS" "$FRONTEND/.next"
  mv "$tmp" "$PREVIOUS"
}

live_commit() { cat "$FRONTEND/.next/DEPLOYED_COMMIT" 2>/dev/null || echo "unknown (deployed before deploy.sh recorded it)"; }

# Everything runs from main(), called on the last line: bash reads a script as
# it goes, and the pull below can rewrite this very file. A function is read
# whole before it runs.
main() {
# ── preflight ────────────────────────────────────────────────────────────────
mkdir -p "$DEPLOY_DIR"
exec 9>"$DEPLOY_DIR/lock"
if command -v flock >/dev/null; then
  flock -n 9 || die "another deploy.sh is running (lock: $DEPLOY_DIR/lock)"
fi

for cmd in node npm pm2 curl git tar realpath; do
  command -v "$cmd" >/dev/null || die "'$cmd' not found on PATH"
done

if [[ $ROLLBACK == 1 ]]; then
  step "Rollback"
  [[ -d "$PREVIOUS/standalone" ]] || die "no previous build in $PREVIOUS"
  [[ -d "$FRONTEND/.next" ]] || die "no live build in $FRONTEND/.next"
  echo "    live now:  $(live_commit)"
  swap_previous_in
  echo "    restoring: $(live_commit)"
  restart_frontend
  wait_for "http://127.0.0.1:$LIVE_PORT$BASE_PATH/pt-BR" 60 || die "the restored build does not answer on :$LIVE_PORT (pm2 logs $APP)"
  check_apache || warn "Apache check failed after rollback"
  pm2 save >/dev/null
  echo; echo "Rolled back. Run ./deploy.sh --rollback again to undo."
  exit 0
fi

step "Preflight"
node_version="$(node -p 'process.versions.node')"
if [[ "$(printf '%s\n%s\n' "$MIN_NODE" "$node_version" | sort -V | head -1)" != "$MIN_NODE" ]]; then
  die "Node $node_version is too old: Next.js 16 needs >= $MIN_NODE. Install Node 22 LTS (the CI version) first."
fi
ok "node $node_version"

free_mb="$(df -Pm "$DEPLOY_DIR" | awk 'NR == 2 { print $4 }')"
[[ "$free_mb" -ge $MIN_FREE_MB ]] || die "only ${free_mb} MB free on $(df -P "$DEPLOY_DIR" | awk 'NR == 2 { print $6 }'); the build needs ${MIN_FREE_MB} MB"
ok "${free_mb} MB free"

script="$(pm2_script)"
if [[ $RECREATE_PM2 == 0 ]]; then
  [[ -n "$script" ]] || die "PM2 has no '$APP' process. Run with --recreate-pm2 to create it."
  [[ "$(realpath -m "$script")" == "$(realpath -m "$FRONTEND/.next/standalone/server.js")" ]] || die "PM2 '$APP' runs $script, not
       $FRONTEND/.next/standalone/server.js, so it would not serve this build.
       Run with --recreate-pm2 to recreate it on server.js."
  ok "PM2 '$APP' runs .next/standalone/server.js"
fi

env_file=""
for f in .env.production.local .env.local .env.production .env; do
  [[ -f "$FRONTEND/$f" ]] && grep -q '^NEXT_PUBLIC_API_URL=' "$FRONTEND/$f" && { env_file="$f"; break; }
done
api_url="$( [[ -n "$env_file" ]] && grep '^NEXT_PUBLIC_API_URL=' "$FRONTEND/$env_file" | tail -1 | cut -d= -f2- | tr -d "\"' " || true)"
if [[ -z "$api_url" ]]; then
  warn "NEXT_PUBLIC_API_URL not set in frontend/.env*; next.config.js uses https://cp2b.unicamp.br/pilar2b"
else
  # The browser calls ${NEXT_PUBLIC_API_URL}/api/v1/…, so a value ending in /api
  # becomes /pilar2b/api/api/v1 and every request 404s.
  [[ "$api_url" != */api && "$api_url" != */api/ ]] || die "NEXT_PUBLIC_API_URL=$api_url in frontend/$env_file ends in /api.
       The code appends /api/v1 itself; set it to https://cp2b.unicamp.br/pilar2b"
  ok "NEXT_PUBLIC_API_URL=$api_url (frontend/$env_file)"
fi

# ── pull ─────────────────────────────────────────────────────────────────────
cd "$FRONTEND"
REPO="$(git rev-parse --show-toplevel)"
if [[ $PULL == 1 ]]; then
  step "Pull origin/$BRANCH"
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  [[ "$current_branch" == "$BRANCH" ]] || die "the checkout is on '$current_branch', not '$BRANCH' (use --no-pull to deploy it as is)"
  # next build rewrites next-env.d.ts in every checkout that ran it.
  git restore -- next-env.d.ts 2>/dev/null || true
  dirty="$(git -C "$REPO" status --porcelain --untracked-files=no)"
  [[ -z "$dirty" ]] || die "uncommitted changes on the VM; a pull could clash with them:
$dirty"
  old="$(git rev-parse HEAD)"
  git fetch --quiet origin "$BRANCH"
  git merge --ff-only --quiet "origin/$BRANCH" || die "origin/$BRANCH does not fast-forward from $(git rev-parse --short HEAD)"
  new="$(git rev-parse HEAD)"
  if [[ "$old" == "$new" ]]; then
    ok "already at $(git log -1 --format='%h %s')"
  else
    git log --format='    %h %s' "$old..$new"
    # The frontend reads fields the backend serves; say what the backend needs.
    nl="cp2b-workspace/NewLook"
    migrations="$(git -C "$REPO" diff --name-only --diff-filter=A "$old" "$new" -- "$nl/backend/app/migrations/" | grep '\.sql$' || true)"
    if [[ -n "$migrations" ]]; then
      warn "new migrations (apply each with psql, docs/VM_UPDATE_GUIDE.md step 4):"
      sed 's/^/            /' <<<"$migrations"
    fi
    git -C "$REPO" diff --quiet "$old" "$new" -- "$nl/backend/requirements.txt" \
      || warn "backend/requirements.txt changed: pip install -r requirements.txt"
    git -C "$REPO" diff --quiet "$old" "$new" -- "$nl/backend/app" \
      || warn "backend code changed: pm2 restart pilar-backend --update-env"
  fi
  if ! git diff --quiet "$old" "$new" -- deploy.sh; then
    echo "    deploy.sh itself changed; continuing with the new version"
    flock -u 9 2>/dev/null || true
    # bash, not ./: the execute bit does not come along where core.fileMode=false.
    if [[ $RECREATE_PM2 == 1 ]]; then exec bash "$FRONTEND/deploy.sh" --no-pull --recreate-pm2; fi
    exec bash "$FRONTEND/deploy.sh" --no-pull
  fi
fi
COMMIT="$(git rev-parse HEAD)"

# ── build in the staging directory ───────────────────────────────────────────
step "Build $(git log -1 --format='%h %s') in $STAGE"
mkdir -p "$STAGE"
# Fresh sources every time; node_modules and .next/cache are kept between runs.
find "$STAGE" -mindepth 1 -maxdepth 1 ! -name node_modules ! -name .next -exec rm -rf {} +
tar -C "$FRONTEND" --exclude=./node_modules --exclude=./.next -cf - . | tar -C "$STAGE" -xf -

cd "$STAGE"
# Reinstall whenever package-lock.json changed, not only when next is missing:
# a release that adds a package (the redesign added three @fontsource fonts)
# otherwise builds against the old node_modules and fails.
lock_sum="$(sha256sum package-lock.json | cut -d' ' -f1)"
if [[ ! -x node_modules/.bin/next || "$(cat node_modules/.pilar-lock.sha256 2>/dev/null)" != "$lock_sum" ]]; then
  echo "    npm ci (package-lock.json changed or node_modules incomplete)"
  # --include=dev: NODE_ENV=production (exported above) would otherwise leave out
  # the devDependencies, and the build needs typescript.
  HUSKY=0 npm ci --include=dev --no-audit --no-fund --loglevel=error
  echo "$lock_sum" > node_modules/.pilar-lock.sha256
else
  ok "node_modules matches package-lock.json"
fi

npm run build
[[ -f .next/standalone/server.js ]] || die "the build produced no .next/standalone/server.js"

# next build does not put static/ and public/ inside the standalone bundle.
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
printf '%s %s\n' "$COMMIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > .next/DEPLOYED_COMMIT

# ── check the new build before it goes live ──────────────────────────────────
step "Check the new build on 127.0.0.1:$SMOKE_PORT"
[[ "$(http_code "http://127.0.0.1:$SMOKE_PORT/")" == 000 ]] || die "port $SMOKE_PORT is in use; set SMOKE_PORT to a free one"
(cd .next/standalone && PORT=$SMOKE_PORT exec node server.js) > "$DEPLOY_DIR/smoke.log" 2>&1 &
smoke_pid=$!
trap 'kill $smoke_pid 2>/dev/null || true' EXIT
wait_for "http://127.0.0.1:$SMOKE_PORT$BASE_PATH/pt-BR" 60 || die "the new build does not start (see $DEPLOY_DIR/smoke.log); the live site was not touched"
check_bundle "http://127.0.0.1:$SMOKE_PORT" "$STAGE/.next/standalone" || die "the new build failed its checks; the live site was not touched"
kill $smoke_pid 2>/dev/null || true
wait $smoke_pid 2>/dev/null || true
trap - EXIT
# What the check fetched from the API (fetch-cache, kept an hour) must not go
# live with the build: had the API been down just now, the site would serve that.
rm -rf .next/standalone/.next/cache

# ── swap it in ───────────────────────────────────────────────────────────────
step "Go live"
rm -rf "$PREVIOUS"
[[ -d "$FRONTEND/.next" ]] && mv "$FRONTEND/.next" "$PREVIOUS"
mv "$STAGE/.next" "$FRONTEND/.next"
# The build cache belongs to the build directory, not the live bundle.
if [[ -d "$FRONTEND/.next/cache" ]]; then mkdir -p "$STAGE/.next" && mv "$FRONTEND/.next/cache" "$STAGE/.next/cache"; fi
restart_frontend

rollback_now() {
  warn "$1 — putting the previous build back"
  if [[ -d "$PREVIOUS" ]]; then
    swap_previous_in
    restart_frontend
    wait_for "http://127.0.0.1:$LIVE_PORT$BASE_PATH/pt-BR" 60 && pm2 save >/dev/null
    die "deploy of ${COMMIT:0:7} rolled back; the site runs $(live_commit). See pm2 logs $APP"
  fi
  die "$1, and there is no previous build to restore. See pm2 logs $APP"
}

wait_for "http://127.0.0.1:$LIVE_PORT$BASE_PATH/pt-BR" 60 || rollback_now "the restarted frontend does not answer on :$LIVE_PORT"
check_bundle "http://127.0.0.1:$LIVE_PORT" "$FRONTEND/.next/standalone" || rollback_now "the live checks failed"
check_apache || rollback_now "Apache does not serve the new build"
pm2 save >/dev/null

step "Done"
echo "    live:     $(live_commit)"
if [[ -d "$PREVIOUS/standalone" ]]; then
  echo "    previous: $(cat "$PREVIOUS/DEPLOYED_COMMIT" 2>/dev/null || echo 'a build from before deploy.sh recorded commits')  (./deploy.sh --rollback)"
fi
echo "    full check of the stack: ../scripts/vm_verify.sh"
}

main
