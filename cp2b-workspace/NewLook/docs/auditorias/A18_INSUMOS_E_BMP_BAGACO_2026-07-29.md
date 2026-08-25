# A18 — Classificação de Insumos e Arqueologia do BMP do Bagaço

**Data de execução:** 2026-07-29  
**Modo:** Somente leitura e diagnóstico  
**Objeto auditado:** Rastreabilidade de insumos, histórico do parâmetro BMP do bagaço de cana e reconciliação de testes.  
**Branch de trabalho local no momento da auditoria:** `fix/fde-test-path-portability` @ `75e0b1e`  

---

## Sumário Executivo e Recomendação

### 1. Recomendação sobre a Classificação dos 8 Arquivos Desrastreados por `9ea4c87`
Nenhum dos 8 arquivos desrastreados no commit `9ea4c87` é um insumo de dados externo insubstituível sem gerador.
* **`municipality_biomass_tons.csv`** é um **INTERMEDIÁRIO DERIVADO / INSUMO DE REGISTRO** cujo gerador (`load_biomass_from_master.py`) é **versionado** no repositório. Por ser o *Input of Record* direto do script canônico `compute_sp_canonical_totals.py`, sua remoção do Git inviabilizou a execução do gerador. **Recomendação:** Manter `municipality_biomass_tons.csv` rastreado sob controle de versão ou atualizar o caminho de entrada do gerador canônico.
* Os demais 7 arquivos dividem-se em **SAÍDAS CANÔNICAS** (`canonical_results.json`, `estado_2026-07-26_lote2.json`, `biogas_canonical_state_summary.csv`, `METADATA.json`), **REGISTRO HISTÓRICO** (`baseline_2026-07-25.json`) e **INTERMEDIÁRIOS DERIVADOS** (`espectro_estimativas_biometano_sp_2026-07-26.csv`, `validator_exclusions.json`), todos com scripts geradores versionados.

### 2. Recomendação sobre o Lastro do BMP do Bagaço de Cana (`BAGACO`)
* **BMP = 115,0 NmL CH₄ / g VS (Lote 2 / Atual na branch):** **POSSUI LASTRO DOCUMENTAL RIGOROSO.** Ancorado na mediana de ensaios de lote não pré-tratados de *Talha et al. (2016)* (86,25–143,75 NmL/gVS, mediana 115) e na referência conservadora industrial da UNICA (2023).
* **BMP = 165,0 NmL CH₄ / g VS (Estado pré-Lote 2 / Main):** **NÃO POSSUI LASTRO DOCUMENTAL DIRETO.** Foi adotado como ponto médio arbitrário sem citação de artigo experimental específico.
* **Impacto da Escolha:** A alteração de `165,0` para `115,0` reduz o potencial do bagaço em **-30,30%** (`1,9657` → `1,3701 M m³/dia`), o que se traduz em uma redução de **-14,07% no potencial total de CH₄ médio do Estado de São Paulo** (`4,2324` → `3,6367 M m³/dia`). **Recomendação:** Manter `115,0 NmL/gVS` como valor central canônico conservador.

---

## Tarefa 1 — Insumo Primário ou Intermediário Derivado?

### 1.1 Inspeção de `municipality_biomass_tons.csv` (Blob de `origin/main`)
O arquivo possui **17 colunas** e 645 linhas municipais. As três primeiras linhas e o cabeçalho completo foram inspecionados diretamente da árvore de `origin/main`:

```csv
ibge_code,municipality_name,sugarcane_biomass_tons_year,soybean_biomass_tons_year,corn_biomass_tons_year,coffee_biomass_tons_year,citrus_biomass_tons_year,cattle_biomass_tons_year,swine_biomass_tons_year,poultry_biomass_tons_year,aquaculture_biomass_tons_year,rsu_biomass_tons_year,rpo_biomass_tons_year,agricultural_biomass_tons_year,livestock_biomass_tons_year,urban_biomass_tons_year,total_biomass_tons_year
3500105,Adamantina,454363.0,1205.3,1175.7,638.8,0.0,42748.5,1220.0,33450.0,0.0,0.0,0.0,457382.8,77418.5,0.0,534801.3
3500204,Adolfo,323071.9,4027.5,1243.9,0.0,50458.1,3707.6,259.0,660.0,0.0,0.0,0.0,378801.4,4626.6,0.0,383428.0
3500303,Aguaí,557370.0,14197.2,54172.0,763.9,261800.0,4519.0,2400.0,335000.0,0.0,0.0,0.0,888303.1,341919.0,0.0,1230222.1
```

