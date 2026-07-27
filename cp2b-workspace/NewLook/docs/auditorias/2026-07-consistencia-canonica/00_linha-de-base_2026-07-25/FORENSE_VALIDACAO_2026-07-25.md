# Forense de validação — existe algum cálculo de erro predito × medido?

**Data:** 2026-07-25 · **Lote:** 0e · **Modo:** somente leitura, nada foi corrigido
**Escopo:** todas as refs (`--all`), incluindo os 1.079 commits da linhagem pré-squash
recuperados em 2026-07-25 e não alcançáveis a partir de `main`.
**Commit da auditoria:** `dbea3a7` · **Baseline:** `docs/data/baseline_2026-07-25.json`

---

## Resposta curta

> **NÃO EXISTE CÁLCULO.** Em nenhum ponto de nenhuma ref do repositório — nem na
> linhagem de `main`, nem nos 1.079 commits pré-squash — existe código, notebook,
> CSV ou planilha que compute um erro entre potencial predito e produção medida.
>
> Os três números que o manuscrito afirma (**19,69 M m³/dia**, **20,8 % MAE** e
> a composição **84,6 % / 61,3 %**) entram no repositório como **constantes
> literais copiadas do manuscrito**, todas no mesmo commit, `d0ff67c` de
> 2026-03-03. Nenhuma delas é derivada de nada versionado.
>
> **13,2 %** não existe em lugar nenhum, em nenhuma ref, em nenhuma época.
>
> Os dados que permitiriam calcular o MAE **existem** no repositório
> (`analysis/data/05c_anp_biometano_plants_latest.csv`: 10 plantas de SP com
> capacidade autorizada e volume medido) e **nada os consome**.

---

## (a) Busca executada

Termos: `MAE`, `mean absolute error`, `erro médio`, `erro médio absoluto`,
`prediction_error`, `validation`, `observed`, `measured`, e os literais
`13.2`, `20.8`, `19.69`, `133.82`, `15.2`, `48.3`.

Métodos:

| Método | Comando |
|---|---|
| Pickaxe sobre todas as refs, incluindo arquivos deletados | `git log --all -S"<termo>"` |
| Grep sobre árvores completas das duas linhagens | `git grep -nE … <ref>` |
| Grep sobre 400 commits do grafo | `git grep -nE "mean_absolute_error\|…" $(git rev-list --all --max-count=400)` |
| Notebooks | `git log --all --pretty=format: --name-only \| grep '\.ipynb$'` |

Resultados negativos, todos verificados:

| Busca | Resultado |
|---|---|
| `mean_absolute_error` (sklearn) em qualquer ref | **nenhuma ocorrência** |
| `mean absolute error` / `erro médio absoluto` como cálculo | **nenhuma ocorrência** |
| `abs(... - measured/observed/predicted/medido)` em `.py`/`.sql`/`.ts` | **nenhuma ocorrência** |
| Notebooks Jupyter (`.ipynb`) em qualquer ref | **nenhum arquivo, em nenhuma época** |
| `133.82` em qualquer ref | **nenhuma ocorrência** |
| `13.2` como percentual em `.md`/`.py`/`.sql`/`.ts` | **nenhuma ocorrência** |

Ocorrências de `15.2` e `48.3` existem apenas dentro de células de CSV e de
coordenadas geográficas — nenhuma é uma grandeza declarada. Idem para os hits de
`19.69` em `3fa30a9` (2025-12-01) e `6c856e2` (2025-12-02): inspecionados um a um,
são substrings de coordenadas de polígonos IBGE
(`centroid_lat: -19.687126…`) e de uma matriz de distâncias
(`('5203','1505',1708.2,2917950.4575,4984445719.6983)`). **Não são o total de SP.**

---

## (b) Cada ocorrência: CÁLCULO ou CONSTANTE

