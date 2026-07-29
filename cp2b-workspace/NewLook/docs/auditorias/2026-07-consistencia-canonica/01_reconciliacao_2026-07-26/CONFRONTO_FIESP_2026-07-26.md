# Confronto de parâmetros com a FIESP 2025

**Data:** 2026-07-26 · **Lote:** 2b · **Modo:** somente leitura sobre os parâmetros
**Nenhum valor de `feedstocks.yaml` foi alterado.** Nada aqui alimenta o pipeline.

**Estado do PILAR-2b usado:** `docs/data/estado_2026-07-26_lote2.json` (pós-Lote 2).
**Benchmark versionado neste lote:** `data/benchmarks/fiesp_2025.yaml`.
**Extração de registro do relatório:** `docs/data/FIESP_BENCHMARK_EXTRACTION.md`.

Até hoje a comparação com a FIESP existia só no nível do total — dois números
grandes lado a lado, sem meio de saber se discordavam por parâmetro, por escopo
ou por base. O extrato de 2026-07-26 permite descer ao fator.

---

## Resumo

1. **A vinhaça é o maior desacordo, e não está onde parecia.** O fator de resíduo
   da FIESP (0,80 m³/t) e o do PILAR-2b (0,420 t/t) parecem discordar por ~2×.
   Postos na mesma base, discordam por **1,12×** — praticamente concordam. **Todo
   o desacordo está no rendimento por m³ de vinhaça: 22,1 contra 4,43 Nm³ de
   biogás/m³, um fator de 5,0×.** §2.1.
2. **O rótulo de coluna da FIESP para a vinhaça não sobrevive aos totais da
   própria FIESP.** Aplicado a toda a cana processada, o fator renderia 6,09
   bilhões Nm³/ano — 42,8 % acima do total de 4,27 bilhões que a FIESP publica
   para todos os substratos somados. §2.1.
3. **O bagaço não está no headline de 6,4.** Mesmo teste: sozinho excederia o
   total publicado em 21,2 %. Isso confirma o extrato do usuário contra a §1 da
   extração já versionada, que listava o bagaço no escopo. §2.3.
4. **No confronto pareado, o PILAR-2b fica 10,5× abaixo da FIESP** (0,61 contra
   6,4 Mm³/d de biometano). Incluindo o bagaço, 2,9× abaixo. §3.
5. **Torta e RSU concordam dentro de 1,4–1,7×**; o bagaço disponível concorda
   dentro de 1,2×. A vinhaça é o outlier isolado. §2.
6. **O rótulo "~16 bilhões/ano" tem agora um candidato forte**, e não é a FIESP:
   GEF Biogás Brasil, 15,5 bilhões Nm³/ano. §5.

---

## 1. O que a FIESP cobre

| | FIESP 2025 | PILAR-2b |
|---|---|---|
| Substratos no headline | **3**: vinhaça, torta de filtro, RSU aterro | **26** parametrizados, **14** streams somados |
| Base | potencial por **planta elegível** (181 plantas, 146 usinas) | potencial **municipal** (645 municípios) |
| Corte de escala | **4.800 Nm³/d** de biogás bruto | **nenhum** |
| Rota do RSU | aterro, captura 70 %, modelo IPCC 2006 | digestão anaeróbia (FORSU), motor forward |
| Calibração | planta a planta | estatística, FDE auditado por fator |
| Composição declarada | 84 % sucroalcooleiro / 16 % RSU | ver §3 |

---

## 2. Confronto fator a fator

### 2.1 Vinhaça — o caso prioritário

**As bases são diferentes, e a diferença é determinável.**

| Grandeza | FIESP | PILAR-2b | Razão |
|---|---:|---:|---:|
| Fator de resíduo, como declarado | 0,80 m³ / t cana processada | 0,420 t / t cana moída | — |
| Fator de resíduo, em massa (ρ = 1,01 t/m³) | 0,808 t/t | 0,420 t/t | 0,52× |
| **Fator de resíduo, na mesma base** (§ abaixo) | **0,372 m³/t de toda a cana** | **0,416 m³/t de toda a cana** | **1,12×** |
| Rendimento de biogás por m³ de vinhaça | **22,10 Nm³/m³** | **4,43 Nm³/m³** | **0,20×** |
| Rendimento de CH₄ por m³ de vinhaça | 11,71 Nm³/m³ | 2,88 Nm³/m³ | 0,25× |
| Teor de CH₄ | 53 % | 65 % | 1,23× |
| Dias/ano | 226 (sem haircut anual, ver abaixo) | FS = 0,90 | — |

