# Perfil municipal, PR 1 (dados): roteiro de produção

Carga dos dados novos do perfil municipal no banco `cp2b` da VM `cp2b-web`:
Censo 2022 por idade e sexo, urbano/rural, população 1970–2022 e MapBiomas anual
com soja. Spec: `docs/superpowers/specs/2026-11-28-perfil-municipal-seo-design.md`.

Rode **depois do merge do PR** e na ordem abaixo. Ensaio completo feito no Docker
local em 28/11/2026, com todos os gates verdes (relatórios em
`docs/data/ingest_reports/`).

**O que muda no site:** as páginas de perfil só leem esses dados nos PRs 2 e 3.
O único leitor atual é `/municipalities/land-cover` (Comparar e Encontrar
parecidos, com login): ele continua com os mesmos oito grupos, porque a soja
volta a contar como lavoura nele. Depois da carga ele passa a aceitar qualquer
ano de 1985 a 2025. O cache dele fica na memória do processo, e o
`pm2 restart pilar-backend` do passo 6 o limpa.

**Regras:** nenhum `INSERT`/`UPDATE` à mão; arquivos de carga e backups em
`/data`, nunca no disco raiz (3,6 GB livres); o banco `cp2b_db` (site
`cp2b_web`) e os `arqueia*` ficam fora.

## 0. No seu PC: enviar os snapshots (Git Bash)

Os loaders leem os mesmos arquivos testados no Docker (~155 MB). Antes, na VM,
crie a pasta (passo 1). Depois, no PC:

```bash
cd /a/Pilar-2b-perfil/cp2b-workspace/NewLook/backend/data/raw
scp -r ibge_censo_idade ibge_censo_situacao ibge_censo_historico mapbiomas_cobertura \
    lucas@<endereço-da-vm>:/data/pilar2b_raw/
```

## 1. Na VM: pastas e conferência só de leitura

```bash
sudo mkdir -p /data/pilar2b_raw /data/backups
sudo chown lucas: /data/pilar2b_raw
sudo chown postgres: /data/backups

sudo -u postgres psql -X -d cp2b -P pager=off <<'SQL'
SELECT to_regclass('staging.ingest_runs') AS ledger,
       to_regclass('public.municipality_timeseries') AS timeseries,
       to_regclass('public.municipality_land_cover') AS land_cover;
SELECT source_id, left(ibge_code,2) AS uf, max(year), count(DISTINCT ibge_code)
FROM municipality_timeseries WHERE left(ibge_code,2) IN ('35','31')
GROUP BY 1,2 ORDER BY 1,2;
SELECT count(*) AS municipios FROM municipalities;
SELECT schemaname, tablename, tableowner FROM pg_tables
WHERE tablename IN ('municipality_land_cover', 'municipality_timeseries', 'municipalities', 'ingest_runs');
SQL
grep -o '^DATABASE_URL=postgresql://[^:]*' /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend/.env
df -h / /data
```

Esperado:
- as três tabelas existem (se `ledger` vier vazio, falta a migração 021: pare e avise);
- `municipios` = 5.571. As cargas do Censo são nacionais e cada código precisa
  existir em `municipalities`; se faltar, a carga é desfeita inteira e avisa;
- o dono (`tableowner`) das quatro tabelas é o mesmo usuário que aparece no
  `grep` do `DATABASE_URL`. A migração altera tabelas e a carga grava em
  `staging.ingest_runs`; se o dono for outro (por exemplo `postgres`), aplique a
  migração com `sudo -u postgres psql -d cp2b -v ON_ERROR_STOP=1 -f ...` e avise
  antes de seguir. `pam_1612`, `pam_1613` e `ibge_ppm` com 645 (35) e 853 (31).
Se faltar algum, ele é carregado antes, com os promotores existentes; não é
bloqueio para este PR, mas é para o PR 3.

## 2. Atualizar o código

```bash
cd /var/www/pilar2b/repo
git restore cp2b-workspace/NewLook/frontend/next-env.d.ts
git pull origin main
cd cp2b-workspace/NewLook/backend
source .venv/bin/activate
pip install -r requirements.txt --quiet
```

## 3. Backup das tabelas tocadas

```bash
sudo -u postgres pg_dump -Fc -d cp2b \
  -t public.municipality_land_cover -t public.municipality_timeseries \
  -t public.municipalities -t staging.ingest_runs \
  -f /data/backups/cp2b_perfil_dados_$(date +%F).dump
ls -lh /data/backups/
```

## 4. Migração 044

Ela já tem `BEGIN`/`COMMIT` próprios (não use `-1`):

```bash
export DATABASE_URL=$(grep '^DATABASE_URL' .env | cut -d= -f2-)
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f app/migrations/044_land_cover_soy_ingest.sql
```

Esperado: `BEGIN`, vários `ALTER TABLE`/`COMMENT`, `COMMIT`. Ela libera o grupo
`soy` e outras UFs no land cover, cria `ingest_run_id` e deixa
`municipality_timeseries` aceitar anos a partir de 1970.

