# B11 — ETAPA 0: Gate de Proveniência

**Data de execução:** 2026-07-29
**Modo:** Somente leitura. Nenhum arquivo de dados, parâmetro ou código de cálculo foi alterado.
**Branch:** `fix/fde-test-path-portability` @ `75e0b1eb61d74c12aea533d18b21b4d3a5ab2fb1` (2026-07-23 09:17:00 -0300)

---

## VEREDITO: **DIVERGÊNCIA — PARADA OBRIGATÓRIA**

O gate **não fecha**. Não regenerar nada.

A hipótese de trabalho proposta — *"o raster é 10.1/2024 e o rótulo 2023 refere-se ao ano
agrícola do PAM, logo é erro de nomenclatura, não de dado"* — foi testada e **é falsa**, mas
não pelo motivo esperado. O problema não é de nomenclatura nem de ano:

> **O MapBiomas não participa do cálculo canônico de São Paulo. Em nenhum ponto.**

Não há erro de rótulo a corrigir porque não há consumo de MapBiomas a rotular. A base
espacial dos números publicados é **IBGE PAM (área e produção declaradas) + IBGE PPM
(rebanho) + SNIS (RSU coletado) + Censo 2022 (população)**. O raster MapBiomas existe no
repositório e serve exclusivamente a duas funções de interface que não tocam o inventário.

Além disso, foram encontradas **três divergências estruturais** que invalidam o insumo da
ETAPA 1 e comprometem parte das evidências do relatório A18. Estão em §3.

---

## 1. TABELA DE ANOS EFETIVOS POR FONTE (saída 0.4)

| Fonte | Ano lido pelo código | Ano afirmado pelo autor | Arquivo:linha | Confere? |
|---|---|---|---|---|
| **MapBiomas (base espacial)** | **Não é lido no cálculo.** Metadados do raster declaram `Collection 8` / `year 2024` | Coleção **10.1**, ano 2024 | `backend/data/mapbiomas/mapbiomas_metadata.json:2,5`; `app/services/mapbiomas_service.py:58,267-269` | ❌ **NÃO** — coleção diverge (8 vs 10.1) **e** a fonte não alimenta o inventário |
| **IBGE PAM — SP (canônico)** | **2023** (coluna `year`, 5.769/5.769 linhas) | até **2024** | `analysis/data/01_master_residue_streams_SP_2023.csv` @ HEAD, coluna `year` | ❌ **NÃO** (2023) |
| **IBGE PAM — nacional** | **2023** (invocação documentada `--year 2023`) | até **2024** | `backend/scripts/promote_pam.py:5-6`; `backend/ingest/sources/pam_1612/source.py:11` | ❌ **NÃO** (2023, embora o workbook cubra 2024) |
| **CONAB** | **Nenhum. Não existe ingestão de CONAB.** | até **2024** | Só aparece em comentário justificativo: `backend/scripts/load_biomass_tons.py:24,77,94`; `promote_pam.py:56` | ❌ **NÃO** — fonte alegada, ausente do código |
| **IBGE PPM** | **2024** (workbooks 2008–2024; carga registrada de 2024) | — | `backend/ingest/sources/ibge_ppm/source.py:12-16,74-76` | ⚠️ workbook presente na fonte, **snapshot bruto ausente nesta branch** |
| **SNIS** | **2022** | — | `backend/scripts/promote_snis.py:4-5` (`--years 2008-2022`) | ⚠️ **snapshot bruto ausente nesta branch** |
| **População (urbano)** | **Censo 2022**, constante hardcoded `SP_POPULATION = 44_411_238` | — | `backend/scripts/compute_sp_canonical_totals.py:61-63` | ⚠️ **Não existe regra de projeção para anos > 2022** (ver §2.4) |

Legenda: ❌ diverge · ⚠️ confere mas com ressalva material.

---

## 2. DETALHAMENTO POR ITEM

### 2.1 — Asset, coleção e ano do MapBiomas efetivamente consumidos (0.1)

**Artefato encontrado:**