**Volume × massa não é o problema.** A densidade da vinhaça é ~1,01 t/m³, então
m³ e t são praticamente intercambiáveis. A conversão explica 1 %, não 2×.

**O problema é o denominador.** O rótulo da FIESP diz "por tonelada de cana
processada", mas isso não se sustenta contra os próprios totais dela:

```
344.610.000 t de cana processada  ×  17,68 Nm³/t  =  6,093 bilhões Nm³/ano
total de biogás publicado pela FIESP (TODOS os substratos) = 4,266 bilhões
                                       → a vinhaça sozinha excede o total em 42,8 %
```

Nem toda cana vai a etanol, e a vinhaça só existe na rota do etanol. A própria
FIESP tabula a divisão etanol/açúcar por mesorregião (Tabela 4: Araçatuba 60/40,
Ribeirão Preto 87/13, S.J. Rio Preto 49/51), o que só faz sentido se ela for
aplicada em algum ponto do cálculo.

**Fração de cana implicada, por resíduo aritmético sobre os totais publicados:**

| Componente | Biometano (bi Nm³/ano) | Origem |
|---|---:|---|
| Total publicado | 2,337 | Tabela 10 |
| − RSU (16 % da composição) | 0,374 | composição declarada |
| − torta (0,030 t/t × 84,41 Nm³/t torta × 53 %) | 0,463 | Tabela 5 |
| **= vinhaça (resíduo)** | **1,501** | |
| vinhaça em biogás (÷ 53 %) | 2,832 | |
| **base de cana implicada** = 2,832 bi ÷ 17,68 | **160,2 Mt** | |
| **fração da cana processada** | **46,5 %** | |

46,5 % é compatível com a fração de cana destinada a etanol em SP nas safras
recentes. **Conclusão: o fator 17,68 Nm³/t da FIESP aplica-se à cana roteada
para etanol, não a toda a cana processada. O rótulo de coluna é frouxo.**

O PILAR-2b embute a mesma correção, por outro caminho. Sua nota de proveniência
é `~12 bi L EtOH/ano (UNICA SP) × 12 L vinhaça/L × 1,01 kg/L ÷ 340 Mt cana`.
A 85 L de etanol por tonelada de cana integralmente roteada, isso implica
**41,5 %** de cana a etanol — próximo dos 46,5 % implicados na FIESP.

Postos na mesma base, os dois fatores de resíduo **concordam dentro de 12 %**.

**Onde está, então, o fator de 5×.** No rendimento por m³:

| | Nm³ CH₄ / m³ de vinhaça | Como se chega lá |
|---|---:|---|
| PILAR-2b | **2,88** | TS 3,0 % × VS/TS 60 % × BMP 160 → VS = 18 kg/m³ |
| FIESP | **11,71** | 17,68 ÷ 0,80 × 53 % |

Para 11,71 Nm³ CH₄/m³ a BMP 160 seriam necessários ~73 kg VS/m³, isto é, TS
acima de 12 %. Vinhaça de usina não é tão concentrada. A leitura fisicamente
coerente é que a FIESP raciocina por **DQO removida** (vinhaça 20–40 kg DQO/m³,
0,25–0,35 Nm³ CH₄/kg DQO), enquanto o PILAR-2b raciocina por **SV**, com a mesma
convenção de todos os outros 25 substratos.

**Isso não é conservadorismo declarado nem erro de um dos lados — são duas bases
biométricas distintas.** Registro factual, sem escolher entre elas:

- A faixa comumente citada para vinhaça de SP é **6–10 Nm³ CH₄/m³**.
- O PILAR-2b (2,88) fica **abaixo** dessa faixa.
- A FIESP (11,71) fica **acima** dela.

Os dois números provavelmente erram, em sentidos opostos. **Nada foi alterado**:
mover o BMP ou o TS da vinhaça agora seria calibrar contra um benchmark, que é
exatamente o padrão que a auditoria de circularidade identificou e que a
`POLITICA_BMP.md` §7.5 proíbe. Fica registrado como item de discussão do
manuscrito e candidato a lote próprio, com referência primária — não com a FIESP.

