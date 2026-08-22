# Auditoria de resíduos urbanos — SP e piloto MG

Data da verificação: 2026-08-21

## Veredito

O arquivo-fonte bruto do SNIS **não está no acervo local**. O único arquivo
encontrado é um produto intermediário de Notebook 31,
`_SP_processed/SP_SNIS_2022_residuos.csv`, já filtrado para os 645 municípios de
SP e com ausências transformadas em zero. Ele não pode ser promovido.

Não há indício de que `CO111`, `CO115` ou `CO119` sejam toneladas/dia: o
dicionário SNIS define essas massas em toneladas/ano, e o ingestor canônico
preserva essa unidade sem multiplicar por 365. Há, contudo, um erro anterior de
formato decimal no produto processado. Exemplos observados:

- população SNIS `34.687` permaneceu `34.687` no CSV intermediário e depois virou
  `34687` no master (recuperável neste caso, mas não em `3.9`, que virou `39`);
- massa `986.5` virou `9865` no master, uma multiplicação por 10 sem regra de
  unidade documentada;
- São Paulo, Campinas e Guarulhos aparecem com massas coletadas iguais a zero,
  embora os indicadores per capita permaneçam preenchidos.

Portanto, os números baixos não são toneladas/dia esquecidas de anualizar. São
o resultado de **dados ausentes convertidos em zero, separadores decimais
danificados e fallback populacional diferente da metodologia do cenário**.

A sensação de valores baixos no mapa é válida, mas tem outra causa: a plataforma
expõe três superfícies urbanas que não usam a mesma atividade de origem.

| Superfície verificada | Massa urbana/FORSU de SP | Interpretação |
|---|---:|---|
| Mapa local (`fields=map`) | 4.441.124 t/ano | fallback populacional: 44.411.238 hab × 0,100 t/hab/ano |
| Resultado canônico intermediário | 5.692.858 t/ano | 214 municípios com CO111 + 431 com fallback populacional |
| Cenário corrigido pelo Atlas | aproximadamente 7,24 milhões t/ano de fração orgânica | 15.591.115 t/ano coletadas × 46,46% |

Portanto, multiplicar o valor do mapa por 365 produziria um erro grave. O que
precisa ser resolvido é a semântica e a fonte canônica: resíduo total gerado,
RDO coletado ou fração orgânica digestível.

O manuscrito CEUS de 14/08 cita aproximadamente **40.000 t/dia de RSU total**
em SP (cerca de 14,6 Mt/ano). Isso não é comparável diretamente ao valor do mapa
rotulado como biomassa urbana: o mapa atual apresenta FORSU/substrato orgânico,
após a fração orgânica, e não todo o RSU gerado. O cenário Atlas de 15,591 Mt/ano
de RSU total é da mesma ordem do texto; após 46,46% de fração orgânica resulta
em aproximadamente 7,24 Mt/ano de FORSU.

## Evidências da cadeia de dados

- O adaptador `backend/ingest/sources/snis/source.py` mapeia `CO111` (RDO),
  `CO115` (RPU) e `CO119` (RDO + RPU) em toneladas anuais e valida a identidade
  `CO119 = CO111 + CO115` quando os três valores existem.
- A conversão de RDO coletado para substrato digestível ocorre em
  `biomass_tons_from_collected_waste`; ela aplica a fração orgânica, não 365.
- O banco Docker local possui 645 municípios de SP e 853 de MG. Nenhum dos dois
  estados possui séries SNIS promovidas em `municipality_timeseries`.
- As colunas armazenadas de biomassa RSU/RPO estão zeradas. O mapa recompõe RSU
  em tempo de leitura a partir da população, por isso todos os 645 valores atuais
  aparecem como `estimated`.
- O legado `rsu_biogas_m3_year` implica cerca de 16,63 milhões t/ano de matéria
  orgânica, acima até do total de RSU gerado no Atlas (15,649 milhões t/ano).
  Esse legado não deve ser usado para retrocalcular massa.
- O cenário corrigido já documentado usa faixas populacionais do Atlas
  (0,7/0,8/0,9/1,1 kg por habitante por dia), anualiza por 365 e aplica 46,46%
  de fração orgânica.

## Problemas adicionais encontrados

