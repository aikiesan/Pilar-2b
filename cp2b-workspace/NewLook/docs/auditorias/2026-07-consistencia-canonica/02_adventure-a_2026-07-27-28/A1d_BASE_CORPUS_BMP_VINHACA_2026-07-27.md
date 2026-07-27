# A1d — Base do corpus de BMP da vinhaça

**Data da triagem:** 2026-07-27  
**Escopo:** somente leitura; nenhum valor de BMP ou parâmetro de `feedstocks.yaml` foi alterado.

## Conclusão

Não é possível classificar individualmente as `n = 7` observações nem calcular medianas separadas para ensaios em batelada e reatores contínuos com o material versionado.

O arquivo `data/canonical_parameters/feedstock_bmp_from_refs.csv` não contém sete registros de vinhaça. Ele contém uma única linha agregada:

| feedstock | n_bmp_obs | bmp_min | bmp_median | bmp_max | example_source_url |
|---|---:|---:|---:|---:|---|
| VINHACA | 7 | 49,0 | 180,0 | 968,0 | AJER 2018 |

Não foram preservados, para cada observação, o valor, o artigo de origem, o tipo de experimento, as condições operacionais ou o denominador. Também não há no repositório um script gerador ou uma exportação das notas brutas usadas para produzir o agregado. O histórico indica que a linha foi criada no commit `5d3c378` a partir de notas externas, sem preservar as sete linhas intermediárias.

Assim:

- **mediana armazenada do conjunto opaco:** 180,0;
- **mediana dos ensaios em batelada:** não calculável;
- **mediana dos reatores contínuos:** não calculável;
- **“as sete são todas batelada”:** não pode ser declarado;
- **mínimo 49 e máximo 968:** não podem ser associados de forma auditável a uma fonte ou denominador.

## Situação das sete observações solicitadas

| Observação | Valor | Fonte | Batelada ou reator | Duração | Temperatura | Inóculo | I/S | Filtração | Denominador |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | não preservado | não preservada | indeterminável | não preservada | não preservada | não preservado | não preservada | não preservada | não preservado |
| 2 | não preservado | não preservada | indeterminável | não preservada | não preservada | não preservado | não preservada | não preservada | não preservado |
| 3 | não preservado | não preservada | indeterminável | não preservada | não preservada | não preservado | não preservada | não preservada | não preservado |
| 4 | não preservado | não preservada | indeterminável | não preservada | não preservada | não preservado | não preservada | não preservada | não preservado |
| 5 | não preservado | não preservada | indeterminável | não preservada | não preservada | não preservado | não preservada | não preservada | não preservado |
| 6 | não preservado | não preservada | indeterminável | não preservada | não preservada | não preservado | não preservada | não preservada | não preservado |
| 7 | não preservado | não preservada | indeterminável | não preservada | não preservada | não preservado | não preservada | não preservada | não preservado |

Preencher essa tabela a partir dos 27 artigos candidatos associados a `VINHACA` em `references_unified.csv` exigiria adivinhar quais trabalhos e quais resultados entraram no agregado. A lista inclui ensaios BMP, reatores contínuos, codigestões, revisões e modelagem; metadados bibliográficos não estabelecem pertencimento ao conjunto das sete observações.

## Auditoria das fontes localizáveis

### 1. Fonte indicada como exemplo no CSV

**Artigo:** *Evaluation of the Production of Methane from the Vinasse of Rum by Anaerobic Digestion* (AJER, 2018).  
**Fonte primária:** https://www.ajer.org/papers/Vol-7-issue-6/T0706160169.pdf

| Campo | Resultado da leitura |
|---|---|
| Tipo | BMP em batelada, em frascos OxiTop de 1 L, com medição manométrica |
| Duração | 51 dias |
| Temperatura | 30 °C |
| Inóculo | esterco bovino fresco |
| I/S | 3,33 g VS de inóculo por g VS de substrato; o artigo informa S/I = 0,3 |
| Filtração da vinhaça | não descrita |
| Denominador | mL CH₄ por g VS de substrato inicialmente adicionado; o branco do inóculo foi descontado |
| Resultados | 153,0 mL CH₄/g VS para vinhaça sem pré-tratamento; 193,5 mL CH₄/g VS após pré-acidificação de quatro dias |

