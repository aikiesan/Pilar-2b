# A1f — Busca dirigida de BMP de vinhaça de cana

**Data da busca:** 2026-07-26  
**Escopo:** fontes novas, ausentes de `references_unified.csv`; atualização do artefato observacional sem alteração de `feedstocks.yaml`.

## Resultado

Depois do filtro de elegibilidade e do filtro estequiométrico de plausibilidade, o corpus final contém **n = 6 observações comparáveis**, provenientes de **4 artigos**:

| Grupo | n registrado | n aceito na mediana | Observação |
|---|---:|---:|---|
| Vinhaça de etanol de cana | 5 | **4** | Uma observação antiga foi marcada `[IMPLAUSÍVEL]` |
| Outras vinhaças | 2 | **2** | Ambas são vinhaça de rum de cana, do mesmo artigo e da mesma amostra |
| **Total** | **7** | **6** | Quatro fontes/artigos no conjunto aceito |

Não foi localizada observação elegível de vinhaça de melaço de beterraba ou de outra matéria-prima além das duas observações de rum de cana já presentes em A1e.

Os seis valores aceitos, em ordem crescente, são **153; 193,5; 267; 476; 494; 507 NmL CH₄/g VS adicionado**.

| Métrica | Resultado |
|---|---:|
| n final comparável | **6** |
| mediana | **371,50 NmL CH₄/g VS** |
| mínimo | **153,00 NmL CH₄/g VS** |
| máximo | **507,00 NmL CH₄/g VS** |
| terço inferior, conforme `POLITICA_BMP.md` §1.1 | **153,00–271,00 NmL CH₄/g VS** |
| `bmp.medio` vigente | **160,00 NmL CH₄/g VS** |

**Conclusão:** `bmp.medio = 160` permanece dentro do terço inferior da amplitude observada. Nenhum parâmetro foi alterado.

## Critérios aplicados

Uma observação entrou na estatística somente quando:

1. o substrato era vinhaça isolada, sem codigestão;
2. o ensaio era em batelada;
3. o denominador era VS adicionado;
4. o volume de metano estava explicitamente normalizado a condições padrão;
5. o valor não excedia o teto de plausibilidade.

O teto foi calculado, para cada amostra, como:

```text
teto = (DQO / VS da mesma amostra) × 350 NmL CH4/g DQO
```

Quando DQO e VS da mesma amostra não estivessem disponíveis, seria usado o teto conservador de **540 NmL CH₄/g VS**. Neste corpus, todas as linhas registradas tinham DQO e VS da mesma amostra, de modo que o teto genérico não precisou ser usado.

O “terço inferior” segue a regra já declarada em `POLITICA_BMP.md` §1.1:

```text
limite superior = mínimo + (máximo − mínimo) / 3
                = 153 + (507 − 153) / 3
                = 271 NmL CH4/g VS
```

## Fontes novas incluídas

### 1. Volpi et al. (2022)

**Artigo:** *Use of Lignocellulosic Residue from Second-Generation Ethanol Production to Enhance Methane Production Through Co-digestion*  
**DOI publicado:** https://doi.org/10.1007/s12155-021-10293-1  
**Texto integral auditado:** https://doi.org/10.1101/2021.02.19.432018

O trabalho realizou duas rodadas de BMP com o **mesmo lote de vinhaça 1G de etanol de cana** da Usina Iracema e dois inóculos:

| Experimento | Inóculo | BMP da vinhaça isolada | Validação do controle |
|---|---|---:|---|
| 1, Tabela 5, p. 26 | BIOPAQ IC tratando vinhaça | **476 ± 13 NmL CH₄/g VS** | controle positivo abaixo do critério; o valor pode subestimar o máximo |
| 2, Tabela 6, p. 32 | UASB de abatedouro de aves | **507 ± 6 NmL CH₄/g VS** | controle positivo válido |

Condições comuns: batelada em triplicata, 55 °C, I/S = 2 em VS, método VDI 4630, encerramento quando a produção por leitura caiu abaixo de 1% do acumulado e volume normalizado. A duração exata não é declarada em número; as Figuras 1 e 2 chegam a aproximadamente 80 e 120 dias, respectivamente. Não se descreve filtração da vinhaça.

