# Nota C24: corredores verdes com dados reais

Estratégia 2027, rodada 2, ideia C24. Atualiza a §3.6 da v1 ("corredores de
biometano"), que era hipótese. Números de
[`analysis/build_sp_green_corridors.py`](../../../../analysis/build_sp_green_corridors.py)
(relatório em `analysis/outputs/sp_green_corridors/RELATORIO.md`, gerado com o
snapshot CP2b v5.1). Os corredores seguem o traçado das rodovias na camada viária da
plataforma (MapBiomas 10.1 INFRAESTRUTURA). Tudo é triagem: conferir antes de citar.

## Pergunta

Os corredores existem: o Corredor Verde da TransJordano (100 caminhões a biometano,
postos em Sumaré, Cubatão e Ribeirão Preto, BNDES R$ 140 mi, abr/2026) e a Iconic no
eixo SP–RJ. Onde estão os postos de GNV de SP, quanta oferta de biometano há perto de
cada rodovia, e onde falta?

## Resposta curta

**A demanda e a oferta estão em lugares diferentes.** Os postos ficam na Grande SP e
nos eixos Dutra e Anhanguera/Bandeirantes, servidos hoje por gás de aterro e de
esgoto. No interior (Washington Luís, Rondon, Raposo) há milhões de m³/dia de
potencial e quase nenhum posto. A oportunidade é o posto de biometano fora da rede,
junto à usina de cana, nesses eixos.

## Números

| | |
|---|---|
| **Postos** | 126 postos de GNV em SP na pesquisa de preços da ANP (jan/2025–jun/2026), em 43 municípios; 38 na capital. É um piso: a pesquisa é amostral |
| **Nos corredores** | 114 dos 126 (90 %) a até 20 km de uma das seis rodovias. Fora da capital: Anhanguera/Bandeirantes 32, Dutra 32, Anchieta/Imigrantes 13, Raposo 11, Washington Luís 8, Rondon 1 |
| **Oferta que já produz** (plantas ANP a até 50 km que entregam ≥ 1.000 m³/dia) | Anhanguera/Bandeirantes 81 mil m³/dia (4 plantas), Raposo 73 mil (4), Dutra 65 mil (3), Anchieta/Imigrantes 55 mil (2), Rondon 26 mil (2), Washington Luís 19 mil (1) |
| **Potencial a até 50 km** (CP2b N3) | Washington Luís 4,8 milhões de m³/dia, Anhanguera/Bandeirantes 3,9, Rondon 3,9, Raposo 3,4, Dutra 0,37, Anchieta/Imigrantes 0,26 |
| **Déficit** | Washington Luís: 6 dos 8 postos sem planta produzindo a 50 km. Anhanguera/Bandeirantes 4, Dutra 3 |
| **TransJordano** | Sumaré: CRI Elias Fausto a 28 km (7 mil m³/dia a 50 km). Cubatão: Metagás a 34 km. Ribeirão Preto: nenhuma planta produzindo a 50 km, a mais próxima a 169 km (Raízen Costa Pinto). A frota pediria cerca de 20 mil m³/dia (ordem de grandeza, ver Limites) |

Duas plantas autorizadas e listadas como em operação quase não entregam gás (OneBio
Paulínia, cerca de 125 m³/dia; Santa Cruz, cerca de 10): o protótipo não as conta
como oferta. Sem esse corte, Campinas e Araraquara pareceriam servidas.

## O que fazer

1. **Na plataforma:** camada de postos de GNV no mapa de Proximidade, com a planta
   produzindo mais próxima e a distância. É o mesmo cálculo do protótipo.
2. **Nos estudos:** Washington Luís e Rondon são os eixos para um estudo de posto
   fora da rede junto a usinas de cana (vinhaça e torta), com o cartão de
   pré-viabilidade (C2) e o financiamento do BNDES (C18; o Fundo Clima financiou
   R$ 98 mi da TransJordano).
3. **Para a demanda:** frota pesada por município (ANTT/RNTRC) e garagens de
   ônibus, como a §3.6 já pedia. Sem isso, o déficit é contado em postos, não em m³.

## Limites

- A pesquisa de preços da ANP é amostral: município fora da amostra aparece sem posto,
  e os postos novos de biometano (TransJordano) não constam. Complementar com a lista
  de postos GNV da Comgás.
- Posto no centroide do município; distância em linha reta até a rodovia. Os
  municípios-âncora (lista no relatório) só marcam onde cada corredor começa e termina.
  Com linhas retas entre eles, em vez do traçado, os números mudam pouco (Raposo: 9
  postos fora da capital e 3 plantas produzindo, em vez de 11 e 4).
- A proximidade importa para biometano levado por caminhão. Uma planta que injeta na
  rede da Comgás atende, por contrato (TUSD-Verde), um posto ligado à rede a qualquer
  distância. O protótipo não separa as plantas injetadas.
- Consumo do caminhão: 29 kg/100 km (um registro europeu de um Scania G410 a GNV) e
  450 km/dia (a extensão da rota da TransJordano). Os dois são suposições; trocar pelo
  consumo medido quando a TransJordano ou a Scania publicarem.

## Fontes

- Postos: [ANP, série histórica de preços de combustíveis](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis) (combustíveis automotivos, 2025-01 a 2026-01), filtrada por `analysis/ingest_anp_postos_gnv.py` em `analysis/data/sources/anp/anp_postos_gnv_sp.csv`
- TransJordano: [Agência iNFRA](https://agenciainfra.com/blog/bndes-libera-r-140-mi-para-corredor-verde-em-sp/), [eixos](https://eixos.com.br/gas-natural/biogas/bndes-aprova-r-140-milhoes-para-corredor-verde-com-caminhoes-a-biometano-em-sp/), [Mundo Logística (rota de 450 km)](https://mundologistica.com.br/noticias/transjordano-corredor-verde-sp)
- Consumo: [Spritmonitor, Scania G410 CNG](https://www.spritmonitor.de/en/detail/1249571.html)
- Plantas e produção: `analysis/data/05_biogas_plants_brazil.csv` (ANP); potencial: Atlas Real e CP2b v5.1, como na reconciliação BioGRAM (C16)
- Rodovias: camada viária da plataforma (MapBiomas 10.1 INFRAESTRUTURA, rodovias estaduais e federais), exportada por `analysis/sql/export_corridor_highways.sql` em `analysis/data/sources/mapbiomas/rodovias_corredores_sp.geojson`
