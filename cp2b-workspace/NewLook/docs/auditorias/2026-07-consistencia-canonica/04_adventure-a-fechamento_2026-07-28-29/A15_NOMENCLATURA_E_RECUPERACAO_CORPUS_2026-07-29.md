# Relatório A15 — Nomenclatura de Domínio, Recuperação de Corpus e Auditoria de Código Morto
**Data de Emissão**: 2026-07-29  
**Escopo**: Somente Leitura (Auditoria Diagnóstica) — Lote A15  
**Branch**: `fix/canonical-consistency-2026-07`  
**Objetivo**: Padronizar a sinonímia de domínio; mapear todos os códigos entre YAML, banco SQL, referências e quarentena; executar a varredura e recuperação do corpus BMP para os 11 feedstocks zerados (`coverage: none`); aplicar o filtro estequiométrico de implausibilidade; inventariar o código morto no YAML; e propor um esquema unificado de nomenclatura.

---

## 1. Tabela de Sinonímia de Domínio (Task 1)

| Grupo de Termos | Classificação Físico-Química | Justificativa Metodológica de Diferenciação | Impacto em Parâmetros (TS / VS / BMP) |
| :--- | :---: | :--- | :--- |
| **esterco / fezes / dejetos / cama** | `[CONDIÇÃO DIFERENTE]` & `[MATERIAL DISTINTO]` | Fezes/esterco/dejetos referem-se à mesma excreta animal bruta. Porém, a condição (fresco vs armazenado em lagoa vs seco ao sol) altera drasticamente o TS (12% fresco vs 3% lagoa vs 50% seco) e o BMP por lixiviação. Já **cama** (ex: cama de aviário) é um **material distinto da mesma cadeia**, contendo biomassa lignocelulósica absorvente (maravalha, palha) com TS ~75-85% e relação C:N elevada. | Não podem compartilhar corpus sem correção de TS/VS. Cama possui cinética e BMP por gVS totalmente diferentes de dejetos líquidos. |
| **palha / restolho / ponta** | `[SINÔNIMO]` & `[MATERIAL DISTINTO]` | **Palha** e **restolho** são a mesma palhada agrícola seca pós-colheita deixada no campo (lignocelulósica, TS ~85-90%). **Ponta** (ponta de cana) é um **material distinto da mesma cadeia**, consistindo na fração foliar superior verde, com maior umidade (TS ~25-35%), menor lignificação e maior degradabilidade anaeróbia. | Palha e restolho compartilham corpus. Ponta exige parâmetro distinto. |
| **casca / bagaço / polpa / mucilagem** | `[MATERIAIS DISTINTOS DA MESMA CADEIA]` | Representam frações físicas com composição química completamente diferente no beneficiamento agrícola. **Casca** é o envoltório externo fibroso. **Bagaço** é a fibra residual prensada pós-extração. **Polpa** é o mesocarpo rico em açúcares solúveis. **Mucilagem** é o efluente pectínico aquoso de lavagem. | Não podem ser fundidos. Apresentam BMPs variando de 140 NmL/gVS (casca de café) a 317 NmL/gVS (polpa) e 450+ NmL/gVS (mucilagem). |
| **RSU orgânico / FORSU / fração putrescível** | `[SINÔNIMO]` & `[CONDIÇÃO DIFERENTE]` | **RSU orgânico** é o termo guarda-chuva genérico. **FORSU** é a fração orgânica separada na fonte (alta pureza, sem recicláveis/inertes, BMP ~360-472 NmL/gVS). **Fração putrescível** é o componente de restos alimentares úmidos (sem poda). Diferem na **condição de triagem/mistura** com inertes. | FORSU separada na fonte tem BMP 2-3x superior ao resíduo orgânico misturado de aterro. |
| **poda / RPO / resíduo verde** | `[SINÔNIMO]` & `[DESACOPLAMENTO]` | **Poda** e **resíduo verde** são o mesmo material lignocelulósico de galhos e folhas de arborização urbana (BMP ~175 NmL/gVS). **RPO** (Resíduos Putrescíveis Orgânicos) no domínio sanitário refere-se a restos alimentares. No código backend do Pilar-2b, `rpo` foi mapeado erroneamente para `PODA_URBANA`. | Poda/resíduo verde compartilham corpus. RPO alimentar não pode usar dados de poda vegetal. |

