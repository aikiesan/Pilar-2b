#!/usr/bin/env bash
# PILAR-2b — retrato do servidor de produção (NIPE/Unicamp), só leitura.
#
#   bash vm_diagnostico.sh                      # de qualquer pasta
#   REPO=/var/www/pilar2b/repo bash vm_diagnostico.sh
#
# Para planejar a troca do checkout para o repositório novo e a próxima
# publicação contra o que o servidor TEM, não contra o que supomos. Junta numa
# saída só: a máquina, as ferramentas, o checkout (remoto, commit, sujeira, os
# arquivos fora do git que não podem se perder), a versão do Next que está NO
# AR, os processos PM2 do PILAR, o Apache (módulos, vhost, compressão), o banco
# (migrações aplicadas contra as do repositório, contagens que identificam o
# banco) e o fim dos logs de erro.
#
# Nada aqui grava, reinicia, instala, faz fetch ou pull. Segredos não saem:
# das variáveis de ambiente só os NOMES; do SECRET_KEY só o tamanho e 12
# caracteres do sha256 (para comparar com a chave antiga sem mostrá-la); senha
# em URL aparece como ***.
#
# A saída vai para a tela e para /tmp/pilar2b-diagnostico-<data>.txt; é esse
# arquivo que volta para a análise.
#
# Settings (variáveis de ambiente, todas opcionais):
#   REPO         o checkout do PILAR-2b       /var/www/pilar2b/repo
#   API_URL      o backend                    http://127.0.0.1:8001
#   FRONT_URL    o servidor Next.js           http://127.0.0.1:3002
#   APACHE_URL   o Apache desta máquina       http://127.0.0.1
#   APACHE_HOST  o vhost que serve /pilar2b   cp2b.unicamp.br

set -uo pipefail

REPO="${REPO:-/var/www/pilar2b/repo}"
NEWLOOK="$REPO/cp2b-workspace/NewLook"
API_URL="${API_URL:-http://127.0.0.1:8001}"
FRONT_URL="${FRONT_URL:-http://127.0.0.1:3002}"
APACHE_URL="${APACHE_URL:-http://127.0.0.1}"
APACHE_HOST="${APACHE_HOST:-cp2b.unicamp.br}"
OUT="/tmp/pilar2b-diagnostico-$(date +%Y%m%d-%H%M).txt"

exec > >(tee "$OUT") 2>&1

section() { printf '\n===== %s =====\n' "$*"; }
kv() { printf '  %-28s %s\n' "$1" "$2"; }
run() { # label, command...: prints the command's output indented, or why it failed
  local label="$1"; shift
  printf '  -- %s\n' "$label"
  "$@" 2>&1 | sed 's/^/     /' | head -60 || true
}
mask() { sed -E 's#(://)[^/@[:space:]]+@#\1***@#g'; }  # user:senha@ ou token@
have() { command -v "$1" >/dev/null 2>&1; }

printf 'PILAR-2b — diagnóstico do servidor\n'
kv "gerado em" "$(date -Is)"
kv "usuário" "$(id -un)"
kv "checkout" "$REPO"

# ── máquina ──────────────────────────────────────────────────────────────────
section "Máquina"
kv "host" "$(hostname)"
kv "sistema" "$(. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || uname -sr)"
kv "kernel" "$(uname -r)"
kv "no ar desde" "$(uptime -s 2>/dev/null || uptime)"
run "disco" df -h / /var/www /tmp
run "memória" free -m

# ── ferramentas ──────────────────────────────────────────────────────────────
section "Ferramentas"
for t in git node npm pm2 python3 psql apache2ctl curl; do
  if have "$t"; then
    case "$t" in
      apache2ctl) v="$(apache2ctl -v 2>/dev/null | head -1)";;
      psql) v="$(psql --version)";;
      *) v="$("$t" --version 2>/dev/null | head -1)";;
    esac
    kv "$t" "$v"
  else
    kv "$t" "(não instalado)"
  fi
done
[[ -x "$NEWLOOK/backend/.venv/bin/python" ]] \
  && kv "python do backend (.venv)" "$("$NEWLOOK/backend/.venv/bin/python" --version 2>&1)" \
  || kv "python do backend (.venv)" "(não encontrado em backend/.venv)"

