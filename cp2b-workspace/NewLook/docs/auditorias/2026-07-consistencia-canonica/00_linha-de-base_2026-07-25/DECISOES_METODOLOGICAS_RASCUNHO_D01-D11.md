# Decisões metodológicas — PILAR-2b

**Propósito.** Registro de uma entrada por decisão metodológica, com a evidência que a sustenta e as alternativas rejeitadas. Este arquivo é a fonte de onde sairão a seção de métodos e as limitações declaradas do manuscrito CEUS. Ele não contém números canônicos: estes vivem em `docs/data/canonical_results.json`.

**Regra de manutenção.** Atualizado ao fim de cada lote, no mesmo commit do lote. Nenhuma entrada é apagada; decisões revistas ganham uma entrada nova que referencia a anterior.

**Regra de citação de número.** Nenhum valor numérico é digitado à mão neste arquivo nem no manuscrito. Onde um número for necessário, usar marcador `{{chave}}` resolvido a partir de `canonical_results.json` na geração.

---

## Índice de estado

| # | Decisão | Estado | Lote de origem | Move número publicado |
|---|---|---|---|---|
| D01 | Fonte de verdade única | FECHADA | B0 (`cac1f42`) | Não |
| D02 | Concentração espacial: métrica e recorte | FECHADA | B0 | Não |
| D03 | Vinhaça: rejeição da faixa 6–10 como referência de validação | FECHADA | A1 | Não |
| D04 | Vinhaça: rejeição da reponderação 15/85 | FECHADA | A1c | Não |
| D05 | Vinhaça: parâmetros de composição | PENDENTE | A1e | Possivelmente |
| D06 | Vinhaça: linhagem do BMP | ABERTA (crítica) | A1e | Possivelmente |
| D07 | FORSU: rota de cálculo e haircut explícito | DECIDIDA, NÃO IMPLEMENTADA | A2 | Sim |
| D08 | Divergência pública de 1,93× na interface | ABERTA (urgente) | A2 | Não |
| D09 | Escopo do saneamento documental | FECHADA | A0c | Não |
| D10 | Contagem de feedstocks | ABERTA | A0c | Não |
| D11 | Licença do projeto | ABERTA | — | Não |

---

## D01 — Fonte de verdade única

**Decisão.** Todos os agregados estaduais passam a ser lidos de `docs/data/canonical_results.json`, versionado, com `schema_version`, `generated_at`, `git_sha` e `feedstocks_yaml_sha256` no cabeçalho. Unidade declarada por campo.

**Motivação.** O inventário A0c encontrou 63 afirmações concorrentes sobre potencial prático estadual e 25 sobre biometano, em documentos ativos e legados, sem hierarquia declarada entre elas.

**Critério de aceite aplicado.** A refatoração não podia alterar nenhum total. Verificado: total pós-refatoração idêntico ao do Lote 2 (`c64a64f`) até a quarta casa decimal.

**Rejeitado.** Gerar o JSON em runtime sem versionar. Motivo: o validador do CI precisaria executar o pipeline completo a cada push, e não haveria artefato contra o qual comparar em revisão de PR.

**Consequência para o manuscrito.** Texto redigido com marcadores, preenchidos na geração. Ver regra de citação acima.

---

## D02 — Concentração espacial: métrica e recorte

**Decisão.** A concentração espacial é reportada por coeficiente de Gini, curva de Lorenz e top-N acumulado sobre os 645 municípios, mais desagregação pelas 11 regiões intermediárias do IBGE.

**Estado.** A afirmação de concentração do rascunho anterior sobreviveu ao recálculo do Lote 2. É a única afirmação quantitativa do manuscrito que atravessou intacta, e não depende de nenhum parâmetro de BMP — decorre apenas da distribuição espacial da biomassa.

**Ponto de redação.** O recorte de N municípios é apresentado com arredondamento honesto do percentual acumulado, e não ajustado para atingir um limiar redondo estrito. O valor exato sai do JSON.

**Delta em relação ao rascunho anterior.** A ordenação relativa de duas regiões intermediárias mudou com o recálculo. Deve constar da tabela de delta do manuscrito.

---

## D03 — Vinhaça: rejeição da faixa 6–10 Nm³ CH₄/m³ como referência de validação

**Decisão.** A faixa de 6 a 10 Nm³ CH₄/m³ é removida como critério de conformidade do rendimento da vinhaça. A comparação era inválida.

**Evidência (A1).** A faixa é derivada da rota de DQO removida (DQO × eficiência de remoção × rendimento estequiométrico por DQO). O PILAR-2b estima pela rota de sólidos voláteis (TS × VS/TS × BMP por g VS). São grandezas com denominadores diferentes; a razão DQO/VS em vinhaça situa-se tipicamente entre 1,5 e 2,0, o que por si só explica boa parte do afastamento.

**Corolário.** O rendimento implícito vigente do PILAR-2b não constitui violação da `POLITICA_BMP` §1.1, porque a política posiciona o valor médio dentro do corpus e a faixa rejeitada não pertence ao mesmo corpus.

