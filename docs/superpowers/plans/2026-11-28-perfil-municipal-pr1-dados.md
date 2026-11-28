# Perfil municipal — PR 1: dados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carregar pelo contrato `ingest/` os dados novos do perfil municipal (Censo 2022 por idade e sexo, urbano/rural, histórico de população 1970–2022 e MapBiomas anual com soja), com gates, registro em `staging.ingest_runs` e um comando de promoção repetível.

**Architecture:** Quatro fontes novas em `backend/ingest/sources/`, cada uma com `SPEC/fetch/load/validate/promote`. Um módulo compartilhado lê snapshots da API SIDRA e outro grava o registro da carga (`staging.ingest_runs`) e faz upsert na tabela longa. Um script único `scripts/promote_profile_data.py` roda load → validate → promote numa transação. A migração 044 abre `municipality_land_cover` para o grupo `soy`, outras UFs e o `ingest_run_id`.

**Tech Stack:** Python 3, pandas, psycopg2, openpyxl, pytest; PostgreSQL 18 + PostGIS (produção), Docker `cp2b-db-dev` (local).

**Spec:** `docs/superpowers/specs/2026-11-28-perfil-municipal-seo-design.md` (seção "Design → 1. Dados novos" e "Deploy na VM").

## Global Constraints

- Todo código em `cp2b-workspace/NewLook/backend/`; comandos abaixo partem dessa pasta.
- Dados carregados nacionalmente (5.571) quando a fonte é nacional; land cover por parâmetro `--ufs`, padrão `35,31`.
- Valor ausente = **sem linha**, nunca 0. Nenhum placeholder.
- Snapshots brutos em `data/raw/<source_id>/<ano>/` (gitignored); `fetch` nunca sobrescreve um snapshot existente; `load` é puro.
- `municipality_timeseries.quality` só aceita `measured|interpolated|proxy|estimated`; usar `measured`.
- Upsert idempotente pela UNIQUE `(ibge_code, year, source_id, variable)`.
- Gate nacional do Censo 2022: soma = **203.080.756**; SP = **44.411.238**; MG = **20.539.989**. Censo 2010 Brasil = **190.755.799**.
- Claude nunca commita: cada passo "Commit" é Lucas rodando o comando sugerido. Branch nova a partir do `main` depois do merge dos PRs 60 e 61 (`feat/profile-data`); commits e PR em inglês, Conventional Commits (CONTRIBUTING.md).
- Testes: `python -m pytest <arquivo> -v` (ou dentro do container: `docker exec cp2b-backend-dev sh -c "cd /app && python -m pytest <arquivo> -v"`).

## Review Focus

1. **Município criado depois de 1970** (ex.: emancipado em 1993): o histórico não pode ter linha 0 para 1970/1980/1991; só os anos em que existia. Teste em Task 4.
2. **Valores SIDRA especiais** (`-`, `..`, `...`, `X`): viram ausência, nunca 0 nem erro de parse. Teste em Task 1.
3. **Município em dois biomas** no MapBiomas (duas linhas por classe): soma, não sobrescreve. Teste em Task 5.
4. **Rodar a promoção duas vezes** com o mesmo snapshot: mesmo conteúdo, um único registro em `staging.ingest_runs` (UNIQUE por checksum). Teste em Task 6.
5. **Gate falhando**: a promoção não escreve nada e sai com código ≠ 0. Teste em Task 6.

---

### Task 1: Leitor de snapshots SIDRA e registro de carga

**Files:**
- Create: `ingest/sidra_api.py`
- Create: `ingest/ledger.py`
- Test: `tests/unit/ingest/test_sidra_api.py`, `tests/unit/ingest/test_ledger.py`

