# A1e — Reconstrução do corpus de BMP da vinhaça

**Data:** 2026-07-28  
**Escopo:** somente leitura sobre `feedstocks.yaml`; criação de artefatos de rastreabilidade.

## Resultado

O corpus reconstruído contém **3 observações incluídas**, todas de vinhaça de cana isolada, em batelada e expressas por VS adicionado:

| obs_id | Fonte e condição | BMP (NmL CH₄/g VS) |
|---|---|---:|
| `VIN_BMP_001` | Galvez et al. (2018), vinhaça de rum de cana, sem pré-acidificação | 153,00 |
| `VIN_BMP_002` | Galvez et al. (2018), mesma vinhaça, pré-acidificação por quatro dias | 193,50 |
| `VIN_BMP_003` | Domingos et al. (2024), controle de vinhaça isolada | 918,53 mL/g VS; condições normais não declaradas |

Estatísticas:

| Métrica | Resultado |
|---|---:|
| n incluído | **3** |
| n comparável em NmL/g VS | **2** |
| mínimo comparável | **153,00 NmL CH₄/g VS** |
| mediana comparável | **173,25 NmL CH₄/g VS** |
| máximo comparável | **193,50 NmL CH₄/g VS** |
| terço inferior da amplitude comparável | **153,00–166,50 NmL CH₄/g VS** |
| mediana dos três valores como publicados, sem harmonizar T/P | **193,50 mL ou NmL CH₄/g VS** |

O terço inferior foi calculado conforme a ancoragem da `POLITICA_BMP.md` §1.1: do mínimo até `mínimo + (máximo − mínimo)/3`. Para não chamar mL de NmL sem base, a estatística comparável usa apenas as duas observações cuja fonte normaliza o gás a condições padrão. O valor de Domingos et al. permanece materializado, mas fora desse cálculo.

### Comparação com os números vigentes

| Referência | Valor (NmL CH₄/g VS) | Comparação com a mediana comparável reconstruída |
|---|---:|---:|
| `feedstocks.yaml` — `bmp.medio` | **160,00** | −13,25; **7,65% abaixo** |
| CSV agregado — `bmp_median` | **180,00** | +6,75; **3,90% acima** |
| Corpus reconstruído comparável (n=2) | **173,25** | — |

O `bmp.medio = 160` permanece dentro do terço inferior observado e a 7 NmL/g VS do mínimo. Nenhum parâmetro foi alterado.

## Discrepância no universo de candidatos

A instrução menciona 27 candidatos, mas `data/canonical_parameters/references_unified.csv` contém **24 linhas** cujo `feedstock_codes` é exatamente `VINHACA`. Duas linhas apontam para o mesmo trabalho de Paulo Vitor Correa, deixando **23 fontes únicas**.

Não foram acrescentados artigos externos à lista para completar artificialmente 27. O preprint de Volpi et al. discutido em A1d, por exemplo, não é uma das linhas `VINHACA` do arquivo e não entrou no corpus A1e.

## Método

Para cada linha candidata:

1. abriu-se a URL registrada ou uma cópia primária/repositório institucional do mesmo trabalho;
2. verificaram-se substrato, regime e denominador;
3. incluíram-se apenas resultados de metano de vinhaça de cana isolada, em batelada, normalizados por VS;
4. codigestões, resultados de biogás total, resultados por DQO e estudos sem medição experimental foram excluídos;
5. desempenhos contínuos auditáveis foram separados em `bmp_reactor_VINHACA.csv`;
6. fonte sem texto suficiente para verificar o resultado foi marcada `[NÃO VERIFICÁVEL]`.

Não foi feita conversão de DQO para VS: não existe fator universal fisicamente defensável. `L CH₄/kg VS` e `Nm³ CH₄/t VS` seriam numericamente equivalentes a `NmL CH₄/g VS` quando as mesmas condições de gás são declaradas. Nas duas observações de Galvez et al., o artigo explicita condições padrão e o fator numérico é 1. Domingos et al. não declara temperatura e pressão de normalização; por isso o campo convertido foi marcado `[NÃO CONVERTÍVEL]`, sem assumir fator 1.

## Auditoria dos 24 registros candidatos