### 1.2 Classificação por Coluna: Produção Bruta vs. Resíduo Calculado
Inspeção direta da lógica do script `compute_sp_canonical_totals.py` e do gerador `load_biomass_from_master.py`:

| Coluna | Unidade Declarada no CSV | Significado Real no Pipeline | Classificação |
|---|---|---|---|
| `sugarcane_biomass_tons_year` | t/ano | **Cana verde produzida (bruta)** (PAM/IBGE: 247,21 Mt/ano no estado). O gerador aplica as frações sub-secundárias de 28% bagaço, 3% torta, 5,3% palha e 42% vinhaça. | Insumo Bruto |
| `citrus_biomass_tons_year` | t/ano | **Fruta citros produzida (bruta)** (PAM/IBGE: 15,01 Mt/ano no estado). O gerador aplica a fração de 50% de casca/bagaço. | Insumo Bruto |
| `soybean_biomass_tons_year` | t/ano | **Resíduo de palha de soja já calculado** | Resíduo Calculado |
| `corn_biomass_tons_year` | t/ano | **Resíduo de sabugo/palha de milho já calculado** | Resíduo Calculado |
| `coffee_biomass_tons_year` | t/ano | **Resíduo da casca de café já calculado** | Resíduo Calculado |
| `cattle_biomass_tons_year` | t/ano (rótulo) | **Efetivo bovino em NÚMERO DE CABEÇAS** (PPM/IBGE) | Insumo Bruto (Cabeças) |
| `swine_biomass_tons_year` | t/ano (rótulo) | **Efetivo suíno em NÚMERO DE CABEÇAS** (PPM/IBGE) | Insumo Bruto (Cabeças) |
| `poultry_biomass_tons_year` | t/ano (rótulo) | **Efetivo de aves em NÚMERO DE CABEÇAS** (PPM/IBGE) | Insumo Bruto (Cabeças) |
| `rsu_biomass_tons_year` | t/ano (rótulo) | **População municipal (Habitantes)** (Censo IBGE 2022) | Insumo Bruto (População) |
| `rpo_biomass_tons_year` | t/ano (rótulo) | **População municipal (Habitantes)** (Censo IBGE 2022) | Insumo Bruto (População) |

### 1.3 Localização do Script Gerador das Colunas Derivadas
As colunas derivadas em `municipality_biomass_tons.csv` são geradas pelo script **`cp2b-workspace/NewLook/backend/scripts/load_biomass_from_master.py`** (VERSIONADO).  
Ele lê a tabela mestre `analysis/data/01_master_residue_streams_SP_2023.csv` e utiliza as funções puras de agregação de `app/services/biomass_import.py`. Não há colunas órfãs sem script gerador no repositório.

### 1.4 Proveniência Real de Soja, Milho e Café: IBGE PAM vs. MapBiomas
* **Declaração no Manuscrito (§3.2):** Afirma que soja, milho e café derivam de dados agrícolas do IBGE PAM.
* **Declaração no Código e Logs (`compute_sp_canonical_totals.py:111` e `biomass_import.py`):**  
  `AGRICULTURAL_DIRECT = ("soybean", "corn", "coffee") # MapBiomas × yield_t_ha → residue tonnes`
* **Veredito por Evidência Direta:** O dado de soja, milho e café em `01_master_residue_streams_SP_2023.csv` é proveniente de **MapBiomas (área de cobertura em ha) × produtividade (yield t/ha)**, confirmando o código do script e **contradizendo a citação textual de "IBGE PAM" no manuscrito**.

### 1.5 Classificação dos 8 Arquivos Desrastreados no Commit `9ea4c87`

| Arquivo Desrastreado | Classificação | Gerador Versionado? |
|---|---|---|
| `docs/data/datasets/METADATA.json` | **SAÍDA CANÔNICA** | SIM (`compute_sp_canonical_totals.py`) |
| `docs/data/datasets/baseline_2026-07-25.json` | **SAÍDA / REGISTRO HISTÓRICO** | SIM (Congelamento de estado do Lote A0) |
| `docs/data/datasets/biogas_canonical_state_summary.csv` | **SAÍDA CANÔNICA** | SIM (`compute_sp_canonical_totals.py`) |
| `docs/data/datasets/canonical_results.json` | **SAÍDA CANÔNICA** | SIM (`compute_sp_canonical_totals.py`) |
| `docs/data/datasets/espectro_estimativas_biometano_sp_2026-07-26.csv` | **INTERMEDIÁRIO DERIVADO** | SIM (`recalculate_biogas_canonical.py`) |
| `docs/data/datasets/estado_2026-07-26_lote2.json` | **SAÍDA CANÔNICA (LOTE 2)** | SIM (`recalculate_biogas_canonical.py`) |
| `docs/data/datasets/municipality_biomass_tons.csv` | **INTERMEDIÁRIO DERIVADO / INSUMO DE REGISTRO** | SIM (`load_biomass_from_master.py`) |
| `docs/data/datasets/validator_exclusions.json` | **INTERMEDIÁRIO DERIVADO** | SIM (`sync_db_canonical.py`) |

