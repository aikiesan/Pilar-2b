# Aventura B — Reexpressão do método Atlas em notação FDE — Etapa 1 (derivação) + colisão com o Apêndice A

**Data:** 2026-08-08 · **Modo:** somente leitura. Repositório intocado; nenhum branch criado; nada commitado.
**Base:** `2dbb23a` (`docs/validation-chain-2026-08-01`).
**Derivação:** script read-only em scratchpad (`etapa1_derivacao.py`), lendo o master canônico; não toca o repo.
**Status:** Etapa 1 fechada. **Colisão do Apêndice A RESOLVIDA** pelo autor (2026-08-08): três conjuntos, três papéis distintos — ver Adendo Etapa 2 no fim e `docs/DECISOES_METODOLOGICAS.md`. **Etapa 2 desbloqueada:** `fde_flow_factors.csv` escrito e **provado** (reproduz o gate ao dígito, sem tocar o gerador). Refator do gerador/loader, delta de 645 municípios (Etapa 3), Etapa 4 (API/UI) e Etapa 5 (higiene) **adiados** para o stack de pé; **nenhum commit** até a tabela delta municipal fechar.

---

## 1. Etapa 1 — o portão fecha: o método Atlas É expressável como FC × FCo × FS × FL

Reproduzindo a lógica de `sp_scenarios_real_ideal.py`, separando **disponibilidade** (FC, FCo) de **conversão** (BMP, VS, CH₄, PCI, per-capita, DQO...), por fluxo e por tier:

- **Real total = 7.832.143.834** (diff +0,37 Nm³, arredondamento float)
- **Ideal total = 9.841.178.207** (diff +0,04 Nm³)

**É identidade algébrica, não meta perseguida.** Nenhum fator ajustado.

### Conjunto B — fatores por fluxo (Real)

| Fluxo | FC | FCo | FS | FL | FDE | Teórico | Resultante |
|---|---:|---:|---:|---:|---:|---:|---:|
| Palha de cana | 1,000 | 0,400 | 1,00 | 1,00 | 0,4000 | 6.024.425.685 | 2.409.770.274 |
| Bovinos | 0,667 | 1,000 | 1,00 | 1,00 | 0,6667 | 1.838.597.155 | 1.225.731.437 |
| Vinhaça | 1,000 | 1,000 | 1,00 | 1,00 | 1,0000 | 1.197.325.974 | 1.197.325.974 |
| Torta de filtro | 1,000 | 1,000 | 1,00 | 1,00 | 1,0000 | 860.632.241 | 860.632.241 |
| Milho | 1,000 | 0,400 | 1,00 | 1,00 | 0,4000 | 1.361.216.163 | 544.486.465 |
| Soja | 1,000 | 0,400 | 1,00 | 1,00 | 0,4000 | 1.223.083.878 | 489.233.551 |
| RSU (FORSU) | 0,9962 | 0,4646 | 1,00 | 1,00 | 0,4628 | 859.020.594 | 397.584.384 |
| Silvicultura | 1,000 | 0,400 | 1,00 | 1,00 | 0,4000 | 599.802.082 | 239.920.833 |
| Citros | 1,000 | 0,700 | 1,00 | 1,00 | 0,7000 | 285.156.605 | 199.609.624 |
| Aves | 0,7143 | 1,000 | 1,00 | 1,00 | 0,7143 | 124.604.505 | 89.003.218 |
| Café | 1,000 | 0,700 | 1,00 | 1,00 | 0,7000 | 95.279.430 | 66.695.601 |
| Esgoto (ETE) | 0,905 | 1,000 | 1,00 | 1,00 | 0,9050 | 73.639.647 | 66.643.880 |
| Poda urbana | 1,000 | 0,800 | 1,00 | 1,00 | 0,8000 | 31.204.438 | 24.963.550 |
| Suínos | 0,667 | 1,000 | 1,00 | 1,00 | 0,6667 | 30.736.035 | 20.490.690 |
| Aquicultura | 1,000 | 0,400 | 1,00 | 1,00 | 0,4000 | 130.281 | 52.112 |
| **TOTAL** | | | | | | | **7.832.143.834** |

Ideal difere só onde há disponibilidade: palha 0,50; livestock FC=1,00; retenções 0,50/0,85/0,95; esgoto/RSU coleta=1,00. Vinhaça/torta seguem 1,00 (o Real/Ideal da vinhaça é **conversão** — CH₄ 0,50→0,65 —, não disponibilidade).

### Dois achados estruturais do conjunto B

1. **FS = FL = 1,00 em TODOS os 15 fluxos.** O método Atlas (conjunto B) usa apenas **FC e FCo**. Não há termo de sazonalidade nem de logística em ponto algum. Qualquer FS/FL ≠ 1 numa tabela do artigo **não pertence a este modelo**.
2. **São 15 fluxos, não 13.** A cana são três substreams com FDE distintos (palha 0,40 · vinhaça 1,00 · torta 1,00). O nível de cálculo do conjunto B é o fluxo (15), não o setor agregado (13). Conecta ao bloqueio #3.

---

