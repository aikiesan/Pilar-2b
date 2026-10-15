#!/usr/bin/env bash
# PILAR-2b — read-only check of the production VM after a deploy.
#
#   cd /var/www/pilar2b/repo/cp2b-workspace/NewLook
#   scripts/vm_verify.sh
#
# Answers "did the release reach production, and does it work?": the deployed
# commit against origin/main, the PM2 processes, the API endpoints the new
# frontend reads, the database objects of migrations 034-037, the pages, the
# redirects, and the stylesheets, scripts and fonts as Apache serves them.
# Nothing here restarts, installs or changes the checkout (it only runs
# `git fetch`). Exit status 1 when a check fails.
#
# Settings (environment variables, all optional):
#   API_URL      the backend                        http://127.0.0.1:8001
#   FRONT_URL    the Next.js server                 http://127.0.0.1:3002
#   APACHE_URL   Apache on this machine             http://127.0.0.1
#   APACHE_HOST  virtual host that proxies /pilar2b cp2b.unicamp.br
#   SKIP_DB=1    skip the database checks

set -uo pipefail

NEWLOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$NEWLOOK/frontend"
API_URL="${API_URL:-http://127.0.0.1:8001}"
FRONT_URL="${FRONT_URL:-http://127.0.0.1:3002}"
APACHE_URL="${APACHE_URL:-http://127.0.0.1}"
APACHE_HOST="${APACHE_HOST:-cp2b.unicamp.br}"
B=/pilar2b

FAILS=0
WARNS=0
section() { printf '\n\033[1m%s\033[0m\n' "$*"; }
pass() { printf '  \033[32mOK\033[0m    %s\n' "$*"; }
fail() { printf '  \033[31mFALHA\033[0m %s\n' "$*"; FAILS=$((FAILS + 1)); }
note() { printf '  \033[33mAVISO\033[0m %s\n' "$*"; WARNS=$((WARNS + 1)); }

# status code, and the redirect target when there is one
probe() { curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 30 "$@" || echo "000 "; }

expect() { # expected-code label url [curl args...]
  local want="$1" label="$2" url="$3" got
  shift 3
  got="$(probe "$@" "$url")"
  if [[ "${got%% *}" == "$want" ]]; then pass "$want $label"; else fail "$label: esperado $want, veio ${got%% *}"; fi
}

expect_redirect() { # label url target-suffix [curl args...]
  local got code target
  got="$(probe "${@:4}" "$2")"
  code="${got%% *}"
  target="${got#* }"
  if [[ "$code" == 30[1278] && "$target" == *"$3" ]]; then pass "$code $1 → ${target#*://*/}"
  else fail "$1: esperado redirect para …$3, veio $code ${target:-(sem destino)}"; fi
}

# ── 1. Code ──────────────────────────────────────────────────────────────────
section "1. Código no servidor"
cd "$NEWLOOK" || exit 1
head_sha="$(git rev-parse HEAD)"
pass "checkout: $(git log -1 --format='%h %s (%cr)')"
if git fetch --quiet origin main 2>/dev/null; then
  behind="$(git rev-list --count HEAD..origin/main)"
  if [[ "$behind" == 0 ]]; then pass "checkout em dia com origin/main"
  else fail "checkout está $behind commit(s) atrás de origin/main (git pull, depois frontend/deploy.sh)"; fi
else
  note "git fetch falhou; não comparei com origin/main"
fi
deployed="$(cut -d' ' -f1 "$FRONTEND/.next/DEPLOYED_COMMIT" 2>/dev/null || true)"
if [[ -z "$deployed" ]]; then
  note "frontend no ar sem registro de commit (build anterior ao deploy.sh novo)"
elif [[ "$deployed" == "$head_sha" ]]; then
  pass "frontend no ar foi compilado deste commit (${deployed:0:7})"
else
  newer="$(git log --format='%h %s' -1 "$deployed..HEAD" -- frontend 2>/dev/null || true)"
  if [[ -z "$newer" ]]; then pass "frontend no ar (${deployed:0:7}) sem mudanças de frontend desde então"
  else fail "frontend no ar é ${deployed:0:7}; o checkout tem mudanças de frontend depois (ex.: $newer): rode frontend/deploy.sh"; fi
fi