# ── checkout ─────────────────────────────────────────────────────────────────
section "Checkout"
if [[ -d "$REPO/.git" ]]; then
  printf '  -- remotos\n'; git -C "$REPO" remote -v 2>&1 | mask | sed 's/^/     /'
  kv "branch" "$(git -C "$REPO" rev-parse --abbrev-ref HEAD)"
  run "últimos commits" git -C "$REPO" log --format='%h %ad %s' --date=short -5
  kv "commits no total" "$(git -C "$REPO" rev-list --count HEAD)"
  kv "primeiro commit" "$(git -C "$REPO" rev-list --max-parents=0 HEAD | head -1)"
  dirty="$(git -C "$REPO" status --porcelain --untracked-files=no)"
  kv "arquivos rastreados alterados" "$(printf '%s' "$dirty" | grep -c . || true)"
  [[ -n "$dirty" ]] && run "quais" bash -c "printf '%s\n' \"\$1\" | head -30" _ "$dirty"
  kv "não rastreados (fora .gitignore)" "$(git -C "$REPO" status --porcelain | grep -c '^??' || true)"
  run "stash" git -C "$REPO" stash list
else
  kv "git" "(sem .git em $REPO)"
fi

# What `git` does not carry and a re-clone would lose.
section "Fora do git (precisam sobreviver à troca de repositório)"
for f in backend/.env frontend/.env.local frontend/.env.production backend/.venv \
         backend/data/raw frontend/.next/standalone frontend/.next/DEPLOYED_COMMIT \
         frontend/.deploy ../.deploy frontend/node_modules; do
  p="$NEWLOOK/$f"
  if [[ -e "$p" ]]; then
    size="$(du -sh "$p" 2>/dev/null | cut -f1)"
    kv "$f" "existe ($size)"
  else
    kv "$f" "—"
  fi
done
[[ -f "$NEWLOOK/frontend/.next/DEPLOYED_COMMIT" ]] && kv "commit publicado" "$(cat "$NEWLOOK/frontend/.next/DEPLOYED_COMMIT")"
run "outros arquivos ignorados na raiz do NewLook" bash -c "cd '$NEWLOOK' && git status --porcelain --ignored -- . 2>/dev/null | grep '^!!' | grep -vE 'node_modules|\\.next|__pycache__|\\.venv|\\.pytest_cache' | head -40"
if [[ -d "$NEWLOOK/backend/data/raw" ]]; then
  run "backend/data/raw" bash -c "cd '$NEWLOOK/backend/data/raw' && find . -maxdepth 2 -type f | sort | head -60"
fi

# ── variáveis de ambiente (só nomes) ─────────────────────────────────────────
section "Variáveis de ambiente (só os nomes)"
for f in backend/.env frontend/.env.local frontend/.env.production; do
  p="$NEWLOOK/$f"
  [[ -f "$p" ]] || continue
  kv "$f" "$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$p" | cut -d= -f1 | sort | tr '\n' ' ')"
done
if [[ -f "$NEWLOOK/backend/.env" ]]; then
  sk="$(grep '^SECRET_KEY=' "$NEWLOOK/backend/.env" | tail -1 | cut -d= -f2- | tr -d "\"'")"
  if [[ -n "$sk" ]]; then
    kv "SECRET_KEY" "${#sk} caracteres, sha256 $(printf '%s' "$sk" | sha256sum | cut -c1-12)…"
  else
    kv "SECRET_KEY" "(vazio)"
  fi
  kv "NEXT_PUBLIC_API_URL (frontend)" "$(grep -h '^NEXT_PUBLIC_API_URL=' "$NEWLOOK"/frontend/.env.local "$NEWLOOK"/frontend/.env.production 2>/dev/null | tail -1 | cut -d= -f2- | mask)"
  kv "PRODUCTION_ORIGINS (backend)" "$(grep '^PRODUCTION_ORIGINS=' "$NEWLOOK/backend/.env" | tail -1 | cut -d= -f2-)"
fi

# ── versões que estão no ar ──────────────────────────────────────────────────
section "Versões"
pkgver() { node -p "require('$1').version" 2>/dev/null || echo "—"; }
kv "next, frontend/node_modules" "$(pkgver "$NEWLOOK/frontend/node_modules/next/package.json")"
kv "next, NO AR (.next/standalone)" "$(pkgver "$NEWLOOK/frontend/.next/standalone/node_modules/next/package.json")"
kv "react, no ar" "$(pkgver "$NEWLOOK/frontend/.next/standalone/node_modules/react/package.json")"
kv "package.json do app" "$(pkgver "$NEWLOOK/frontend/package.json")"
case "$(pkgver "$NEWLOOK/frontend/.next/standalone/node_modules/next/package.json")" in
  16.4.0|16.4.1|16.4.2|16.4.3|16.4.4|16.4.5)
    kv "ALERTA" "Next abaixo de 16.4.6 no ar: publicar a 16.4.6 é hotfix (#25)";;
