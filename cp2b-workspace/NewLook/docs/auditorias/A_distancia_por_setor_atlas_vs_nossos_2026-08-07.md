# Adventure A — Distância por setor: método Atlas (publicado 2016/17) × nosso Real/Ideal (método Atlas, 2023) × nossa cascata FDE (2023)

**Data:** 2026-08-07 · **Modo:** somente leitura · **Nada foi modificado** (nem arquivo, nem schema, nem parâmetro; nenhuma migração executada).
**Árvore:** `docs/validation-chain-2026-08-01` · **HEAD:** `2dbb23a80bc9e94fcdddec52e7cda032e9ae2d07` (`2dbb23a`, *docs(results): spatial results for the paper under the Atlas method*).
**Banco:** stack já no ar; `cp2b-db-dev` (`cp2b_maps`, postgis 15-3.4, healthy). Todas as consultas com `SET default_transaction_read_only=on`.

> **Escolha de árvore.** O lote foi rodado em `2dbb23a`, e não no commit "certificado" `7bd8596`, por decisão registrada: em `7bd8596` as migrações 004/028 estão quebradas (004 nunca aplicou por completo — aborta na primeira FK pendente, deixando só 19 resíduos agrícolas, **sem RSU nem esgoto**), reparadas apenas nos commits de validação. A única diferença do gerador do portão acima de `7bd8596` é **comentário** (`9195a1a`, "changes no computation"), então o número certificado se reproduz idêntico aqui. `2dbb23a` entrega o número certificado **e** um banco com os três setores. O volume em execução é pós-reparo (38 resíduos, não 19).

---

> **⚠️ CORREÇÃO 2026-08-08 (ver `A_atlas_ancoragem_etapa1_2026-08-08.md`).** A auditoria do PDF do Atlas mostrou que **duas das três âncoras usadas neste relatório estavam erradas**: RSU deveria ser **418.432.163** (FORSU, Tab. V.8), não 1.528.007.602 (aquilo era biogás captado da rota de aterro); esgoto deveria ser **102.781.019** (Ideal, Tab. VI.3), não 102.158.739 (Real). A cana (7.852.566.000) está correta. **Distâncias corretas: cana 56,9%, RSU 95,0%, esgoto 64,8%, total 90,7% do Atlas (8.637.664.626).** O "encolhimento de 74% no RSU" abaixo é **artefato de ancoragem** — leia a Etapa 1. Nossos números por setor permanecem válidos; o que muda são as âncoras do Atlas e as % da Tarefa 3 e Tabela 5.

## Sumário executivo — o que o lote mediu

Três objetos distintos, medidos na mesma base de atividade 2023, comparados setor a setor. **Nenhum parâmetro foi ajustado para aproximar nenhum total de nenhum outro.** A distância entre eles é o resultado.

| Setor | Atlas publicado 2016/17 (biometano) | Nosso Real 2023 (método Atlas) | Nossa cascata FDE 2023 |
|---|---:|---:|---:|
| Cana (vinhaça+torta+palha) | 7.852.566.000 | 4.467.728.488 | 1.605.795.351 ⚠️ |
| RSU | 1.528.007.602 | 397.584.384 | 464.205.440 |
| Esgoto/ETE | 102.158.739 | 66.643.880 | — (não computável) |
| **Subtotal 3 setores** | **9.482.732.341** | **4.931.956.752** | **2.070.000.791** (2 de 3) |
| **Total do Estado (todos os setores)** | n/d dos âncoras | **7.832.143.834** | 3,301 bi (§1.1, não reproduzido ao vivo) |

Unidades: Nm³ CH₄/ano = biometano no nosso pipeline (o CH₄ **é** o biometano; slip de upgrading 1–3% não descontado — limite superior, RESULTADOS §5.5). ⚠️ = a cascata da cana **inclui bagaço**; as outras duas colunas o excluem (ver Tarefa 6).

**Três leituras que decidem o artigo:**

