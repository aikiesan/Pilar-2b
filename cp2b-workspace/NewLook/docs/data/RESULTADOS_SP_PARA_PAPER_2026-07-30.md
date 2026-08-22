# Resultados de São Paulo para o manuscrito — PILAR-2b

**Data:** 30 de julho de 2026 · **Escopo:** 645 municípios de SP · **Ano-base:** 2023
**Referência metodológica central:** COELHO et al., *Atlas de Bioenergia do Estado de São Paulo*, IEE/USP, 2020

> Complementa [`METODOLOGIA_CENARIOS_SP_2026-07-30.md`](./METODOLOGIA_CENARIOS_SP_2026-07-30.md),
> que registra as escolhas metodológicas. Aqui estão os **números publicáveis** e
> as justificativas de cada correção que os produziu.

---

## 1. Resultados consolidados

| Grandeza | **Cenário Real** (curto prazo) | **Cenário Ideal** (fronteira) |
|---|---:|---:|
| Metano / Biometano (Nm³/ano) | **7.832.143.834** | **9.841.178.207** |
| Metano / Biometano (Nm³/dia) | **21.457.928** | **26.962.132** |
| Biogás bruto (Nm³/ano) | 12.531.430.135 | 15.745.885.131 |
| Biogás bruto (Nm³/dia) | 34.332.685 | 43.139.411 |
| Energia térmica (GWh/ano) | 77.852 | 97.821 |
| **Energia elétrica (GWh/ano)** | **29.584** | **37.172** |

Conversões: biogás = CH₄ / 0,625 (FIESP 2025) · térmica = CH₄ × 9,94 kWh/Nm³
(Bueno et al., 2016) · elétrica = térmica × 0,38 (ABIOGAS 2018, média entre 0,35
e 0,42) · diária = anual / 365.

---

## 1.1 Cascata de disponibilidade — os dois métodos, lado a lado

Do potencial teórico até cada resultado publicável, em base anual e diária.

| Etapa | bi Nm³ CH₄/ano | mi Nm³/dia | Fração do teórico |
|---|---:|---:|---:|
| **Teórico** (sem correção de disponibilidade) | 19,901 | 54,52 | 1,0000 |
| — após **FC** (coleta) | 15,338 | 42,02 | 0,7707 |
| — após **FCo** (uso concorrente) | 4,447 | 12,18 | 0,2235 |
| — após **FS** (sazonalidade) | 4,024 | 11,02 | 0,2022 |
| — após **FL** (logística) → **mobilizável FDE** | 3,301 | 9,04 | 0,1659 |
| **Cenário Real** (método Atlas) | **7,832** | **21,46** | **0,3936** |
| **Cenário Ideal** (método Atlas) | **9,841** | **26,96** | **0,4945** |

**As duas últimas linhas não continuam a cascata — elas a substituem.** Isto é
deliberado e é o ponto metodológico central do artigo, não uma inconsistência:

- As linhas FC→FL aplicam o **FDE multiplicativo do banco**
  (`FDE = FC × FCo × FS × FL`), que bottom-out em **16,59%** do teórico.
- Os Cenários Real e Ideal aplicam a **lógica agronômica do Atlas** (§4.9), que
  chega a **39,36%** e **49,45%**.

A diferença de **2,37×** entre o mobilizável FDE (3,301) e o Cenário Real (7,832)
é o efeito medido da rejeição do FDE do banco, documentada em §4.9: para milho
ele dá 4,7% e para soja 0,8%, sofrendo a mesma sobre-penalização já corrigida na
cana — um uso concorrente lançado como perda total.

A cascata é publicada junto do resultado porque a diferença entre os dois métodos
é resultado, não ruído: sem ela, o leitor não tem como saber que um FDE
alternativo, presente no mesmo repositório, daria 3,301.

Reprodução da cascata ponderada pelo potencial teórico:
`backend/scripts/sp_fde_cascade.py` (requer `DATABASE_URL`).

---

## 2. Composição por resíduo (Nm³ CH₄/ano)

| Resíduo | Real | Ideal | % do Real |
|---|---:|---:|---:|
| Cana (vinhaça + torta + palha) | 4.467.728.488 | 5.429.368.849 | 57,0% |
| Bovinos | 1.225.731.437 | 1.838.597.155 | 15,7% |
| Milho | 544.486.465 | 680.608.082 | 7,0% |
| Soja | 489.233.551 | 611.541.939 | 6,2% |
| RSU (FORSU) | 397.584.384 | 399.100.968 | 5,1% |
| Silvicultura | 239.920.833 | 299.901.041 | 3,1% |
| Citros | 199.609.623 | 242.383.114 | 2,5% |
| Aves | 89.003.218 | 124.604.505 | 1,1% |
| Café | 66.695.601 | 80.987.516 | 0,9% |
| Esgoto (ETE) | 66.643.880 | 73.639.647 | 0,9% |
| Poda urbana | 24.963.550 | 29.644.216 | 0,3% |
| Suínos | 20.490.690 | 30.736.035 | 0,3% |
| Aquicultura | 52.112 | 65.140 | 0,0% |
| **TOTAL** | **7.832.143.834** | **9.841.178.207** | 100% |