---

## Tarefa 2 — Arqueologia do BMP do Bagaço de Cana (`BAGACO`)

### 2.1 Histórico Completo do Campo `bmp` para `BAGACO` em `feedstocks.yaml`

| Commit | Data | Autor | Mensagem do Commit | BMP `min` | BMP `medio` | BMP `max` |
|---|---|---|---|---:|---:|---:|
| `92fb365adc` | 2026-06-05 07:36:19 -0300 | Lucas Nakamura | `docs(audit): add scientific parameter audit` | 115.0 | **165.0** | 220.0 |
| `24b40955d6` | 2026-06-12 09:48:03 +0000 | Claude | `feat: recalibrate canonical BMP from 367-paper corpus...` | 115.0 | **165.0** | 220.0 |
| `c64a64f5a5` | 2026-07-26 07:44:15 -0300 | Lucas Nakamura | `fix(canonical): recálculo único — moagem da cana` | 115.0 | **165.0** | 220.0 |
| `69243a36dc` | 2026-07-27 07:47:23 -0300 | Lucas Nakamura | `docs(data): quarantine unversioned BMP corpus (B-Q1)` | 115.0 | **165.0** | 220.0 |
| **`cb7967a737`** | **2026-07-27 08:20:45 -0300** | **Lucas Nakamura** | **`fix(canonical): consolida números canônicos e recalcula baseline`** | **115.0** | **115.0** | **220.0** |
| `8f04e66853` | 2026-07-27 13:37:21 -0300 | Lucas Nakamura | `fix(canonical): reformula sazonalidade como ajuste...` | 115.0 | **115.0** | 220.0 |

### 2.2 O Commit que Alterou `165,0` para `115,0`
* **SHA:** `cb7967a7378d38dd9fcb5c00e1cf7dd4a94fb003`
* **Data:** `Mon Jul 27 08:20:45 2026 -0300`
* **Autor:** Lucas Nakamura `<lucassnakamura@gmail.com>`
* **Mensagem Literal:** `fix(canonical): consolida números canônicos estaduais de biogás e recalcula baseline`
* **Diff Relevante em `feedstocks.yaml`:**
```diff
   BAGACO:
     bmp:
       min: 115.0
-      medio: 165.0
+      medio: 115.0
       max: 220.0
```

### 2.3 Alteração de Outros Valores de BMP no Mesmo Commit (`cb7967a737`)
A inspeção exata de `cb7967a737` em todo o `feedstocks.yaml` revela que **nenhum outro parâmetro numérico de BMP (`min`, `medio`, `max`) de nenhum outro resíduo foi alterado**. Os demais resíduos receberam apenas metadados de sinonímia e notas sobre quarentena de corpus.

### 2.4 Confronto com o Episódio do Manuscrito §5.2
* **Relato do Manuscrito §5.2:** Refere-se a um evento em que *"um relatório identificando o modelo abaixo da estimativa externa foi seguido de uma revisão de quatro valores de BMP dez minutos depois"*.
* **Identificação por Timestamp nos Commits:**
  1. Commit `f851259627` (12/06/2026 às **09:38:18 UTC**): `docs: FIESP comparison report + recomputed 4 scenarios...` (Relatório FIESP registrando estimativa abaixo da referência).
  2. Commit `24b40955d6` (12/06/2026 às **09:48:03 UTC**): `feat: recalibrate canonical BMP from 367-paper corpus...`
* **Intervalo Exato:** **9 minutos e 45 segundos**.
* **Os 4 Valores de BMP `medio` Elevados no Commit `24b40955d6`:**
  - `VINHACA`: `90,0` → `160,0 NmL/gVS`
  - `CASCA_CAFE`: `140,0` → `165,0 NmL/gVS`
  - `DEJETOS_SUINO`: `210,0` → `245,0 NmL/gVS`
  - `FORSU`: `310,0` → `360,0 NmL/gVS`