1. O fator médio de FORSU do mapa é 0,100 t/hab/ano. Ele é menor que a fração
   orgânica implícita até na menor faixa do Atlas (0,7 × 365 × 46,46% ≈
   0,119 t/hab/ano), o que explica parte da subestimação.
2. O resultado canônico intermediário e o banco em execução não estão
   sincronizados: o primeiro registra 214 municípios com CO111 medido, enquanto
   o segundo não contém nenhuma série SNIS.
3. O CSV processado `SP_SNIS_2022_residuos.csv` não pode ser promovido como fonte
   canônica: tem 279 indicadores e 645 linhas, mas apenas 48 valores positivos
   de CO111 (soma 28.969,2 t/ano). O master subsequente soma 289.692 t/ano porque
   remove o ponto decimal indiscriminadamente; nenhum dos dois totaliza SP de
   modo plausível. É obrigatório reprocessar o export bruto UTF-16/`;`.
4. RPO/poda urbana estava sendo estimado por população apesar de a cobertura
   canônica marcar essa atividade como não instanciada. Essa derivação foi
   removida da resposta pública; `CO115` não separa poda de varrição.
5. O manuscrito afirma que 219 municípios têm valor SNIS observado; os resultados
   canônicos registram 214, e o arquivo intermediário local produz 193 municípios
   com alguma tonelagem RDO/RPU utilizável (apenas 48 com CO111 positivo). O
   snapshot que sustenta 214/219 não está no acervo e a alegação não é hoje
   reprodutível a partir dos arquivos entregues.

## Regra provisória para publicação

- SP permanece a única camada canônica e a única origem dos totais publicados.
- MG aparece somente como camada beta, visualmente neutra e fora dos totais de SP.
- Outros estados não são emitidos pelo endpoint GeoJSON público e também são
  rejeitados no cliente.
- Valores SNIS devem manter a unidade original anual e trazer proveniência,
  ano-base e cobertura (`measured`, `estimated`, `no_data`).
- Não publicar RPO municipal até existir fonte ou coeficiente documentado que
  separe poda dos demais resíduos públicos.

## Portão de entrada do piloto MG

O piloto já desenha os 853 municípios e possui PAM agrícola. Ainda não existe
fonte urbana de MG no acervo. Antes de habilitar números urbanos, executar nesta
ordem:

1. obter e arquivar o SNIS bruto nacional, preservando valores ausentes (sem transformar
   ausência em zero);
2. validar `CO119 = CO111 + CO115`, duplicatas, formato decimal brasileiro,
   cobertura e anos de referência;
3. comparar totais estaduais e equivalentes kg/hab/dia contra Atlas/diagnóstico
   estadual, com alertas para valores fisicamente implausíveis;
4. escolher formalmente a métrica pública: RDO coletado, RSU gerado ou FORSU
   digestível; manter as demais como medidas separadas;
5. só então promover os municípios aprovados de `no_data` para `measured` ou
   `estimated` e incluir testes de regressão por total estadual.

## Três correntes urbanas para biodigestão

| Corrente | Atividade de origem | Situação em SP | Situação em MG |
|---|---|---|---|
| FORSU / fração orgânica de RDO | CO111 medido; composição aplicada depois | arquivo intermediário reprovado; cenário populacional apenas estimado | `no_data` até SNIS/população auditável |
| Poda e resíduos verdes | massa municipal específica de poda | OS040 informa execução; CO115 mistura poda, varrição e outros RPU, portanto não fornece massa de poda | `no_data` |
| Lodo de esgoto/ETE | ES006 tratado (mil m³/ano) + modelo de sólidos/lodo | cenário estimado existe, mas não há biomassa municipal medida | `no_data` |

Essas correntes devem aparecer separadas na funcionalidade restrita. Ausência de
atividade deve ser exibida como `no_data`, nunca como zero. `CO115` não pode ser
renomeado para poda, e volume de esgoto não pode ser mostrado diretamente como
toneladas de lodo.

## Decisão pendente

Recomenda-se que o mapa de biodigestão use **FORSU digestível** como métrica
principal, derivada de CO111 quando medido e de uma metodologia Atlas explícita
quando estimada. A interface deve mostrar separadamente RDO coletado e RSU total;
misturá-los sob um único rótulo “resíduos urbanos (t/ano)” é a raiz da ambiguidade
atual.