esac
if [[ -x "$NEWLOOK/backend/.venv/bin/pip" ]]; then
  run "pacotes-chave do backend" bash -c "'$NEWLOOK/backend/.venv/bin/pip' freeze 2>/dev/null | grep -iE '^(fastapi|uvicorn|starlette|pydantic|sqlalchemy|psycopg2|geoalchemy2|shapely)=' "
  run "requirements.txt contra o .venv (diferenças)" bash -c "
    cd '$NEWLOOK/backend'
    comm -3 <(grep -E '^[A-Za-z0-9_.-]+==' requirements.txt | tr 'A-Z_' 'a-z-' | sort) \
            <(.venv/bin/pip freeze 2>/dev/null | tr 'A-Z_' 'a-z-' | sort) | head -30"
fi

# ── PM2 ──────────────────────────────────────────────────────────────────────
section "PM2"
if have pm2; then
  pm2 jlist 2>/dev/null | node -e '
    let s = require("fs").readFileSync(0, "utf8");
    s = s.slice(s.indexOf("["));
    for (const p of JSON.parse(s)) {
      const e = p.pm2_env || {};
      const mine = /^pilar-/.test(p.name);
      const up = e.pm_uptime ? Math.round((Date.now() - e.pm_uptime) / 3600e3) + " h" : "-";
      console.log(`  ${mine ? "*" : " "} ${p.name.padEnd(22)} ${String(e.status).padEnd(9)} reinícios ${String(e.restart_time).padEnd(5)} no ar ${up.padEnd(7)} mem ${Math.round((p.monit?.memory || 0) / 1048576)} MB`);
      if (mine) {
        console.log(`      script ${e.pm_exec_path}`);
        console.log(`      cwd    ${e.pm_cwd}`);
        const env = e.env || {};
        console.log(`      env    ${["NODE_ENV","PORT","HOSTNAME","API_INTERNAL_URL","APP_ENV"].filter(k => k in env).map(k => k + "=" + env[k]).join(" ")}`);
      }
    }' 2>&1 || echo "  (pm2 jlist ilegível)"
  printf '  (* = processos do PILAR; os outros são de outras aplicações desta máquina, não mexer)\n'
else
  kv "pm2" "(não instalado para este usuário)"
fi

# ── HTTP ─────────────────────────────────────────────────────────────────────
section "HTTP"
# curl prints the -w line even when it fails (000), so no fallback echo.
code() { curl -s -o /dev/null -w '%{http_code} %{time_total}s' --max-time 30 "$@" || true; }
kv "backend /health" "$(code "$API_URL/health")"
kv "backend /api/v1/residuos" "$(code "$API_URL/api/v1/residuos/?limit=1")"
kv "frontend direto /pt-BR" "$(code "$FRONT_URL/pilar2b/pt-BR")"
kv "Apache /pilar2b/pt-BR" "$(code -H "Host: $APACHE_HOST" "$APACHE_URL/pilar2b/pt-BR")"
kv "Apache /pilar2b/api" "$(code -H "Host: $APACHE_HOST" "$APACHE_URL/pilar2b/api/v1/residuos/?limit=1")"
# The test that matters for mod_deflate: does a JSON response come back compressed?
enc="$(curl -s -o /dev/null -D - --max-time 60 -H "Host: $APACHE_HOST" -H 'Accept-Encoding: gzip, br' \
        "$APACHE_URL/pilar2b/api/v1/residuos/?limit=50" | grep -i '^content-encoding' | tr -d '\r')"
kv "JSON comprimido pelo Apache" "${enc:-NÃO (sem Content-Encoding)}"

# ── Apache ───────────────────────────────────────────────────────────────────
section "Apache"
if have apache2ctl; then
  mods="$(apache2ctl -M 2>/dev/null | tr -d ' ' | cut -d'(' -f1 | tr '\n' ' ')"
  [[ -z "$mods" ]] && mods="$(ls /etc/apache2/mods-enabled/ 2>/dev/null | sed 's/\..*//' | sort -u | tr '\n' ' ')"
  for m in deflate brotli headers proxy proxy_http rewrite alias expires; do
    kv "mod_$m" "$(grep -qw "${m}_module\|$m" <<<"$mods" && echo ativo || echo '—')"
  done