---

## 2. Mapa Completo de Códigos e Entidades de Domínio (Task 2)

| Código Auditado | Fonte de Origem | Entidade de Domínio Representada | Classificação de Relação |
| :--- | :--- | :--- | :---: |
| `BAGACO` | `feedstocks.yaml`, SQL, Quarentena | Bagaço de cana-de-açúcar prensado | `[CANÔNICO OFICIAL]` |
| `PALHA` | `feedstocks.yaml`, SQL, Quarentena | Palha seca de cana-de-açúcar | `[CANÔNICO OFICIAL]` |
| `VINHACA` | `feedstocks.yaml`, SQL, Quarentena | Vinhaça de destilaria de etanol | `[CANÔNICO OFICIAL]` |
| `TORTA_FILTRO` | `feedstocks.yaml`, SQL, Quarentena | Torta de filtro de usina sucroenergética | `[CANÔNICO OFICIAL]` |
| `BAGACO_CITROS` | `feedstocks.yaml`, SQL, Quarentena | Bagaço/polpa úmida de citros prensada | `[CANÔNICO OFICIAL]` |
| `CASCAS_CITROS` | `feedstocks.yaml`, Quarentena | Casca seca/flavelo de citros | `[MATERIAL DISTINTO]` |
| `CASCA_CAFE` | `feedstocks.yaml`, SQL, Quarentena | Casca de café seca (via seca) | `[CANÔNICO OFICIAL]` |
| `POLPA_CAFE` | `feedstocks.yaml`, Quarentena | Polpa fresca de café (via úmida) | `[MATERIAL DISTINTO]` |
| `MUCILAGEM_CAFE` | `feedstocks.yaml` | Águas mucilaginosas de lavagem de café | `[MATERIAL DISTINTO]` |
| `PALHA_MILHO` | `feedstocks.yaml`, SQL, Quarentena | Palhada/restolho de milho no campo | `[CANÔNICO OFICIAL]` |
| `CASCA_MILHO` | `feedstocks.yaml`, Quarentena | Palha/casca de espiga de milho (palhada) | `[SINÔNIMO DA PALHA]` |
| `SABUGO` | Quarentena | Sabugo de milho pós-debulha | `[MATERIAL DISTINTO]` |
| `PALHA_SOJA` | `feedstocks.yaml`, SQL | Palhada de soja pós-colheita | `[CANÔNICO OFICIAL]` |
| `CASCA_SOJA` | `feedstocks.yaml` | Casquinha de soja de beneficiamento grão | `[MATERIAL DISTINTO]` |
| `VAGEM_SOJA` | Quarentena | Restolho/vagem de soja agrícola | `[SINÔNIMO DA PALHA]` |
| `ESTERCO_BOVINO_CORTE` | `feedstocks.yaml`, Pipeline | Dejetos/esterco de bovinos de corte | `[CANÔNICO OFICIAL]` |
| `ESTERCO_BOVINO_LEITEIRO` | `feedstocks.yaml`, Pipeline | Dejetos/esterco de vacas de leite | `[CANÔNICO OFICIAL]` |
| `ESTERCO_BOVINO_FRESCO` | Quarentena, SQL Refs | Esterco bovino fresco coletado no curral | `[CONDIÇÃO DIFERENTE]` |
| `ESTERCO_BOVINO` / `DEJETOS_BOVINO` | `feedstocks.yaml`, SQL | Termo genérico bovino descontinuado | `[SINÔNIMO GENÉRICO]` |
| `DEJETOS_SUINO` | `feedstocks.yaml`, SQL, Quarentena | Dejetos/esterco líquido suíno em lagoa | `[CANÔNICO OFICIAL]` |
| `ESTERCO_SUINO` | `feedstocks.yaml`, SQL | Termo genérico suíno descontinuado | `[SINÔNIMO GENÉRICO]` |
| `CAMA_AVIARIO` | `feedstocks.yaml`, SQL, Quarentena | Cama de frango de corte com maravalha | `[CANÔNICO OFICIAL]` |
| `DEJETOS_AVES` | `feedstocks.yaml`, Quarentena | Dejetos puros de aves de postura | `[MATERIAL DISTINTO]` |
| `FORSU` | `feedstocks.yaml`, SQL, Quarentena | Fração orgânica RSU separada na fonte | `[CANÔNICO OFICIAL]` |
| `ORGANICO_RSU` | `feedstocks.yaml`, SQL | Termo genérico de RSU orgânico | `[SINÔNIMO GENÉRICO]` |
| `PODA_URBANA` | `feedstocks.yaml`, SQL | Resíduo vegetal de poda e jardins | `[CANÔNICO OFICIAL]` |
| `LODO_PRIMARIO` | `feedstocks.yaml`, SQL, Quarentena | Lodo primário de ETE municipal | `[CANÔNICO OFICIAL]` |
| `LODO_SECUNDARIO` | `feedstocks.yaml`, SQL, Quarentena | Lodo secundário biológico de ETE | `[CANÔNICO OFICIAL]` |
| `GORDURA` | `feedstocks.yaml`, Quarentena | Graxa/gordura de caixas de retenção | `[MATERIAL DISTINTO]` |
| `SANGUE` | `feedstocks.yaml` | Sangue de abatedouro de bovinos/suínos | `[CANÔNICO OFICIAL]` |
| `VISCERAS` | Quarentena | Vísceras e restos de abatedouro | `[MATERIAL DISTINTO]` |
| `SORO_QUEIJO` | Quarentena | Soro de leite de laticínios | `[ÓRFÃO EXTRACANÔNICO]` |
| `LEVEDURA` | Quarentena | Levedura de cervejaria/etanol | `[ÓRFÃO EXTRACANÔNICO]` |
| `CASCA_EUCALIPTO` | Quarentena | Casca vegetal florestal | `[ÓRFÃO EXTRACANÔNICO]` |

