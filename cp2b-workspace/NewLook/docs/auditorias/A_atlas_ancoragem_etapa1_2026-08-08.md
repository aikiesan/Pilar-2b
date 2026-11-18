# Aventura A — Etapa 1: auditoria de ancoragem contra o Atlas de Bioenergia SP (2020)

**Data:** 2026-08-08 · **Modo:** leitura externa (PDF do Atlas) + verificação SQL somente-leitura. **Nada no repositório modificado.** Base `2dbb23a`, `cp2b-db-dev` no ar.
**Precede e corrige:** `A_distancia_por_setor_atlas_vs_nossos_2026-08-07.md` (âncoras de RSU e esgoto estavam erradas ali).
**Fecha:** itens 5, 7, 8 do handoff de 07/08. **Reabre e corrige o item 1.** Abre itens 13 e 14.

**Referência canônica a inserir no manuscrito e no corpus:**
> Coelho, S. T., Garcilasso, V. P., Santos, M. M., Escobar, J. F., Perecin, D., & Souza, D. B. (2020). *Atlas de bioenergia do Estado de São Paulo*. São Paulo: IEE-USP. 250 p. ISBN 978-65-88109-06-9. Apoio: P&D Cesp/Aneel PD 00061-0057/2017; RCGI (FAPESP 2014/50279-4).

---

## 1. As âncoras corrigidas (fonte: PDF do Atlas, Cap. XII)

O Atlas declara (p. 248) quais tabelas compõem seu total estadual, e o total **fecha por soma** — a hipótese de não-aditividade de 07/08 está descartada.

**Tabela XII.26 — Total do Estado, ano-base 2017:** biogás 16.024.338.002 · **biometano 8.637.664.626** · elétrica 92.166.765 MWh/ano.

Soma reconstruída das tabelas setoriais: cana (IV.6/XII.2) 7.852.566.000 + RSU FORSU (V.8) 418.432.163 + esgoto Ideal (VI.3) 102.781.019 + pecuária criação (XII.11) 232.904.949 + abate (XII.13) 12.699.913 + cervejaria (XII.15) 18.280.837 = **8.637.664.881**; publicado 8.637.664.626; **delta 255 Nm³/ano (0,0000030%)**. Aditivo.

| Setor | Âncora antiga (07/08) | O que ela era de fato | **Âncora correta** |
|---|---:|---|---:|
| Cana | 7.852.566.000 | biometano, Tab. IV.6 ✓ | **7.852.566.000** |
| RSU | 1.528.007.602 | biogás captado (75%) da rota de **aterro** (Tab. V.6) | **418.432.163** (FORSU, Tab. V.8) |
| Esgoto | 102.158.739 | biometano, cenário **Real** (Tab. VI.2) | **102.781.019** (Ideal, Tab. VI.3) |

O erro de RSU era duplo: coluna errada (biogás bruto captado, não biometano) **e** rota errada (aterro, não digestão anaeróbia da FORSU). O Atlas tem três rotas mutuamente exclusivas para RSU (aterro V.6/V.7; FORSU V.8; WtE térmico V.9/V.10) e consolida biometano só pela segunda. O erro do esgoto é de cenário (Real→Ideal), 0,6%.

---

## 2. Distâncias recalculadas (nosso Real 2023 × âncora correta)

Nossos números têm saída literal de execução (`municipalities`, SP); as âncoras vêm do PDF.

| Setor | Nosso Real 2023 | Atlas (correto) | % |
|---|---:|---:|---:|
| Cana | 4.467.728.488 | 7.852.566.000 | **56,9%** |
| RSU | 397.584.384 | 418.432.163 | **95,0%** |
| Esgoto | 66.643.880 | 102.781.019 | **64,8%** |
| **Total da plataforma** | **7.832.143.834** | **8.637.664.626** | **90,7%** |

**O "déficit de 74% no RSU" do relatório de 07/08 era artefato de ancoragem.** Contra a rota que o Atlas efetivamente consolida (FORSU), estamos a **95%**.

### O total de 90,7% é coincidência, não concordância