**Sobre os 226 dias:** não é haircut. O rodapé ** da Tabela 5 declara que a
produção é diluída em 365 dias apenas para comparar com a rota de aterro; o total
anual não é reduzido por 226/365. O PILAR-2b, esse sim, aplica FS = 0,90 — um
corte de 10 % que a FIESP não aplica. **O PILAR-2b é mais conservador nesta
dimensão.**

### 2.2 Torta de filtro

| Grandeza | FIESP | PILAR-2b | Razão |
|---|---:|---:|---:|
| Fator de resíduo | 30 kg/t cana (faixa 30–35) | **30 kg/t cana** (0,030) | **1,00×** |
| Rendimento de biogás por t de torta | 84,41 Nm³/t | 141,87 Nm³/t (teórico) | 1,68× |
| Rendimento por t de cana | 2,53 Nm³/t | 4,26 Nm³/t (teórico) | 1,68× |
| Dias/ano | 365 | FS = 0,88 | — |

O fator de resíduo é **idêntico**, com o PILAR-2b no piso da faixa da FIESP.

Ganho colateral: o confronto **corrobora a ambiguidade sinalizada desde
2026-06-12**. Lidos por tonelada de torta, 84,41 e 141,87 são da mesma ordem.
Lidos por tonelada de cana, a FIESP renderia 84,41 contra 4,26 do PILAR-2b — um
fator de 20×. **A leitura "por tonelada de torta" é a única fisicamente coerente**,
agora confirmada por um conjunto de parâmetros independente. Segue sem confirmação
da FIESP, mas deixa de ser conjectura isolada.

### 2.3 Bagaço — tabulado, mas fora do headline

| Grandeza | FIESP | PILAR-2b | Razão |
|---|---:|---:|---:|
| Fator de resíduo | 250 kg/t cana | 280 kg/t cana | 1,12× |
| Fração disponível | 30 % ("30 % de uso") | 22 % (`fco_available`) | 0,73× |
| **Bagaço disponível por t de cana** | **0,0750 t/t** | **0,0616 t/t** | **0,82×** |

O PILAR-2b tem mais bagaço e disponibiliza menos dele. Líquido: **18 % mais
conservador**. O conceito de "30 % de uso" da FIESP é o mesmo `fco_available` do
PILAR-2b — convergência metodológica independente, que vale registrar.

**Evidência de que o bagaço não entra no headline de 6,4:**

```
0,250 t/t × 30 % × 106 Nm³ biometano/t ÷ 53 %  ×  344.610.000 t
    =  5,169 bilhões Nm³/ano de biogás
total publicado pela FIESP (todos os substratos) = 4,266 bilhões
                                       → o bagaço sozinho excede o total em 21,2 %
```

Isto **confirma o extrato do usuário** ("SOMENTE vinhaça, torta e RSU") e
**corrige a §1 de `FIESP_BENCHMARK_EXTRACTION.md`**, que lista o bagaço no escopo
do estudo. A Tabela 5 tabula o fator; a conta do headline não o usa.

> **Divergência registrada, não corrigida neste lote:**
> `FIESP_BENCHMARK_EXTRACTION.md` §1 e §6 descrevem o escopo como incluindo o
> bagaço. Correção do texto é escopo do Lote 5.

### 2.4 RSU

| Grandeza | FIESP | PILAR-2b | Razão |
|---|---:|---:|---:|
| Rota | aterro + captura | digestão anaeróbia (FORSU) | **não comparável** |
| Rendimento bruto | 31,51 Nm³ biogás/t RSU | — | |
| Captura | 70 % | — (não há perda de aterro) | |
| Teor de CH₄ | 50 % | 52 % | 1,04× |
| **CH₄ por t de RSU total** | **11,03 Nm³/t** | — | |
| **CH₄ por t de substrato orgânico** | 21,01 Nm³/t (÷ 0,525) | **29,56 Nm³/t** | **1,41×** |
| Geração per capita | — | 0,100 t/cap/ano de orgânico | |