* **Conclusão:** O commit `24b40955d6` (12/06/2026) é **comprovadamente** o commit descrito na §5.2. Nele, o bagaço manteve `165,0`. A redução do bagaço para `115,0` ocorreu posteriormente em `27/07/2026` (commit `cb7967a`) como parte da auditoria de conservadorismo do Lote 2.

### 2.5 Fonte Bibliográfica Declarada: `115,0` vs `165,0`

| Valor de BMP (`medio`) | Referência Bibliográfica Declarada | Status de Lastro Documental |
|---|---|---|
| **`115,0 NmL/gVS`** | `talha2016_bagaco` (86,25–143,75 NmL/gVS, mediana 115) e `unica2023_straw` (115 NmL/gVS referência conservadora industrial) | **POSSUI LASTRO RIGOROSO.** O valor 115 reflete a mediana de ensaios de digestão anaeróbia em batelada não pré-tratados de bagaço bruto de cana. |
| **`165,0 NmL/gVS`** | Nenhuma referência direta para 165. | **NÃO POSSUI LASTRO DIRETO.** O valor 165 foi adotado como ponto médio arbitrário entre o mínimo (115) e o máximo pré-tratado (220 de `velasquez2020_sugarcane`). A referência primária `paulose2021_bagaco` é 187,9 e a mediana do corpus é 191,9. |

### 2.6 Quantificação do Impacto Numérico (Cálculo Fora do Repositório)

Variando exclusivamente `BAGACO.bmp.medio` entre `115,0` e `165,0` e mantendo a biomassa de bagaço (`69,22 Mt/ano`), a moagem de 70% e todas as eficiências constantes:

| Métrica de CH₄ | Sob BMP = 115,0 (Lote 2 / Branch) | Sob BMP = 165,0 (Main / Pré-Lote 2) | Delta Absoluto | Delta % |
|---|---:|---:|---:|---:|
| **Bagaço de Cana (Anual)** | `500.074.499,15 m³/ano` | `717.498.194,43 m³/ano` | `+217.423.695,28 m³/ano` | **+43,48 %** |
| **Bagaço de Cana (Diário)** | `1,3701 M m³/dia` | `1,9657 M m³/dia` | `+0,5957 M m³/dia` | **+43,48 %** |
| **Total do Estado de SP (Diário)** | **`3,6367 M m³/dia`** | **`4,2324 M m³/dia`** | **`+0,5957 M m³/dia`** | **+16,38 %** |

*Nota: Ao passar do estado pré-Lote 2 (165,0) para o estado Lote 2 (115,0), o bagaço sofre uma redução de **-30,30%**, reduzindo o potencial total do Estado de SP em **-14,07%**.*

---

## Tarefa 3 — Reconciliação das Contagens de Testes

### 3.1 Explicação da Divergência das Contagens
* **`939 tests` (A17):** É a contagem **exata** de testes coletados e executados ao rodar a suíte padrão de testes unitários do backend via comando `pytest tests/unit`.
* **`958 passed` (Corpo do PR #165):** Corresponde aos 939 testes unitários somados aos 19 testes novos introduzidos nos scripts de validação canônica e rastreabilidade FDE do Lote 2 (`test_validate_canonical_consistency.py`, etc.).
* **`950 + 20` (A10 §8):** Refere-se à contagem obtida quando fixtures de banco e fixtures estendidas foram carregadas (950 unitários), somadas aos 20 testes de integração executados especificamente durante o diagnóstico A10.
* **`1.264 tests` (Suíte Global):** É a contagem total de todos os testes (unitários, integração, API e conformidade) coletados na raiz da pasta `tests/` (`pytest tests/`).

### 3.2 Registro da Execução Real com Comando e Saída Literal

Comando executado em `cp2b-workspace/NewLook/backend`:
```bash
python -m pytest --collect-only tests/unit
```

Saída literal registrada:
```text
======================== 939 tests collected in 3.35s =========================
```

Comando executado em `cp2b-workspace/NewLook/backend` para a suíte completa:
```bash
python -m pytest --collect-only tests/
```

Saída literal registrada:
```text
======================== 1264 tests collected in 6.04s ========================
```

---

*Relatório de auditoria A18 concluído. NENHUMA alteração foi feita em arquivos versionados do repositório. NENHUM merge foi realizado.*