O resumo do PDF apresenta `19.5`, mas a Tabela 5 e a conclusão apresentam `193.5`; trata-se de erro tipográfico no resumo. A mediana desses **dois resultados do artigo**, isoladamente, seria 173,25 mL CH₄/g VS. Esse número **não é** a mediana de batelada do corpus, pois o repositório não demonstra que ambos foram contabilizados entre as sete observações.

Os valores 49 e 968 não aparecem nesse artigo. Portanto, o único URL guardado no CSV não recompõe o conjunto.

### 2. Candidato de batelada que evidencia risco de mistura de substratos

**Artigo:** *Biochemical Methane Potential (BMP) from sugarcane biorefinery residues: maximizing their use by co-digestion* (preprint, 2021).  
**Fonte primária:** https://www.biorxiv.org/content/10.1101/2021.02.19.432018v1

| Campo | Resultado da leitura |
|---|---|
| Tipo | BMP em batelada, frascos Duran de 250 mL, triplicata |
| Duração | encerramento quando a produção diária ficou abaixo de 1% do acumulado; o texto não informa uma duração única |
| Temperatura | 55 °C |
| Inóculo | experimento 1: consórcio de reator mesofílico tratando vinhaça, aclimatado a 55 °C; experimento 2: lodo granular de UASB de efluente de abatedouro de aves |
| I/S | 2:1 em base VS |
| Filtração da vinhaça | não descrita; os substratos são descritos como brutos |
| Denominador | NmL CH₄ por g VS adicionado |
| Vinhaça isolada | 475,83 ± 12,72 e 506,76 ± 6,28 NmL CH₄/g VS |
| Codigestão | 970,80 ± 71,55 NmL CH₄/g VS para licor de desacetilação + vinhaça |

O resultado de codigestão próximo ao máximo agregado de 968 não é uma observação de vinhaça isolada. Sem as linhas brutas, não se pode afirmar que esse valor originou o máximo; a proximidade apenas revela um risco concreto de o agregado ter misturado mono-digestão e codigestão.

### 3. Fuess et al. (2017): não é BMP e usa outro denominador

**Artigo:** *Thermophilic two-phase anaerobic digestion using an innovative fixed-bed reactor for enhanced organic matter removal and bioenergy recovery from sugarcane vinasse* (Applied Energy, 2017).  
**Fonte primária:** https://repositorio.unesp.br/server/api/core/bitstreams/f002c812-3e5d-4984-9883-aa0d22873851/content  
**DOI:** https://doi.org/10.1016/j.apenergy.2016.12.071

| Campo | Resultado da leitura |
|---|---|
| Tipo | desempenho de sistema contínuo em duas fases; não é BMP stricto sensu |
| Duração | APBR acidogênico: 240 dias; UASB metanogênico: 210 dias; ASTBR metanogênico: 240 dias |
| Temperatura | 55 °C |
| Inóculo | lodo termofílico de UASB industrial tratando vinhaça |
| I/S | não aplicável a partida/operação contínua |
| Filtração da vinhaça | sim, papel-filtro de 3 µm antes da alimentação |
| Denominador | mL CH₄ por g de COD removida, não por g VS adicionado ou removido |
| Resultado metanogênico | ASTBR: 249–301 mL CH₄/g COD removida |

A filtração a 3 µm remove material particulado e faz com que TCOD, TVS e VSS caracterizem a amostra filtrada. O resultado não é comparável diretamente a BMP por g VS adicionado.

Não há evidência versionada de que Fuess et al. (2017) seja uma das sete observações. Se tiver sido usado, sua inclusão como “BMP” representaria mistura de categoria experimental e de denominador.

## Implicação para o corpus

O valor agregado `bmp_median = 180.0` deve ser tratado como uma estatística sem linhagem observacional reproduzível. A evidência disponível não permite verificar:

1. se as sete entradas são todas BMP em batelada;
2. se algum desempenho de reator contínuo foi contado como BMP;
3. se os resultados usam VS adicionado, VS removido, COD adicionado ou COD removido;
4. se mono-digestão e codigestão foram misturadas;
5. se vinhaça bruta e vinhaça filtrada foram tratadas como equivalentes.

Para fechar a auditoria seria necessário recuperar a exportação original das notas externas e materializar uma tabela com uma linha por observação, contendo ao menos: artigo, tabela/figura/página, valor, unidade original, conversão, substrato, regime, duração, temperatura, inóculo, I/S, pré-tratamento/filtração e denominador.

**Decisão deste lote:** nenhuma alteração no BMP; a classificação e as medianas por regime ficam explicitamente **não calculáveis** com o corpus versionado.