Estruturalmente idêntico ao achado MapBiomas × PAM: concordância agregada por erros que se cancelam. Composição (somas exatas de `municipalities`, SP, execução 08/08):

| Setor | Real | Ideal |
|---|---:|---:|
| sugarcane | 4.467.728.488 | 5.429.368.849 |
| cattle | 1.225.731.437 | 1.838.597.155 |
| corn | 544.486.465 | 680.608.082 |
| soybean | 489.233.551 | 611.541.939 |
| rsu | 397.584.384 | 399.100.968 |
| forestry | 239.920.833 | 299.901.041 |
| citrus | 199.609.624 | 242.383.114 |
| poultry | 89.003.218 | 124.604.505 |
| coffee | 66.695.601 | 80.987.516 |
| sewage | 66.643.880 | 73.639.647 |
| rpo (poda) | 24.963.550 | 29.644.216 |
| swine | 20.490.690 | 30.736.035 |
| aquaculture | 52.112 | 65.141 |

- **Fluxos que só nós temos como biometano:** milho+soja+citros+café+silvicultura+poda = **1.564.909.624 = 20,0%** do nosso Real (execução 08/08). No Atlas esses resíduos são roteados **termicamente** (Rankine, Cap. X–XI); não há âncora de biometano do Atlas para nenhum deles.
- **Pecuária, direção oposta:** Atlas 232.904.949 (só rebanho confinado, 1.825.781 cabeças). Nosso **cattle Real = 1.225.731.437**, >5× o total pecuário do Atlas.
- **Bagaço:** fora do biometano nos dois lados; o Atlas o contabiliza na **elétrica** (excedente de cogeração 126 kWh/tc). Os 92 TWh do Atlas × nossos 29.584 GWh **não são comparáveis** (item 14).

---

## 3. A divergência da cana é a palha — e não só pela fração (item 13)

Decomposição (Atlas por diferença, Tab. XII.2; nosso por execução):

| Substream | Nosso Real 2023 | Atlas 2016/17 | % | Delta |
|---|---:|---:|---:|---:|
| Vinhaça | 1.197.325.974 | 1.217.596.000 | 98,3% | −20.270.026 |
| Torta de filtro | 860.632.241 | 566.926.000 | 151,8% | +293.706.241 |
| Palha | 2.409.770.274 | 6.068.044.000 | 39,7% | −3.658.273.726 |
| **Total cana** | 4.467.728.488 | 7.852.566.000 | 56,9% | −3.384.837.512 |

**A vinhaça reproduz o Atlas a 1,7%. A palha responde por 108% do déficit da cana** (a torta compensa em sentido contrário, +52%).

**Item 13 — a fração não explica o gap da palha.** Nossa palha: Real 2.409.770.274 (40%), Ideal 3.012.212.843 (50%); Ideal/Real = **1,2500 exato** → a fração recolhida é a única diferença Real/Ideal. Mas nossa palha **na própria fração 50% do Atlas** (= nosso Ideal, 3.012.212.843) ainda é só **49,6%** da palha do Atlas (6.068.044.000). Ou seja: alinhar 40%→50% fecha apenas ×1,25; o residual **~2,0×** é estrutural (kg/t, rendimento de biogás ou VS) — **divergência de parâmetro para `parameters_provenance.csv`, não escolha de método.** Realinhar a fração **não** fecharia o gap.

Nossos parâmetros de palha: 140 kg/t cana, BMP 175 NmL CH₄/gVS, VS 56% (`sp_scenarios_real_ideal.py` linhas 62, 82). O Atlas usa **50%** da palha na rota de biogás (p. 77), mas **40%** na cogeração (p. 64/193) — inconsistência interna do Atlas; para a rota que replicamos vale 50%. Os parâmetros de rendimento/BMP da palha do Atlas **não foram extraídos** nesta rodada → puxar do PDF antes de fechar o item 13.

---

## 4. Rota do RSU: resolvida (item 7)