**Rejeitado.** Ajustar `ts` ou `vs_of_ts` até que o rendimento implícito caísse dentro da faixa. Motivo: seria calibrar contra um alvo que mede outra grandeza, reintroduzindo por outra porta a circularidade removida no Lote 1.

**Ação documental pendente.** `CONFRONTO_FIESP` e `POLITICA_BMP` devem declarar a base de medida de cada faixa citada e remover a comparação VS-contra-DQO.

**Redação no manuscrito.** Isto vira limitação declarada, não correção silenciosa: a plataforma estima por rota VS/BMP em batelada, o que é sistematicamente conservador frente a estimativas por DQO removida em reator; a diferença deve ser explicitada para leitores que comparem com literatura de tratamento de efluentes.

---

## D04 — Vinhaça: rejeição da reponderação por tipo de mosto

**Decisão.** A proposta de reparametrizar a vinhaça por média ponderada entre destilaria autônoma e usina anexa é rejeitada.

**Evidência (A1c).** Três defeitos independentes:

1. As frações de composição do parque foram apresentadas como dado sem apuração reproduzível. Permanecem hipótese.
2. Corrigido o peso de produção de etanol para volume de vinhaça, os pesos não mudam, porque os fatores de geração específica encontrados são iguais para as duas configurações. A correção proposta era algebricamente inerte.
3. A razão DQO/VS resultante ficava abaixo de 1,1, fora do intervalo fisicamente esperado, e piorava em relação à parametrização vigente. Sinal de que TS e VS/TS foram tomados de populações amostrais distintas.

**Rejeitado adicionalmente.** Combinar TS de um estudo com VS/TS de outro e DQO de um terceiro. Motivo: recria o problema que a auditoria devia eliminar.

**Achado que sobrevive.** Existe fonte paulista que reporta TS, VS e DQO na mesma amostra, com razão DQO/VS dentro do intervalo esperado. Nela, TS é alto e VS/TS é baixo — padrão compatível com a carga mineral da vinhaça — e os dois efeitos se compensam. O rendimento pela rota VS dessa amostra fica próximo do valor vigente do PILAR-2b, não do valor que a reponderação rejeitada produzia. A amostra é de uma instalação; não é média estadual.

---

## D05 — Vinhaça: parâmetros de composição

**Estado.** Pendente de A1e.

**Posição provisória.** Manter `ts` e `vs_of_ts` vigentes. A evidência de A1c não autoriza substituí-los, e a única amostra internamente coerente disponível aponta para rendimento da mesma ordem do atual.

**Condição para reabrir.** Aparecimento de campanha amostral com cobertura estadual declarada, medindo TS, VS e DQO nas mesmas amostras, com `n` de instalações maior que um.

---

## D06 — Vinhaça: linhagem do BMP (ABERTA, crítica)

**Problema.** O corpus de BMP da vinhaça está armazenado como linha agregada única, com `n=7`, sem preservação de nenhuma observação individual. Não há script gerador nem exportação das notas externas que produziram o agregado.

**Evidência (A1d).**

- A amplitude entre mínimo e máximo do agregado é de aproximadamente 20×, indício de mistura de categorias experimentais.
- O máximo do agregado coincide, com diferença inferior a 0,3%, com um resultado publicado de **codigestão** de vinhaça com licor de desacetilação. Se essa observação entrou como vinhaça isolada, o agregado está contaminado na origem.
- A única fonte referenciada no CSV é um ensaio em batelada cujos dois resultados publicados não correspondem ao mínimo, à mediana nem ao máximo do agregado.
- O valor em uso no `feedstocks.yaml` difere da mediana registrada no próprio CSV agregado. Existe uma terceira decisão, não documentada, entre um e outro.

**Por que é crítico.** A vinhaça é o maior stream do estado. O manuscrito posiciona a metodologia como calibrada por literatura. Um pedido de revisor pela tabela de origem do parâmetro não teria resposta no estado atual.

**Ação.** A1e reconstrói o corpus com uma linha por observação, critérios de inclusão explícitos, codigestão e desempenho de reator segregados em arquivo separado.

**Hipótese de trabalho.** O parâmetro em uso é provavelmente defensável e apenas a documentação está ausente. A confirmação exige a reconstrução, não a suposição.

**Pergunta aberta.** Localizar as notas externas originais (planilha, gestor de referências, registro manual) reduziria substancialmente o custo de A1e.

**Escopo estendido.** A mesma classe de defeito deve ser verificada nos demais feedstocks antes da submissão. Um corpus agregado sem linhagem é um problema de método, não de um substrato.

---

## D07 — FORSU: rota de cálculo e promoção do haircut a fator explícito

**Decisão.** Adotar a rota baseada na fração orgânica gravimétrica do resíduo domiciliar coletado, e promover a perda por coleta e segregação a componente explícito do bloco `fde`, nomeado como fator de coleta.

