# VM pre-deploy diagnostic — read-only

Run these on the production VM before deploying #154 + #156. Everything here is
a SELECT or a status read; nothing writes, restarts or installs.

SSH is password auth, so these are run by hand:

```bash
ssh lucas@177.220.121.2 -p 22004
```

## 1. Which repo, which commit

`pilar2b` has its OWN clone — `/var/www/pilar2b/repo`, NOT `/var/www/cp2b/repo`.

```bash
cd /var/www/pilar2b/repo
git log --oneline -3
git status --porcelain | head
```

Expect the HEAD to predate #154. A dirty `next-env.d.ts` is normal (auto-generated;
discard it before pulling).

## 2. Does the database have the national spine?

```bash
psql "$DATABASE_URL" -c "SELECT count(*) AS municipalities FROM municipalities;"
```

- **5,571** → national spine present, good.
- **645** → still São-Paulo-only. The national expansion has never been loaded
  here, and #154/#156 will show an almost-empty map. Stop and plan the full
  `load_national.sh` path first (docs/NATIONAL_DATA_LOAD.md).

## 3. Which migrations have been applied

```bash
psql "$DATABASE_URL" -c "\dt municipality_timeseries"
psql "$DATABASE_URL" -c "\dt municipality_biomass_provenance"
```

Both tables must exist — they are migrations 024 and 025. `municipality_biomass_provenance`
is the coverage guard; without it every crop reads as `no_data` regardless of what
is in the columns.

## 4. What data is actually loaded

```bash
psql "$DATABASE_URL" -c "
SELECT source_id, count(*) AS rows, count(DISTINCT ibge_code) AS munis,
       min(year) AS y0, max(year) AS y1
FROM municipality_timeseries GROUP BY source_id ORDER BY source_id;"

psql "$DATABASE_URL" -c "
SELECT source_id, stream, count(*)
FROM municipality_biomass_provenance GROUP BY 1,2 ORDER BY 1,2;"
```

Reference — what the local database looks like after #154 + #156:

| source_id | rows | municipalities |
|---|---|---|
| `ibge_ppm` | 1,433,650 | 5,543 |
| `snis` | 420,699 | 5,570 |
| `pam_1612` | 186,592 | 5,563 |
| `pam_1613` | 191,558 | 5,541 |
| `ibge_censo2022` | 5,570 | 5,570 |

Provenance: `pam_1612` soybean/corn/sugarcane 5,488 each; `pam_1613`
coffee/citrus 5,041 each; a residue of `sp_master_csv` rows is expected and
harmless (all zero-valued).

## 5. Demographics

```bash
psql "$DATABASE_URL" -c "
SELECT count(*) FILTER (WHERE population > 0)        AS pop,
       count(*) FILTER (WHERE population_density > 0) AS dens,
       count(*) FILTER (WHERE gdp_per_capita > 0)     AS pib,
       count(*)                                       AS total
FROM municipalities;"
```

645 means the SP-only load; 5,570 means Censo 2022 + PIB are in.

## 6. Which raw files are already on the VM

The promote scripts read these, and they are gitignored — a `git pull` will not
bring them.

```bash
ls -la /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend/data/raw/ 2>/dev/null
ls -la /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend/data/raw/pam/ 2>/dev/null
```

Needed for #154 + #156:

```
backend/data/raw/pam/TABELA_1612_*.xlsx          (4 files)
backend/data/raw/pam/TABELA_1613_*.xlsx          (5 files)
backend/data/raw/ibge_censo2022/Agregados_por_municipios_basico_BR.csv
backend/data/raw/ibge_pib/PIB_Municipios_2010-2023.xlsx
```

## 7. Services

```bash
pm2 list | grep -E "pilar-(frontend|backend)"
curl -s -o /dev/null -w "backend %{http_code}\n" 127.0.0.1:8001/api/v1/residuos/?limit=1
curl -s -o /dev/null -w "frontend %{http_code}\n" http://localhost/pilar2b/
```

Only `pilar-frontend` and `pilar-backend` belong to this app. `cp2b-backend`,
`abiove-*` and `postgrest-local` are other applications on the same box — leave
them alone.

---

## What the answers decide

- **Spine at 645** → this is a much larger job than a deploy; the national load
  has to happen first, and that is its own change window.
- **Spine at 5,571 but no PAM rows** → deploy code, copy raw files, run the two
  promote scripts. The expected path.
- **PAM rows already present** → only #156's read-side changes are needed; no
  data load at all.

Nothing above should be run as a deploy step. It is diagnosis, so the actual
deploy can be planned against what is really there rather than what we assume.