| # | Candidato | Acesso e classificação | Decisão |
|---:|---|---|---|
| 1 | Barros, Duda & Oliveira (2016), *Biomethane production from vinasse in UASB reactors* | Texto integral acessível. UASB contínuos por 230 dias; rendimento por DQO removida. O DOI correto é `10.1016/j.bjm.2016.04.021`, diferente do DOI registrado no CSV. | **Fora do BMP**; seis estatísticas de R1/R2 materializadas no CSV de reator. |
| 2 | *Technological strategies for managing sugarcane vinasse...* | Apenas resumo/metadados acessíveis; revisão tecnológica, sem observação primária identificável. O DOI do CSV termina em `119XXX` e não é um DOI resolvível. | Excluído; revisão. |
| 3 | Naspolini et al. (2017), *Bioconversion of Sugarcane Vinasse...* | Texto integral acessível. A vinhaça passa por fermentação para biossurfactante e o efluente segue para digestão; não fornece BMP de vinhaça bruta por VS. | Excluído; substrato processado e denominador incompatível. |
| 4 | Galvez et al. (2018), *Evaluation of the Production of Methane...* | PDF integral acessível. Batelada OxiTop, 51 dias, 30 °C, esterco bovino, I/S 3,33 em VS; Tabela 5 informa 153,0 e 193,5 mL CH₄/g VS de substrato. | **Duas observações incluídas.** |
| 5 | Correa (2015), *Aproveitamento do Biogás a Partir da Vinhaça...* | PDF integral acessível. Estudo de viabilidade/revisão, sem ensaio BMP próprio. | Excluído; sem observação primária. |
| 6 | Syaichurrozi et al., *Kinetic Model of Biogas Yield...* | PDF integral acessível. Batelada de 30 dias, mas mede **biogás total**, não metano, em mistura vinhaça + fluido ruminal, com/sem ureia. | Excluído; não é CH₄ de vinhaça isolada. |
| 7 | Syaichurrozi et al. (2023), *Effect of Fe Addition...* | PDF integral acessível. Frascos em batelada, 50 dias, 30 °C; rendimento de biogás em mL/g DQO, com adição de Fe. | Excluído; denominador DQO e não BMP de CH₄ por VS. |
| 8 | López & Borzacconi (2011), *Modelling of an EGSB...* | Artigo/registro acessível. Modelagem de EGSB contínuo, sem observação específica em VS. O DOI registrado (`...768`) não coincide com o DOI localizado para o título (`10.2166/wst.2011.697`). | Excluído; contínuo/modelagem, sem linha conversível. |
| 9 | *Kinetics of thermophilic acidogenesis...* | Resumo e metadados acessíveis. Reatores acidogênicos para produção de H₂, não metano. O DOI localizado para o título é `10.1016/j.energy.2016.10.043`, não `...11.093`. | Excluído; acidogênese/H₂. |
| 10 | Janke et al. (2015), *Biogas Production from Sugarcane Waste...* | Texto integral acessível. BMP em batelada de 35 dias; três vinhaças dão 246, 302 e 273 NmL CH₄/g **DQO**. | Excluído; denominador DQO adicionada. |
| 11 | *Biochemical Methane Potential: A Comparison Of Different Substrates Including Sugarcane Vinasse* | A página Even3 registrada não expôs resumo, PDF ou tabela recuperável. | **[NÃO VERIFICÁVEL]**; nenhum valor inventado. |
| 12 | *Co-digestion of vinasse with cattle manure and glycerin...* | O arquivo registrado retornou erro; o próprio título declara codigestão. | **[NÃO VERIFICÁVEL]** quanto aos valores; excluído por codigestão. |
| 13 | Domingos et al. (2024), *Influence of Ensiling Time...* | PDF integral acessível. Embora o experimento principal seja codigestão, há controle de vinhaça isolada: 918,53 mL CH₄/g VS, batelada de 59 dias a 35 °C. Não são declaradas condições normais do volume. | **Uma observação incluída**, mas não usada na mediana em NmL; todas as misturas foram excluídas. |
| 14 | *Feasibility of biohydrogen production by co-digestion of vinasse and molasses...* | Fonte/título e metadados acessíveis. AnSBBR de codigestão voltado a H₂. | Excluído; codigestão e produto H₂. |
| 15 | Duda, Sturaro & Oliveira (2019), *Co-digestão anaeróbia de vinhaça, melaço e torta de filtro* | PDF integral acessível. Dois UASB contínuos em série, alimentados com mistura. | Excluído; codigestão contínua. |
| 16 | *Avaliação da sustentabilidade de alternativas da utilização da vinhaça* | Documento acessível; avaliação de alternativas, não ensaio BMP primário. | Excluído; sem observação experimental. |
| 17 | *Complementaridade da matriz energética brasileira...* | Documento acessível; análise energética de coprodutos, não ensaio BMP. | Excluído; sem observação experimental. |
| 18 | *Modelagem e simulação da produção de biogás a partir da vinhaça* | Documento acessível; simulação baseada em literatura. | Excluído; sem observação experimental. |
| 19 | Correa (2015), *Aproveitamento do Biogás a Partir da Vinhaça da Cana* | Mesma URL e mesmo documento da linha 5. | Excluído; duplicata e sem ensaio. |
| 20 | Santos (2021), *Produção de Biogás a Partir da Vinhaça* | PDF integral acessível; revisão bibliográfica declarada. O DOI registrado (`10.3390/su14127016`) não pertence ao trabalho. | Excluído; revisão e DOI incorreto. |
| 21 | *Obtenção de biohidrogênio usando subprodutos da cana-de-açúcar* | Resumo acessível; produção de H₂, não BMP de CH₄. | Excluído; produto H₂. |
| 22 | Moura (2023), *Codigestão de Vinhaça... e Lodo de Esgoto* | PDF integral acessível. Inclui controle 100% vinhaça em batelada, mas todos os rendimentos são por **DQO adicionada**; mistura ótima 207,0 mL CH₄/g DQO. | Excluído; denominador DQO adicionada. |
| 23 | Baez-Smith (2006), *Anaerobic Digestion of Vinasse...* | Texto de conferência acessível. Revisão técnico-industrial, sem novo BMP por VS rastreável. | Excluído; sem observação primária elegível. |
| 24 | Silva & Abud (2016), *Anaerobic biodigestion of sugarcane vinasse...* | Artigo acessível. Bateladas por 23 dias, variando temperatura, pH e esterco; reporta produção/composição de biogás e remoção, não BMP de CH₄ por VS adicionado. O DOI correto localizado é `10.4136/ambi-agua.1897`, não `...1898`. | Excluído; métrica incompatível. |