**Bagaço de cana está deliberadamente ausente.** O Atlas (p.65) o classifica entre
os resíduos *"já aproveitados para geração de energia"*, em oposição a *"torta de
filtro, vinhaça e palha de cana"*, ainda não aproveitados. Contabilizá-lo
duplicaria energia que o setor sucroenergético já recupera em caldeiras.

---

## 3. Posicionamento contra a literatura de SP

Biometano, base diária — a mesma da Figura 1 da FIESP (2025):

| Estudo | mi Nm³/dia | bi Nm³/ano |
|---|---:|---:|
| GEF Biogás Brasil (2023) | 42,5 | 15,50 |
| ABiogás (2020) | 36,4 | 13,30 |
| **PILAR-2b — Cenário Ideal** | **27,0** | **9,84** |
| **Coelho et al. / IEE-USP (2020)** | **23,6** | **8,60** |
| **PILAR-2b — Cenário Real** | **21,5** | **7,83** |
| SEMIL/SP (2023) | 9,8 | 3,60 |
| Instituto 17 / BEP-UK (2021) | 8,2 | 3,00 |
| *Capacidade instalada ou em instalação (ANP, 2024)* | *0,4* | *0,14* |

**Os dois cenários enquadram Coelho et al.** — o Real abaixo, o Ideal acima. É
coerente com as diferenças de escopo: aquele estudo adota cenário ideal para
esgoto mas cobre menos substratos, enquanto o PILAR-2b inclui milho, soja,
citros, café, silvicultura e poda que ele não considera.

O Cenário Real equivale a **≈54× a capacidade de biometano instalada ou em
instalação** no Estado (ANP, 2024).

---

## 4. Correções aplicadas e suas justificativas

Cada uma alterou o resultado; todas são rastreáveis a uma fonte.

### 4.1 Os volumes são metano, não biogás

O BMP que gera todos os números está em **NmL CH₄/gVS**, e não há divisão
CH₄→biogás em ponto algum da cadeia. Confirmação independente: o fator energético
embutido resulta em 9,97 kWh por m³ do volume armazenado — o PCI do **metano**
(9,94), não o do biogás (~6 a 60% CH₄).

**Consequência para o manuscrito:** o valor da plataforma pertence à coluna
*biometano* das tabelas comparativas. Lê-lo contra a coluna *biogás* subestima a
posição do PILAR-2b em ~1,6×.

### 4.2 Teórico ≠ mobilizável

O headline anterior (19,90 bi Nm³ CH₄/ano) **não tinha correção de
disponibilidade alguma** — multiplicava massa × BMP × VS e parava. Todos os
estudos comparáveis publicam figuras mobilizáveis. Comparar diretamente
superestimava o PILAR-2b pelo inverso do FDE.

### 4.3 Bagaço excluído (Atlas p.65)

Usar `BAGACO` como resíduo representativo da cana aplicava seu fator de uso
concorrente (FCo = 0,18 — 82% já queimado) a **62% do potencial do Estado**.

### 4.4 Vinhaça adicionada (Atlas p.67)

Estava **ausente do pipeline**: a massa de cana servida era 56,3% da produção
(439,1 Mt), compatível com bagaço+palha+torta+pontas e pequena demais para conter
vinhaça. O Atlas dá rota direta que dispensa BMP e VS — **114 m³ de biogás por m³
de etanol, 50–65% CH₄**.

**Justificativa científica para alta disponibilidade:** a fertirrigação **não é
uso concorrente**. A digestão anaeróbia é *sequencial* — o digestato conserva
K/N/P e segue para o campo, com DBO e odor reduzidos. Descontar a vinhaça por
fertirrigação contabiliza um fluxo de passagem como perda total.

### 4.5 Palha a 40% / 50% (Atlas p.65)

*"foi adotado o emprego de apenas 40% da palha disponível (em termos
conservadores)"* — 50–60% deve permanecer no campo para proteção do solo, e o
recolhimento custa R$ 65,00/t (Cardoso, 2019b).

### 4.6 Suínos — erro de 9,7× corrigido

O fator de **380 m³ CH₄/cabeça/ano** era aplicado ao **rebanho total**
(1.591.238 cabeças) mas só é plausível por **matriz** — SP tem 163.706.
Verificação zootécnica independente: a massa implícita dava **177,1 kg de
esterco/cabeça/dia**, 15–44× o que um suíno produz. Reconstruído por massa.