## 5. Cargas

Cada uma primeiro com `--dry-run` (valida e escreve o relatório, sem gravar).
Só siga se todas as linhas forem `[PASS]`.

Os relatórios vão para `/data/pilar2b_raw/reports`, fora do repositório, para
o `git pull` seguinte não encontrar arquivos alterados.

```bash
export INGEST_RAW_DIR=/data/pilar2b_raw
R="--reports-dir /data/pilar2b_raw/reports"
for s in ibge_censo_idade ibge_censo_situacao ibge_censo_historico; do
  python scripts/promote_profile_data.py --source $s --year 2022 --dry-run $R || break
done
python scripts/promote_profile_data.py --source mapbiomas_cobertura --year 2025 --ufs 35,31 --dry-run $R
```

Com tudo verde:

```bash
for s in ibge_censo_idade ibge_censo_situacao ibge_censo_historico; do
  python scripts/promote_profile_data.py --source $s --year 2022 $R || break
done
python scripts/promote_profile_data.py --source mapbiomas_cobertura --year 2025 --ufs 35,31 $R
```

Cada uma termina em `promoted: N rows, staging.ingest_runs id M`. Se der erro, a
carga daquela fonte é desfeita inteira (nada fica pela metade).

## 6. Conferência

```bash
sudo -u postgres psql -X -d cp2b -P pager=off <<'SQL'
SELECT source_id, left(ibge_code,2) uf, count(DISTINCT ibge_code) FROM municipality_timeseries
WHERE source_id LIKE 'ibge_censo%' AND left(ibge_code,2) IN ('35','31') GROUP BY 1,2 ORDER BY 1,2;
SELECT count(*) FILTER (WHERE urban_population IS NULL) AS sem_urbano FROM municipalities WHERE uf IN ('SP','MG');
SELECT count(DISTINCT year) anos, count(DISTINCT ibge_code) municipios, count(*) linhas FROM municipality_land_cover;
SELECT year, group_key, round(area_ha) FROM municipality_land_cover
WHERE ibge_code='3521705' AND year IN (1985,2025) AND group_key IN ('pasture','soy') ORDER BY 2,1;
SELECT year, value FROM municipality_timeseries
WHERE ibge_code='3521705' AND source_id='ibge_censo_historico' ORDER BY year;
SELECT urban_population, rural_population FROM municipalities WHERE ibge_code='3521705';
SELECT id, source_id, reference_year, row_count, gates_passed FROM staging.ingest_runs ORDER BY id;
SQL
```

Esperado (igual ao Docker):

| Conferência | Valor |
|---|---|
| `ibge_censo_historico` e `ibge_censo_idade` | 853 (31) e 645 (35) cada |
| `sem_urbano` | 0 |
| land cover | 41 anos, 1.498 municípios, 552.762 linhas |
| Itaberá pasto 1985 → 2025 | 58.142 → 8.798 |
| Itaberá soja 1985 → 2025 | 4.241 → 57.547 |
| Itaberá população | 14.585 · 16.399 · 17.899 · 18.911 · 17.858 · 17.983 |
| Itaberá urbano / rural | 12.320 / 5.663 |
| `staging.ingest_runs` | 4 linhas, `gates_passed = t` |

Depois, `pm2 restart pilar-backend --update-env` (carrega o endpoint de land
cover com a soja somada às lavouras e limpa o cache dele) e
`curl -s http://localhost:8001/health`. Confira também que `git status` no
repositório não mostra arquivos alterados.

## 7. Limpeza

Os snapshots podem ficar em `/data/pilar2b_raw` (servem para recarregar). O
backup fica até o PR 3 estar no ar; depois:
`sudo rm /data/backups/cp2b_perfil_dados_*.dump`.

## Se algo der errado

As cargas só acrescentam dados novos, então o caminho normal é desfazer **os
dados**, numa transação, sem restaurar tabelas inteiras. Para o land cover, os
dados antigos voltam do backup:

```bash
sudo -u postgres psql -d cp2b -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
DELETE FROM municipality_timeseries
 WHERE source_id IN ('ibge_censo_idade', 'ibge_censo_historico');
UPDATE municipalities SET urban_population = NULL, rural_population = NULL;
TRUNCATE municipality_land_cover;
COMMIT;
SQL
ls /data/backups/    # use o nome exato do arquivo abaixo
sudo -u postgres pg_restore --data-only -d cp2b -t municipality_land_cover   /data/backups/cp2b_perfil_dados_AAAA-MM-DD.dump
```

As linhas de `staging.ingest_runs` podem ficar: são só o histórico das cargas.
A migração 044 também pode ficar aplicada, porque só alarga restrições e cria uma
coluna opcional.

Não use `pg_restore --clean -t ...` nessas tabelas: com `-t` ele não recria
chaves, índices e restrições (o `UNIQUE` da série temporal sumiria e as cargas
de PAM e PPM passariam a falhar), e o `--clean` de `municipalities` esbarra nas
chaves estrangeiras. O dump completo é o último recurso, e só com aviso antes.