| Campo | Valor |
|---|---|
| Caminho | `cp2b-workspace/NewLook/backend/data/mapbiomas/mapbiomas_agropecuaria_sp_2024.tif` |
| SHA-256 | `c78dd4024b21b0574eeb96596341a0a0ecf2e38db2de2f9a00196c864263e399` |
| Tamanho | 13.493.883 bytes |
| Metadados | `mapbiomas_metadata.json`, SHA-256 `7fcd506df45f2d37476e5e8d11a56f8c205da205f654078fb3ac432a8a70feca` |
| Commit de introdução | `41c9ea053611f31f01c35c94d5228a6593b5ca71` — 2026-05-19 12:33:31 +0000 — *"Initial public release: PILAR-2b v3.0.3"* (único commit que toca o diretório) |

**Propriedades reais do raster** (lidas com `rasterio`, não declaradas):

| Propriedade | Valor |
|---|---|
| CRS | EPSG:4326 |
| Resolução | 0,0008084837557 ° ≈ **90 m** |
| Dimensões | 11.070 × 6.901 px |
| Tipo | uint8, sem `nodata` definido |
| Tags embutidas | `{'AREA_OR_POINT': 'Area'}` — **nenhuma tag de coleção, ano, asset ou export** |
| Classes presentes | 0, 9, 15, 20, 39, 40, 41, 46, 47, 48 (subconjunto agropecuário) |

**Três problemas de proveniência:**

1. **Não há asset ID do Earth Engine, script de export, nem checksum da origem.** O único
   registro de origem é `backend/setup_mapbiomas.py:10`, que copia o arquivo de um caminho
   **fora do repositório e fora de qualquer versionamento**:
   `C:\Users\Lucas\Documents\CP2B\CP2B_Maps_V2\data\rasters\mapbiomas_agropecuaria_sp_2024.tif`.
   A cadeia de custódia termina aí.

2. **Os metadados são uma afirmação digitada à mão, não proveniência.** O bloco
   `{"year": 2024, "source": "MapBiomas Collection 8"}` é um literal escrito em
   `setup_mapbiomas.py:33-37` e gravado em JSON. Não foi extraído do raster — o raster não
   carrega essa informação.

3. **A afirmação é internamente impossível.** A Coleção 8 do MapBiomas termina em **2022**;
   a Coleção 9 vai até 2023; só a Coleção 10 alcança **2024**. `Collection 8` + `year 2024`
   não pode ser verdadeiro simultaneamente. Some-se a isso a resolução de ~90 m contra os
   30 m nativos do MapBiomas: o arquivo foi **reamostrado** (≈3×) em algum ponto não
   registrado.

**Conclusão de 0.1:** a coleção e o ano do mosaico **não são determináveis a partir deste
repositório**. O que existe é uma etiqueta manual autocontraditória sobre um arquivo
reamostrado de origem não rastreável. Nem a afirmação do autor (10.1) nem a do A18 (8/9)
podem ser confirmadas ou refutadas com evidência interna.

### 2.2 — Raster por pixel ou MapBiomas Statistics por município? (0.2)

**Nenhum dos dois, para efeito de cálculo.** O raster é consumido por pixel, mas apenas por
duas funções de interface. O rastreamento completo dos consumidores de MapBiomas no backend:

| Consumidor | Arquivo | Função | Entra no inventário? |
|---|---|---|---|
| Servidor de tiles PNG | `app/api/v1/endpoints/mapbiomas.py:33-35` | Overlay visual do mapa | **Não** |
| Análise de buffer | `app/services/mapbiomas_service.py:58` → `app/api/v1/endpoints/proximity.py:238-239` | % de uso do solo num raio, ferramenta de proximidade | **Não** |
| Camadas de infraestrutura | `app/api/v1/endpoints/infrastructure.py:239,275` | Pontos/linhas do **MapBiomas 10.1 INFRAESTRUTURA** (migração 023) — usinas, gasodutos, subestações | **Não** (geolocalização, não biomassa) |