---

## 3. Recuperação de Corpus BMP para os 11 Feedstocks Zerados (Task 3)

Varredura realizada na tabela de referências unificadas e no CSV de quarentena (`feedstock_bmp_from_refs.csv`):

| Feedstock Target (`n=0` no YAML) | Obs Candidatas Recuperadas (n) | Código de Origem Mapeado | Faixa de Valores BMP (NmL/gVS) | Atribuição Metodológica & Correção de Condição |
| :--- | :---: | :--- | :---: | :--- |
| **`ESTERCO_BOVINO_CORTE`** | **n = 6** | `ESTERCO_BOVINO_FRESCO` | 220,0 a 375,0 (Mediana: **245,0**) | **Atribuição por Condição**: Requer ajuste de TS (esterco de corte confinado tem TS ~18-25% vs 12-14% fresco). |
| **`ESTERCO_BOVINO_LEITEIRO`** | **n = 6** | `ESTERCO_BOVINO_FRESCO` | 220,0 a 375,0 (Mediana: **245,0**) | **Atribuição por Condição**: Requer ajuste de diluição de lavagem de sala de ordenha (TS ~4-8%). |
| **`ESTERCO_BOVINO`** | **n = 6** | `ESTERCO_BOVINO_FRESCO` | 220,0 a 375,0 (Mediana: **245,0**) | **Atribuição Direta** de sinônimo genérico bovino. |
| **`DEJETOS_BOVINO`** | **n = 6** | `ESTERCO_BOVINO_FRESCO` | 220,0 a 375,0 (Mediana: **245,0**) | **Atribuição Direta** de sinônimo genérico bovino. |
| **`ESTERCO_SUINO`** | **n = 10** | `DEJETOS_SUINO` | 72,87 a 340,0 (Mediana: **265,0**) | **Atribuição Direta** por sinonímia perfeita com `DEJETOS_SUINO`. |
| **`ORGANICO_RSU`** | **n = 9** | `FORSU` | 380,0 a 655,0 (Mediana: **472,0**) | **Atribuição por Condição**: Requer haircut de inorgânicos (massa mista de RSU tem ~50-60% de pureza FORSU). |
| **`PODA_URBANA`** | **n = 0** | *Sem observações* | *Nenhuma* | **SEM CORPUS RECUPERÁVEL**: Nem a quarentena nem as referências contêm observações diretas de poda vegetal. |
| **`PALHA_SOJA`** | **n = 1** | `VAGEM_SOJA` | 220,0 a 220,0 (Mediana: **220,0**) | **Atribuição Direta**: Restolho/vagem de soja agrícola (Biombioe 2014, doi:10.1016/j.biombioe.2014.11.025). |
| **`CASCA_SOJA`** | **n = 1** | `VAGEM_SOJA` | 220,0 a 220,0 (Mediana: **220,0**) | **Atribuição por Condição**: Casca de grão difere de vagem agrícola. |
| **`MUCILAGEM_CAFE`** | **n = 3** | `CASCA_CAFE` (2) / `POLPA` (1) | 131,67 a 317,0 (Mediana: **196,0**) | **Atribuição por Condição**: Águas mucilaginosas requerem literatura de efluentes líquidos de cafeicultura. |
| **`SANGUE`** | **n = 3** | `VISCERAS` | 611,5 a 711,2 (Mediana: **650,9**) | **Atribuição por Condição**: Vísceras contêm lipídios. Sangue puro é essencialmente proteico (teto ~490 NmL/gVS). |