1. **Todos os três setores encolhem** sob a base 2023 com método Atlas, frente ao Atlas publicado: cana 56,9%, RSU 26,0%, esgoto 65,2% do valor do Atlas. Como a cana **cresceu ~32%** e a população subiu de 2017→2023, o encolhimento **não é vintage** — é a reconstrução por corrente ser mais conservadora. A frase do artigo não pode ser "reproduzimos o Atlas"; tem de ser "aplicamos o método do Atlas a dados atualizados e lemos a disponibilidade de forma mais conservadora, nesta magnitude, por estas razões."
2. **A cascata FDE não é o piso universal.** É o piso para a cana (1,61 bi ≪ 4,47 bi) e para o Estado (3,30 ≪ 7,83), mas para o **RSU ela é maior** que o método Atlas (464 M > 398 M) e para o **esgoto é indefinida** (não há base teórica). O rótulo "piso conservador" precisa ser qualificado por setor.
3. **A referência metodológica central — o Atlas (Coelho et al., 2020) — não está citada** no corpus, embora 13 parâmetros de cenário derivem dela.

---

## Tarefa 1 — Portão + procedência dos parâmetros de energia

**Portão de aceitação confirmado.** O gerador `sp_scenarios_real_ideal.py`, lendo o master canônico comprometido, devolve **REAL 7.832.143.834** e IDEAL 9.841.178.207 Nm³ CH₄/ano. Cruzamento independente com o banco: `SUM(ch4_real_m3_year)` sobre 645 municípios = **7.832.143.834**, **diferença 0**. As duas rotas concordam ao dígito.

- Master: `data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv`
- sha256 (blob git, LF, independente de plataforma): `7d0fb051bb7cb74c4588d8d77a0865c27a0e9c0b42bb3f43f91ec117a1aebfa5` — confere com o valor registrado.

**LHV e eficiência elétrica — o que o pipeline usa × o Atlas.** Do gerador (linhas 54–55) e de `scenario_parameters`:

| Parâmetro | Nosso pipeline | Atlas | Fonte nossa |
|---|---:|---|---|
| PCI CH₄ | **9,94** kWh/Nm³ | 9,97 (p.94) | Bueno et al. 2016 |
| Eficiência elétrica | **0,38** | 0,35 (≤5.000 Nm³/dia) / 0,42 (>5.000) (p.94/97) | ABIOGAS 2018 (média das duas faixas) |

**Efeito da diferença sobre o GWh** (medido sobre o CH₄ Real = 7.832.143.834; os percentuais independem do cenário):

| Grandeza | Nossos parâmetros | Atlas (faixa baixa 0,35) | Atlas (faixa alta 0,42) |
|---|---:|---:|---:|
| Energia térmica (GWh/ano) | 77.852 (×9,94) | 78.086 (×9,97) | 78.086 (×9,97) |
| Energia elétrica (GWh/ano) | **29.584** | 27.330 | 32.796 |
| Nosso × Atlas (elétrica) | — | **+8,24%** | **−9,80%** |

- **PCI isolado:** 9,94 vs 9,97 → nossa térmica fica **0,30% menor** do que ficaria com o PCI do Atlas. Efeito de segunda ordem.
- **Eficiência:** nosso 0,38 é a média entre as faixas do Atlas. Nossa elétrica fica **+8,24%** acima da faixa de baixa vazão e **−9,80%** abaixo da de alta vazão. Uma planta específica deve usar 0,35 ou 0,42 (RESULTADOS §5.4).
- **Não alteramos nada.** Isto é a medida do desvio, não uma correção.

> Contexto: o Atlas publica **31.895 GWh/ano** de elétrica **só para a cana** (Tabela IV.6, dados 2016/17). Não é comparável ao nosso total de Estado — é lembrete de quão permissivo o setor cana do Atlas é (ver Tarefa 3).

---

## Tarefa 2 — Nossos totais por setor, 2023 (Real e Ideal, Nm³ CH₄/ano = biometano)

Mapeados aos setores que o Atlas reporta. Composição por corrente, direto do gerador (soma bate com as colunas de `municipalities`):

**Cana-de-açúcar** = vinhaça + torta de filtro + palha (bagaço excluído):

| Corrente | Real | Ideal | Base do parâmetro |
|---|---:|---:|---|
| Palha de cana | 2.409.770.274 | 3.012.212.843 | 140 kg/t cana; 40%/50% recolhível (Atlas p.65); BMP 175, VS 56% |
| Vinhaça | 1.197.325.974 | 1.556.523.766 | 114 m³ biogás/m³ etanol; 50–65% CH₄ (Atlas p.67) |
| Torta de filtro | 860.632.241 | 860.632.241 | 35 kg/t cana (Atlas p.66); BMP 280, VS 20% |
| **Setor cana** | **4.467.728.488** | **5.429.368.849** | |