*Observação: a única referência a "10.1" no repositório é o produto **INFRAESTRUTURA**
(`infrastructure.py:275`), que é um dataset vetorial de ativos — não o mosaico de uso do
solo. É plausível que a afirmação "Coleção 10.1" do autor tenha origem aqui, por transposição.*

**A cadeia real do cálculo de SP, rastreada ponta a ponta:**

```
analysis/data/01_master_residue_streams_SP_2023.csv   (long, HEAD)
        │  colunas: ibge_code, year, residue_stream, residue_tons_yr, populacao_2022
        ▼  scripts/load_biomass_from_master.py  →  app/services/biomass_import.py:96
docs/data/municipality_biomass_tons.csv               (derivado, 645 municípios)
        ▼  scripts/compute_sp_canonical_totals.py:58  (_CSV)
        ▼  app/services/biogas_forward.py + canonical_loader.py + feedstocks.yaml
sp_canonical_by_stream.csv  /  canonical_results.json
```

Em nenhum elo há leitura de raster ou de MapBiomas Statistics.

**Contradição documental a registrar.** O docstring de
`backend/scripts/compute_sp_canonical_totals.py:22` afirma:

> *"soybean/corn/coffee: CSV already contains residue-equivalent tonnes from MapBiomas × yield_t_ha"*

Isso **não se sustenta**. As colunas do master são de nomenclatura PAM/SIDRA literal
(`prod_t_Soja_em_grão`, `area_ha_Café_em_grão_Total`, `prod_t_Amendoim_em_casca`,
`prod_t_Sorgo_em_grão`) — culturas que **não existem como classes do MapBiomas**. O A18
§7.5 reproduziu essa mesma afirmação ("Área MapBiomas (ha) × Produtividade PAM"),
propagando o erro. **O docstring precisa ser corrigido**; é ele, e não o dado, a origem
provável da crença de que o MapBiomas alimenta o inventário.

### 2.3 — Anos de PAM e CONAB (0.3)

**PAM.** O master canônico de SP tem coluna `year` com valor `2023` em **5.769 de 5.769
linhas** (100%). Não há mistura de anos. Na trilha nacional, o comando documentado em
`promote_pam.py:5-6` e `ingest/sources/pam_1612/source.py:11` é `--year 2023`.

Os workbooks brutos **cobrem 2024** (`data/raw/pam/TABELA_1612_2024_A_2021.xlsx`), ou seja,
o dado de 2024 está disponível e simplesmente **não foi carregado**. A divergência é de
carga, não de disponibilidade — o que a torna corrigível, mas ela é real hoje.

**CONAB.** Não existe fonte de ingestão CONAB. `backend/ingest/sources/` contém exatamente:
`aneel_siga`, `ibge_ppm`, `pam`, `pam_1612`, `pam_1613`, `snis`. As quatro ocorrências da
string "CONAB" no backend são **comentários justificativos** sobre retenção de palha no solo
(`load_biomass_tons.py:24,77,94`) e uma nota de trabalho futuro (`promote_pam.py:56`).
Nenhum número entra no cálculo pela CONAB.

### 2.4 — SNIS e regra de projeção populacional (0.3)

**Ano do SNIS: 2022.** Invocação documentada `--years 2008-2022` (`promote_snis.py:4-5`).

**Não existe regra de projeção populacional para anos posteriores a 2022.** A busca por
`projec|population_year|pop_year` em `canonical_loader.py` e `biomass_availability.py` não
retorna nenhuma implementação. O modelo usa a constante
`SP_POPULATION = 44_411_238` (`compute_sp_canonical_totals.py:61-63`), fixada no Censo
Demográfico 2022, sem envelhecimento nem projeção. A premissa da pergunta 0.3 — de que
existe uma regra a documentar — **não se confirma**; o que existe é um valor congelado.

**Ressalva de reprodutibilidade:** os snapshots brutos de SNIS e PPM **não existem nesta
branch**. `backend/data/raw/` contém apenas `ibge_censo2022/`, `ibge_pib/` e `pam/`. As
cargas de SNIS e PPM registradas em produção não são reproduzíveis a partir do que está
versionado aqui.

