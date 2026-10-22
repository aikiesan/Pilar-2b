# Bacias de aterro da CETESB (2024): os blocos que já existem (C23 v2)

Gerado por `analysis/build_bacias_aterro.py`. Estratégia 2027, rodada 2, ideia C23.

Os municípios agrupados pelo destino que a CETESB registra no campo `Dispoe_em` da camada do IQR de 2024. Cada bacia passa pelo mesmo cálculo dos blocos do Integra Resíduos (`build_integra_residuos.py`): RSU coletado, FORSU, metano pela rota aterro com captura e pela biodigestão da FORSU (alternativas, não somam), escala mínima, nutriente novo e CAPEX indicativo.

**40 bacias, 37 delas com mais de um município; 379 de 645 municípios (80 % da população) estão numa bacia.**

| Situação na camada da CETESB | Municípios |
|---|---:|
| dispõe no próprio município | 35 |
| dispõe em outro município de SP | 344 |
| mais de um destino (não repartido) | 2 |
| dispõe fora de SP | 8 |
| Dispoe_em vazio na camada da CETESB | 256 |
| destino com nome que não casou com o IBGE | 0 |

Estabilidade: 343 de 366 membros de bacia com destino registrado em 2023 mantiveram o mesmo `Dispoe_em` em 2024.

## Bacias

Escala mínima: 15.000 Nm³ CH₄/dia. Ordenadas pelo metano da rota aterro. IQR das origens: menor e maior nota dos membros (sem as notas -1); uma faixa larga sugere mais de um aterro no mesmo município.