**RSU** = fração orgânica (FORSU / ORGANICO_RSU):

| Corrente | Real | Ideal | Base |
|---|---:|---:|---|
| RSU (FORSU) | 397.584.384 | 399.100.968 | per-capita 0,7–1,1 kg/dia; MO 0,4646 (Eq V.5); FMO 101,5 (Eq V.6); CH₄ 0,55; coleta 0,9962 Real / 1,0 Ideal |

**Esgoto/ETE** = lodo primário + secundário, via rota DQO:

| Corrente | Real | Ideal | Base |
|---|---:|---:|---|
| Esgoto (ETE) | 66.643.880 | 73.639.647 | 0,120 m³/hab/dia; DQO 449,7 g/m³; 0,1115 Nm³CH₄/kgDQO; remoção 0,755 (Atlas Eq VI.1); coleta 0,905 Real / 1,0 Ideal |

**Nota biometano.** No pipeline, CH₄ = biometano (não há divisão CH₄→biogás; RESULTADOS §4.1). O Atlas reporta biogás **e** biometano separados; comparamos biometano-com-biometano. Nosso biometano não desconta slip de upgrading (≤3%) — é limite superior.

---

## Tarefa 3 — Distância A: efeito do vintage de dados (Atlas 2016/17 × nosso Real 2023, mesmo método)

| Setor | Atlas 2016/17 | Nosso Real 2023 | Diferença absoluta | Nosso ÷ Atlas | Cresceu/encolheu |
|---|---:|---:|---:|---:|:--|
| Cana | 7.852.566.000 | 4.467.728.488 | −3.384.837.512 | **56,90%** | encolheu −43,10% |
| RSU | 1.528.007.602 | 397.584.384 | −1.130.423.218 | **26,02%** | encolheu −73,98% |
| Esgoto | 102.158.739 | 66.643.880 | −35.514.859 | **65,24%** | encolheu −34,76% |

**Os três encolheram.** RSU encolhe mais (a 26%), depois cana (57%), depois esgoto (65%).

⚠️ **Distância A NÃO isola vintage limpo — leia com cuidado:**

1. **O sinal contradiz o vintage.** A moagem de cana cresceu ~32% e a população de SP subiu de 2017→2023 (RESULTADOS §5.6). Com o método nominalmente fixo, uma base de atividade **maior** devolvendo um resultado **menor** significa que o resíduo não é vintage — é a nossa reconstrução por corrente ser mais conservadora por tonelada que a do Atlas. **Esta é a descoberta**, não um erro.
2. **RSU mistura dois sub-métodos do próprio Atlas.** A âncora do Atlas é "RSU aterro, cenário real" (Tabela V.6) — um modelo de **aterro** (geração de gás no tempo). Nosso gerador usa a rota de **fração orgânica** do Atlas (Eq V.5–V.6, FMO instantâneo). São métodos diferentes dentro do Atlas. O gap de RSU conflaciona vintage + escolha de sub-método. **Verificar no PDF** se a Tabela V.6 sai da Eq V.5–V.6 ou de um modelo LandGEM separado.
3. **Cana também não é reprodução pura.** Nosso gerador aplica os parâmetros do Atlas (114 m³/m³ etanol, palha 40/50%) mas usa BMP×VS para torta/palha e traz "quatro correções" (bagaço fora, vinhaça dentro, suíno, saneamento). Logo, Distância A da cana = vintage + reconstrução, não vintage puro.

**Consequência para o manuscrito:** a sentença tem de ser *"aplicamos o método do Atlas à base 2023 e obtemos um potencial de cana (e RSU, e esgoto) mais conservador, por 43% / 74% / 35%, por estas razões"* — não *"reproduzimos o Atlas"*.

---

## Tarefa 4 — Distância B: efeito do modelo de disponibilidade (nosso Real método Atlas × nossa cascata FDE, ambos 2023)

Cascata FDE = `FC × FCp × FS × FL`, ponderada pelo teórico por fluxo (réplica exata de `sp_fde_cascade.py`, função `acumulado()`).

