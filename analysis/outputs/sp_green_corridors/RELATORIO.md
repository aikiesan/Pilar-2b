# Corredores verdes: postos de GNV, oferta e déficit

Gerado por `analysis/build_sp_green_corridors.py`. Estratégia 2027, rodada 2 (C24). Postos: pesquisa de preços da ANP, 126 postos de GNV em SP com coleta entre jan/2025 e jun/2026 (última coleta mais recente: 2026-06-30). A pesquisa é amostral: é um piso, não o cadastro.

Corredor = linha pelos centroides dos municípios-âncora (trechos retos). Posto entra no corredor se o município está a até 20 km da linha; planta e Atlas Real, a até 50 km. Produção ANP atual = biogás processado no último mês × 60 % de CH₄; conta como oferta a planta que entrega pelo menos 1.000 m³/dia. CP2b N3: CP2b v5.1, cenário med.

## 1. Por corredor

| Corredor | Extensão | Postos GNV (fora da capital) | Sem planta produzindo a 50 km | Plantas ANP (produzindo) | Capacidade ANP | Produção ANP | Atlas Real | CP2b N3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Anhanguera/Bandeirantes (SP-330/SP-348) | 306 km | 69 (31) | 4 | 6 (4) | 440.704 | 81.047 | 4.208.248 | 4.249.580 |
| Dutra (BR-116) | 229 km | 70 (32) | 3 | 3 (3) | 127.200 | 65.280 | 1.144.827 | 341.449 |
| Anchieta/Imigrantes (SP-150/SP-160) | 48 km | 51 (13) | 0 | 2 (2) | 97.200 | 54.816 | 740.813 | 259.469 |
| Washington Luís (SP-310) | 279 km | 8 (8) | 6 | 3 (1) | 319.810 | 19.076 | 4.633.073 | 5.000.805 |
| Raposo Tavares (SP-270) | 535 km | 47 (9) | 1 | 4 (3) | 180.894 | 61.971 | 5.010.560 | 3.355.540 |
| Marechal Rondon (Tietê–Araçatuba) (SP-300) | 375 km | 1 (1) | 1 | 2 (2) | 154.062 | 26.097 | 4.490.431 | 4.317.653 |

Volumes em m³ de CH₄ por dia. Um posto pode estar em mais de um corredor (a capital está em quatro).

Âncoras: Anhanguera/Bandeirantes: São Paulo → Ribeirão Preto (7 municípios); Dutra: São Paulo → Cruzeiro (7 municípios); Anchieta/Imigrantes: São Paulo → Santos (4 municípios); Washington Luís: Cordeirópolis → São José do Rio Preto (6 municípios); Raposo Tavares: São Paulo → Presidente Prudente (6 municípios); Marechal Rondon (Tietê–Araçatuba): Tietê → Araçatuba (5 municípios). Lista completa em `corredores.csv`.

## 2. Postos da TransJordano

| Posto | Postos GNV na pesquisa ANP | Planta em operação mais próxima | Distância | Produção ANP a 50 km |
|---|---:|---|---:|---:|
| Sumaré | 0 | CRI Geo Biogás (Elias Fausto) | 28 km | 7.155 |
| Cubatão | 0 | Metagás Biogás e Energia | 34 km | 16.741 |
| Ribeirão Preto | 2 | Raízen-Geo Biogás Costa Pinto | 169 km | 0 |

Ordem de grandeza da frota: 100 caminhões × 196 m³/dia (29 kg/100 km, 450 km/dia, ambos suposição) ≈ 19.565 m³/dia.

## 3. Municípios com mais postos

| Município | Postos GNV | Planta em operação mais próxima | Distância | Produção ANP a 50 km |
|---|---:|---|---:|---:|
| São Paulo | 38 | Metagás Biogás e Energia | 0 km | 54.816 |
| Guarulhos | 11 | Essencis Biometano (Caieiras) | 30 km | 54.816 |
| Campinas | 6 | CRI Geo Biogás (Elias Fausto) | 39 km | 7.155 |
| Jundiaí | 5 | Essencis Biometano (Caieiras) | 26 km | 45.230 |
| São José dos Campos | 5 | ENGEP Ambiental / ZEG Jambeiro | 31 km | 10.464 |
| Santo André | 4 | Metagás Biogás e Energia | 23 km | 54.816 |
| Valinhos | 4 | CRI Geo Biogás (Elias Fausto) | 41 km | 7.155 |
| Mogi Guaçu | 3 | Raízen-Geo Biogás Costa Pinto | 95 km | 0 |
| Osasco | 3 | Essencis Biometano (Caieiras) | 18 km | 54.816 |
| Suzano | 3 | Metagás Biogás e Energia | 35 km | 16.741 |
| Araraquara | 2 | Raízen-Geo Biogás Costa Pinto | 112 km | 0 |
| Barueri | 2 | Essencis Biometano (Caieiras) | 20 km | 54.816 |

111 dos 126 postos (88 %) estão em algum dos 6 corredores.

## Leitura

1. **A demanda está na Grande SP e nos eixos Dutra e Anhanguera/Bandeirantes** (32 e 31 postos fora da capital). Ali a oferta que já produz é gás de aterro e de esgoto da Grande SP.
2. **No interior, a oferta existe e o posto não.** Washington Luís: 8 fora da capital e 4,6 milhões de m³/dia no Atlas Real (5,0 no CP2b N3); Raposo Tavares: 9 fora da capital e 5,0 milhões de m³/dia no Atlas Real (3,4 no CP2b N3); Marechal Rondon (Tietê–Araçatuba): 1 fora da capital e 4,5 milhões de m³/dia no Atlas Real (4,3 no CP2b N3). É onde um posto de biometano fora da rede (cana, vinhaça) teria matéria-prima e nenhum concorrente.
3. **Déficit: no Washington Luís, 6 dos 8 postos não têm planta produzindo a 50 km.** A frota da TransJordano pediria cerca de 20 mil m³/dia (ordem de grandeza), e Ribeirão Preto não tem planta produzindo a 50 km (a mais próxima a 169 km): o gás chega pela rede ou por caminhão.

## Limites

- Pesquisa de preços amostral: municípios fora da amostra da ANP aparecem sem posto. Postos novos de biometano (TransJordano) não constam. Complementar com a lista de postos GNV da Comgás.
- Posto no centroide do município; corredores por trechos retos entre âncoras. Distâncias em linha reta. As plantas da capital (Metagás) também estão no centroide, por isso a distância 0 km.
- Proximidade importa para biometano entregue por caminhão (gasoduto virtual). Planta injetada na rede da Comgás pode atender um posto ligado à rede a qualquer distância, por contrato (TUSD-Verde).
- Consumo do caminhão: um registro europeu, sem medição brasileira publicada.

Fontes: [anp_precos](https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis); [bndes_transjordano](https://agenciainfra.com/blog/bndes-libera-r-140-mi-para-corredor-verde-em-sp/); [transjordano_rota](https://mundologistica.com.br/noticias/transjordano-corredor-verde-sp); [spritmonitor_g410](https://www.spritmonitor.de/en/detail/1249571.html).
