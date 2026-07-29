# A4 — Recuperação da linhagem a partir do banco

**Data da auditoria:** 2026-07-26  
**Banco:** `cp2b_maps`, serviço `db`, container `cp2b-db-dev`, PostgreSQL/PostGIS `postgis/postgis:15-3.4`  
**Modo:** todas as consultas executadas dentro de `BEGIN TRANSACTION READ ONLY`; nenhuma escrita no banco; `feedstocks.yaml` não alterado.

## Conclusão executiva

A hipótese de que as observações individuais de BMP estejam preservadas no banco ativo **não se confirmou**.

- A tabela que poderia guardar as observações, `public.residuo_references`, contém 107 linhas, das quais 40 são rotuladas `parameter_type = 'bmp'`.
- As 40 linhas BMP têm `reported_value = NULL`, `reported_unit = NULL` e `doi = NULL`.
- A busca por DOI também nos campos textuais dessas 40 linhas retornou zero.
- `public.scientific_references`, a tabela que mais diretamente corresponderia ao corpus de aproximadamente 400 artigos, está vazia.
- Para vinhaça, existem cinco referências textuais rotuladas BMP, mas nenhuma contém valor, unidade, DOI, regime ou denominador.
- As sete observações declaradas pelo CSV agregado não são recuperáveis do banco. O valor máximo agregado de 968 e a codigestão próxima de 970,8 NmL CH₄/g VS não aparecem no banco.

O banco guarda **rótulos de referência por feedstock**, não a linhagem observação → valor → unidade → DOI que gerou `feedstock_bmp_from_refs.csv`.

---

# Parte I — Inventário de esquema

Esta parte foi concluída antes de qualquer consulta a linhas de dados ou contagens.

## 1. Consulta inicial obrigatória