| Setor | Real (método Atlas) | Cascata FDE | Cascata ÷ Real | Fator dominante que deprime a cascata |
|---|---:|---:|---:|:--|
| Cana | 4.467.728.488 | 1.605.795.351 ⚠️ | **35,94%** | **FCp** (uso concorrente): passo 0,1878 — o colapso |
| RSU | 397.584.384 | 464.205.440 | **116,76%** | **FC** (coleta): passo 0,4750 |
| Esgoto | 66.643.880 | — | — | base teórica ausente (ver abaixo) |

Decomposição por estágio (fator acumulado central = média dos substratos, por fluxo):

| Setor | após FC | após FCp | após FS | FDE final | passo FC | passo FCp | passo FS | passo FL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Cana | 0,8575 | 0,1610 | 0,1444 | **0,1297** | 0,858 | **0,188** | 0,896 | 0,898 |
| RSU | 0,4750 | 0,3925 | 0,3729 | **0,2983** | **0,475** | 0,826 | 0,950 | 0,800 |

**Achados:**

1. **Assimetria do "piso".** Para a **cana**, a cascata (1,61 bi) fica muito abaixo do método Atlas (4,47 bi) — é o piso conservador. Para o **RSU**, a cascata (464 M) fica **acima** do método Atlas (398 M): a cascata **não é o piso** do RSU. Isso qualifica a narrativa de Estado ("a cascata é o piso") — verdadeira no agregado e na cana, falsa no RSU.
2. **Fatores dominantes divergem por setor.** Cana é derrubada por **FCp** (uso concorrente — bagaço 82% queimado, vinhaça/palha descontadas): o passo FCp leva 0,858 → 0,161. RSU é derrubado por **FC** (coleta 45–50%): o passo FC leva 1,0 → 0,475. Esse é o payload de diagnóstico: um planejador lê *por que* o piso está onde está, resíduo a resíduo.
3. **Esgoto: Distância B não computável.** LODO_PRIMARIO e LODO_SECUNDARIO **têm** fatores FDE (acumulado 0,5741 / 0,5299 — reteriam ~55%, mais que o RSU!), mas **não há coluna teórica `sewage_biogas_m3_year`** em `municipalities` (16 colunas teóricas, nenhuma de esgoto). O esgoto entrou só como fluxo do método Atlas (RESULTADOS §4.8), nunca como fluxo decomposto. Sem peso teórico, a cascata não produz esgoto. **Não fabricamos o número.**

⚠️ **Bagaço quebra a comparabilidade da cana (ver Tarefa 6):** a cascata da cana (1,606 bi) **inclui** bagaço na base teórica de 12,38 bi; o Real (4,468 bi) **exclui**. Distância B da cana compara uma cascata bagaço-inclusiva com um método Atlas bagaço-exclusivo — não é maçã-com-maçã. Uma cascata bagaço-excluída exigiria decompor o teórico por substrato, o que o banco **não guarda** (o próprio `sp_fde_cascade.py` lamenta isso: "o banco guarda o teórico por FLUXO, não por substrato"). Sensibilidade: sem BAGACO na média de fatores, o FDE central da cana cai de 0,1297 para 0,1263 — quase igual; o efeito real está na massa teórica, que não dá para remover limpo hoje.

---

## Tarefa 5 — Tabela mestra de três colunas (biometano, base Real)

| Setor | Atlas publicado 2016/17 | Nosso Real 2023 (método Atlas) | Nossa cascata FDE 2023 |
|---|---:|---:|---:|
| Cana (vinhaça+torta+palha) | 7.852.566.000 | 4.467.728.488 | 1.605.795.351 ⚠️ bagaço-incl. |
| RSU | 1.528.007.602 | 397.584.384 | 464.205.440 |
| Esgoto/ETE | 102.158.739 | 66.643.880 | — não computável |
| **Subtotal 3 setores** | **9.482.732.341** | **4.931.956.752** | **2.070.000.791** (2 de 3) |
| **Total do Estado (todos os setores)** | ver nota | **7.832.143.834** | **3,301 bi** (§1.1) |