**Interfaces:**
- Produces:
  - `sidra_api.snapshot_path(raw_dir: Path, source_id: str, year: int, uf: str) -> Path` → `raw_dir/source_id/year/<uf>.json`
  - `sidra_api.fetch_by_uf(url_template: str, raw_dir: Path, source_id: str, year: int, ufs: tuple[str, ...]) -> list[Path]` — baixa `url_template.format(uf=<código numérico da UF>)` só quando o arquivo não existe; nunca sobrescreve.
  - `sidra_api.read_rows(path: Path) -> list[dict]` — devolve as linhas de dados (descarta a linha de cabeçalho `rows[0]`), com `V` convertido para `float | None`.
  - `ledger.record_run(conn, source_id: str, reference_year: int, df: pd.DataFrame, gates_passed: bool, report_path: str) -> int` — insere em `staging.ingest_runs` (checksum de `ingest.gates.frame_checksum`) com `ON CONFLICT (source_id, reference_year, frame_checksum) DO UPDATE SET promoted_at = now()` e devolve o `id`.
  - `ledger.upsert_timeseries(conn, rows: list[dict], ingest_run_id: int) -> int` — rows com `ibge_code, year, source_id, variable, value, unit`; quality `measured`; upsert pela UNIQUE; devolve contagem.

- [ ] **Step 1: Testes falhando**

```python
# test_sidra_api.py
def test_read_rows_drops_header_and_maps_special_values(tmp_path):
    p = tmp_path / "35.json"
    p.write_text(json.dumps([
        {"V": "Valor", "D1C": "Município (Código)"},
        {"V": "17983", "D1C": "3521705"},
        {"V": "-", "D1C": "3500105"},
        {"V": "..", "D1C": "3500204"},
        {"V": "X", "D1C": "3500303"},
    ]), encoding="utf-8")
    rows = read_rows(p)
    assert [r["V"] for r in rows] == [17983.0, None, None, None]

def test_fetch_never_overwrites(tmp_path, monkeypatch):
    target = snapshot_path(tmp_path, "src", 2022, "35"); target.parent.mkdir(parents=True)
    target.write_text("[]")
    monkeypatch.setattr(sidra_api, "_download", lambda url: pytest.fail("downloaded"))
    assert fetch_by_uf("http://x/{uf}", tmp_path, "src", 2022, ("35",)) == [target]

# test_ledger.py (fake cursor que grava SQL e params)
def test_record_run_uses_frame_checksum_and_upserts(fake_conn):
    df = pd.DataFrame({"ibge_code": ["3521705"], "v": [1.0]})
    run_id = record_run(fake_conn, "ibge_censo_idade", 2022, df, True, "r.md")
    sql, params = fake_conn.executed[0]
    assert "ON CONFLICT (source_id, reference_year, frame_checksum)" in sql
    assert params[2] == frame_checksum(df)
    assert run_id == 1

def test_upsert_timeseries_binds_run_and_quality(fake_conn):
    n = upsert_timeseries(fake_conn, [{"ibge_code": "3521705", "year": 2022, "source_id": "s",
                                       "variable": "v", "value": 1.0, "unit": "pessoas"}], 7)
    sql, rows = fake_conn.executed[0]
    assert "ON CONFLICT (ibge_code, year, source_id, variable)" in sql
    assert rows[0]["ingest_run_id"] == 7 and rows[0]["quality"] == "measured" and n == 1
```

- [ ] **Step 2: Rodar e ver falhar** — `python -m pytest tests/unit/ingest/test_sidra_api.py tests/unit/ingest/test_ledger.py -v` → FAIL (módulos inexistentes).
- [ ] **Step 3: Implementar** `ingest/sidra_api.py` (download com `urllib.request`, timeout 120 s, `_download(url) -> bytes` isolado para o mock; códigos de UF via `ingest.ibge`) e `ingest/ledger.py` (`execute_batch` como em `scripts/promote_ibge_ppm.py`). `fake_conn` vai em `tests/unit/ingest/conftest.py`.
- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS.
- [ ] **Step 5: Commit** — `git add ingest/sidra_api.py ingest/ledger.py tests/unit/ingest/ && git commit -m "feat(ingest): add a per-state SIDRA reader and the load ledger"`

---

### Task 2: Fonte `ibge_censo_idade` (SIDRA 9514)

**Files:**
- Create: `ingest/sources/ibge_censo_idade/__init__.py`, `ingest/sources/ibge_censo_idade/source.py`
- Create: `tests/unit/ingest/fixtures/censo_9514_sample.json` (Itaberá + 1 município de MG, recortado de um snapshot real)
- Test: `tests/unit/ingest/test_censo_idade.py`