fi
run "sites ativos" ls /etc/apache2/sites-enabled/
vhosts="$(grep -lE 'pilar2b' /etc/apache2/sites-enabled/* 2>/dev/null || true)"
for v in $vhosts; do
  run "trechos /pilar2b em $v" grep -nE 'pilar2b|ProxyPass|Alias|Deflate|AddOutputFilter|Header' "$v"
  base="$(basename "$v")"
  if [[ -f "$NEWLOOK/apache/$base" ]]; then
    run "diferença entre $base no servidor e no repositório" diff -u "$NEWLOOK/apache/$base" "$v"
  fi
done
run "configuração do deflate" bash -c "cat /etc/apache2/mods-enabled/deflate.conf 2>/dev/null | grep -v '^\s*#' | grep -v '^\s*$'"

# ── banco ────────────────────────────────────────────────────────────────────
section "Banco de dados"
db_url=""
[[ -f "$NEWLOOK/backend/.env" ]] && db_url="$(grep '^DATABASE_URL=' "$NEWLOOK/backend/.env" | tail -1 | cut -d= -f2- | tr -d "\"'")"
if [[ -z "$db_url" ]]; then
  kv "banco" "(DATABASE_URL não encontrado em backend/.env)"
elif ! have psql; then
  kv "banco" "(psql não instalado; pulado)"
elif ! psql "$db_url" -XAtqc 'SELECT 1' >/dev/null 2>&1; then
  kv "banco" "(psql não conecta com o DATABASE_URL de backend/.env)"
else
  q() { psql "$db_url" -XAtqF ' | ' -c "$1" 2>&1 | sed 's/^/     /'; }
  kv "conexão" "$(printf '%s' "$db_url" | mask)"
  printf '  -- versões\n';                 q "SELECT version();"; q "SELECT postgis_full_version();" | cut -c1-160
  printf '  -- tamanho\n';                 q "SELECT pg_size_pretty(pg_database_size(current_database()));"
  printf '  -- migrações aplicadas (as 12 últimas)\n'
  q "SELECT version, applied_at::date FROM schema_migrations ORDER BY version DESC LIMIT 12;"
  printf '  -- migrações do repositório ainda não aplicadas\n'
  applied="$(psql "$db_url" -XAtqc 'SELECT version FROM schema_migrations' 2>/dev/null)"
  missing=0
  for f in "$NEWLOOK"/backend/app/migrations/*.sql; do
    v="$(basename "$f" .sql)"
    if ! grep -qxF "$v" <<<"$applied" && ! grep -qxF "$(basename "$f")" <<<"$applied"; then
      printf '     %s\n' "$(basename "$f")"; missing=$((missing + 1))
    fi
  done
  [[ $missing -eq 0 ]] && printf '     (nenhuma)\n'
  printf '  -- municípios (5.571 = base nacional; 645 = só SP)\n'
  q "SELECT count(*) AS total, count(*) FILTER (WHERE population > 0) AS com_populacao FROM municipalities;"
  printf '  -- infraestrutura por camada (para comparar com o local: biogas_plant 543/18, ethanol_plant 397/22, gas_delivery_point 184/17, slaughterhouse 207/16, gas_pipeline_transport 56, gas_pipeline_distribution 19/16)\n'
  q "SELECT layer_id, count(*), count(DISTINCT uf) FROM infrastructure_features GROUP BY 1 ORDER BY 1;"
  printf '  -- séries por fonte\n'
  q "SELECT source_id, count(*), count(DISTINCT ibge_code), min(year), max(year) FROM municipality_timeseries GROUP BY 1 ORDER BY 1;"
  printf '  -- tabelas maiores\n'
  q "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 15;"
fi

# ── logs ─────────────────────────────────────────────────────────────────────
section "Fim dos logs de erro"
for app in pilar-backend pilar-frontend; do
  log="$HOME/.pm2/logs/${app}-error.log"
  [[ -f "$log" ]] && run "$app ($(du -h "$log" | cut -f1))" tail -n 15 "$log"
done
for log in /var/log/apache2/pilar2b-error.log /var/log/apache2/error.log; do
  [[ -r "$log" ]] && run "$log" bash -c "grep -i pilar2b '$log' | tail -n 10"
done

section "Fim"
printf '  Saída salva em %s\n' "$OUT"
