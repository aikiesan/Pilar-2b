# Digestato como fertilizante em SP: protótipo

Gerado por `analysis/build_sp_digestate_nutrients.py`. Estratégia 2027, §3.5.

Cenário Real (Atlas-FDE), fluxos com dado municipal (sem esgoto, cujo lodo segue a CONAMA 498/2020, e sem os sete fluxos que só existem como total estadual). N já descontado de 15 % de perda no armazenamento.

## Nutrientes no digestato, por fluxo (t/ano)

| Fluxo | Destino hoje, sem biodigestor | N | P₂O₅ | K₂O |
|---|---|---:|---:|---:|
| vinhaça | Já volta ao solo hoje | 74.990 | 25.207 | 504.137 |
| bovinos | Já volta ao solo hoje | 120.216 | 78.573 | 141.431 |
| palha de cana | Sai do campo se a palha for removida | 65.026 | 15.300 | 122.401 |
| torta de filtro | Já volta ao solo hoje | 54.865 | 87.600 | 18.442 |
| RSU (FORSU) | Hoje vai para aterro (nutriente novo) | 36.322 | 14.244 | 21.366 |
| aves | Já volta ao solo hoje | 21.615 | 19.980 | 12.715 |
| suínos | Já volta ao solo hoje | 8.294 | 7.667 | 5.576 |
| **Total** | | **381.328** | **248.570** | **826.067** |

## Por destino atual

| Destino hoje | N | P₂O₅ | K₂O | Valor a preço de importação (R$ mi/ano) |
|---|---:|---:|---:|---:|
| Já volta ao solo hoje | 279.981 | 219.026 | 682.300 | 4.841 |
| Sai do campo se a palha for removida | 65.026 | 15.300 | 122.401 | 794 |
| Hoje vai para aterro (nutriente novo) | 36.322 | 14.244 | 21.366 | 328 |

## Demanda das lavouras (PAM 2023 × recomendação indicativa, sem pastagem)

| | N | P₂O₅ | K₂O |
|---|---:|---:|---:|
| Demanda (t/ano) | 713.121 | 343.989 | 864.495 |
| Digestato total / demanda | 53 % | 72 % | 96 % |
| Só o nutriente novo / demanda | 5,1 % | 4,1 % | 2,5 % |

## Leitura

1. **O digestato não é uma receita nova para a maior parte de SP.** 81 % do valor dos nutrientes vem de fluxos que já voltam ao solo hoje: a vinhaça na fertirrigação, a torta no sulco, o dejeto na pastagem ou na lavoura. O biodigestor preserva esses nutrientes; não os cria. Somar esse valor à receita do projeto, como faria um `digestato × preço`, conta duas vezes um insumo que a usina ou o produtor já usa.
2. **A vinhaça sozinha cobre cerca de 84 % do K₂O recomendado para a cana de SP.** É por isso que a CETESB regula a dose por potássio. Um biodigestor de vinhaça precisa provar que o digestato continua aplicável sob a P4.231; a vantagem dele é agronômica (menos DQO, menos odor, menos emissão de metano na lagoa), não um fertilizante a vender.
3. **A palha é o caso contrário.** Remover 40 % da palha para o biodigestor tira do campo 122.401 t de K₂O e 65.026 t de N por ano (R$ 794 mi a preço de importação). Se o digestato não voltar ao canavial, essa conta é um custo do projeto que hoje nenhum cenário do PILAR-2b registra.
4. **O nutriente genuinamente novo vem do resíduo urbano:** R$ 328 mi/ano, hoje enterrados em aterro. Isso é o argumento de economia circular para prefeituras e consórcios, e depende de coleta seletiva da fração orgânica, que é a premissa mais frágil do fluxo.

## Consequência para o produto

- A calculadora e o dossiê devem separar o digestato em três linhas: **valor preservado** (fluxos já reciclados, não é receita), **reposição obrigatória** (palha removida, custo evitado só se o digestato voltar ao campo) e **nutriente novo** (FORSU, receita potencial).
- O mapa pode mostrar, por município, "% da demanda de N/P/K das lavouras atendível por digestato" (coluna `*_cobertura_pct` de `municipios.csv`).

## Limites

- Coeficientes de composição, recomendações por cultura e preços são valores de triagem, marcados `conferir` no script. Antes de citar, conferir composição contra o corpus, recomendações contra o Boletim 100 vigente e preços contra o ComexStat.
- Demanda sem pastagem nem silvicultura: é um piso.
- Disponibilidade agronômica de N do digestato (fração mineral) não é tratada; P e K são considerados integralmente disponíveis.