Mesma rota (digestão anaeróbia da FORSU, Atlas Eq. V.5–V.8): MO 46,46%; 101,5 Nm³/t; CH₄ 55%; purificação 97%; PCI 9,97; η 0,35/0,42. A 95%, é reprodução. As duas premissas do Atlas que explicam os 5% restantes: (i) composição gravimétrica **pós-triagem** (~20% de recicláveis separados); (ii) **100% de coleta** na Tab. V.8, contra nossa coleta observada (SNIS). A diferença é a base de coleta, não o método.

---

## 5. Bagaço: citação e justificativa corrigidas (item 5)

- **Citar p. 77** (nota da Tab. IV.6): *"Não foi considerado o bagaço uma vez que ele é utilizado para cogeração e geração de excedentes"* — **não a p. 65**, para onde o gerador (linhas 17–22) aponta hoje.
- **Não citar a p. 65 literalmente:** o parágrafo de abertura tem erro editorial impresso ("resíduos gerados **não incluem** o bagaço, a torta de filtro e a vinhaça") que nega os três resíduos que o capítulo trata. Confirmado por rasterização.
- **Razão = uso concorrente integral (FCo=0), não "fora de escopo".** Isso torna coerente a cascata FDE incluir bagaço na base teórica e zerá-lo no uso concorrente. Reescrever Métodos nesses termos; **nunca invocar resolução da ANEEL.**

---

## 6. Lista de bloqueios, atualizada

| # | Item | Status |
|---|---|---|
| 1 | Posicionamento frente ao Atlas | **Reescrito** — 57%/95%/65%, total 90,7% coincidente |
| 2 | Piso por setor | Aberto — texto (inalterado: piso p/ cana e estado, não RSU, indef. esgoto) |
| 3 | Contagem de feedstocks (30/33 × 13/15/38) | Aberto — **decisão sua** |
| 4 | Coelho et al. (2020) ausente | **Referência pronta**; pendente 367×399 |
| 5 | Bagaço | **Fechado** — p. 77, uso concorrente |
| 6 | Sinal do FCo | Aberto — texto |
| 7 | Rota do RSU | **Fechado** — mesma rota, diferença é base de coleta |
| 8 | Esgoto sem base decomposta | **Fechado como limite** — declarar (Atlas usa Ideal) |
| 9 | Gap 130.281 Nm³ | Fechado (aquicultura) |
| 10 | Split cana ...488/...489 | Fechado (arredondamento; verdadeiro ...488,39) |
| 11 | `sp_fde_cascade.py` aborta | Dívida técnica |
| 12 | `scientific_references` vazia | Dívida técnica |
| 13 | Parâmetro de palha × 50% do Atlas | **Verificado** — fração fecha só ×1,25; ~2,0× residual é parâmetro. Extrair rendimento/BMP do Atlas |
| 14 | Comparação de elétrica inválida | **Aberto** — 92 TWh do Atlas incluem excedente de bagaço; não comparar aos 29.584 GWh |

---

## 7. Decisões suas (inalteradas)

- Contagem de feedstocks — escolher entre 13/15 e propagar.
- 367 × 399 no corpus, depósito REDU travado.
- Fração de palha: **declarar** (recomendado), não realinhar — realinhar não fecha o gap (é parâmetro) e mexeria no 7.832.143.834 → Aventura B com tabela delta e portão novo.

---

## 8. Limites desta rodada

- Âncoras do Atlas: camada de texto do PDF, conferidas contra tabelas setoriais e contra XII.26 (fecha a 255 Nm³). P. 65 conferida visualmente; demais, não.
- Nossos por-setor: execução SQL 08/08 sobre `municipalities` (SP). Palha/vinhaça/torta: gerador (07/08).
- Ano-base do Atlas 2016/17 (cana) e 2017 (demais); nosso misto (PAM 2023, PPM 2024, Censo/SNIS 2022). **Não usar diferença temporal como explicação da cana** — a moagem cresceu.
- Cap. VII–XI não lidos em detalhe. Se a pecuária entrar na comparação, o Cap. VII precisa da mesma auditoria.
- **Nada modificado** no repositório.

---

## Adendo — Bloqueio #13 FECHADO via Tabela IV.4 do Atlas (p.72) + verificação SQL (2026-08-08)