## 2. A colisão: três parametrizações que não reconciliam

O Apêndice A (Tabela A1, tabela `fde_residue_availability`) traz uma **terceira** parametrização, distinta tanto do gerador quanto da `residuos` (que alimenta `sp_fde_cascade.py`). Para a cana:

| Substream | Conjunto B (gerador → 7,83 bi) | `residuos` (cascata → 3,301 bi) | Apêndice A (Tabela A1) |
|---|---:|---:|---:|
| Palha / straw | FCo 0,40; FS=FL=1 → **40,0%** | 0,55·0,083·0,85·0,75 → **2,92%** | 0,85·0,10·0,90·0,85 → **6,55%** |
| Vinhaça | **100%** (só conversão) | **9,31%** | 0,95·0,15·0,90·0,90 → **11,54%** |
| Torta | **100%** | **25,65%** | 0,95·0,33·0,90·0,90 → **25,39%** |
| Bagaço | **ausente** (fora do gerador) | **13,99%** (na base teórica) | FCo 0,00 → **0,00%** |

**Nenhuma coluna concorda com outra na palha (40% × 2,92% × 6,55%).** E o crucial:

- **O Apêndice A não reproduz o resultado publicado.** Os 7,83 bi vêm do conjunto B (palha 40%, FS=FL=1), não do Apêndice A (palha 6,55%, quatro fatores). Se o manuscrito apresenta a Tabela A1 como a parametrização por trás dos resultados municipais, isso é **falsa alegação** da mesma família do catálogo.
- **O Apêndice A também não reproduz o cenário Conservative (3,301 bi).** Esse número sai de `sp_fde_cascade.py` sobre a tabela `residuos` (palha 2,92%, bagaço 13,99%), **não** sobre `fde_residue_availability` (palha 6,55%, bagaço 0,00%). Logo o Apêndice A não documenta nem o conjunto B nem o conjunto A que a Aventura B quer renomear.

### Inconsistência interna do próprio Apêndice A

A nota ᵇ afirma: *"This study adopts 140 kg per tonne and a removal fraction of 0.40"* — que é **o parâmetro do conjunto B** (gerador). Mas a **linha** straw da Tabela A1 traz FCo 0,10 e FDE 6,55%, que **não é 0,40**. A nota descreve um modelo; a linha mostra outro. Contradizem-se dentro da mesma página.

### `fde_residue_availability` — existência não confirmada

A Tabela A1 declara "Values are those stored in `fde_residue_availability`". Essa tabela **não constava** na listagem de tabelas da auditoria de 07/08 (`cp2b-db-dev`). Re-verificação ao vivo **pendente** — o stack está parado nesta rodada. Se a tabela não existir no banco de produção, o Apêndice A cita uma fonte inexistente no DSN canônico — outra lacuna de procedência (regra: container ≠ autoridade sem procedência do master hash-locked).

---

## 3. Implicação e decisão necessária

**Etapa 1 (conjunto B) está pronta e é sólida** — o portão fecha, os fatores estão nomeados, a classificação availability-vs-conversão está limpa. `fde_flow_factors.csv` pode ser gerado deste conjunto sem mexer em nenhum número.

**Etapa 2+ está bloqueada** porque o Apêndice A, como está, é um terceiro modelo que não produz nem 7,83 bi nem 3,301 bi. Antes de escrever código ou CSV, o autor decide:

1. **O Apêndice A deve documentar o conjunto B (o método publicado)?** Então a Tabela A1 está errada (palha 6,55% vs 40%; FS/FL presentes onde o modelo tem 1,00) e deve ser **reescrita** com os fatores do conjunto B derivados aqui. É a leitura coerente com o portão.
2. **Ou o Apêndice A deve ser o conjunto A (Conservative, por substrato)?** Então precisa reproduzir 3,301 bi — mas isso hoje sai da tabela `residuos`, não de `fde_residue_availability`. As duas teriam de ser reconciliadas, e o número Conservative reaberto se a base mudar (→ tabela delta, portão novo).
3. **De onde vem `fde_residue_availability`** e qual sua procedência a partir do master? (Pré-requisito `A_apendiceA_vs_banco_2026-08-08.md`, **ausente** — esta Etapa 1 é o começo dessa reconciliação.)

**Recomendação:** tratar o conjunto B (esta derivação) como autoridade para os resultados publicados; reescrever o Apêndice A com os fatores por fluxo do conjunto B; e, se um conjunto A por substrato for mantido, reconciliá-lo contra a cascata que de fato produz 3,301 bi (`residuos`), rotulando cada tabela pelo modelo — nunca harmonizar números entre modelos.

---

## 4. Pendências de ambiente / procedência (não bloqueiam a derivação)

- Pré-requisito `A_apendiceA_vs_banco_2026-08-08.md` **ausente**.
- Stack parado (todos `cp2b-*` Exited há ~24 min); re-verificar `fde_residue_availability` quando subir.
- Higiene de branch: `2dbb23a` carrega mudanças não commitadas (relatórios de auditoria, `.gitignore`, `next-env.d.ts`, ~10 arquivos de dados) que seguiriam para um branch de Aventura B — decidir o que vai junto antes de ramificar.
- Split de procedência do conjunto B (8 primary_literature + 7 inherited_assumed): suíno é "Reconstrução PILAR-2b", não Atlas — refinar antes de gravar `provenance_class`.