| Destino | Municípios | População | RSU (t/ano) | CH₄ aterro (Nm³/dia) | % escala | CH₄ digestão (Nm³/dia) | % escala | IQR das origens | Plantas no município do destino |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| Caieiras (A.P.) | 17 | 12.776.587 | 4.994.173 | 670.485 | 4.470 | 354.878 | 2.366 | 9,4–9,8 | Essencis Biometano (Caieiras) |
| Paulínia (A.P.) | 24 | 2.598.028 | 904.566 | 121.441 | 810 | 64.277 | 428 | 9,2 | Biometano Verde Paulínia (OneBio) |
| São Paulo (CDR) | 7 | 2.218.515 | 814.941 | 109.409 | 729 | 57.908 | 386 | 9,4 | CLARO S/A; Gaswatt Energi; UTE Bandeirantes (Aterro Bandeirantes); UTE São João Biogás (Aterro São João) |
| Mauá (A.P.) | 8 | 2.172.563 | 768.327 | 103.151 | 688 | 54.596 | 364 | 9,3 | — |
| Santana de Parnaíba (A.P.) | 7 | 1.844.257 | 602.200 | 80.847 | 539 | 42.791 | 285 | 9,2 | — |
| Guatapará (A.P.) | 14 | 1.132.737 | 411.066 | 55.187 | 368 | 29.210 | 195 | 9,6 | — |
| Iperó (A.P.) | 12 | 1.093.995 | 394.314 | 52.938 | 353 | 28.019 | 187 | 9,2 | — |
| Santos (A.P.) | 5 | 1.162.292 | 375.775 | 50.449 | 336 | 26.702 | 178 | 9,3 | — |
| Jambeiro (A.P.) | 12 | 1.121.030 | 356.122 | 47.811 | 319 | 25.305 | 169 | 10,0 | — |
| Piratininga (A.P.) | 25 | 888.920 | 275.006 | 36.920 | 246 | 19.541 | 130 | 9,6 | — |
| Onda Verde (A.P.) | 22 | 805.110 | 245.104 | 32.906 | 219 | 17.417 | 116 | 10,0 | — |
| Tremembé (A.P.) | 10 | 705.543 | 221.276 | 29.707 | 198 | 15.724 | 105 | 9,8 | — |
| Catanduva (A.P.) | 30 | 664.675 | 190.610 | 25.590 | 171 | 13.544 | 90 | 9,8 | — |
| Cesário Lange (A.P.) | 13 | 463.536 | 141.648 | 19.017 | 127 | 10.065 | 67 | 9,8 | — |
| Americana (A.P.) | 2 | 420.587 | 137.638 | 18.478 | 123 | 9.780 | 65 | 10,0 | — |
| Itapevi (A.P.) | 4 | 422.279 | 134.793 | 18.096 | 121 | 9.578 | 64 | 9,4 | — |
| Cachoeira Paulista (A.P.) | 15 | 442.694 | 129.406 | 17.373 | 116 | 9.195 | 61 | 9,6 | — |
| Casa Branca (A.P.) | 8 | 397.836 | 119.319 | 16.019 | 107 | 8.479 | 56 | 9,8 | — |
| Sales Oliveira (A.P.) | 14 | 396.497 | 111.912 | 15.025 | 100 | 7.952 | 53 | 8,0 | — |
| Indaiatuba (A.P.) | 3 | 338.109 | 107.008 | 14.366 | 96 | 7.604 | 51 | 9,8 | CORPUS SANEAMENTO E OBRAS LTDA |
| Quatá (A.P.) | 19 | 368.752 | 105.829 | 14.208 | 95 | 7.520 | 50 | 9,6 | REVITA ENGENHARIA SA |
| Marília (A.P.) | 12 | 334.957 | 104.068 | 13.972 | 93 | 7.395 | 49 | 9,6 | — |
| Regente Feijó (A.P.) | 7 | 330.273 | 101.755 | 13.661 | 91 | 7.231 | 48 | 9,8 | — |
| São Carlos (A.P.) | 2 | 271.005 | 87.513 | 11.749 | 78 | 6.218 | 42 | 10,0 | — |
| Rio das Pedras (A.P.) | 14 | 293.560 | 85.628 | 11.496 | 77 | 6.085 | 41 | 9,0 | — |
| Meridiano (A.P.) | 20 | 250.043 | 69.745 | 9.364 | 62 | 4.956 | 33 | 10,0 | — |
| Jardinópolis (A.P.) | 4 | 210.116 | 65.271 | 8.763 | 58 | 4.638 | 31 | 9,1 | — |
| Bragança Paulista (A.P.) | 4 | 202.961 | 64.518 | 8.662 | 58 | 4.585 | 31 | 8,8 | — |
| Barretos (A.P.) | 4 | 189.109 | 58.469 | 7.850 | 52 | 4.155 | 28 | 9,2 | — |
| Tapiratiba (A.P.) | 7 | 200.242 | 56.231 | 7.549 | 50 | 3.996 | 27 | 8,8 | — |
| Salto (A.P.) | 2 | 161.938 | 51.990 | 6.980 | 46 | 3.694 | 25 | 9,8 | — |
| Adamantina (A.P.) | 9 | 183.422 | 51.925 | 6.971 | 46 | 3.690 | 25 | 8,7 | — |
| Conchal (A.P.) | 5 | 137.461 | 37.881 | 5.086 | 34 | 2.692 | 18 | 9,7 | — |
| Santa Isabel (A.P.) | 4 | 111.679 | 31.438 | 4.221 | 28 | 2.234 | 15 | 7,9 | — |
| Guará (A.P.) | 5 | 102.896 | 28.353 | 3.807 | 25 | 2.015 | 13 | 10,0 | — |
| Pirapozinho (A.P.) | 4 | 41.242 | 11.419 | 1.533 | 10 | 811 | 5 | 9,1 | — |
| Aguaí (A.P.) | 1 | 32.072 | 9.329 | 1.253 | 8 | 663 | 4 | 9,8 | — |
| Botucatu | 2 | 26.223 | 6.675 | 896 | 6 | 474 | 3 | 7,6 | — |
| Pariquera-Açu | 1 | 12.289 | 3.128 | 420 | 3 | 222 | 2 | 8,7 | — |
| Santa Fé do Sul | 1 | 3.833 | 976 | 131 | 1 | 69 | 0 | 8,6 | — |

## Leitura

1. **A bacia é o bloco de fato.** O resíduo já viaja até esses destinos hoje; um projeto de biogás no destino não precisa de um consórcio novo para ter escala, só de contrato com quem já está lá.
2. **Rota aterro:** é o gás que a razão estadual do Atlas atribui ao resíduo que chega por ano, não o gás do resíduo já aterrado, que pode ser maior num aterro antigo. A coluna de plantas mostra onde já existe captura no cadastro do repositório.
3. **Rota digestão:** é o teto se toda a fração orgânica dos membros fosse separada e levada ao mesmo destino, o que supõe coleta seletiva da FORSU.