**Notas da linha de total:**
- **Atlas:** só temos 3 setores verbatim dos âncoras; **não há total de Estado do Atlas** aqui. Atenção: o subtotal dos 3 setores ancorados (9,48 bi) **excede** a referência Coelho/IEE-USP de ~8,60 bi (23,6 mi Nm³/dia) da tabela de posicionamento. Isso sugere que as figuras por setor do Atlas **podem não ser aditivas** a um total (cenários/escopos distintos por capítulo). Comparar nosso setor com o setor deles é válido; **somar os setores deles não é** — resolver contra o PDF.
- **A cana do Atlas sozinha (7,85 bi) rivaliza com nosso Estado inteiro (7,83 bi).** É o sinal de que o método do Atlas é mais permissivo por setor, antes mesmo da cascata.
- **Nossa cascata de Estado (3,301 bi / 16,59%):** vem do §1.1 registrado. **Não foi reproduzida ao vivo** neste lote — o script `sp_fde_cascade.py` **aborta** neste banco por `CASCAS_CITROS_IND` sem FDE (ver Riscos). Os valores por setor de cana e RSU acima foram computados diretamente (não dependem de citros).

---

## Tarefa 6 — Bagaço: confirmação e uma correção ao pressuposto do lote

O lote pediu para "confirmar que o bagaço é excluído nos três". **A verificação diz que não é** — é excluído em dois, incluído no terceiro:

| Objeto | Bagaço? | Base (citada) |
|---|:--|---|
| Atlas publicado | **Excluído** | Atlas p.65: resíduos *"já aproveitados para geração de energia (como o bagaço de cana)"* vs *"torta de filtro, vinhaça e palha de cana"* ainda não aproveitados |
| Nosso Real/Ideal | **Excluído** | `sp_scenarios_real_ideal.py` linhas 17–22 (mesma citação p.65); `scenario_parameters.bagaco_incluido = 0` (real e ideal), fonte "Atlas de Bioenergia SP 2020, p.65" |
| Nossa cascata FDE | **INCLUÍDO** | `sp_fde_cascade.py` linhas 63–64: *"Bagaço ENTRA aqui, ao contrário dos cenários Real/Ideal: a pergunta é o que a metodologia FDE faz com o potencial teórico inteiro, e o teórico inclui bagaço."* Substrato BAGACO no fluxo cana (FDE 0,1399) |

**Justificativa da exclusão (Atlas p.65 / RESULTADOS §4.3):** contabilizar o bagaço duplicaria energia que o setor sucroenergético já recupera em caldeiras de cogeração. Usar BAGACO como representante da cana aplicava seu FCo de 0,18 (82% já queimado) a 62% do potencial do Estado.

**Implicação:** a Distância B da cana (Tarefa 4) não é estritamente comparável enquanto a cascata carregar bagaço. Ou se produz uma cascata bagaço-excluída (precisa de teórico por substrato — item de schema, ver Path Forward), ou o artigo declara o assimétrico explicitamente.

---

## Tarefa 7 — O Atlas no corpus de referências

**O Atlas de Bioenergia SP (Coelho et al., IEE/USP, 2020) NÃO está citado no corpus.**

- Arquivos de referência: `data/canonical_parameters/references_unified.csv` e `references_review.csv` — **367 registros cada** (não 399). A tabela `scientific_references` do banco está **vazia (0 linhas)**; `residuo_references` tem 754 linhas / 67 títulos distintos.
- Busca por `coelho|atlas|bioenergia|IEE|IEE/USP`: só dois falsos positivos — CIBiogás *"Atlas do Biogás Brasil - Potencial suinocultura"* (**obra diferente**) e um artigo de co-digestão de vinhaça. **Nenhum** registro do Atlas de Bioenergia SP.
- Nota sobre "399 registros": o número vem do PR #179 (*"309 dos 399 artigos perderam o vínculo... no dedupe"*). O corpus atual traz **367**. Reconciliar 399 → 367 → 754 vínculos / 67 títulos é um item aberto.

**Parâmetros do Atlas usados mas não citados** (de `scenario_parameters`, fonte declarando o Atlas — 13 linhas):