### 4.7 RSU — impossibilidade física corrigida (Atlas Eq. V.5–V.6)

A massa de fração orgânica implícita (16,63 Mt/ano) **excedia todo o RSU gerado
em São Paulo** (15,65 Mt/ano). Uma fração orgânica não pode exceder o resíduo do
qual é fração, independentemente de qual BMP se prefira.

### 4.8 Esgoto — fluxo novo (Atlas Eq. VI.1)

Ausente do pipeline, embora `LODO_PRIMARIO` e `LODO_SECUNDARIO` já carregassem 27
e 25 referências. `CH₄ = EC × 449,7 gDQO/m³ × 0,1115 Nm³CH₄/kgDQO × 0,755`
(Silva 2015; SABESP 2018).

### 4.9 Demais resíduos — retenção de solo, não o FDE do banco

Milho, soja, citros, café, silvicultura, poda e aquicultura eram servidos como
volumes **teóricos**. Receberam a mesma lógica agronômica que o Atlas aplica à
palha de cana (40%/50% para resíduo de campo; 70%/85% para resíduo de
processamento, já concentrado na indústria).

**O FDE armazenado no banco foi rejeitado** (milho 4,7%; soja 0,8%): sofre a
mesma sobre-penalização já corrigida para a cana — um uso concorrente lançado
como perda total.

### 4.10 Saneamento da base de resíduos

- **69 → 40 resíduos.** Quase todo substrato existia em duplicata (código
  canônico MAIÚSCULO e slug minúsculo), com parâmetros divergindo até 2,5×.
  Critério de sobrevivência: **mais referências**, não o rótulo `data_status` —
  quatro linhas marcadas "🟢 Scientifically Validated" tinham zero referências, e
  `vinhaca_cana` (BMP 300) tinha duas, ambas `general`, nenhuma medindo BMP,
  contra 37 tipadas como `bmp` em `VINHACA` (BMP 160). As 668 referências foram
  **re-apontadas**, não descartadas.
- **43 triplos FDE reparados.** Em 43 dos 152 (fc 12, fcp 6, fs 19, fl 6) o `_max`
  estava abaixo do `_medio` ou o `_min` acima dele. O `_medio` **não foi tocado** —
  a soma dos FDE médios ficou 8,32720000 antes e depois.

---

## 5. Limitações declaradas

1. **A fração 0,40/0,50** para milho, soja e silvicultura é **analogia** com a
   palha de cana, não medição por cultura. É a hipótese de maior alavancagem
   sobre o resultado e a mais exposta a revisão.
2. **As frações 0,70/0,85** para citros e café são julgamento dos autores, sem
   fonte primária dedicada.
3. **Esterco coletável** (6–9 kg/cab/dia suínos; 8–12 bovinos) representa faixas
   de sistemas de manejo, não medição por município.
4. **Eficiência elétrica de 0,38** é média entre as duas faixas de vazão do
   Atlas; plantas específicas devem usar 0,35 ou 0,42.
5. **Biometano não desconta perdas de *upgrading*** (1–3% de *slip* de CH₄) — é
   limite superior.
6. **Ano-base misto:** dados primários 2023; parâmetros do Atlas derivados de base
   2017. A moagem de cana cresceu ~32% no período, o que o cálculo acompanha por
   usar a produção 2023.
7. **A biomassa total permanece não publicável.** `total_biomass_tons_year`
   (493,6 Mt) soma massa agrícola com **contagem de cabeças** — `residue_tons_yr`
   guarda cabeças para bovinos, suínos e aves. A massa derivada é ~231,5 Mt/ano
   com o fator suíno corrigido, mas depende de premissas de esterco coletável.

---

## 6. Reprodutibilidade

| Artefato | Caminho |
|---|---|
| Motor de cenários (estado) | `backend/scripts/sp_scenarios_real_ideal.py` |
| Carga por município e resíduo | `backend/scripts/load_scenarios_real_ideal.py` |
| Esquema + procedência dos parâmetros | `backend/app/migrations/026`, `029` |
| Validação contra o Atlas (RSU) | `backend/scripts/validate_rsu_against_atlas.py` |
| Reconciliação de massa | `backend/scripts/reconcile_biomass_mass.py` |
| Fusão de duplicatas | `backend/scripts/dedupe_residuos.py` |
| Reparo dos triplos FDE | `backend/app/migrations/027` |
| Master canônico (fonte primária) | `data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv` (sha256 `7d0fb051bb7cb74c`, 188.483 bytes) |

Os 16+ parâmetros de cenário, com fonte, página e justificativa, estão na tabela
`scenario_parameters` do banco — consultáveis por SQL, não só neste documento.