Foi executado:

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name;
```

## 2. Inventário completo das 70 tabelas retornadas

| Schema | Tabelas |
|---|---|
| `public` | `auth_access_log`, `auth_token_denylist`, `auth_users`, `biogas_plants`, `br_region_distances`, `calculator_leads`, `conversion_factors`, `gas_pipelines`, `geography_columns`, `geometry_columns`, `intermediate_regions`, `municipalities`, `municipalities_with_infrastructure`, `municipality_rankings`, `municipality_summary`, `power_substations`, `power_transmission_lines`, `residue_streams_sp2023`, `residuo_references`, `residuos`, `residuos_reference_counts`, `residuos_with_sectors`, `scientific_references`, `sector_statistics`, `sectors`, `spatial_ref_sys`, `states`, `subsectors`, `technology_cards`, `technology_references`, `user_routes`, `validation_plants`, `wastewater_treatment_plants` |
| `staging` | `ingest_runs` |
| `tiger` | `addr`, `addrfeat`, `bg`, `county`, `county_lookup`, `countysub_lookup`, `cousub`, `direction_lookup`, `edges`, `faces`, `featnames`, `geocode_settings`, `geocode_settings_default`, `loader_lookuptables`, `loader_platform`, `loader_variables`, `pagc_gaz`, `pagc_lex`, `pagc_rules`, `place`, `place_lookup`, `secondary_unit_lookup`, `state`, `state_lookup`, `street_type_lookup`, `tabblock`, `tabblock20`, `tract`, `zcta5`, `zip_lookup`, `zip_lookup_all`, `zip_lookup_base`, `zip_state`, `zip_state_loc` |
| `topology` | `layer`, `topology` |

Há um único banco de aplicação no container: `cp2b_maps` (55 MB). Os demais bancos conectáveis são `postgres`, `template1` e `template_postgis`. Os schemas de `cp2b_maps` são `public`, `staging`, `tiger`, `tiger_data`, `topology` e os schemas internos do PostgreSQL.

## 3. Seleção das tabelas candidatas

Pelo nome, sete objetos sugerem referências, parâmetros/fatores, BMP ou literatura:

1. `public.conversion_factors`;
2. `public.residue_streams_sp2023`;
3. `public.residuo_references`;
4. `public.residuos`;
5. `public.residuos_reference_counts`;
6. `public.scientific_references`;
7. `public.technology_references`.

`residuos_reference_counts` é uma `VIEW`; os outros seis objetos são `BASE TABLE`.

## 4. Esquema completo das tabelas candidatas

Tipos abaixo são os tipos declarados por `information_schema.columns`; `NULL` indica que a coluna aceita nulos.

### `public.conversion_factors` — 14 colunas

| # | Coluna | Tipo | Nulo? |
|---:|---|---|:---:|
| 1 | `id` | `integer` | não |
| 2 | `category` | `text` | não |
| 3 | `subcategory` | `text` | não |
| 4 | `factor_value` | `real` | não |
| 5 | `unit` | `text` | não |
| 6 | `literature_reference` | `text` | sim |
| 7 | `reference_url` | `text` | sim |
| 8 | `real_data_validation` | `text` | sim |
| 9 | `safety_margin_percent` | `real` | sim |
| 10 | `final_factor` | `real` | sim |
| 11 | `date_validated` | `date` | sim |
| 12 | `notes` | `text` | sim |
| 13 | `created_at` | `timestamp with time zone` | sim |
| 14 | `updated_at` | `timestamp with time zone` | sim |

### `public.residue_streams_sp2023` — 31 colunas

| # | Coluna | Tipo | Nulo? |
|---:|---|---|:---:|
| 1 | `id` | `integer` | não |
| 2 | `ibge_code` | `integer` | não |
| 3 | `municipality_name` | `text` | não |
| 4 | `lat` | `double precision` | sim |
| 5 | `lon` | `double precision` | sim |
| 6 | `area_km2` | `double precision` | sim |
| 7 | `populacao_2022` | `double precision` | sim |
| 8 | `densidade_demografica` | `double precision` | sim |
| 9 | `cd_rgi` | `integer` | sim |
| 10 | `cd_rgint` | `integer` | sim |
| 11 | `year` | `integer` | sim |
| 12 | `residue_stream` | `text` | não |
| 13 | `residue_stream_pt` | `text` | sim |
| 14 | `sector` | `text` | sim |
| 15 | `sector_pt` | `text` | sim |
| 16 | `residue_tons_yr` | `double precision` | sim |
| 17 | `biogas_m3_yr` | `double precision` | sim |
| 18 | `energy_gwh_yr` | `double precision` | sim |
| 19 | `energy_mwh_yr` | `double precision` | sim |
| 20 | `biogas_m3_per_capita` | `double precision` | sim |
| 21 | `biogas_m3_per_km2` | `double precision` | sim |
| 22 | `conversion_factor` | `double precision` | sim |
| 23 | `cf_unit` | `text` | sim |
| 24 | `bagaco_excluded_pct` | `double precision` | sim |
| 25 | `mun_total_gwh` | `double precision` | sim |
| 26 | `mun_potential_class` | `text` | sim |
| 27 | `mun_n_streams` | `integer` | sim |
| 28 | `mun_dominant_stream` | `text` | sim |
| 29 | `source_dataset` | `text` | sim |
| 30 | `notes` | `text` | sim |
| 31 | `created_at` | `timestamp with time zone` | sim |

### `public.residuo_references` — 17 colunas

| # | Coluna | Tipo | Nulo? |
|---:|---|---|:---:|
| 1 | `id` | `integer` | não |
| 2 | `residuo_id` | `integer` | não |
| 3 | `parameter_type` | `text` | não |
| 4 | `citation` | `text` | não |
| 5 | `authors` | `text` | sim |
| 6 | `title` | `text` | sim |
| 7 | `journal` | `text` | sim |
| 8 | `year` | `integer` | sim |
| 9 | `volume` | `text` | sim |
| 10 | `pages` | `text` | sim |
| 11 | `doi` | `text` | sim |
| 12 | `url` | `text` | sim |
| 13 | `reported_value` | `real` | sim |
| 14 | `reported_unit` | `text` | sim |
| 15 | `is_primary` | `boolean` | sim |
| 16 | `validation_status` | `text` | sim |
| 17 | `created_at` | `timestamp with time zone` | sim |

Esta é a única tabela candidata com campos explícitos para valor e unidade de uma referência. Ela **não possui** colunas de substrato, regime, duração, denominador, filtragem ou condições normais.

### `public.residuos` — 44 colunas

| # | Coluna | Tipo | Nulo? |
|---:|---|---|:---:|
| 1 | `id` | `integer` | não |
| 2 | `codigo` | `text` | não |
| 3 | `nome` | `text` | não |
| 4 | `nome_en` | `text` | sim |
| 5 | `sector_codigo` | `text` | não |
| 6 | `subsector_codigo` | `text` | sim |
| 7 | `categoria_codigo` | `text` | sim |
| 8 | `categoria_nome` | `text` | sim |
| 9 | `bmp_min` | `real` | sim |
| 10 | `bmp_medio` | `real` | não |
| 11 | `bmp_max` | `real` | sim |
| 12 | `bmp_unidade` | `text` | sim |
| 13 | `ts_min` | `real` | sim |
| 14 | `ts_medio` | `real` | sim |
| 15 | `ts_max` | `real` | sim |
| 16 | `vs_min` | `real` | sim |
| 17 | `vs_medio` | `real` | sim |
| 18 | `vs_max` | `real` | sim |
| 19 | `chemical_cn_ratio` | `real` | sim |
| 20 | `chemical_ch4_content` | `real` | sim |
| 21 | `fc_min` | `real` | sim |
| 22 | `fc_medio` | `real` | sim |
| 23 | `fc_max` | `real` | sim |
| 24 | `fcp_min` | `real` | sim |
| 25 | `fcp_medio` | `real` | sim |
| 26 | `fcp_max` | `real` | sim |
| 27 | `fs_min` | `real` | sim |
| 28 | `fs_medio` | `real` | sim |
| 29 | `fs_max` | `real` | sim |
| 30 | `fl_min` | `real` | sim |
| 31 | `fl_medio` | `real` | sim |
| 32 | `fl_max` | `real` | sim |
| 33 | `fator_pessimista` | `real` | sim |
| 34 | `fator_realista` | `real` | sim |
| 35 | `fator_otimista` | `real` | sim |
| 36 | `generation` | `text` | sim |
| 37 | `destination` | `text` | sim |
| 38 | `justification` | `text` | sim |
| 39 | `icon` | `text` | sim |
| 40 | `created_at` | `timestamp with time zone` | sim |
| 41 | `updated_at` | `timestamp with time zone` | sim |
| 42 | `cn_ratio_min` | `real` | sim |
| 43 | `cn_ratio_max` | `real` | sim |
| 44 | `kinetics` | `jsonb` | sim |

### `public.residuos_reference_counts` — 10 colunas

| # | Coluna | Tipo | Nulo? |
|---:|---|---|:---:|
| 1 | `id` | `integer` | sim |
| 2 | `codigo` | `text` | sim |
| 3 | `nome` | `text` | sim |
| 4 | `sector_codigo` | `text` | sim |
| 5 | `total_references` | `bigint` | sim |
| 6 | `bmp_references` | `bigint` | sim |
| 7 | `ts_references` | `bigint` | sim |
| 8 | `vs_references` | `bigint` | sim |
| 9 | `cn_references` | `bigint` | sim |
| 10 | `ch4_references` | `bigint` | sim |

### `public.scientific_references` — 21 colunas

| # | Coluna | Tipo | Nulo? |
|---:|---|---|:---:|
| 1 | `id` | `integer` | não |
| 2 | `paper_id` | `integer` | sim |
| 3 | `doi` | `character varying` | sim |
| 4 | `title` | `text` | não |
| 5 | `authors` | `text` | sim |
| 6 | `journal` | `character varying` | sim |
| 7 | `publisher` | `character varying` | sim |
| 8 | `publication_year` | `integer` | sim |
| 9 | `abstract` | `text` | sim |
| 10 | `keywords` | `text` | sim |
| 11 | `sector` | `character varying` | sim |
| 12 | `sector_full` | `character varying` | sim |
| 13 | `primary_residue` | `character varying` | sim |
| 14 | `pdf_filename` | `character varying` | sim |
| 15 | `codename_short` | `character varying` | sim |
| 16 | `external_url` | `text` | sim |
| 17 | `validation_status` | `character varying` | sim |
| 18 | `has_validated_params` | `boolean` | sim |
| 19 | `metadata_confidence` | `character varying` | sim |
| 20 | `created_at` | `timestamp with time zone` | sim |
| 21 | `updated_at` | `timestamp with time zone` | sim |

### `public.technology_references` — 6 colunas

| # | Coluna | Tipo | Nulo? |
|---:|---|---|:---:|
| 1 | `id` | `uuid` | não |
| 2 | `technology_id` | `character varying` | sim |
| 3 | `reference_id` | `integer` | não |
| 4 | `relevance_note` | `text` | sim |
| 5 | `display_order` | `integer` | sim |
| 6 | `created_at` | `timestamp without time zone` | sim |

Nenhuma das sete tabelas possui coluna de versão. `conversion_factor` contém a sequência de caracteres “version”, mas é um fator numérico, não uma coluna de versionamento.

---

# Parte II — Consultas de dados

Somente depois de concluir o inventário acima foram executadas consultas de contagem, datas e conteúdo.

## 5. Atualidade das tabelas candidatas

| Tabela | Tipo | Linhas | `created_at` mínimo | `created_at` máximo | `updated_at` mínimo | `updated_at` máximo | Versão? |
|---|---|---:|---|---|---|---|:---:|
| `conversion_factors` | tabela | 8 | 2026-05-03 21:47:20.735473 UTC | 2026-05-03 21:47:20.741894 UTC | 2026-05-03 21:47:20.735473 UTC | 2026-05-03 21:47:20.741894 UTC | não |
| `residue_streams_sp2023` | tabela | 5.769 | 2026-05-09 14:45:52.5761 UTC | 2026-05-09 14:45:52.5761 UTC | inexistente | inexistente | não |
| `residuo_references` | tabela | 107 | 2026-05-03 21:47:20.582029 UTC | 2026-05-03 21:47:20.711176 UTC | inexistente | inexistente | não |
| `residuos` | tabela | 19 | 2026-05-03 21:47:20.552091 UTC | 2026-05-03 21:47:20.569674 UTC | 2026-05-03 21:47:20.552091 UTC | 2026-05-03 21:47:20.569674 UTC | não |
| `residuos_reference_counts` | view | 19 | inexistente | inexistente | inexistente | inexistente | não |
| `scientific_references` | tabela | **0** | — | — | — | — | não |
| `technology_references` | tabela | **0** | — | — | inexistente | inexistente | não |

O arquivo `feedstock_bmp_from_refs.csv` entrou no histórico Git no commit `c588a4f9d2426d93647e7ae91669ea0bbf6f9cec`, de **2026-06-12 07:02:00 −03:00**.

Todos os registros datáveis das tabelas candidatas foram carregados em 3 ou 9 de maio de 2026, portanto **antes** da consolidação de 12 de junho. Não há atualização posterior nem versionamento que indique sincronização com o CSV agregado. Para as duas tabelas vazias, não há data de conteúdo.

Conclusão de atualidade: o conteúdo candidato do banco é anterior à consolidação e representa um estado mais antigo e muito mais esparso.

## 6. O que existe em `residuo_references`

| `parameter_type` | Linhas | Com valor | Com DOI estruturado | Com valor + DOI |
|---|---:|---:|---:|---:|
| `bmp` | 40 | **0** | **0** | **0** |
| `ch4_content` | 27 | 0 | 1 | 0 |
| `cn_ratio` | 14 | 0 | 1 | 0 |
| `ts` | 17 | 0 | 3 | 0 |
| `vs` | 9 | 0 | 0 | 0 |
| **Total** | **107** | **0** | **5** | **0** |

Uma segunda busca procurou padrões DOI (`10.<prefixo>/...`) em `doi`, `url`, `citation` e `title`. Para as 40 linhas BMP, o resultado também foi **zero**. Assim, “DOI ausente” não é apenas falha da coluna estruturada.

## 7. Cobertura dos 28 feedstocks canônicos

Definição usada para “observação individual de BMP com DOI”: linha de `residuo_references` com:

```sql
lower(parameter_type) = 'bmp'
AND reported_value IS NOT NULL
AND DOI presente na coluna ou nos campos textuais
```

Todas as 28 contagens são zero. A coluna “stubs BMP” mostra referências textuais rotuladas BMP, sem valor ou DOI; ela não é contada como observação.

| Feedstock | Existe em `residuos`? | Stubs BMP no banco | Observações BMP com valor + DOI | `n_bmp_obs` agregado | Diferença banco − agregado |
|---|:---:|---:|---:|---:|---:|
| `BAGACO` | sim | 0 | **0** | 6 | −6 |
| `PALHA` | sim | 0 | **0** | 14 | −14 |
| `VINHACA` | sim | 5 | **0** | 7 | −7 |
| `TORTA_FILTRO` | sim | 2 | **0** | 14 | −14 |
| `BAGACO_CITROS` | sim | 3 | **0** | 10 | −10 |
| `CASCAS_CITROS` | sim | 3 | **0** | 1 | −1 |
| `CASCA_CAFE` | sim | 5 | **0** | 2 | −2 |
| `POLPA_CAFE` | sim | 0 | **0** | 1 | −1 |
| `MUCILAGEM_CAFE` | sim | 0 | **0** | 0 | 0 |
| `CASCA_SOJA` | sim | 2 | **0** | 0 | 0 |
| `PALHA_SOJA` | sim | 2 | **0** | 0 | 0 |
| `PALHA_MILHO` | sim | 9 | **0** | 31 | −31 |
| `CASCA_MILHO` | sim | 0 | **0** | 30 | −30 |
| `CAMA_AVIARIO` | não | 0 | **0** | 1 | −1 |
| `DEJETOS_AVES` | não | 0 | **0** | 2 | −2 |
| `ESTERCO_BOVINO` | não | 0 | **0** | 0 | 0 |
| `ESTERCO_BOVINO_CORTE` | não | 0 | **0** | 0 | 0 |
| `ESTERCO_BOVINO_LEITEIRO` | não | 0 | **0** | 0 | 0 |
| `DEJETOS_BOVINO` | não | 0 | **0** | 0 | 0 |
| `DEJETOS_SUINO` | não | 0 | **0** | 10 | −10 |
| `ESTERCO_SUINO` | não | 0 | **0** | 0 | 0 |
| `FORSU` | não | 0 | **0** | 9 | −9 |
| `ORGANICO_RSU` | não | 0 | **0** | 0 | 0 |
| `LODO_PRIMARIO` | não | 0 | **0** | 11 | −11 |
| `LODO_SECUNDARIO` | não | 0 | **0** | 8 | −8 |
| `PODA_URBANA` | não | 0 | **0** | 0 | 0 |
| `GORDURA` | não | 0 | **0** | 2 | −2 |
| `SANGUE` | não | 0 | **0** | 0 | 0 |
| **Total dos 28** | **13 presentes** | **31 stubs** | **0** | **159** | **−159** |

O CSV agregado possui 196 observações declaradas em 24 linhas. Apenas 159 pertencem aos 28 códigos canônicos atuais; as 37 restantes estão em códigos antigos ou não canônicos como `CASCA_EUCALIPTO`, `ESTERCO_BOVINO_FRESCO`, `LEVEDURA`, `SABUGO`, `SORO_QUEIJO`, `VAGEM_SOJA` e `VISCERAS`.

Mesmo contando os 40 stubs BMP de todos os 19 resíduos antigos do banco, e ignorando a ausência de valores e DOI, o banco ainda não recompõe as 196 observações declaradas.

## 8. Teste específico da vinhaça

### 8.1 Estado das linhas no banco

`VINHACA` tem 13 linhas em `residuo_references`:

- 5 rotuladas `bmp`;
- 8 rotuladas `ch4_content`.

As cinco linhas BMP são:

| ID | Citação armazenada | Valor | Unidade | DOI | Substrato | Regime | Denominador |
|---:|---|---|---|---|---|---|---|
| 95 | `MORAES, B. S.` | `NULL` | `NULL` | `NULL` | não há coluna/dado | não há coluna/dado | não há coluna/dado |
| 96 | `ZAIAT, M.` | `NULL` | `NULL` | `NULL` | não há coluna/dado | não há coluna/dado | não há coluna/dado |
| 97 | `BONOMI, A. Anaerobic digestion of vinasse from sugarcane ethanol production in Brazil... RSER, v. 44, p. 888-903, 2015.` | `NULL` | `NULL` | `NULL` | não há coluna/dado | não há coluna/dado | não há coluna/dado |
| 98 | `SILVA, A. A. et al. Anaerobic biodigestion of sugarcane vinasse under thermophilic conditions... Revista Ambiente & Água, v. 11, n. 3, 2016.` | `NULL` | `NULL` | `NULL` | não há coluna/dado | não há coluna/dado | não há coluna/dado |
| 99 | `EMBRAPA AGROENERGIA. Biogás e suas contribuições para os Objetivos de Desenvolvimento Sustentável (ODS). Documentos 49, 2022.` | `NULL` | `NULL` | `NULL` | não há coluna/dado | não há coluna/dado | não há coluna/dado |

Todas têm `is_primary = false`, `validation_status = 'validated'` e foram criadas entre 21:47:20.700883 e 21:47:20.704444 UTC em 2026-05-03.

Há um DOI em uma das oito linhas `ch4_content`, mas ele não é uma observação BMP e também não tem valor. Nenhuma das 13 linhas de vinhaça possui `reported_value`.

### 8.2 Comparação dos três estados

| Estado | Linhas/observações | Com valor comparável | Com DOI | Recupera linhagem? |
|---|---:|---:|---:|:---:|
| Banco — stubs rotulados BMP | 5 | 0 | 0 | não |
| `feedstock_bmp_from_refs.csv` — declaração agregada | `n_bmp_obs = 7` | somente min/mediana/max | 1 URL de exemplo, não sete DOI | não |
| `bmp_observations_VINHACA.csv` após A1f | 7 linhas materializadas | 6 aceitas | 4 linhas aceitas com DOI; 2 sem DOI; quatro artigos no total | sim, para o corpus reconstruído |

As “7 do CSV agregado” são um contador, não sete registros. Não existe chave que associe cada uma a uma linha do banco.

### 8.3 As sete originais são recuperáveis?

**Não.** O banco permite no máximo recuperar cinco rótulos bibliográficos incompletos. Ele não permite recuperar:

- os sete valores individuais;
- as unidades;
- os DOI de cada observação;
- substrato isolado versus codigestão;
- batelada versus reator contínuo;
- VS adicionado versus removido ou DQO;
- quais valores produziram mínimo 49, mediana 180 e máximo 968.

Nenhuma das cinco citações BMP do banco coincide de forma auditável com uma das sete observações materializadas em A1f, pois os DOI, títulos completos e valores necessários à ligação estão ausentes.

### 8.4 O valor próximo de 968

Foi feita busca em `residuo_references`, `conversion_factors` e `residuos` por:

- valores numéricos entre 967,5 e 971,5;
- tokens textuais 968, 969 ou 970;
- o código `VINHACA`.

Resultado:

- nenhuma ocorrência de 968/969/970 nas tabelas de referência ou fatores;
- `residuos.VINHACA` contém apenas `bmp_min = 220`, `bmp_medio = 300`, `bmp_max = 380`, unidade `L CH4/kg VS`;
- nenhum registro de codigestão próximo de 968.

O trabalho de Volpi et al. auditado em A1d contém **970,80 ± 71,55 NmL CH₄/g VS** para codigestão de licor de desacetilação + vinhaça. A proximidade com o máximo agregado de 968 é real, mas **não há evidência no banco** de que esse resultado tenha sido uma das sete observações originais. O banco não permite confirmar nem refutar a mistura; apenas confirma que a linhagem necessária foi perdida antes de chegar ao estado atual.

## 9. Determinação final

1. O banco ativo não contém o corpus de aproximadamente 400 artigos: `scientific_references` está vazio.
2. `residuo_references` é anterior à consolidação, esparsa e sem valores em todas as 107 linhas.
3. Nenhum dos 28 feedstocks possui observação individual BMP com valor e DOI no banco.
4. A vinhaça possui cinco stubs BMP, não sete observações.
5. As sete observações originais e o máximo 968 não são recuperáveis deste banco.
6. A linhagem reconstruída em A1f veio das fontes primárias, não do banco.
7. Nenhum parâmetro foi importado, criado ou alterado; `feedstocks.yaml` permanece intacto.