**O Atlas não usa percentual de palha — usa retenção absoluta.** Tabela IV.4 / Eq. IV.1: palha 220 kg/tc, produtividade 79,0 tc/ha, retenção 7,00 t/ha (CNPEM/Sucre) → disponível 10,38 t/ha = **59,7%** = 131,4 kg/tc. O Atlas é internamente inconsistente (p.64: 40%; p.71/IV.4: 59,7%; p.77: 50%; p.75 nota 16: ~30%); só a p.71/IV.4 é operativa (executa a Eq. IV.1 e gera os 6.068.044.000 da IV.6). **Não há percentual do Atlas ao qual realinhar — só uma regra de retenção absoluta sobre produtividade estadual média.** "Declarar, não realinhar" passa de preferência a única leitura defensável.

**Moagem 2023 medida (execução, master 645 linhas):** `prod_t_Cana_de_açúcar` = **439.098.082 tc** ÷ Atlas 365.989.639 tc = **1,1998** (o fator "1,200×" da decomposição deixa de ser inferência). Bate com RESULTADOS §4.4 (439,1 Mt).

**Decomposição da palha (fecha sem resíduo):** disponibilidade 131,4 vs 56,0 kg/tc = **2,346×**; rendimento 126,2 (Atlas implícito) vs 98,0 Nm³/t = **1,288×**; produto por tc = **3,021×**; moagem 1,200× em sentido contrário → razão de totais 2,518× = 6.068.044.000/2.409.770.274. **A fração (40→50%) não é o problema principal; o fator de geração 220 vs 140 kg/tc é.**

**#16 torta — verificado no gerador:** fator de geração **35,0 kg/tc (linha 61) = idêntico ao Atlas**. A divergência é só rendimento: nosso 1000×0,20 SV×0,280 = **56,0 Nm³/t** vs Atlas implícito **44,3 Nm³/t** = **1,264×**. É BMP/SV, não geração → `parameters_provenance.csv`.

**#17 vinhaça — corrigir o texto:** por tonelada de cana (normalizando pela moagem 1,200×), vinhaça é **0,819× = 18% abaixo** do Atlas, não os 98% aparentes. A concordância de 98% no total vinha do crescimento da moagem — mesmo padrão de erros que se cancelam. Qualquer frase que declare a vinhaça como "reprodução" deve ser corrigida.

**Rendimentos implícitos do Atlas (126,2 palha; 44,3 torta) são derivados por divisão dos totais publicados**, não lidos — os fatores de biogás do Atlas (10–15 Nm³/m³ vinhaça; 40–45 Nm³/tc) são confidenciais ABIOGAS, publicados só como faixas. Não dá para reproduzir a IV.6 a partir da IV.4 sem escolher pontos nas faixas.

**Parágrafo de Métodos proposto (aprovar antes de qualquer coisa):**
> A disponibilidade de palha é definida aqui como fração fixa da palha gerada, e não por retenção absoluta por hectare. O Atlas adota 7 t/ha de retenção sobre produtividade média estadual de 79 t/ha (59,7% da palha disponível; geração 220 kg/tc). Adotamos 140 kg/tc e fração recolhida 0,40. As duas escolhas são conservadoras e explicam, juntas, um fator de 2,35 na disponibilidade por tonelada moída. A retenção absoluta pressupõe produtividade uniforme entre municípios, premissa que a resolução municipal desta plataforma não sustenta.

**Blocos após este adendo:** #13 **fechado**; #14 (elétrica) aberto — retirar do texto; **#15** (retenção absoluta × fracionária → Métodos + `parameters_provenance.csv`); **#16** (torta: 35 kg/tc igual, BMP 1,26× — `parameters_provenance.csv`); **#17** (vinhaça 18% abaixo por tc — corrigir texto). Abertos de decisão sua: #3 contagem, #4 corpus 367×399.

**Limite:** parâmetros do Atlas da camada de texto da IV.4 (não conferida por rasterização); rendimentos implícitos são derivados, não lidos; nossos torta/vinhaça confirmados no gerador (linhas 58, 61, 81–82).