| # | Local | Valor | Commit | Data | Autor | Natureza |
|---|---|---|---|---|---|---|
| 1 | `backend/scripts/run_manuscript_validation.py:64` | `"total_M_m3_dia": 19.69` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** — chave do dict `MANUSCRIPT` |
| 2 | `backend/scripts/run_manuscript_validation.py:65` | `"industrial_scale_count": 125` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** |
| 3 | `backend/scripts/run_manuscript_validation.py:66` | `"medium_count": 293` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** |
| 4 | `backend/scripts/run_manuscript_validation.py:67` | `"sugarcane_pct_theoretical": 84.6` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** |
| 5 | `backend/scripts/run_manuscript_validation.py:68` | `"sugarcane_pct_practical": 61.3` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** |
| 6 | `backend/scripts/run_manuscript_validation.py:69` | `"mae_facility_pct": 20.8` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** |
| 7 | `backend/scripts/run_manuscript_validation.py:304` | `"The 20.8% MAE (manuscript) must be verified against"` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** — string de aviso |
| 8 | `backend/scripts/validate_manuscript_data.sql:10,32,42,45` | `19.69` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** — literal SQL `19.69 AS manuscript_M_m3_dia` |
| 9 | `backend/scripts/validate_manuscript_data.sql:200` | `20.8` | `d0ff67c` | 2026-03-03 | Claude | **CONSTANTE** — comentário |
| 10 | `backend/scripts/validate_manuscript_data.sql` §5 | fórmula de MAE | `d0ff67c` | 2026-03-03 | Claude | **CÁLCULO, MAS COMENTADO** — ver abaixo |
| 11 | `backend/ingest/sources/aneel_siga/source.py:6,15-16` | `19.69 vs 6.39` | `63b26a6` | 2026-07-03 | L. N. Cerejo | **CONSTANTE** — comentário, enquadra como erro de unidade kW→MW→GW |
| 12 | `backend/tests/unit/ingest/test_aneel_siga.py:45` | `19.69-vs-6.39` | `63b26a6` | 2026-07-03 | L. N. Cerejo | **CONSTANTE** — nome de classe de teste |
| 13 | `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:39,139` | `19.69 vs 6.39 MW/GW` | `63b26a6` | 2026-07-03 | L. N. Cerejo | **CONSTANTE** — pendência declarada |
| 14 | `docs/archive/2026-05-pre-squash/Outline_Paper_CP2b _) (1).md:16,107` | `19,69 milhões de m³ CH4/dia` | pré-squash | 2026-05-10 | L. Nakamura | **CONSTANTE** — afirmação no manuscrito |

O único trecho do repositório que **é** uma fórmula de MAE está inteiramente
comentado e condicionado a uma coluna que não existe no esquema
(`validate_manuscript_data.sql`, seção 5):

```sql
-- If 'measured_biogas_m3_year' exists, calculate MAE:
/*
SELECT
    COUNT(*)                                                AS n_facilities,
    ROUND(AVG(
        ABS(total_biogas_m3_year - measured_biogas_m3_year)
        / NULLIF(measured_biogas_m3_year, 0) * 100
    )::numeric, 2)                                          AS mae_pct,
    ROUND(SQRT(AVG(
        POWER(total_biogas_m3_year - measured_biogas_m3_year, 2)
    ))::numeric, 2)                                         AS rmse_m3_ano,
    ROUND(CORR(total_biogas_m3_year, measured_biogas_m3_year)::numeric, 4) AS r_squared_proxy
FROM municipalities
WHERE measured_biogas_m3_year > 0
  AND total_biogas_m3_year > 0;
*/
```

A coluna `measured_biogas_m3_year` **não existe** em nenhuma migração do
repositório. O que o script de fato executa é uma sondagem de
`information_schema` procurando qualquer coluna cujo nome case com `%measured%`,
`%observed%`, `%actual%`, `%modelled%`, `%predicted%`, `%estimated%`,
`%reference%` ou `%validated%`; quando não encontra nada — o caso real — imprime
(`run_manuscript_validation.py:302-305`):

```
    No measured/observed columns found.
    The 20.8% MAE (manuscript) must be verified against
    an external reference dataset (Table 4 source data).
```

O próprio script declara, portanto, que o 20,8 % não é verificável contra o banco.

---

## (c) Genealogia de 19,69

**Primeira aparição como total estadual:** commit `d0ff67c`, **2026-03-03**,
autor `Claude`, mensagem *"Add performance benchmark and manuscript data
validation scripts"*. O commit adiciona três arquivos e nada mais
(`benchmark_endpoints.py` +454, `run_manuscript_validation.py` +371,
`validate_manuscript_data.sql` +271).

O valor entra já rotulado como **afirmação do manuscrito**, não como resultado:

```sql
--    Manuscript claim: 19.69 M m³/dia (≈ 7,187 M m³/ano)
    19.69                                                 AS manuscript_M_m3_dia,
```