| # | Parâmetro | Valor | Página/Eq |
|---:|---|---|---|
| 1 | vinhaca_biogas_por_m3_etanol | 114 m³/m³ etanol | p.67 |
| 2 | vinhaca_teor_ch4 | 0,50 / 0,65 | p.67 |
| 3 | palha_cana_fracao_recolhivel | 0,40 / 0,50 | p.65 |
| 4 | bagaco_incluido | 0 | p.65 |
| 5 | rsu_fracao_organica | 0,4646 | Eq V.5 |
| 6 | rsu_fator_biogas | 101,5 Nm³/t MO | Eq V.6 |
| 7 | rsu_taxa_coleta | 0,9962 | p.90 |
| 8 | esgoto_dqo_media | 449,7 g/m³ | Eq VI.1 |
| 9 | esgoto_potencial_ch4 | 0,1115 Nm³/kg DQO | Eq VI.1 |
| 10 | esgoto_eficiencia_remocao | 0,755 | Eq VI.1 |
| 11 | residuos_campo_fracao_recolhivel | 0,40 / 0,50 | analogia p.65 |
| 12 | pci_ch4 | 9,94 (Atlas usa 9,97) | p.94 |
| 13 | eficiencia_eletrica | 0,38 (Atlas 0,35/0,42) | p.94 |

**Não adicionei nada** — apenas inventariado, conforme o lote.

**Contagem de feedstocks (questão levantada):** as somas por setor de `municipalities` descansam sobre **15 linhas de fluxo do gerador → 13 colunas de setor distintas** (cenários por resíduo = 13, `scenario_parameters`). A taxonomia `residuos` tem **38**; a tabela FDE, **38** com fatores; nenhum arquivo `residuos.csv` foi encontrado nesta árvore. **Nenhuma contagem é 30.** A sentença do manuscrito que compromete "30 feedstocks" precisa ser reconciliada com 13 (setores publicados) ou 15 (linhas de fluxo).

---

## Consolidação — questões abertas, por severidade

| # | Questão | Severidade | Bloqueia submissão? |
|---:|---|:--|:--|
| 1 | "Reproduzimos o Atlas" é falso; é "aplicamos e lemos mais conservador". Reescrever a alegação. | Alta | Sim |
| 2 | RSU compara aterro (Atlas Tab V.6) × fração orgânica (nosso Eq V.5–V.6). Verificar no PDF; decidir rota. | Alta | Sim (para a alegação de RSU) |
| 3 | "Piso conservador" é falso para RSU (cascata > Atlas) e indefinido para esgoto. Qualificar por setor. | Alta | Sim |
| 4 | Bagaço: incluído na cascata, excluído no resto → Distância B da cana não é maçã-com-maçã. | Média | Não, se declarado |
| 5 | Atlas (Coelho 2020) não citado; 13 parâmetros dependem dele. Adicionar à bibliografia. | Média | Sim (integridade de citação) |
| 6 | "30 feedstocks" não bate com nenhuma contagem (13/15/38). Corrigir a sentença. | Média | Sim |
| 7 | `sp_fde_cascade.py` aborta (CASCAS_CITROS_IND sem FDE): cascata de Estado não reproduz ao vivo. | Média | Não (número vem do §1.1) |
| 8 | Total de Estado do Atlas indisponível; 3 setores ancorados (9,48 bi) > benchmark Coelho (8,60 bi). | Média | Sim (para a linha de total) |
| 9 | Corpus tem 367, não 399; `scientific_references` vazia. Reconciliar contagem. | Baixa | Não |

---

## Path Forward — como terminar isto direito (para amanhã)

**Passo 0 — ambiente (já resolvido).** Rodar em `2dbb23a`, stack no ar, portão reproduzido (CSV + banco, diff 0). Manter somente leitura; ramificar deliberadamente de `2dbb23a` quando formos **escrever** resultados (não commitar no HEAD destacado).

**Passo 1 — extrair do PDF do Atlas (você já o tem), para fechar 3 lacunas de uma vez:**
- (a) **Total de Estado do Atlas** → preenche a linha de total da Tabela 5 e resolve a tensão 9,48 vs 8,60 bi (aditivo ou não?).
- (b) **Método de RSU do Atlas** (Tab V.6 sai da Eq V.5–V.6 ou de LandGEM?) → decide se Distância A de RSU é vintage ou método.
- (c) **Confirmar os âncoras verbatim** já embutidos no prompt contra a fonte, uma vez.

**Passo 2 — decisões metodológicas (suas):**
- **RSU:** ou (i) reproduzir a rota de aterro do Atlas para uma Distância A limpa de vintage, ou (ii) declarar a divergência de sub-método explicitamente e comparar só rota-de-fração-orgânica com rota-de-fração-orgânica. Recomendo (ii): mais honesto e mais barato.
- **Bagaço na cascata:** ou (i) adicionar teórico por substrato ao schema para uma cascata bagaço-excluída (tarefa de dados), ou (ii) declarar o assimétrico e anotar que remover bagaço mal move o FDE central (0,1297→0,1263). Recomendo (ii) para o artigo, (i) como dívida técnica.
- **"Piso conservador":** trocar a alegação de Estado por uma tabela por setor (esta) que mostra onde a cascata é piso (cana, Estado) e onde não é (RSU, esgoto).