**Evidência (A2).** O parâmetro por habitante em uso embute uma redução não declarada de aproximadamente 48% sobre a fração orgânica física. Duas declarações do mesmo conceito coexistiam no mesmo arquivo, com fator próximo de 1,9 entre elas, consumidas em pontos diferentes do pipeline.

**Princípio aplicado.** O mesmo fixado no Lote 2 ao remover a disponibilidade persistida: restrição de disponibilidade seletiva reside em `fde.components`, nunca embutida em fator de geração. Um haircut oculto dentro de um fator de geração não é auditável e não pode ser discutido como alavanca de política pública — que é justamente o argumento central da decomposição em quatro fatores.

**Consequência.** Move o total estadual. Exige tabela de delta. Não implementar isoladamente: agrupar com qualquer delta resultante de D05/D06 em uma tabela única.

**Redação no manuscrito.** O fator de coleta e segregação de resíduo orgânico urbano passa a ser reportado explicitamente na tabela de fatores de correção, com fonte. Isso fortalece o argumento de decomponibilidade em vez de enfraquecê-lo.

---

## D08 — Divergência pública na interface (ABERTA, urgente)

**Problema.** O cabeçalho de indicadores estaduais e a soma dos valores municipais exibidos no mapa derivam de rotas de cálculo distintas para o mesmo conceito, com razão próxima de 1,9 entre elas. Ambos são visíveis simultaneamente ao usuário na plataforma em produção.

**Classificação.** Defeito de face pública, não inconsistência interna. É o único item cujo custo cresce a cada dia de exposição.

**Ação recomendada.** Tratar à frente da fila, independentemente do cronograma de D07. Se a reconciliação paramétrica não puder ser concluída de imediato, suprimir temporariamente o indicador estadual em vez de manter duas afirmações contraditórias no ar.

**Nota de integridade.** Se qualquer versão publicada, apresentação ou relatório citou o indicador estadual afetado, isso precisa constar do registro.

---

## D09 — Escopo do saneamento documental

**Decisão.** O saneamento documental incide apenas sobre afirmações de total estadual em prosa, texto de interface, README e constantes nomeadas. Valores derivados em runtime, parcelas municipais ou por feedstock, fixtures, seeds, snapshots e benchmarks de terceiros ficam fora.

**Evidência (A0b, A0c).** A triagem automática produziu falso positivo sistemático, classificando mais de 1.500 ocorrências por grandeza como afirmação estadual. A triagem manual restritiva reduziu a população a 63 e 25 ocorrências, respectivamente, com critério declarado.

**Aprendizado registrado.** Varredura por padrão textual não distingue afirmação de dado. O critério de classificação precisa ser escrito antes da varredura e validado por amostra.

**Consequência.** O Lote 5 tem escopo finito e enumerado. Afirmações classificadas como legado resolvem-se por substituição por marcador; as classificadas como ativas exigem decisão individual.

---

## D10 — Contagem de feedstocks (ABERTA)

**Problema.** O número de categorias de resíduo aparece com valores diferentes entre o arquivo canônico de parâmetros, a especificação do Lote 1 e o rascunho do manuscrito.

**Por que importa.** É a primeira estatística descritiva que um revisor confere, e a divergência é verificável em segundos abrindo o repositório citado no artigo.

**Ação.** Definir a contagem a partir do arquivo canônico e distinguir explicitamente, no manuscrito, entre categorias parametrizadas com fator de correção e entradas apenas presentes na base de referência científica, se forem conjuntos diferentes.

---

## D11 — Licença do projeto (ABERTA)

**Problema.** O registro institucional declara GPL-3.0; o repositório e parte da documentação declaram MIT.

**Classificação.** Discrepância jurídica, não editorial. A submissão do manuscrito declara a licença do software descrito, e o registro de propriedade intelectual é o documento vinculante.

**Ação.** Resolver antes da submissão, independentemente do cronograma dos demais lotes. Verificar todas as declarações de licença: arquivo `LICENSE`, cabeçalhos de código, README, texto da interface, metadados do repositório e do conjunto de dados publicado.

---

## Pendências transversais para o manuscrito

Itens que não são decisões metodológicas, mas que precisam estar resolvidos antes da reescrita.

- **Atribuição de financiamento.** Ambos os processos declarados, na forma exigida pela agência.
- **Validação.** As afirmações de erro do rascunho anterior precisam ser reconstruídas a partir do pipeline atual ou removidas. Não carregar valor de rascunho anterior sem verificação.
- **Reprodutibilidade.** O conjunto de dados publicado, o repositório e o manuscrito devem citar a mesma versão do pipeline, identificada por `git_sha`.
- **Terminologia dos cenários.** Fixar uma nomenclatura única para os cenários e usá-la de forma idêntica em código, JSON canônico, interface e manuscrito. O inventário encontrou o mesmo cenário nomeado de maneiras diferentes em documentos distintos.