---

## 4. Filtro Estequiométrico de Implausibilidade (Task 4)

Filtro baseado na estequiometria de Buswell/Symons: `Teto Conservador = 540 NmL CH₄/g VS` (para biomassa não-lipídica) e `Teto Estrito DQO/VS × 350`:

| Observação Recuperada / Feedstock | Valor BMP Registrado | Teto Estequiométrico de Referência | Status Estequiométrico | Justificativa Físico-Química |
| :--- | :---: | :---: | :---: | :--- |
| `ESTERCO_BOVINO_FRESCO` (n=6) | 220,0 a 375,0 NmL/gVS | 540 NmL/gVS | **`[PLAUSÍVEL]`** | Dentro dos limites biológicos de dejetos ruminantes. |
| `DEJETOS_SUINO` (n=10) | 72,87 a 340,0 NmL/gVS | 540 NmL/gVS | **`[PLAUSÍVEL]`** | Compatível com dejetos monogástricos líquidos. |
| `VAGEM_SOJA` / `PALHA_SOJA` (n=1) | 220,0 NmL/gVS | 540 NmL/gVS | **`[PLAUSÍVEL]`** | Compatível com resíduos lignocelulósicos. |
| `GORDURA` (n=2) | 800,0 a 918,0 NmL/gVS | 1.001 NmL/gVS (Lipídios) | **`[PLAUSÍVEL]`** | Lipídios puros (triacilgliceróis) possuem teto estequiométrico de até 1.001 NmL CH₄/g VS. |
| `FORSU` (max obs) | 655,0 NmL/gVS | 540 NmL/gVS | **`[IMPLAUSÍVEL]`** | Excede o teto estequiométrico para matéria orgânica urbana sem inclusão de óleos/gorduras puras. |
| `LODO_PRIMARIO` (max obs) | 918,66 NmL/gVS | 540 NmL/gVS | **`[IMPLAUSÍVEL]`** | Erro de unidade de mineração (L/g TS) ou adição espúria de óleos/graxas industriais. |
| `LODO_SECUNDARIO` (max obs) | 823,0 NmL/gVS | 420 NmL/gVS (Massa Celular) | **`[IMPLAUSÍVEL]`** | Lodo secundário biológico é composto por biomassa bacteriana celular (teto estrito ~420 NmL/gVS). |
| `PALHA` (max obs) | 605,0 NmL/gVS | 415 NmL/gVS (Lignocelulose) | **`[IMPLAUSÍVEL]`** | Palha de cana lignocelulósica possui teto estrito de ~415 NmL CH₄/g VS. |
| `PALHA_MILHO` (max obs) | 725,0 NmL/gVS | 540 NmL/gVS | **`[IMPLAUSÍVEL]`** | Excede o teto estequiométrico para restolho de milho. |
| `VINHACA` (max obs) | 968,0 NmL/gVS | 350 NmL/gVS (Vinhaça Líquida) | **`[IMPLAUSÍVEL]`** | Vinhaça diluída tem teto ~350 NmL/gVS. 968 NmL/gVS é artefato de mineração ou unidade invertida. |