# ── 2. Processes ─────────────────────────────────────────────────────────────
section "2. Processos PM2"
if command -v pm2 >/dev/null; then
  report="$(pm2 jlist 2>/dev/null | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      let apps = [];
      try { apps = JSON.parse(s.slice(s.indexOf("["))); } catch {}
      for (const name of ["pilar-backend", "pilar-frontend"]) {
        const a = apps.find((p) => p.name === name);
        if (!a) { console.log(`FAIL ${name}: processo não existe`); continue; }
        const e = a.pm2_env;
        console.log(e.status === "online" ? `OK ${name} online (${e.restart_time} restarts)` : `FAIL ${name}: ${e.status}`);
        if (name === "pilar-frontend") {
          const env = e.env || {};
          if (!String(e.pm_exec_path).endsWith(".next/standalone/server.js"))
            console.log(`FAIL pilar-frontend roda ${e.pm_exec_path}, não .next/standalone/server.js`);
          // Next 16 with HOSTNAME=127.0.0.1 proxies the locale rewrites to
          // localhost and every page answers 500 (frontend/deploy.sh).
          if (env.HOSTNAME === "127.0.0.1")
            console.log("FAIL pilar-frontend HOSTNAME=127.0.0.1 quebra as páginas no Next 16; use 0.0.0.0 (frontend/deploy.sh)");
          if (!env.API_INTERNAL_URL)
            console.log("WARN pilar-frontend sem API_INTERNAL_URL: o servidor Next lê a API pelo endereço público");
        }
      }
    });')"
  while read -r kind msg; do
    case "$kind" in OK) pass "$msg" ;; FAIL) fail "$msg" ;; WARN) note "$msg" ;; esac
  done <<<"$report"
else
  note "pm2 não está no PATH"
fi

# ── 3. Backend ───────────────────────────────────────────────────────────────
section "3. API ($API_URL)"
health="$(curl -s --max-time 15 "$API_URL/health" || true)"
case "$health" in
  *'"status":"healthy"'* | *'"status": "healthy"'*) pass "/health: healthy" ;;
  *'"status"'*) fail "/health: $(grep -oE '"status": ?"[a-z]+"' <<<"$health" | head -1) — $health" ;;
  *) fail "/health não responde" ;;
esac
expect 200 "/api/v1/statistics/summary" "$API_URL/api/v1/statistics/summary"
# The new frontend asks for the whole list; an API from before answers 422.
expect 200 "/api/v1/municipalities/names?limit=6000 (lista de municípios)" "$API_URL/api/v1/municipalities/names?limit=6000"
# Real/Ideal on the map are CP2b N4/N3 since 3.2.0: 503 = migration 034 or its data missing.
code="$(probe "$API_URL/api/v1/cp2b/summary")"
case "${code%% *}" in
  200) pass "200 /api/v1/cp2b/summary (Cenário Real/Ideal CP2b carregado)" ;;
  503) fail "/api/v1/cp2b/summary: 503 — migração 034 ou carga do CP2b (scripts/load_cp2b_potential.py) faltando; Real/Ideal no mapa ficam sem dados" ;;
  *) fail "/api/v1/cp2b/summary: ${code%% *}" ;;
esac
expect 200 "/api/v1/cp2b/municipalities/3509502 (Campinas)" "$API_URL/api/v1/cp2b/municipalities/3509502"

# ── 4. Database ──────────────────────────────────────────────────────────────
section "4. Banco de dados (migrações 034-037)"
db_url=""
[[ -f "$NEWLOOK/backend/.env" ]] && db_url="$(grep '^DATABASE_URL=' "$NEWLOOK/backend/.env" | tail -1 | cut -d= -f2- | tr -d "\"'")"
if [[ "${SKIP_DB:-0}" == 1 ]]; then
  note "pulado (SKIP_DB=1)"
elif ! command -v psql >/dev/null || [[ -z "$db_url" ]]; then
  note "psql ou DATABASE_URL (backend/.env) indisponível; pulado"
elif ! psql "$db_url" -XAtqc 'SELECT 1' >/dev/null 2>&1; then
  fail "psql não conecta com o DATABASE_URL de backend/.env"
else
  q() { psql "$db_url" -XAtqc "$1" 2>/dev/null; }
  has() { [[ "$(q "SELECT to_regclass('public.$1') IS NOT NULL")" == t ]]; }
  for obj in "034:municipality_cp2b_potential" "034:municipality_cp2b_map" \
             "035:newsletter_subscribers" "036:analytics_pageviews"; do
    if has "${obj#*:}"; then pass "${obj%%:*} ${obj#*:}"; else fail "${obj%%:*} ${obj#*:} ausente (migração ${obj%%:*} não aplicada)"; fi
  done
  if has municipality_cp2b_potential; then
    rows="$(q 'SELECT count(DISTINCT ibge_code) FROM municipality_cp2b_potential')"
    if [[ "${rows:-0}" -gt 0 ]]; then pass "CP2b carregado para $rows municípios"
    else fail "municipality_cp2b_potential vazia: rode scripts/load_cp2b_potential.py"; fi
  fi
  if [[ "$(q "SELECT pg_get_constraintdef(oid) LIKE '%preliminary%' FROM pg_constraint WHERE conname = 'municipality_timeseries_quality_check'")" == t ]]; then
    pass "037 qualidade 'preliminary' aceita em municipality_timeseries"
  else
    fail "037 não aplicada (municipality_timeseries_quality_check sem 'preliminary')"
  fi