## Cartão de pré-viabilidade (rascunho), bacias na escala mínima pela rota aterro

### Caieiras (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 17 |
| População (hab) | 12.776.587 |
| RSU coletado (t/ano) | 4.994.173 |
| FORSU (t/ano) | 2.320.293 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 354.878 (2.366 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 670.485 (4.470 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 56.020 / 105.842 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 11.834 / 4.641 / 6.961 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 106,90 |
| CAPEX indicativo, rota aterro (R$ mi) | 1.367,2–1.794,4 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 92.715 / 88.343 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| CLARO S/A | São Paulo | ANEEL GD | conectada | 0 | 4.950 kW |
| Essencis Biometano (Caieiras) | Caieiras | ANP/levantamento | operating | 0 | 67.200 m³/d biometano |
| Gaswatt Energi | São Paulo | ANEEL GD | conectada | 0 | 3.150 kW |
| UTE Bandeirantes (Aterro Bandeirantes) | São Paulo | ANP/levantamento | operating | 0 | 20 MW |
| UTE São João Biogás (Aterro São João) | São Paulo | ANP/levantamento | deactivated | 0 | 20 MW |
| RENATO RAPPA | Itatiba | ANEEL GD | conectada | 24 | 96 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 50 | 28 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 50 | 24 kW |

### Paulínia (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 24 |
| População (hab) | 2.598.028 |
| RSU coletado (t/ano) | 904.566 |
| FORSU (t/ano) | 420.261 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 64.277 (428 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 121.441 (810 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 10.147 / 19.170 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 2.143 / 840 / 1.261 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 19,36 |
| CAPEX indicativo, rota aterro (R$ mi) | 247,6–325,0 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 51.698 / 50.416 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| Biometano Verde Paulínia (OneBio) | Paulinia | ANP/levantamento | operating | 0 | 106.867 m³/d biometano |
| RENATO RAPPA | Itatiba | ANEEL GD | conectada | 13 | 96 kW |
| CORPUS SANEAMENTO E OBRAS LTDA | Indaiatuba | ANEEL GD | conectada | 14 | 200 kW |
| Essencis Biometano (Caieiras) | Caieiras | ANP/levantamento | operating | 38 | 67.200 m³/d biometano |

### São Paulo (CDR)

| Item | Valor |
|---|---:|
| Municípios | 7 |
| População (hab) | 2.218.515 |
| RSU coletado (t/ano) | 814.941 |
| FORSU (t/ano) | 378.621 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 57.908 (386 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 109.409 (729 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 9.141 / 17.271 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 1.931 / 757 / 1.136 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 17,44 |
| CAPEX indicativo, rota aterro (R$ mi) | 223,1–292,8 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 15.962 / 15.412 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| CLARO S/A | São Paulo | ANEEL GD | conectada | 10 | 4.950 kW |
| Gaswatt Energi | São Paulo | ANEEL GD | conectada | 12 | 3.150 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 17 | 28 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 17 | 24 kW |
| Essencis Biometano (Caieiras) | Caieiras | ANP/levantamento | operating | 20 | 67.200 m³/d biometano |
| RENATO RAPPA | Itatiba | ANEEL GD | conectada | 29 | 96 kW |
| UTE Bandeirantes (Aterro Bandeirantes) | São Paulo | ANP/levantamento | operating | 30 | 20 MW |
| UTE São João Biogás (Aterro São João) | São Paulo | ANP/levantamento | deactivated | 30 | 20 MW |

### Mauá (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 8 |
| População (hab) | 2.172.563 |
| RSU coletado (t/ano) | 768.327 |
| FORSU (t/ano) | 356.965 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 54.596 (364 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 103.151 (688 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 8.618 / 16.283 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 1.820 / 714 / 1.071 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 16,45 |
| CAPEX indicativo, rota aterro (R$ mi) | 210,3–276,1 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 14.028 / 13.693 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| CLARO S/A | São Paulo | ANEEL GD | conectada | 4 | 4.950 kW |
| Gaswatt Energi | São Paulo | ANEEL GD | conectada | 4 | 3.150 kW |
| UTE Bandeirantes (Aterro Bandeirantes) | São Paulo | ANP/levantamento | operating | 6 | 20 MW |
| UTE São João Biogás (Aterro São João) | São Paulo | ANP/levantamento | deactivated | 6 | 20 MW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 30 | 28 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 30 | 24 kW |
| Essencis Biometano (Caieiras) | Caieiras | ANP/levantamento | operating | 33 | 67.200 m³/d biometano |

### Santana de Parnaíba (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 7 |
| População (hab) | 1.844.257 |
| RSU coletado (t/ano) | 602.200 |
| FORSU (t/ano) | 279.782 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 42.791 (285 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 80.847 (539 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 6.755 / 12.762 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 1.427 / 560 / 839 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 12,89 |
| CAPEX indicativo, rota aterro (R$ mi) | 164,9–216,4 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 20.937 / 19.713 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| Essencis Biometano (Caieiras) | Caieiras | ANP/levantamento | operating | 19 | 67.200 m³/d biometano |
| UTE Bandeirantes (Aterro Bandeirantes) | São Paulo | ANP/levantamento | operating | 21 | 20 MW |
| UTE São João Biogás (Aterro São João) | São Paulo | ANP/levantamento | deactivated | 21 | 20 MW |
| RENATO RAPPA | Itatiba | ANEEL GD | conectada | 23 | 96 kW |
| Gaswatt Energi | São Paulo | ANEEL GD | conectada | 40 | 3.150 kW |
| CLARO S/A | São Paulo | ANEEL GD | conectada | 44 | 4.950 kW |

### Guatapará (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 14 |
| População (hab) | 1.132.737 |
| RSU coletado (t/ano) | 411.066 |
| FORSU (t/ano) | 190.981 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 29.210 (195 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 55.187 (368 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 4.611 / 8.712 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 974 / 382 / 573 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 8,80 |
| CAPEX indicativo, rota aterro (R$ mi) | 112,5–147,7 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 12.738 / 12.389 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

- Nenhuma no cadastro do repositório.

### Iperó (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 12 |
| População (hab) | 1.093.995 |
| RSU coletado (t/ano) | 394.314 |
| FORSU (t/ano) | 183.198 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 28.019 (187 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 52.938 (353 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 4.423 / 8.357 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 934 / 366 / 550 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 8,44 |
| CAPEX indicativo, rota aterro (R$ mi) | 107,9–141,7 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 22.380 / 21.830 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| CORPUS SANEAMENTO E OBRAS LTDA | Indaiatuba | ANEEL GD | conectada | 16 | 200 kW |

### Santos (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 5 |
| População (hab) | 1.162.292 |
| RSU coletado (t/ano) | 375.775 |
| FORSU (t/ano) | 174.585 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 26.702 (178 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 50.449 (336 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 4.215 / 7.964 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 890 / 349 / 524 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 8,04 |
| CAPEX indicativo, rota aterro (R$ mi) | 102,9–135,0 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 9.719 / 8.840 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| CLARO S/A | São Paulo | ANEEL GD | conectada | 29 | 4.950 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 31 | 28 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 31 | 24 kW |
| Gaswatt Energi | São Paulo | ANEEL GD | conectada | 32 | 3.150 kW |
| UTE Bandeirantes (Aterro Bandeirantes) | São Paulo | ANP/levantamento | operating | 38 | 20 MW |
| UTE São João Biogás (Aterro São João) | São Paulo | ANP/levantamento | deactivated | 38 | 20 MW |

### Jambeiro (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 12 |
| População (hab) | 1.121.030 |
| RSU coletado (t/ano) | 356.122 |
| FORSU (t/ano) | 165.454 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 25.305 (169 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 47.811 (319 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 3.995 / 7.547 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 844 / 331 / 496 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 7,62 |
| CAPEX indicativo, rota aterro (R$ mi) | 97,5–128,0 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 7.347 / 5.879 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 0 | 28 kW |
| CONDOMINIO RESIDENCIAL ARTS GARDEN N N | Mogi das Cruzes | ANEEL GD | conectada | 0 | 24 kW |
| CLARO S/A | São Paulo | ANEEL GD | conectada | 12 | 4.950 kW |
| Gaswatt Energi | São Paulo | ANEEL GD | conectada | 15 | 3.150 kW |
| MUNICIPIO DE SAO JOSE DOS CAMPOS | São José dos Campos | ANEEL GD | conectada | 16 | 1.560 kW |
| UTE Bandeirantes (Aterro Bandeirantes) | São Paulo | ANP/levantamento | operating | 35 | 20 MW |
| UTE São João Biogás (Aterro São João) | São Paulo | ANP/levantamento | deactivated | 35 | 20 MW |

### Piratininga (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 25 |
| População (hab) | 888.920 |
| RSU coletado (t/ano) | 275.006 |
| FORSU (t/ano) | 127.768 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 19.541 (130 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 36.920 (246 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 3.085 / 5.828 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 652 / 256 / 383 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 5,89 |
| CAPEX indicativo, rota aterro (R$ mi) | 75,3–98,8 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 15.108 / 14.894 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

- Nenhuma no cadastro do repositório.

### Onda Verde (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 22 |
| População (hab) | 805.110 |
| RSU coletado (t/ano) | 245.104 |
| FORSU (t/ano) | 113.875 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 17.417 (116 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 32.906 (219 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 2.749 / 5.194 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 581 / 228 / 342 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 5,25 |
| CAPEX indicativo, rota aterro (R$ mi) | 67,1–88,1 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 15.082 / 14.600 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

- Nenhuma no cadastro do repositório.

### Tremembé (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 10 |
| População (hab) | 705.543 |
| RSU coletado (t/ano) | 221.276 |
| FORSU (t/ano) | 102.805 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 15.724 (105 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 29.707 (198 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 2.482 / 4.690 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 524 / 206 / 308 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 4,74 |
| CAPEX indicativo, rota aterro (R$ mi) | 60,6–79,5 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 3.505 / 2.910 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| MUNICIPIO DE SAO JOSE DOS CAMPOS | São José dos Campos | ANEEL GD | conectada | 22 | 1.560 kW |

### Catanduva (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 30 |
| População (hab) | 664.675 |
| RSU coletado (t/ano) | 190.610 |
| FORSU (t/ano) | 88.557 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 13.544 (90 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 25.590 (171 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 2.138 / 4.040 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 452 / 177 / 266 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 4,08 |
| CAPEX indicativo, rota aterro (R$ mi) | 52,2–68,5 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 11.686 / 11.278 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

- Nenhuma no cadastro do repositório.

### Cesário Lange (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 13 |
| População (hab) | 463.536 |
| RSU coletado (t/ano) | 141.648 |
| FORSU (t/ano) | 65.809 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 10.065 (67 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 19.017 (127 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 1.589 / 3.002 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 336 / 132 / 197 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 3,03 |
| CAPEX indicativo, rota aterro (R$ mi) | 38,8–50,9 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 7.337 / 7.296 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| CORPUS SANEAMENTO E OBRAS LTDA | Indaiatuba | ANEEL GD | conectada | 31 | 200 kW |

### Americana (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 2 |
| População (hab) | 420.587 |
| RSU coletado (t/ano) | 137.638 |
| FORSU (t/ano) | 63.947 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 9.780 (65 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 18.478 (123 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 1.544 / 2.917 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 326 / 128 / 192 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 2,95 |
| CAPEX indicativo, rota aterro (R$ mi) | 37,7–49,5 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 8.968 / 8.955 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| Biometano Verde Paulínia (OneBio) | Paulinia | ANP/levantamento | operating | 15 | 106.867 m³/d biometano |
| CORPUS SANEAMENTO E OBRAS LTDA | Indaiatuba | ANEEL GD | conectada | 33 | 200 kW |

### Itapevi (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 4 |
| População (hab) | 422.279 |
| RSU coletado (t/ano) | 134.793 |
| FORSU (t/ano) | 62.625 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 9.578 (64 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 18.096 (121 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 1.512 / 2.857 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 319 / 125 / 188 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 2,88 |
| CAPEX indicativo, rota aterro (R$ mi) | 36,9–48,4 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 2.636 / 2.190 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| Essencis Biometano (Caieiras) | Caieiras | ANP/levantamento | operating | 24 | 67.200 m³/d biometano |
| UTE Bandeirantes (Aterro Bandeirantes) | São Paulo | ANP/levantamento | operating | 28 | 20 MW |
| UTE São João Biogás (Aterro São João) | São Paulo | ANP/levantamento | deactivated | 28 | 20 MW |
| Gaswatt Energi | São Paulo | ANEEL GD | conectada | 46 | 3.150 kW |

### Cachoeira Paulista (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 15 |
| População (hab) | 442.694 |
| RSU coletado (t/ano) | 129.406 |
| FORSU (t/ano) | 60.122 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 9.195 (61 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 17.373 (116 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 1.452 / 2.743 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 307 / 120 / 180 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 2,77 |
| CAPEX indicativo, rota aterro (R$ mi) | 35,4–46,5 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 1.771 / 1.223 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

- Nenhuma no cadastro do repositório.

### Casa Branca (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 8 |
| População (hab) | 397.836 |
| RSU coletado (t/ano) | 119.319 |
| FORSU (t/ano) | 55.436 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 8.479 (56 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 16.019 (107 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 1.338 / 2.529 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 283 / 111 / 166 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 2,55 |
| CAPEX indicativo, rota aterro (R$ mi) | 32,7–42,9 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 6.627 / 6.604 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

| Planta | Município | Fonte | Situação | Distância (km) | Capacidade |
|---|---|---|---|---:|---|
| Biometano Verde Paulínia (OneBio) | Paulinia | ANP/levantamento | operating | 37 | 106.867 m³/d biometano |

### Sales Oliveira (A.P.)

| Item | Valor |
|---|---:|
| Municípios | 14 |
| População (hab) | 396.497 |
| RSU coletado (t/ano) | 111.912 |
| FORSU (t/ano) | 51.994 |
| CH₄, biodigestão da FORSU (Nm³/dia) | 7.952 (53 % da escala mínima) |
| CH₄ captado, aterro (Nm³/dia) | 15.025 (100 % da escala mínima) |
| Alternativa elétrica, potência média (kW): digestão / aterro | 1.255 / 2.372 |
| Nutriente novo no digestato (t/ano N / P₂O₅ / K₂O) | 265 / 104 / 156 |
| Valor do nutriente novo a preço de importação (R$ mi/ano) | 2,40 |
| CAPEX indicativo, rota aterro (R$ mi) | 30,6–40,2 |
| CP2b v5.1, RSU N3 / N4 (Nm³ CH₄/dia) | 3.538 / 3.389 |

Plantas de aterro ou FORSU nos municípios do bloco ou a até 50 km de um deles:

- Nenhuma no cadastro do repositório.

## Fora das bacias

Lista completa em `fora_das_bacias.csv`.

**Mais de um destino (não repartido):** Praia Grande → Mauá - A.P., Santos - A.P.; São Sebastião → Jambeiro - A.P., Santos - A.P.

**Dispõe fora de SP:** Andradina → Três Lagoas - MS; Aramina → Uberaba - MG; Arapeí → Barra Mansa - RJ; Bananal → Barra Mansa - RJ; Buritizal → Uberaba - MG; Ituverava → Uberaba - MG; Mirandópolis → Três Lagoas - MS; Ribeira → Rio Negrinho - SC

**Dispoe_em vazio na camada da CETESB:** 256 municípios. A camada traz o IQR deles, mas não o destino; o motivo não está nos metadados e o destino não é preenchido aqui.

## Limites

- O significado dos sufixos `A.P.` e `CDR` não está nos metadados; os destinos com sufixos diferentes ficam em bacias separadas.
- Quem dispõe em mais de um destino não é repartido: a camada não traz as toneladas por destino. Esses destinos recebem mais do que a bacia mostra (coluna `recebe_tambem_de_multiplos` em `bacias.csv`).
- Massa de RSU pela geração per capita do Atlas e população do master, como no C23, não pela pesagem no aterro.
- CP2b v5.1: CP2b v5.1, cenário med.

## Fontes

- [CETESB, IQR – Índice de Qualidade de Aterro de Resíduos 2022–2024, camadas VWM_IQR_CETESB_<ano>_POL (DataGeo; cópia e pedidos WFS em analysis/data/sources/cetesb/)](https://datageo.ambiente.sp.gov.br/)
- [CETESB, Inventário Estadual de Resíduos Sólidos Urbanos (publicações e relatórios)](https://cetesb.sp.gov.br/residuossolidos/residuos-solidos/residuos-urbanos-saude-construcao-civil/publicacoes-e-relatorios/)