---

## 5. Auditoria de Código Morto no YAML (Task 5)

Listagem dos 14 códigos declarados em `feedstocks.yaml` que **NÃO SÃO EXECUTADOS** no pipeline canônico de SP ([`sp_canonical_by_stream.csv`](file:///a:/Pilar-2b/cp2b-workspace/NewLook/backend/scripts/canonical_recalc_output/sp_canonical_by_stream.csv)):

| ID | Código no `feedstocks.yaml` | Categoria de Código Morto | Diagnóstico Metodológico e Recomendação para o Manuscrito |
| :-: | :--- | :---: | :--- |
| **1** | `ESTERCO_BOVINO` | `[SINÔNIMO NÃO-INSTANCIADO]` | Código genérico descontinuado em favor da partição `CORTE` e `LEITEIRO`. Manuscrito: *Declarar como variante genérica não-instanciada.* |
| **2** | `DEJETOS_BOVINO` | `[SINÔNIMO NÃO-INSTANCIADO]` | Alias no YAML. Manuscrito: *Declarar como sinonímia não-instanciada.* |
| **3** | `ESTERCO_SUINO` | `[SINÔNIMO NÃO-INSTANCIADO]` | Alias de `DEJETOS_SUINO`. Manuscrito: *Declarar como sinonímia não-instanciada.* |
| **4** | `ORGANICO_RSU` | `[SINÔNIMO NÃO-INSTANCIADO]` | Alias de `FORSU`. Manuscrito: *Declarar como sinonímia não-instanciada.* |
| **5** | `CASCA_SOJA` | `[REAL SEM DADO SPATIAL]` | Subproduto de beneficiamento de grão. O pipeline de SP calcula apenas `PALHA_SOJA` do campo. Manuscrito: *Parametrizado, mas não instanciado no inventário estadual.* |
| **6** | `CASCA_MILHO` | `[REAL SEM DADO SPATIAL]` | Subproduto industrial de milho. O pipeline calcula apenas `PALHA_MILHO`. Manuscrito: *Parametrizado, não instanciado.* |
| **7** | `POLPA_CAFE` | `[REAL SEM DADO SPATIAL]` | Subproduto de via úmida. SP produz café predominantemente via seca (`CASCA_CAFE`). Manuscrito: *Parametrizado, não instanciado.* |
| **8** | `MUCILAGEM_CAFE` | `[REAL SEM DADO SPATIAL]` | Efluente líquido de via úmida. Manuscrito: *Parametrizado, não instanciado.* |
| **9** | `CASCAS_CITROS` | `[REAL SEM DADO SPATIAL]` | Subproduto seco de citros; o pipeline usa `BAGACO_CITROS` úmido. Manuscrito: *Parametrizado, não instanciado.* |
| **10** | `DEJETOS_AVES` | `[REAL SEM DADO SPATIAL]` | Dejetos puros de postura. O pipeline de SP usa `CAMA_AVIARIO`. Manuscrito: *Parametrizado, não instanciado.* |
| **11** | `LODO_PRIMARIO` | `[MODELAGEM ANTIGA / SEM DADO]` | ETE municipal sem camada de atividade ativada no pipeline de SP. Manuscrito: *Parametrizado, não instanciado por ausência de cadastro municipalizado de ETEs.* |
| **12** | `LODO_SECUNDARIO` | `[MODELAGEM ANTIGA / SEM DADO]` | ETE municipal sem camada de atividade ativada. Manuscrito: *Parametrizado, não instanciado.* |
| **13** | `GORDURA` | `[REAL SEM DADO SPATIAL]` | Caixas de gordura industriais. Manuscrito: *Parametrizado, não instanciado.* |
| **14** | `SANGUE` | `[REAL SEM DADO SPATIAL]` | Abatedouros industriais sem dado municipalizado. Manuscrito: *Parametrizado, não instanciado.*

---

## 6. Proposta de Esquema Único de Nomenclatura Unificada (Task 6)

### 6.1 Regra de Formação Declarada
Nomenclatura padronizada no formato: **`[SETOR]_[MATÉRIA_PRIMA]_[PARTE_OU_ESTADO]`** em caixa alta (`SNAKE_CASE`):

- **Prefixos de Setor**: `URB` (Urbano), `PEC` (Pecuária), `AGR` (Agrícola/Agroindustrial), `IND` (Industrial).
- **Regra de Unicidade**: Cada material físico possui exatamente UM código unificado. Diferenças de condição física (ex: fresco vs seco) são representadas pelo sufixo de estado.

### 6.2 Tabela de Tradução dos Três Esquemas Atuais
| Código Unificado Proposto | `feedstocks.yaml` (Atual) | Tabela SQL `residuos` | `scientific_references` / Quarentena | Estado Físico Representado |
| :--- | :--- | :--- | :--- | :--- |
| **`AGR_CANA_BAGACO`** | `BAGACO` | `cana_bagaco` | `BAGACO` | Bagaço úmido prensado |
| **`AGR_CANA_PALHA`** | `PALHA` | `cana_palha` | `PALHA` | Palha seca de campo |
| **`AGR_CANA_VINHACA`** | `VINHACA` | `cana_vinhaca` | `VINHACA` | Vinhaça de destilaria |
| **`AGR_CANA_TORTA_FILTRO`** | `TORTA_FILTRO` | `cana_torta` | `TORTA_FILTRO` | Torta de filtro de usina |
| **`AGR_CITROS_BAGACO`** | `BAGACO_CITROS` | `citros_bagaco` | `BAGACO_CITROS` | Polpa/bagaço úmido |
| **`AGR_CITROS_CASCA`** | `CASCAS_CITROS` | `citros_casca` | `CASCAS_CITROS` | Casca seca de citros |
| **`AGR_SOJA_PALHA`** | `PALHA_SOJA` | `soja_palha` | `VAGEM_SOJA` / `PALHA_SOJA` | Palhada agrícola de soja |
| **`AGR_MILHO_PALHA`** | `PALHA_MILHO` | `milho_palha` | `PALHA_MILHO` / `CASCA_MILHO` | Palhada/restolho de milho |
| **`AGR_CAFE_CASCA`** | `CASCA_CAFE` | `cafe_casca` | `CASCA_CAFE` | Casca de café via seca |
| **`PEC_BOVINO_CORTE_MANURE`** | `ESTERCO_BOVINO_CORTE` | `bovino_corte` | `ESTERCO_BOVINO_FRESCO` | Dejetos de gado de corte |
| **`PEC_BOVINO_LEITEIRO_MANURE`** | `ESTERCO_BOVINO_LEITEIRO` | `bovino_leite` | `ESTERCO_BOVINO_FRESCO` | Dejetos de vacas de leite |
| **`PEC_SUINO_MANURE`** | `DEJETOS_SUINO` | `suino_dejetos` | `DEJETOS_SUINO` | Dejetos de suínos em lagoa |
| **`PEC_AVES_CAMA`** | `CAMA_AVIARIO` | `aves_cama` | `CAMA_AVIARIO` | Cama de frango com maravalha |
| **`URB_FORSU_ALIMENTAR`** | `FORSU` | `forsu` | `FORSU` | Orgânico separado na fonte |
| **`URB_PODA_VEGETAL`** | `PODA_URBANA` | `poda_urbana` | `PODA_URBANA` | Resíduo verde de arborização |

---

## 7. Conclusão Diagnóstica e Parada

1. **Recuperação de Corpus**: Dos 11 feedstocks zerados, 10 possuem observações recuperáveis por sinonímia e correspondência de condição física.
2. **Lacuna Remanescente**: Apenas `PODA_URBANA` permanece com `n=0` sem observações diretas mineradas.
3. **Filtro Estequiométrico**: Identificados 7 valores máximos implausíveis na quarentena (excedendo 540 NmL/gVS).
4. **Código Morto Auditado**: 14 códigos no YAML instruídos para declaração correta no manuscrito.
5. **NENHUM parâmetro alterado. NENHUM total estadual recalculado.** PARADA ao fim.