## Observações incluídas: protocolo e ressalvas

### Galvez et al. (2018)

Fonte primária: https://www.ajer.org/papers/Vol-7-issue-6/T0706160169.pdf

- frascos OxiTop de 1 L, batelada, triplicata;
- 51 dias a 30 °C;
- inóculo de esterco bovino fresco;
- S/I = 0,3 g VS substrato/g VS inóculo, portanto I/S = 3,33;
- branco do inóculo descontado;
- denominador explicitamente definido como VS inicial do substrato;
- nenhuma filtração da vinhaça é descrita;
- tratamento A: neutralização, sem pré-acidificação, 153,0 mL CH₄/g VS;
- tratamento B: pré-acidificação anaeróbia por quatro dias a 30 °C, 193,5 mL CH₄/g VS.

O resumo contém `19.5`, mas a Tabela 5 e a conclusão apresentam `193.5`; adotou-se o valor reiterado nesses dois locais.

### Domingos et al. (2024)

Fonte primária: https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1166071/1/Influence-of-Ensiling-Time-and-Elephant-Grass...2023.pdf

- controle com apenas vinhaça dentro de um experimento de codigestão;
- frascos de 120 mL, volume útil de 60 mL;
- 59 dias a 35 °C e 100 rpm;
- inóculo de UASB de sistema de tratamento de esgoto, adicionado a 10% em volume;
- vinhaça diluída para 5 g DQO/L, pH ajustado a 7;
- nenhuma filtração da vinhaça é descrita;
- 918,53 mL CH₄/g VS; a fonte não declara condições normais de temperatura e pressão, impedindo conversão auditável para NmL.

Há uma inconsistência de rótulo no próprio artigo: a metodologia chama o controle de vinhaça de `C4` e o branco de inóculo de `C5`, enquanto os resultados chamam o controle de vinhaça de `C5`. O valor e a descrição “contendo apenas vinhaça” são explícitos, mas a troca de código foi registrada no CSV como `C4/C5`. O valor elevado deve ser tratado com cautela, não apagado.

## Vinhaça filtrada

**Nenhuma das três observações incluídas informa filtração da vinhaça.** Portanto, não há subconjunto confirmado de vinhaça filtrada dentro do corpus reconstruído.

Fuess et al. (2017), que filtrou a vinhaça em papel de 3 µm, não consta entre as 24 linhas `VINHACA` do arquivo e é desempenho contínuo por DQO removida, não BMP por VS. Não foi inserido artificialmente em nenhum dos CSVs.

## Arquivos materializados

- `data/canonical_parameters/bmp_observations_VINHACA.csv`: três observações incluídas, duas comparáveis em NmL/g VS;
- `data/canonical_parameters/bmp_reactor_VINHACA.csv`: seis estatísticas de desempenho contínuo de R1/R2, mantidas fora do BMP e sem conversão indevida de DQO para VS.

**Estado final:** `feedstocks.yaml` e o BMP vigente permanecem inalterados.