---

## 3. DIVERGÊNCIAS ESTRUTURAIS (bloqueantes para a ETAPA 1)

### 3.1 — O master de SP no working tree é OUTRO ARQUIVO, e o loader não consegue lê-lo

Esta é a divergência mais grave e precisa ser resolvida antes de qualquer regeneração.

| | Versão **commitada** (HEAD) | Versão **no working tree** |
|---|---|---|
| Caminho | `analysis/data/01_master_residue_streams_SP_2023.csv` | *(mesmo caminho)* |
| SHA-256 | `644cfb6a7285bde6a824da2bf8c3107f237cbfc9458b7cee8b26466eb401fc9c` | `2ab1d03d6293690e76b7d883599554307965772afc367a52f2f834eb5d7a28f9` |
| Formato | **LONGO** — 5.769 linhas, 1 linha por (município × fluxo) | **LARGO** — 645 linhas, 1 por município, 58 colunas |
| Colunas-chave | `ibge_code`, `year`, `residue_stream`, `residue_tons_yr`, `populacao_2022` | `CD_GEOCODI`, `area_ha_*`, `prod_t_*`, `cabecas_*`, `rdo_coletado_t`, `populacao_censo2022` |
| Conteúdo | Resíduo já calculado por fluxo | Insumo bruto PAM/PPM/SNIS/Censo |

O leitor `build_municipality_biomass` (`app/services/biomass_import.py:96-152`) exige
`ibge_code`, `residue_stream`, `residue_tons_yr` e `populacao_2022`. **Nenhuma dessas quatro
colunas existe na versão do working tree.** Executado hoje contra o arquivo em disco,
`load_biomass_from_master.py` cairia no `continue` da linha 127 em todas as linhas e
**produziria um arquivo de saída vazio** — silenciosamente, sem erro.

Os dois arquivos são artefatos de estágios diferentes do pipeline: o largo é **insumo bruto**,
o longo é **resíduo processado**. Um foi gravado por cima do outro no mesmo caminho.

As três cópias em disco (`analysis/data/01_master_...`,
`data/canonical_parameters/SP_master_..._FINAL.csv`, `docs/data/SP_master_..._FINAL.csv`)
são **byte-idênticas** (todas `2ab1d03d…`) e todas no formato largo. As duas cópias
`_FINAL` **não são rastreadas pelo git** — existem apenas em disco.

**Pergunta a decidir antes da ETAPA 1** (não decido isto sozinho — a resposta muda o que é
"o dado canônico"): a versão larga é (a) um insumo novo, com um gerador ainda não escrito
que deveria produzir o formato longo, ou (b) uma sobrescrita acidental que deve ser
descartada com `git restore`? A resposta determina se o número canônico atual é reprodutível
ou se o arquivo que o produziu foi perdido.

### 3.2 — O A18 mistura evidências de duas branches

O relatório A18 cita como canônico o arquivo
`data/canonical_parameters/snis_sp_activity_2022.csv` (§0.5, §1 da tabela de divergências,
§7.3), do qual derivam a contagem de 645 municípios e a cobertura 214 medidos / 431 fallback.