**Qual script o produziu:** **nenhum.** Não há, em nenhuma ref, script que emita
19,69. O fluxo é o inverso do que o nome dos arquivos sugere: o número vem de
fora, do manuscrito, e o script existe para *conferir o banco contra ele*.

**Com que fórmula:** o manuscrito declara a fórmula, no arquivo recuperado
`docs/archive/2026-05-pre-squash/Outline_Paper_CP2b _) (1).md:107`:

> *"O Potencial Mobilizável corrigido pelos quatro fatores de correção (FC, FCo,
> FS, FL) totalizou 19,69 milhões de m³ CH4/dia"*

e em `:16`:

> *"O Estado de São Paulo, com 47 plantas operacionais de biogás em contraste com
> um potencial mobilizável de 19,69 milhões de m³ de CH4/dia"*

Ou seja: **CH₄/dia após FC×FCo×FS×FL** — exatamente a grandeza que o pipeline
canônico produz hoje como **3,6488 M m³/dia** (baseline, cenário medio).
**Razão: 5,40×.**

### O enquadramento corrente do 19,69 está errado

`backend/ingest/sources/aneel_siga/source.py:15-16` e
`docs/planning/BRAZIL_EXPANSION_ROADMAP.md:39` tratam "19.69 vs 6.39" como
**discrepância de unidade elétrica da ANEEL** (kW lido como MW ou GW). A auditoria
de 2026-07-25 repetiu esse enquadramento (Bloco F.5 e lacuna I.3#18) por segui-lo.

O outline recuperado mostra que isso não procede: 19,69 é **potencial de CH₄ em
M m³/dia do Estado de São Paulo**, a grandeza-título do manuscrito, e 6,39 era o
valor canônico de **biogás** em M m³/dia da revisão de junho de 2026. São duas
grandezas do mesmo pipeline em épocas diferentes, não capacidade elétrica.

### Hipótese de unidade — NÃO CONFIRMADA, registrada como pista

Somando a coluna `biogas_m3_yr` do dataset que alimentava a versão anterior da
plataforma:

```
analysis/data/01_master_residue_streams_SP_2023.csv
soma biogas_m3_yr = 19.900.698.323 m³/ano  =  19,90 G m³/ano  =  54,52 M m³/dia
```

conferido contra `analysis/data/04_state_summary_by_stream.csv`, que soma
**19.900,70 M m³/ano** — o mesmo número.

**19,90 G m³/ano** e **19,69 M m³/dia** compartilham a mantissa aproximada e
diferem em 1,06 %. É compatível com um total anual em bilhões de m³ ter sido
transcrito como total diário em milhões de m³, mas **os dígitos não batem
exatamente** e nenhum artefato versionado produz 19,69. **Não afirmo essa
origem.** Registro a coincidência e o que ela exigiria para ser confirmada: uma
versão anterior do master CSV cuja soma seja exatamente 19,69 G m³/ano. Não a
encontrei nas refs disponíveis.

O que é certo: o valor canônico corrente para a grandeza que o manuscrito nomeia
é **3,6488 M m³/dia**, e 19,69 não é derivável de nada versionado.

---

## (d) 13,2 % e 20,8 %

| Número | Existe no repositório? | Natureza | Calculável a partir de algo versionado? |
|---|---|---|---|
| **20,8 %** (MAE facility-level) | Sim, 3 ocorrências | **CONSTANTE** importada do manuscrito em `d0ff67c` (2026-03-03) | **NÃO. NÃO EXISTE CÁLCULO.** A única fórmula está comentada e depende de coluna inexistente |
| **13,2 %** | **Não. Zero ocorrências em qualquer ref, em qualquer época** | — | **NÃO EXISTE CÁLCULO.** O número não existe no repositório |

Para o 20,8 %, os quatro elementos necessários a um MAE — conjunto de plantas,
valor predito por planta, valor medido por planta, e a agregação — **nenhum está
implementado**. `validation_plants` tem as colunas `theoretical_potential_nm3`,
`predicted_available_nm3`, `prediction_error_pct` e `utilization_rate_pct`, e as
seis linhas que a migração insere deixam as quatro **nulas**.

---

## (e) `010_create_validation_plants_FIXED.sql` — ele preenche os campos nulos?

**NÃO.** A resposta a D11 é negativa.

Comparação (`docs/archive/2026-05-pre-squash/backend-migrations/010_create_validation_plants_FIXED.sql`,
399 linhas, contra `backend/migrations/010_create_validation_plants.sql`, 370 linhas):

| Aspecto | FIXED | Corrente |
|---|---|---|
| Plantas inseridas | **6** | **6** — as mesmas |
| `theoretical_potential_nm3` preenchido | **não** | não |
| `predicted_available_nm3` preenchido | **não** | não |
| `prediction_error_pct` preenchido | **não** | não |
| `utilization_rate_pct` preenchido | **não** | não |

O que o FIXED de fato muda é **robustez de execução**, não dados:

| Mudança | FIXED | Corrente |
|---|---|---|
| FK de município | `municipality_id INT` (comentário: *"Optional FK - can be NULL if municipality not in main table"*) | `municipality_id INT REFERENCES municipalities(id)` |
| CHECK de throughput | `annual_throughput_tons IS NULL OR … > 0` | `annual_throughput_tons > 0` |
| CHECK de erro de predição | `prediction_error_pct IS NULL OR … BETWEEN -100 AND 1000` | `prediction_error_pct BETWEEN -100 AND 1000` |
| CHECK de utilização | `utilization_rate_pct IS NULL OR … >= 0` | `utilization_rate_pct >= 0` |
| Índices | `CREATE INDEX IF NOT EXISTS` (7×) | `CREATE INDEX` |
| Triggers | precedidos de `DROP TRIGGER IF EXISTS` | sem guarda |
| Agregações da view | envoltas em `ROUND(…::numeric, n)` | sem arredondamento |

Leitura direta: o FIXED é a versão **idempotente e tolerante a nulos** da mesma
migração. Ele foi escrito justamente porque os campos de validação **são** nulos —
os `CHECK` da versão corrente rejeitam `NULL` e a migração corrente não é
re-executável. É correção de engenharia, não de dados. **Não há validação
empírica escondida nele.**

---

## (f) Arquivos com dados de plantas reais de biogás em SP

Todos presentes em `main` hoje, em `analysis/data/`. Nenhum é lido por código do
backend, do frontend ou do pipeline canônico — verificado por grep dos nomes de
arquivo em todo o repositório.

| Arquivo | Linhas | Registros de SP | Nome | Capacidade | **Produção medida** | Coordenadas |
|---|---:|---:|---|---|---|---|
| `analysis/data/05c_anp_biometano_plants_latest.csv` | 21 | **10** | `razao_social` | `cap_biometano_m3d`, `cap_biogas_m3d` | **`vol_biogas_m3d`, `util_pct`** | não (município/UF) |
| `analysis/data/05e_anp_biometano_plant_volume_monthly.csv` | 512 | série mensal | `operator` | `cap_biometano_m3d` | **`vol_biogas_m3d`, `util_pct`** | não |
| `analysis/data/05_biogas_plants_brazil.csv` | 29 | **17** | `plant_name`, `operator`, `cnpj` | `elec_capacity_mw`, `biogas_nm3_day` | **`processed_biogas_nm3_day_latest` (10 de 17), `utilization_pct_latest`** | **sim (17/17)** |
| `analysis/data/05g_aneel_biogas_gd_plants.csv` | 547 | **34** | `operator` | `elec_capacity_kw` | **não — só capacidade** | **sim (34/34)** |
| `analysis/data/05h_aneel_biogas_gd_summary.csv` | — | agregado | — | kW | não | não |
| `analysis/data/05b_biogas_aggregates_by_state.csv` | — | agregado | — | — | — | — |
| `analysis/data/05d_anp_biometano_production_state_monthly.csv` | — | série estadual | — | — | **volume mensal por UF** | não |
| `analysis/data/05f_anp_fleet_stats.csv` | — | — | — | — | — | — |
| `backend/migrations/010_create_validation_plants.sql` | 370 | **6** (INSERT) | `plant_name` | `annual_biogas_production_nm3` | não — campos de comparação nulos | sim, marcadas *"approximate"* |
| `docs/archive/2026-05-pre-squash/backend-migrations/010_..._FIXED.sql` | 399 | **6** | idem | idem | não | idem |

### As dez plantas de SP com produção medida (ANP)

`analysis/data/05c_anp_biometano_plants_latest.csv` — capacidade autorizada
versus volume de biogás efetivamente processado:

| Razão social | Município | `cap_biometano_m3d` | `vol_biogas_m3d` | `util_pct` |
|---|---|---:|---:|---:|
| ESSENCIS BIOMETANO S.A. | Caieiras | 67.200,0 | 63.458,0 | 45 |
| RAÍZEN-GEO BIOGÁS COSTA PINTO LTDA. | Piracicaba | 130.368,0 | 31.570,0 | 14 |
| METAGÁS BIOGÁS E ENERGIA S.A | São Paulo | 30.000,0 | 27.902,0 | 47 |
| COCAL ENERGIA S.A. | Narandiba | 27.112,0 | 19.087,0 | 37 |
| ENGEP AMBIENTAL LTDA | Jambeiro | 30.000,0 | 17.440,0 | 21 |
| CRI GEO BIOGAS S.A. | Elias Fausto | 23.694,0 | 11.925,0 | 20 |
| BIOMETANO VERDE PAULINIA S.A. | Paulínia | 106.867,0 | 208,0 | 0 |
| BIOENERGIA SANTA CRUZ LTDA. | Américo Brasiliense | 82.575,0 | 16,0 | 0 |
| GASGRID GÁS E ENERGIA S.A | São Paulo | 30.000,0 | 0,0 | 0 |
| COCAL ENERGIA PPT PARTICIPAÇÕES LTDA | Paraguaçu Paulista | 60.000,0 | 0,0 | 0 |

Duas dessas plantas — `COCAL ENERGIA S.A.` (Narandiba) e a Raízen em Piracicaba —
correspondem às linhas `Cocal Narandiba` e `Raízen Geo Biogás Bonfim` inseridas
por `010_create_validation_plants.sql`, que declaram `annual_biogas_production_nm3`
de 8.900.000 e 19.000.000 Nm³/ano com fonte `ANEEL/EPE 2023`. **São valores
diferentes dos da ANP**, de anos diferentes, e nenhum dos dois conjuntos é
confrontado com predição em lugar nenhum.

### Nota sobre "47 plantas operacionais"

O outline afirma *"47 plantas operacionais de biogás"* em SP
(`Outline_Paper_CP2b _) (1).md:16`). Os totais de SP nos datasets versionados são
**10** (ANP, biometano), **17** (dataset consolidado Brasil-SP) e **34** (ANEEL GD,
geração elétrica distribuída). 10 + 34 = 44; 17 + 34 = 51. **Nenhuma combinação dá
47**, e nenhum arquivo do repositório declara 47.

---

## Consequência para a auditoria de 2026-07-25

Esta forense **confirma** as lacunas F.5 e I.3#15 — nenhuma métrica de erro é
calculada — e **agrava** o diagnóstico em dois pontos que a auditoria não
alcançou por ter sido feita sobre clone raso:

1. A auditoria não registrou o dicionário `MANUSCRIPT` de
   `run_manuscript_validation.py:62-69`. Existe um manuscrito afirmando
   **19,69 M m³/dia**, **20,8 % de MAE** e composição **84,6 % / 61,3 %**, e o
   repositório não computa nenhum dos três.
2. A auditoria adotou o enquadramento de `BRAZIL_EXPANSION_ROADMAP.md:39`,
   segundo o qual "19.69 vs 6.39" é pendência de unidade da ANEEL. O outline
   recuperado mostra que 19,69 é o potencial de CH₄/dia de São Paulo — 5,40× o
   valor canônico corrente.

Errata formal em `docs/auditorias/2026-07-consistencia-canonica/00_linha-de-base_2026-07-25/ATIVIDADE_GIT_COMPLETA_2026-07-25.md` (Lote 0c).

---

## Fontes desta forense

| Item | Comando / arquivo |
|---|---|
| Pickaxe em todas as refs | `git log --all -S"<termo>"` |
| Árvore pré-squash | `ec52631959a777d27c2f6a7df038b203d6d6a356` |
| Commit de origem das constantes | `d0ff67c` (2026-03-03) |
| Somas dos CSVs | `analysis/data/01_master_residue_streams_SP_2023.csv`, `04_state_summary_by_stream.csv` |
| Valor canônico corrente | `cp2b-workspace/NewLook/docs/data/baseline_2026-07-25.json` |

Nada foi corrigido. Nenhum valor foi alterado. Nenhum código foi tocado.