O PILAR-2b rende 41 % mais por tonelada de orgânico, o que é o esperado: digestão
anaeróbia controlada supera captura em aterro. **As duas rotas são fisicamente
distintas e a razão de 1,41× não é uma discordância de parâmetro** — é a diferença
entre as tecnologias que cada estudo modela.

Nota: a geração per capita do PILAR-2b (0,100 t/cap/ano de orgânico) implica
fração orgânica de ~27 % sobre uma geração de RSU de 0,365 t/cap/ano — bem abaixo
dos 52,5 % que o próprio `feedstocks.yaml` declara em
`organic_fraction_of_rdo`. **Inconsistência interna do PILAR-2b, encontrada por
este confronto**, registrada aqui e não corrigida.

### 2.5 Teores de CH₄

| Substrato | FIESP | PILAR-2b | Comentário |
|---|---:|---:|---|
| Vinhaça | 53 % | 65 % | PILAR-2b 23 % mais alto; 65 % é alto para vinhaça |
| RSU aterro | 50 % | 52 % (`ORGANICO_RSU`) | concordam |
| Torta | 53 % | 60 % | PILAR-2b 13 % mais alto |

---

## 3. Comparação pareada por substrato

**Biometano, Mm³/d, cenário `medio`, estado pós-Lote 2:**

| Recorte do PILAR-2b | min | **medio** | max | vs FIESP 6,4 |
|---|---:|---:|---:|---:|
| **Subconjunto FIESP** (vinhaça + torta + RSU) | 0,120 | **0,607** | 2,290 | **10,5× abaixo** |
| Subconjunto + bagaço | 0,466 | **2,228** | 8,074 | 2,9× abaixo |
| Complexo sucroalcooleiro (4 subfluxos) | 0,408 | **1,939** | 7,248 | — |
| **Total PILAR-2b** (14 streams) | 0,678 | **3,528** | 13,039 | 1,8× abaixo |

**Biogás, Mm³/d:**

| Recorte | min | **medio** | max | vs FIESP 11,7 |
|---|---:|---:|---:|---:|
| Subconjunto FIESP | 0,224 | **1,128** | 4,237 | 10,4× abaixo |
| Total PILAR-2b | 1,249 | **6,498** | 24,016 | 1,8× abaixo |

### O que a diferença entre os dois recortes informa

**Apenas 17,2 % do biometano do PILAR-2b vem dos substratos que a FIESP cobre**
(0,607 de 3,528). Os outros 82,8 % vêm de substratos que a FIESP não considera —
pecuária, café, citros, soja, milho, palha de cana, poda urbana.

Isto reposiciona a comparação. O PILAR-2b **não** é uma estimativa menor da mesma
coisa: é uma estimativa de **outra coisa**, mais larga em substrato e muito mais
conservadora nos três substratos em comum. Dito de outro modo — **onde a FIESP
olha, o PILAR-2b vê um décimo; onde o PILAR-2b olha, a FIESP não olha.**

O grosso do fator de 10,5× é a vinhaça (§2.1) somada ao corte de escala e à base
por planta (§4).

---

## 4. As duas não-comparabilidades, registradas

**(a) Corte de escala.** A FIESP só conta plantas acima de **4.800 Nm³/d de biogás
bruto**. O PILAR-2b não aplica corte nenhum. Isso deveria empurrar a FIESP para
BAIXO em relação ao PILAR-2b, não para cima — o corte descarta oferta dispersa. O
fato de a FIESP ainda ficar 10,5× acima no subconjunto **reforça** que o
desacordo é de parâmetro (§2.1), não de recorte.

**(b) Base por planta × base municipal.** A FIESP estima o potencial de 181
plantas elegíveis, ancoradas em 146 usinas reais e em aterros identificados. O
PILAR-2b estima o potencial de 645 municípios, sem hipótese sobre onde a planta
seria construída. **São grandezas diferentes com a mesma unidade.** A FIESP
responde "quanto se produziria se estas plantas fossem construídas"; o PILAR-2b
responde "quanto de substrato existe e é mobilizável neste território". Nenhuma
razão entre as duas é um erro de estimativa.

---

## 5. Origem do rótulo "~16 bilhões/ano" — hipótese nova