**Esse arquivo não existe nesta branch, não é rastreado, e nada no backend o lê.** Ele foi
adicionado no commit `78f92fd` (2026-07-27, *"fix(canonical): reconcile measured municipal
pipeline (B2-CLOSE)"*), que pertence **exclusivamente** a
`fix/canonical-consistency-2026-07` e **não é ancestral do HEAD atual**
(`git merge-base --is-ancestor` retorna falso).

Consequência: afirmações do A18 lastreadas nesse arquivo descrevem a outra branch, não esta.
Isso é coerente com o próprio A18 §0.3 ("`canonical_results.json` NÃO EXISTE nesta branch")
e reforça a necessidade da ETAPA 1.2 — consolidar numa branch única — **antes** de qualquer
número novo.

### 3.3 — `municipality_biomass_tons.csv` existe aqui, mas está defasado

Contrariando o pressuposto da ETAPA 1.1, o arquivo **existe e é rastreado nesta branch**:

| Campo | Valor |
|---|---|
| Caminho | `cp2b-workspace/NewLook/docs/data/municipality_biomass_tons.csv` |
| SHA-256 | `5f8bc6c9c16af112ef2f3a796a235061998826410866c6618a02f53078a10964` |
| Linhas | 646 (1 cabeçalho + 645 municípios) |
| Último commit | `92fb365` — **2026-06-05** — *"docs(audit): add scientific parameter audit report (#89)"* |

É por isso que o gerador roda aqui e falha em `fix/canonical-consistency-2026-07` (onde foi
desrastreado em `9fdfcb7`). A ETAPA 1.1 deve ser reformulada: não é "restaurar um arquivo
perdido", é **decidir qual das duas branches carrega o estado bom** e reconciliar.

Mas há um agravante: este derivado é de **2026-06-05**, anterior a toda a recalibração de
julho. Ele foi gerado a partir da versão **longa** do master (a única legível pelo loader).
Ou seja, **o número canônico vigente descende de um insumo que não está mais em disco** —
está apenas no HEAD do git, sob um caminho hoje ocupado por outro arquivo.

---

## 4. O QUE FOI VERIFICADO E CONFERE

Nem tudo diverge. Para o registro:

- A cadeia de cálculo de SP é **internamente consistente e rastreável**, do master longo até
  `sp_canonical_by_stream.csv`, sem elo oculto.
- O ano **2023** é uniforme no master de SP: 5.769/5.769 linhas, sem mistura.
- Os 12 fluxos de resíduo do master longo cobrem 645 municípios com cobertura por fluxo
  plausível (`rsu_organic` 645, `rpo_pruning` 645, `cattle` 617, `swine` 587, `poultry` 577,
  `corn` 564, `sugarcane` 512, `soybean` 480, `forestry` 365, `citrus` 337, `coffee` 284,
  `aquaculture` 156).
- A separação de unidades está documentada e implementada corretamente em
  `biomass_import.py:30-38` (agrícola em toneladas, pecuária em **cabeças**, urbano derivado
  de população) — o risco de gravar cabeças como toneladas está explicitamente barrado.
- O raster MapBiomas, embora de proveniência não rastreável, **não contamina os números**,
  justamente por não ser consumido pelo inventário.

---

## 5. RECOMENDAÇÃO

**Não avançar para a ETAPA 1** sem resolver, nesta ordem:

1. **§3.1** — decidir o destino do master largo vs. longo. Sem isso, "regenerar" não tem
   significado definido: há dois arquivos candidatos a "o insumo", e apenas um é legível.
2. **§3.2** — escolher a branch de trabalho única (ETAPA 1.2 antecipada), porque metade das
   evidências do A18 vive na outra.
3. **Corrigir o docstring** de `compute_sp_canonical_totals.py:22` e o §7.5 do A18, que
   atribuem ao MapBiomas uma participação que ele não tem. Este é o item de menor custo e
   maior efeito sobre o manuscrito: a Seção de Métodos precisa dizer **PAM/PPM/SNIS/Censo**,
   não MapBiomas.
4. **Decidir sobre o ano.** Se a intenção é publicar com ano de referência 2024, os workbooks
   do PAM já cobrem 2024 e a carga é reexecutável — mas isso **move todos os números** e
   exige tabela de delta. Se a intenção é publicar 2023, o manuscrito precisa dizer 2023.

**Sobre a alegação "MapBiomas Coleção 10.1, 2024" no manuscrito:** ela não é sustentável em
nenhuma leitura. Ou é removida da descrição da base de biomassa, ou é restrita ao que de fato
usa MapBiomas 10.1 — as camadas de **infraestrutura** (usinas, gasodutos, subestações), que
são geolocalização de ativos e não entram no potencial.

---

*Nenhuma linha de código de cálculo, nenhum parâmetro e nenhum arquivo de dados foi alterado
na execução desta etapa. Parada conforme instrução 0.5.*