**Nada modificado.** Derivação por script de scratchpad; totais conferidos contra o gate.

---

## Adendo Etapa 2 — colisão resolvida + CSV escrito e provado (2026-08-08)

**Resolução do autor:** o Apêndice A (conjunto 3, `fde_residue_availability`) **não é para reproduzir número nenhum** — é camada de catálogo por substrato que nenhum cenário consulta. Os três conjuntos têm papéis distintos (registrado em `docs/DECISOES_METODOLOGICAS.md`):
- **Conjunto B** (por fluxo) → **Apêndice do artigo**; única tabela que reproduz um número publicado.
- **Conjunto 1** (`residuos`) → tabela do cenário **Conservative**, seção de sensibilidade.
- **Conjunto 3** (`fde_residue_availability`) → **fora do artigo**; fica no depósito como catálogo. A nota ᵇ (parâmetros do conjunto B sobre linhas do conjunto 3) é erro e sai.

**Branch:** `feat/reexpressao-fde-2026-08-08`, criado de `2dbb23a`. Só o que a Etapa 1/2 produziu entra no commit (quando houver).

**Entregável escrito:** `data/canonical_parameters/fde_flow_factors.csv` — 15 fluxos × 2 tiers = 30 linhas; colunas `fluxo,tier,fc,fco,fs,fl,fde,termo_origem,fonte,provenance_class`. Fatores de pecuária gravados em precisão float plena (8/12, 6/9, 0,025/0,035) para reprodução exata.

**Prova (read-only, sem tocar o gerador certificado):** o script `etapa2_csv_reader_proof.py` aplica os fatores do CSV aos volumes teóricos e agrega como o gerador (soma não arredondada, arredonda uma vez):

| Tier | CSV-driven (soma-depois-arredonda) | Gate | diff | max delta por fluxo |
|---|---:|---:|---:|---:|
| REAL | 7.832.143.834 | 7.832.143.834 | 0 | 0 |
| IDEAL | 9.841.178.207 | 9.841.178.207 | 0 | 0 |

**Nota de arredondamento (Etapa 3):** `arredondar-por-fluxo-e-somar` dá Ideal 9.841.178.208 (+1). O agregado publicável é `soma-não-arredondada → arredonda-uma-vez` (método do gerador). A tabela delta deve usar essa agregação; o teste decisivo é o delta **por fluxo** (todos zero).

**Adiado para o stack de pé (nenhum commit até fechar):**
1. Refator de `sp_scenarios_real_ideal.py` **e** de `load_scenarios_real_ideal.py` para lerem o CSV (as constantes estão **duplicadas** nos dois; "um formalismo" exige os dois). Só o refator do gerador de estado é verificável sem DB; o loader municipal precisa do banco.
2. Etapa 3 — tabela delta estado (verificável agora, = 0 por fluxo) **e** 645 municípios (precisa do DB, via `load_scenarios`).
3. Etapa 4 — nomenclatura Conservative/Real/Ideal em código, API, UI (precisa do app para verificar).
4. Etapa 5 — higiene (bagaço FDE em `residuos`; `sp_fde_cascade.py` tolerante a `CASCAS_CITROS_IND`; acrescentar Coelho 2020; não tocar colunas legadas `*_biogas_m3_year`).

**Nada commitado.** Branch criado; CSV e docs escritos e não commitados; gerador certificado intocado.

### Retomada 2026-08-08 (segunda passada, ainda sem stack)

- **Portão base nesta branch (pré-edição), saída literal:** REAL `7.832.143.834` · IDEAL `9.841.178.207` (`sp_scenarios_real_ideal.py --master`, roda local, sem DB).
- **`provenance_class` RESOLVIDO** contra a aba `Parametros_Atlas` (em `PILAR2b_SP_verificacao_por_municipio_v2.xlsx`), coluna `source`, em três valores: `atlas_sourced` (vinhaça, torta, palha, RSU) · `pilar_derived` (bovinos, suínos, aves, esgoto — FC de "husbandry literature" e coleta "SP sewage collected/generated") · `inherited_assumed` (milho, soja, silvicultura, aquicultura, citros, café, poda). CSV reescrito.
- **Tier Ideal conferido fluxo a fluxo:** os 15 fluxos batem `teórico × FDE = publicado`, **delta 0** em cada um (antes do delta municipal).
- **DECISOES_METODOLOGICAS.md:** registradas a regra de arredondamento (somar sem arredondar, arredondar uma vez) e a duplicação de constantes entre `sp_scenarios` e `load_scenarios` como causa-raiz.
- **Ainda adiado (precisa do stack):** refator dos dois scripts para lerem o CSV; delta de 645 municípios; Etapa 4 (API/UI); Etapa 5 (higiene). Nenhum commit até a tabela delta municipal fechar.