**Passo 3 — correções de manuscrito (texto, sem tocar em dados):**
- Alegação central: "aplicamos o método do Atlas a 2023 e lemos disponibilidade mais conservadora, por 43%/74%/35% (cana/RSU/esgoto)".
- Contagem de feedstocks: "30" → 13 (setores) ou 15 (fluxos), o que o texto pretender.
- Citar Coelho et al. (2020) e apontar os 13 parâmetros a ele.

**Passo 4 — reparos técnicos (dívida, não bloqueia o artigo):**
- Migração para dar FDE a `CASCAS_CITROS_IND` (e revisar se 004 deixou outros substratos órfãos), para `sp_fde_cascade.py` reproduzir a cascata de Estado ao vivo.
- Reconciliar corpus 399→367 e popular/aposentar `scientific_references`.
- Considerar coluna teórica de esgoto se quisermos Distância B de esgoto algum dia.

**Ordem sugerida amanhã:** Passo 1 (PDF) → Passo 2 (decisões) → Passo 3 (texto). Passo 4 pode virar um lote separado. O que trava o artigo são #1, #2, #3, #5, #6, #8 — todos resolvíveis com o PDF em mãos e reescrita de texto, sem recomputar nada.

---

## Procedência

- Todas as consultas: `docker exec cp2b-db-dev psql -U postgres -d cp2b_maps`, `SET default_transaction_read_only=on`.
- Gerador do portão: `docker compose run --rm --entrypoint python db-migrations scripts/sp_scenarios_real_ideal.py --master data/canonical_parameters/SP_master_residue_streams_2023_FINAL.csv` (lê CSV; não roda migração; não escreve).
- Cascata: réplica de `backend/scripts/sp_fde_cascade.py` `acumulado()` sobre `residuos.{fc,fcp,fs,fl}_medio` e pesos teóricos `municipalities.{fluxo}_biogas_m3_year` (SP, ibge `35%`).
- Parâmetros: `scenario_parameters` (19 linhas), `sp_scenarios_real_ideal.py` (linhas 52–123), `RESULTADOS_SP_PARA_PAPER_2026-07-30.md` §1.1 e §2.
- Âncoras do Atlas: verbatim do prompt (Coelho et al., 2020: Tab IV.6 p.77; V.6 p.100; VI.2 p.117; p.94/97).
- **Nada modificado.** Nenhum arquivo de dados, schema, parâmetro ou migração tocado.

---

## Adendo pós-apuração (2026-08-07, mesma rodada, somente leitura)

Dois itens marcados como "não rastreado"/"reconferir" no handoff foram fechados com saída literal de execução:

**Diferença de 130.281 Nm³/ano (base da cascata × teórico canônico) = aquicultura.**
- Base 11 fluxos da cascata: 19.900.568.042
- Mesmos 11 fluxos + aquicultura: 19.900.698.323 → diferença **exatamente 130.281**
- A cascata (`sp_fde_cascade.py`, `FLUXO_SUBSTRATOS`) tem 11 fluxos e **não inclui aquicultura**; 130.281 confere com `aquaculture_biogas_m3_year` (SP) e com `OUTROS_FLUXOS_TEORICO["aquicultura"] = 130_281` no gerador. **Não é vazamento** — é um fluxo nomeado que o modelo decomposto omite. Se as duas bases aparecerem juntas, basta uma frase: "a base da cascata exclui aquicultura (130.281 Nm³/ano)".

**Split da cana `...488` × `...489` = arredondamento de exibição; valor verdadeiro `...488`.**
- `SUM(ch4_real_sugarcane_m3_year)` (SP), precisão plena: **4.467.728.488,390255** → arredonda para `...488`.
- O `...489` vem de somar os três componentes **já arredondados** (2.409.770.274 + 1.197.325.974 + 860.632.241). O total não arredondado é `...488,39`.
- **Publicar:** o agregado `4.467.728.488` está correto; ao exibir o split, anotar "±1 por arredondamento" ou mostrar uma casa a mais.