fi

# ── 5. Frontend (Node, direct) ───────────────────────────────────────────────
section "5. Páginas ($FRONT_URL)"
for page in /pt-BR /en /pt-BR/map /pt-BR/data /pt-BR/municipalities /pt-BR/compare /pt-BR/calculator \
  /pt-BR/proximity /pt-BR/guide /pt-BR/cite /pt-BR/patch-notes /pt-BR/method/science-base; do
  expect 200 "$B$page" "$FRONT_URL$B$page"
done
# Readable municipality address: the Node server resolves it through the API.
expect 200 "$B/pt-BR/municipalities/campinas-sp (página do município)" "$FRONT_URL$B/pt-BR/municipalities/campinas-sp"
expect_redirect "$B/pt-BR/municipality/3509502 (endereço antigo)" "$FRONT_URL$B/pt-BR/municipality/3509502" "/pt-BR/municipalities/campinas-sp"
expect_redirect "$B/pt-BR/mapa" "$FRONT_URL$B/pt-BR/mapa" "/pt-BR/map"
expect_redirect "$B/pt-BR/dashboard/compare" "$FRONT_URL$B/pt-BR/dashboard/compare" "/pt-BR/compare"
# "Sobre" lives on the CP2b site now; the old address sends visitors there.
expect_redirect "$B/pt-BR/about (agora no site do CP2b)" "$FRONT_URL$B/pt-BR/about" "https://cp2b.unicamp.br/sobre"
expect 200 "$B/sitemap.xml" "$FRONT_URL$B/sitemap.xml"

# ── 6. Through Apache ────────────────────────────────────────────────────────
section "6. Via Apache ($APACHE_URL, Host: $APACHE_HOST)"
H=(-H "Host: $APACHE_HOST")
html="$(curl -s --max-time 30 "${H[@]}" "$APACHE_URL$B/pt-BR" || true)"
if [[ -z "$html" ]]; then
  fail "Apache não respondeu $B/pt-BR"
else
  expect 200 "$B/pt-BR" "$APACHE_URL$B/pt-BR" "${H[@]}"
  expect_redirect "$B (raiz)" "$APACHE_URL$B" "/pilar2b/pt-BR" "${H[@]}"
  expect 200 "$B/api/v1/statistics/summary (API via Apache)" "$APACHE_URL$B/api/v1/statistics/summary" "${H[@]}"
  assets="$(grep -oE "$B/_next/static/[^\"'<> )\\\\]+" <<<"$html" | sort -u)"
  total=0 bad=0
  while read -r a; do
    [[ -n "$a" ]] || continue
    total=$((total + 1))
    c="$(probe "${H[@]}" "$APACHE_URL$a")"
    [[ "${c%% *}" == 200 ]] || { bad=$((bad + 1)); fail "${c%% *} $a"; }
  done <<<"$assets"
  [[ $total -gt 0 ]] || fail "a página não referencia nenhum $B/_next/static"
  [[ $total -gt 0 && $bad == 0 ]] && pass "$total CSS/JS da página servidos pelo Apache"
  # The redesign's fonts (Fraunces, Inter, JetBrains Mono) are self-hosted.
  fonts=0
  for f in "$FRONTEND"/.next/standalone/.next/static/media/{fraunces,inter,jetbrains}*latin-wght-normal*.woff2 \
           "$FRONTEND"/.next/standalone/.next/static/media/fraunces-latin-opsz-normal*.woff2; do
    [[ -f "$f" ]] || continue
    fonts=$((fonts + 1))
    expect 200 "fonte ${f##*/}" "$APACHE_URL$B/_next/static/media/${f##*/}" "${H[@]}"
  done
  [[ $fonts -gt 0 ]] || fail "nenhuma fonte do redesign (Fraunces/Inter) em .next/standalone/.next/static/media"
  expect 200 "$B/images/cp2b-logo-negativo.svg (logo novo)" "$APACHE_URL$B/images/cp2b-logo-negativo.svg" "${H[@]}"
fi

# ── summary ──────────────────────────────────────────────────────────────────
echo
if [[ $FAILS == 0 ]]; then
  printf '\033[32mTudo certo\033[0m (%d aviso(s)).\n' "$WARNS"
else
  printf '\033[31m%d falha(s)\033[0m, %d aviso(s).\n' "$FAILS" "$WARNS"
  exit 1
fi