**Interfaces:**
- Consumes: `sidra_api.fetch_by_uf`, `sidra_api.read_rows`, `ledger.upsert_timeseries`
- Produces: frame longo `ibge_code:str, age_group:str, sex:str ('h'|'m'), population:float`; `AGE_GROUPS = ("0-4","5-9",…,"75-79","80+")` (17); variáveis gravadas `pop_<age_group>_<sex>` com `-` → `_` e `+` → `mais` (ex.: `pop_0_4_h`, `pop_80mais_m`), unit `pessoas`, year 2022.

- [ ] **Step 1: Testes falhando**

```python
def test_load_groups_single_ages_into_17_groups(sample_raw_dir):
    df = load(2022, sample_raw_dir)
    ita = df[df.ibge_code == "3521705"]
    assert sorted(ita.age_group.unique()) == sorted(AGE_GROUPS)
    assert ita.population.sum() == 17983           # total do Censo para Itaberá
    assert set(ita.sex) == {"h", "m"}

def test_variable_names():
    assert variable_name("0-4", "h") == "pop_0_4_h"
    assert variable_name("80+", "m") == "pop_80mais_m"

def test_validate_fails_when_uf_total_drifts(sample_frame):
    ctx = IngestContext(spec=SPEC, year=2022, published_totals={"SP": 44_411_238}, totals_column="population")
    results, _ = validate(sample_frame, ctx)          # amostra não soma SP inteiro
    assert not all(r.passed for r in results)
```

- [ ] **Step 2: Rodar e ver falhar** — `python -m pytest tests/unit/ingest/test_censo_idade.py -v` → FAIL.
- [ ] **Step 3: Implementar** `source.py`: `SPEC` (`key_column="ibge_code"`, `scope_ufs=()` nacional, `value_bounds={"population": (0, 12_500_000)}`); `URL` da API SIDRA para a tabela 9514, variável 93, nível N6 `in N3 {uf}`, sexo Homens/Mulheres, idade em anos simples **ou** grupos de 5 anos da classificação 287, forma de declaração Total. Escolher grupos prontos da classificação se ela tiver exatamente as 17 faixas; senão somar idades simples (decidir no primeiro snapshot real e registrar no docstring). `validate` = battery + aggregation por UF com `PUBLISHED_TOTALS = {"BR": 203_080_756, "SP": 44_411_238, "MG": 20_539_989}`. `promote(df, conn, run_id)` monta rows e chama `upsert_timeseries`.
- [ ] **Step 4: Rodar e ver passar** — mesmo comando → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(ingest): load census 2022 population by age and sex"`

---

### Task 3: Fonte `ibge_censo_situacao` (SIDRA 9923)

**Files:**
- Create: `ingest/sources/ibge_censo_situacao/{__init__,source}.py`, `tests/unit/ingest/fixtures/censo_9923_sample.json`
- Test: `tests/unit/ingest/test_censo_situacao.py`

**Interfaces:**
- Consumes: `sidra_api.*`
- Produces: frame `ibge_code:str, total:float, urban:float, rural:float`; `promote(df, conn, run_id)` faz `UPDATE municipalities SET urban_population=%s, rural_population=%s WHERE ibge_code=%s` (não toca `population`).

- [ ] **Step 1: Testes falhando**

```python
def test_load_itabera(sample_raw_dir):
    row = load(2022, sample_raw_dir).set_index("ibge_code").loc["3521705"]
    assert (row.total, row.urban, row.rural) == (17983, 12320, 5663)

def test_gate_urban_plus_rural_equals_total(sample_frame):
    bad = sample_frame.copy(); bad.loc[0, "urban"] += 1
    results, _ = validate(bad, IngestContext(spec=SPEC, year=2022))
    assert any(r.gate == "cross-source[urban_plus_rural]" and not r.passed for r in results)

def test_promote_updates_only_split_columns(fake_conn, sample_frame):
    promote(sample_frame, fake_conn, run_id=3)
    sql = fake_conn.executed[0][0]
    assert "urban_population" in sql and "rural_population" in sql and " population=" not in sql
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar**; gate extra `urban_plus_rural` via `cross_source_gate` (igualdade exata por município). Atualizar a seção "WHAT IS DELIBERATELY NOT WRITTEN" do docstring de `scripts/promote_ibge_demographics.py` apontando para esta fonte.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `git commit -m "feat(ingest): load census 2022 urban and rural population"`

---

### Task 4: Fonte `ibge_censo_historico` (SIDRA 200 + 4714)

**Files:**
- Create: `ingest/sources/ibge_censo_historico/{__init__,source}.py`, fixtures `censo_200_sample.json`, `censo_4714_sample.json` (Itaberá + um município criado depois de 1970)
- Test: `tests/unit/ingest/test_censo_historico.py`

**Interfaces:**
- Produces: frame `ibge_code:str, year:int, population:float`; `CENSUS_YEARS = (1970, 1980, 1991, 2000, 2010, 2022)`; variável gravada `populacao_residente`, unit `pessoas`. Snapshots em `data/raw/ibge_censo_historico/2022/{t200,t4714}_<uf>.json`.

- [ ] **Step 1: Testes falhando**

```python
def test_itabera_series(sample_raw_dir):
    s = load(2022, sample_raw_dir).query("ibge_code == '3521705'").set_index("year").population
    assert s.to_dict() == {1970: 14585, 1980: 16399, 1991: 17899, 2000: 18911, 2010: 17858, 2022: 17983}