A Tabela 2 mede na mesma amostra DQO = 28,81 g/L e VS = 18,40 g/L:

```text
teto = (28,81 / 18,40) × 350 = 548,02 NmL CH4/g VS
```

Os dois valores são plausíveis. São mantidos como duas observações experimentais, mas **não são duas amostras independentes de vinhaça**.

### 2. Freitas et al. (2023)

**Artigo:** *Anaerobic Co-Digestion of Vinasse and Pentose Liquor and the Role of Micronutrients in Methane Production within Sugarcane Biorefineries*  
**DOI:** https://doi.org/10.3390/methane2040029

Embora o artigo investigue também codigestão, a Tabela 3 traz a monodigestão da vinhaça 1G:

- **494 ± 11 NmL CH₄/g TVS adicionado**;
- batelada em triplicata, 55 °C, I/S = 2 em TVS, VDI 4630;
- inóculo BIOPAQ IC de tratamento de vinhaça, aclimatado por uma semana a 55 °C;
- volume úmido corrigido para gás seco em STP;
- encerramento quando a variação da produção acumulada ficou abaixo de 1%;
- nenhuma filtração da vinhaça é descrita.

Na mesma amostra, a Tabela 1 informa DQO = 28,30 g/L e TVS = 18,40 g/L:

```text
teto = (28,30 / 18,40) × 350 = 538,32 NmL CH4/g VS
```

O valor é plausível.

### 3. Paz Cedeno et al. (2026)

**Artigo:** *Deacetylation and Mechanical Refining Pathway for the Bioconversion of Sugarcane Bagasse*  
**DOI:** https://doi.org/10.1007/s12155-026-10994-5

O ensaio de monodigestão da vinhaça 1G de etanol de cana (Usina Cocal, Narandiba, SP) produziu **267 NmL CH₄/g VS** na Figura 5. O teste foi em batelada, em triplicata, por 49 dias, com I/S = 2 em VS, segundo VDI 4630. O gás úmido foi corrigido para gás seco em STP. O inóculo veio de UASB mesofílico de abatedouro de aves; a temperatura de incubação do BMP não é informada no texto, portanto não foi inferida. A vinhaça foi armazenada a 4 °C e não há descrição de filtração.

Na mesma amostra, a Tabela 5 informa DQO = 33,20 g/L e VS = 20,60 g/L:

```text
teto = (33,20 / 20,60) × 350 = 564,08 NmL CH4/g VS
```

O valor é plausível.

## Reaplicação retroativa às três observações de A1e

| obs_id | Origem | BMP publicado | DQO/VS da mesma amostra | Teto | Decisão |
|---|---|---:|---:|---:|---|
| `VIN_BMP_001` | rum de cana, sem pré-acidificação | 153,00 NmL/g VS | 33,45/55,34 = 0,6044 | 211,56 | `PLAUSÍVEL`; entra |
| `VIN_BMP_002` | rum de cana, pré-acidificada | 193,50 NmL/g VS | 33,45/55,34 = 0,6044 | 211,56 | `PLAUSÍVEL`; entra |
| `VIN_BMP_003` | etanol de cana, controle isolado | 918,53 mL/g VS | 39,93/23,90 = 1,6707 | 584,75 | **`[IMPLAUSÍVEL]`; não entra** |

Para `VIN_BMP_003`, o excesso é:

```text
918,53 − 584,75 = 333,78 mL CH4/g VS
333,78 / 584,75 = 57,08% acima do teto
```

O artigo não declara as condições normais do volume, o que já impedia sua comparação em NmL. Mesmo uma correção conservadora de 35 °C para 0 °C reduziria 918,53 para cerca de 814 NmL/g VS, ainda muito acima de 584,75. Assim, a marca `[IMPLAUSÍVEL]` não depende dessa omissão de T/P.

Há ainda uma inconsistência interna de rótulo no artigo: a metodologia chama o controle de vinhaça de `C4`, enquanto os resultados o chamam de `C5`. O valor foi preservado, não apagado.