`VERIFICACAO_BENCHMARK_FIESP_2026-07-25.md` determinou que a citação estava errada
como escrita e que a intenção **não era determinável** com o que estava
versionado. O extrato de hoje traz um candidato que não existia então.

**GEF Biogás Brasil: 42,5 M Nm³/d = 15,5 bilhões Nm³/ano de biometano.**

| Rótulo no repositório | Onde | Candidato | Ajuste |
|---|---|---|---|
| "~16 bilhões m³ CH₄/ano" | rótulo do Sankey, **removido** em 2026-07-25 | **GEF Biogás Brasil, 15,5 bi Nm³/ano de biometano** | **unidade e ordem de grandeza batem exatamente**; diverge na atribuição (FIESP vs GEF); "CH₄" vs "biometano" é quase a mesma grandeza |
| "FIESP/AMPLUN 2021 ~16,0 M m³/dia biogás" | 4 arquivos, incl. `compute_sp_canonical_totals.py:319` | **Instituto 17 / BEP UK 2021: 8,2 M Nm³/d de biometano → 15,5 M Nm³/d de biogás a 53 % CH₄** | **numeral, unidade E ano batem** |

Duas observações que impedem tratar isso como resolvido:

1. **Cronologia.** O rótulo do Sankey foi escrito em **2026-05-09**, um mês antes
   da extração da FIESP e mais de um ano antes deste extrato. Seu autor não podia
   tê-lo lido no relatório de 2025. O GEF Biogás Brasil, porém, é programa
   público e o número circula de forma independente — a hipótese permanece viável.
2. **Os dois "Instituto 17 (2021)" do repositório não fecham entre si.** A
   extração registra "~4,2 bilhões Nm³/ano de biogás" (= 11,5 Mm³/d); o extrato de
   hoje registra 8,2 Mm³/d de biometano (= 15,5 Mm³/d de biogás). Ou são estudos
   distintos do mesmo ano, ou a mesma fonte citada com valores diferentes.

**Nada foi corrigido.** As quatro citações "FIESP/AMPLUN 2021 ~16,0" continuam sem
lastro, e a decisão — localizar a fonte ou remover as citações — segue sendo do
**Lote 5**. O que muda é que a busca agora tem dois alvos nomeados em vez de
nenhum.

---

## 6. Achados que este lote produziu e não corrigiu

| # | Achado | Onde | Destino |
|---|---|---|---|
| 1 | Rendimento de CH₄ da vinhaça: PILAR-2b 2,88 abaixo da faixa citada de 6–10 Nm³/m³; FIESP 11,71 acima dela | `feedstocks.yaml` VINHACA | discussão do manuscrito; lote próprio, com referência primária |
| 2 | `rsu_organic` implica fração orgânica de ~27 %, contra os 52,5 % declarados em `organic_fraction_of_rdo` no mesmo arquivo | `feedstocks.yaml` FORSU | inconsistência interna — lote próprio |
| 3 | `FIESP_BENCHMARK_EXTRACTION.md` §1 e §6 incluem o bagaço no escopo do headline; a aritmética da própria FIESP o exclui | `docs/data/` | Lote 5 |
| 4 | Teor de CH₄ da vinhaça 65 % no PILAR-2b contra 53 % na FIESP | `feedstocks.yaml` VINHACA | registro |
| 5 | O relatório FIESP 2025 não tem URL versionada; `document.url` deixado nulo | `data/benchmarks/fiesp_2025.yaml` | pendência do usuário |

---

## 7. Reprodução

```bash
python - <<'PY'
import json
st = json.load(open("cp2b-workspace/NewLook/docs/data/estado_2026-07-26_lote2.json", encoding="utf-8"))
per = {r["stream"]: r for r in st["per_stream"]}
sub = ["cana_vinhaca", "cana_torta", "rsu_organic"]
ch4 = sum(per[s]["ch4_practical_m3_yr"]["medio"] for s in sub) / 365 / 1e6
print(f"subconjunto FIESP: CH4 {ch4:.4f} -> biometano {ch4*0.97:.4f} Mm3/d")
print(f"vinhaca a 17,68 Nm3/t sobre 344,61 Mt: {344.61e6*17.68/1e9:.3f} bi Nm3/ano")
print("total de biogas publicado pela FIESP:   4,266 bi Nm3/ano")
PY
```