def test_municipality_created_later_has_no_early_rows(sample_raw_dir):
    years = set(load(2022, sample_raw_dir).query("ibge_code == @NEW_CODE").year)
    assert 1970 not in years and 2022 in years
    assert (load(2022, sample_raw_dir).population > 0).all()
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar**: 200 (variável 93, todos os totais) para 1970–2010; 4714 (variável 93) para 2022. Linhas com valor `None` ou 0 são descartadas. Gates extras: total 2022 por UF = `PUBLISHED_TOTALS` da Task 2; total Brasil 2010 = 190.755.799 (tolerância 0,01%) quando o frame for nacional.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `git commit -m "feat(ingest): load census population from 1970 to 2022"`

---

### Task 5: Migração 044 e fonte `mapbiomas_cobertura`

**Files:**
- Create: `app/migrations/044_land_cover_soy_ingest.sql`
- Create: `ingest/sources/mapbiomas_cobertura/{__init__,source}.py`
- Modify: `scripts/load_municipality_land_cover.py` (só docstring: "aposentado; use ingest mapbiomas_cobertura")
- Test: `tests/unit/ingest/test_mapbiomas_cobertura.py`, `tests/unit/test_migration_044.py` (padrão de `test_migration_043.py`)

**Interfaces:**
- Produces: `GROUPS = ("forest","pasture","cane","soy","crops","silviculture","mosaic","urban","other")`; `group_of(level_1, level_2, level_4) -> str` (igual ao loader atual + `soy` quando `level_4` contém "Soybean", testado **antes** de `crops`); frame `ibge_code:str, year:int, group_key:str, area_ha:float`; `YEARS = range(1985, 2026)`; `load_from(xlsx: Path, ufs: tuple[str, ...]) -> pd.DataFrame` (leitura pura do arquivo, usada por `load(year, raw_dir, ufs=("35","31"))` e pelos testes). Snapshot: `data/raw/mapbiomas_cobertura/2025/MAPBIOMAS_BRAZIL-COL.11-BIOME_STATE_MUNICIPALITY.xlsx` (copiar de `A:\essencial-geo\dados-brutos\mapbiomas\estatisticas_municipios\`).
- Migração 044 (idempotente): `ALTER TABLE municipality_land_cover DROP CONSTRAINT IF EXISTS municipality_land_cover_uf`; recriar `municipality_land_cover_group` com `soy`; `ADD COLUMN IF NOT EXISTS ingest_run_id INTEGER REFERENCES staging.ingest_runs(id)`; `COMMENT`s atualizados ("crops = outras lavouras, sem soja e cana"); bloco de verificação no fim como na 041.

- [ ] **Step 1: Testes falhando**

```python
def test_soy_split_before_crops():
    assert group_of("3. Farming", "3.2. Agriculture", "3.2.1.1. Soybean") == "soy"
    assert group_of("3. Farming", "3.2. Agriculture", "3.2.1.2. Sugar cane") == "cane"
    assert group_of("3. Farming", "3.2. Agriculture", "3.2.1.5. Other Temporary Crops") == "crops"

def test_two_biomes_are_summed(sample_xlsx):        # fixture openpyxl com Itaberá em 2 biomas
    df = load_from(sample_xlsx, ufs=("35",))
    v = df.query("ibge_code=='3521705' and year==1985 and group_key=='pasture'").area_ha.item()
    assert v == pytest.approx(58141, abs=1)

def test_gate_group_sum_matches_source_total(sample_xlsx):
    results, _ = validate(load_from(sample_xlsx, ufs=("35",)), IngestContext(spec=SPEC, year=2025))
    assert next(r for r in results if r.gate == "cross-source[group_sum]").passed

def test_migration_044_allows_soy_and_other_ufs():
    sql = Path("app/migrations/044_land_cover_soy_ingest.sql").read_text()
    assert "'soy'" in sql and "DROP CONSTRAINT IF EXISTS municipality_land_cover_uf" in sql
    assert "ingest_run_id" in sql
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar**: `load(year, raw_dir, ufs=("35","31"))` reaproveitando a leitura do loader atual (sheet `COVERAGE_11`, colunas `geocode`, `class_level_1/2/4`, `y1985…y2025`), somando biomas. Gate `group_sum` (via `cross_source_gate("group_sum", …)`): soma dos 9 grupos por município e ano = soma de todas as linhas da fonte para esse município e ano (tolerância 0,01%). `promote(df, conn, run_id, ufs)`: `DELETE ... WHERE LEFT(ibge_code,2) = ANY(%s)` só das UFs carregadas, depois `execute_values` com `ingest_run_id`.
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Aplicar no Docker local e conferir** — `docker exec -i cp2b-db-dev psql -U postgres -d cp2b_maps -1 -v ON_ERROR_STOP=1 < app/migrations/044_land_cover_soy_ingest.sql` → sem erro; rodar duas vezes → sem erro.
- [ ] **Step 6: Commit** — `git commit -m "feat(ingest): load yearly land cover with soy split out"`

---

### Task 6: Script de promoção e registro das fontes

**Files:**
- Create: `scripts/promote_profile_data.py`
- Modify: `ingest/runner.py` (4 linhas em `SOURCES`)
- Modify: `../docs/data/METADATA.json` (4 entradas com os campos do `lineage_gate`, sem "VERIFY")
- Test: `tests/unit/test_promote_profile_data.py`

**Interfaces:**
- Consumes: `source.load/validate/promote` das Tasks 2–5, `ledger.record_run`, `ingest.report.write_report`
- Produces: CLI `python scripts/promote_profile_data.py --source <id> --year <ano> [--ufs 35,31] [--dry-run]`; `main(argv) -> int` (0 = promovido ou dry-run com gates verdes; 1 = gate falhou; 2 = erro de uso). Fluxo: load → validate (com `metadata_path`) → `write_report` → se `--dry-run` ou gate falhou, para; senão, numa transação: `record_run` → `source.promote(df, conn, run_id[, ufs])` → commit.

- [ ] **Step 1: Testes falhando**

```python
def test_failed_gate_writes_nothing(monkeypatch, fake_conn):
    _fake_source(monkeypatch, gates_pass=False)
    assert main(["--source", "ibge_censo_idade", "--year", "2022"]) == 1
    assert fake_conn.executed == []

def test_dry_run_writes_nothing(monkeypatch, fake_conn):
    _fake_source(monkeypatch, gates_pass=True)
    assert main(["--source", "ibge_censo_idade", "--year", "2022", "--dry-run"]) == 0
    assert fake_conn.executed == []

def test_rerun_same_frame_reuses_ledger_row(monkeypatch, fake_conn):
    _fake_source(monkeypatch, gates_pass=True)
    main(["--source", "ibge_censo_idade", "--year", "2022"]); main(["--source", "ibge_censo_idade", "--year", "2022"])
    ledger_sql = [s for s, _ in fake_conn.executed if "staging.ingest_runs" in s]
    assert len(ledger_sql) == 2 and all("ON CONFLICT" in s for s in ledger_sql)

def test_runner_lists_new_sources():
    from ingest.runner import SOURCES
    assert {"ibge_censo_idade", "ibge_censo_situacao", "ibge_censo_historico", "mapbiomas_cobertura"} <= set(SOURCES)
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** (DSN igual a `scripts/promote_ibge_ppm.py::dsn`; `sys.path` igual).
- [ ] **Step 4: Rodar e ver passar** — e a suíte toda de ingest: `python -m pytest tests/unit/ingest tests/unit/test_promote_profile_data.py tests/unit/test_migration_044.py -v` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(ingest): promote the profile data sources"`

---

### Task 7: Carga completa no Docker e roteiro de produção

**Files:**
- Create: `../docs/data/ingest_reports/{ibge_censo_idade,ibge_censo_situacao,ibge_censo_historico,mapbiomas_cobertura}_<ano>.md` (gerados)
- Create: `../docs/deploy/2026-11-perfil-dados.md` (roteiro da VM)

- [ ] **Step 1: Baixar snapshots e promover no Docker**, uma fonte por vez, primeiro `--dry-run`:
  `docker exec cp2b-backend-dev sh -c "cd /app && python scripts/promote_profile_data.py --source ibge_censo_idade --year 2022 --dry-run"` → gates todos PASS; depois sem `--dry-run`. Repetir para `ibge_censo_situacao`, `ibge_censo_historico` (`--year 2022`) e `mapbiomas_cobertura` (`--year 2025 --ufs 35,31`).
- [ ] **Step 2: Conferir no banco local**

```sql
SELECT source_id, left(ibge_code,2) uf, count(DISTINCT ibge_code) FROM municipality_timeseries
WHERE source_id LIKE 'ibge_censo%' AND left(ibge_code,2) IN ('35','31') GROUP BY 1,2;      -- 645 / 853
SELECT count(*) FILTER (WHERE urban_population IS NULL) FROM municipalities WHERE uf IN ('SP','MG');  -- 0
SELECT count(DISTINCT year), count(DISTINCT ibge_code) FROM municipality_land_cover;          -- 41 / 1498
SELECT year, group_key, area_ha FROM municipality_land_cover
WHERE ibge_code='3521705' AND year IN (1985,2025) AND group_key IN ('pasture','soy');          -- 58141→8798 / 4240→57546
SELECT source_id, reference_year, row_count, promoted_at FROM staging.ingest_runs ORDER BY id DESC LIMIT 4;
```
  Esperado: os números dos comentários (valores de Itaberá com tolerância de ±1 ha).
- [ ] **Step 3: Escrever o roteiro da VM** em `docs/deploy/2026-11-perfil-dados.md`: pré-checagem só leitura (`to_regnamespace('staging')`, consulta PAM/PPM da spec); `pg_dump -Fc -t municipality_land_cover -t municipality_timeseries -t municipalities -t staging.ingest_runs` para `/data/backups/` (criar com `sudo mkdir -p /data/backups && sudo chown postgres: /data/backups` — o usuário `lucas` não escreve em `/data`); migração 044 com `-1 -v ON_ERROR_STOP=1`; snapshots copiados para `/data/pilar2b_raw/` com `INGEST_RAW_DIR` apontando para lá; as 4 promoções; as consultas do Step 2 com `cp2b` no lugar de `cp2b_maps`; rollback com `pg_restore`.
- [ ] **Step 4: Commit** — `git commit -m "docs(deploy): add load reports and the production runbook"`

---

## Sequência dos PRs seguintes (cada um ganha seu próprio plano quando o anterior entrar)

| PR | Entrega | Depende de |
|---|---|---|
| 2 | `GET /municipalities/{ibge}/profile`: payload da spec, cidade de referência, distâncias, mapa SVG via PostGIS portando `build_mock.py` (`free`, `clear`, `RESERVED`), vizinhos de outra UF com sigla; testes com Itaberá, um município de divisa SP/PR, um de MG, um criado após 1970, um minúsculo da Grande SP; revisão visual de ~20 mapas | PR 1 em produção |
| 3 | Página parte 1 (topo, mapa, quem vive, terra, produção) em PT e EN, moldes de frase por língua, teste de chaves nos dois `messages/*.json` | PR 2, PRs 60/61 |
| 4 | Página parte 2 (energia com fatores da calculadora, vizinhos, perguntas, explorar), JSON-LD `Dataset`, title/description | PR 3 |
| 5 | `/municipalities/region/<slug>`, `/municipalities/ranking/<uf>`, sitemap com `lastModified` de `staging.ingest_runs`, `share-image` com mapa | PR 4 |