## Busca dirigida e exclusões

Foram combinados os termos:

- `"sugarcane vinasse" AND ("biochemical methane potential" OR BMP)`;
- `"vinhaça" AND "potencial bioquímico de metano"`;
- `"specific methane yield" AND vinasse`;
- buscas dirigidas nos repositórios de USP, UNICAMP, UNESP e UFSCar.

Antes de incluir qualquer resultado novo, confirmou-se por busca textual que título e DOI não aparecem em `references_unified.csv`. A tabela também registra comparadores inelegíveis já conhecidos quando eles reapareceram nos resultados, para deixar explícito que não foram reintroduzidos no corpus.

| Fonte triada na busca dirigida | Resultado da triagem | Decisão |
|---|---|---|
| Volpi et al. (2022), DOI `10.1007/s12155-021-10293-1` | Duas monodigestões em batelada, NmL/g VS adicionado, STP | **2 incluídas** |
| Freitas et al. (2023), DOI `10.3390/methane2040029` | Controle de vinhaça 1G isolada, batelada, NmL/g TVS, STP | **1 incluída** |
| Paz Cedeno et al. (2026), DOI `10.1007/s12155-026-10994-5` | Controle de vinhaça 1G isolada, batelada, NmL/g VS, STP | **1 incluída** |
| Valmaña García et al. (2022), DOI `10.1007/s43153-022-00270-2` | O estudo chama a resposta de BMP, mas a matriz experimental a expressa por **DQO solúvel removida**, não por VS adicionado | Excluída |
| Janke et al. (2015), DOI `10.1021/ef502807s` | Monodigestão em batelada, porém valores por DQO adicionada | Excluída |
| Leite et al. (2015) | Rendimento por DQO, não por VS adicionado | Excluída |
| Ramos-Vaquerizo et al. (2018), DOI `10.4172/2157-7048.1000375` | EGSB contínuo e rendimento por DQO | Excluída |
| Penteado et al. (2018) | Codigestão de vinhaça e bagaço | Excluída |
| Mamprim Neto (USP, 2013) | Bateladas localizadas, mas sem resultado auditável de CH₄ normalizado por VS adicionado | Excluída |
| Barbosa (USP, 2018) | Ensaios ligados a sulfato; sem observação elegível e auditável por VS adicionado | Excluída |
| Teses/dissertações localizadas em UNICAMP ligadas aos trabalhos acima | Resultados duplicados dos artigos ou codigestão/denominador incompatível | Não duplicadas |
| Buscas nos repositórios UNESP e UFSCar | Predomínio de reatores contínuos, codigestão, biogás total ou ausência de valor por VS adicionado | Nenhuma observação elegível localizada |

Não se converteu rendimento por DQO para VS. Essa conversão usaria justamente a razão DQO/VS cuja variabilidade o filtro pretende respeitar e criaria uma observação derivada, não medida.

## Dependência e representatividade

O aumento de `n` não equivale a seis amostras independentes:

- `VIN_BMP_001` e `VIN_BMP_002` usam a mesma amostra de vinhaça de rum e mudam o pré-tratamento;
- `VIN_BMP_004` e `VIN_BMP_005` usam o mesmo lote de vinhaça 1G e mudam o inóculo;
- `VIN_BMP_004`, `VIN_BMP_005` e `VIN_BMP_006` vêm da mesma rede de pesquisa e duas fontes usam a Usina Iracema;
- três dos quatro novos valores foram obtidos a 55 °C; a política vigente define o centro canônico para base mesofílica.

Portanto, o corpus agora contém evidência direta de vinhaça de etanol de cana, mas ainda não justifica alterar `bmp.medio`. O resultado pedido aqui é de rastreabilidade e triagem, não de recalibração.

## Estado final

- `data/canonical_parameters/bmp_observations_VINHACA.csv` atualizado para sete linhas registradas, com filtro explícito;
- `docs/auditorias/2026-07-consistencia-canonica/02_adventure-a_2026-07-27-28/A1f_BUSCA_BMP_VINHACA.md` criado;
- `feedstocks.yaml` **não alterado**.
