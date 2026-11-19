# C16 — Participação de SP no Brasil × leitura do mapa BioGRAM

Teste de cima para baixo da leitura do mapa: BioGRAM 1.2 Brasil (67.19 bcme/ano) × participação de SP na produção agrícola, no rebanho e na população de 2023 (IBGE). Se o produto cai onde o polígono desenhado cai, a diferença com o PILAR não é efeito do polígono.

## Por aba do mapa (bcme/ano)

| Aba | Esperado pela participação | Mapa reescalado à área de SP | Posição | Mapa bruto (polígono inteiro) | Posição | PILAR N3 | Esperado ÷ N3 |
|---|---:|---:|---|---:|---|---:|---:|
| Crop residues | 7.43–8.30 | 6.97 | -6% abaixo da faixa | 8.46 | +2% acima da faixa | 4.35 | 1.7–1.9× |
| Manure | 1.02–1.18 | 1.13 | dentro da faixa | 1.37 | +16% acima da faixa | 0.55 | 1.8–2.1× |
| Biowaste | 1.54 | 1.21 | -21% abaixo da faixa | 1.47 | -4% abaixo da faixa | 0.24 | 6.5× |
| Total | 9.98–11.02 | 9.32 | -7% abaixo da faixa | 11.33 | +3% acima da faixa | 5.15 | 1.9–2.1× |

SP fica com 14.9%–16.4% do potencial brasileiro pelo cálculo de participação; o mapa dá 13.9 % reescalado e 16.9 % bruto.

## Por grupo do BioGRAM

| Grupo | Brasil (bcme/ano) | Participação de SP | SP esperado (bcme/ano) | Método |
|---|---:|---:|---:|---|
| Sugar crops | 10.83 | 56.2% | 6.08 | exata (tonelagem, todas as culturas) |
| Cereals and grains | 8.84 | 3.7% | 0.33 | exata (tonelagem, todas as culturas) |
| Oil and protein | 16.29 | 3.8% | 0.62 | exata (tonelagem, todas as culturas) |
| Roots and tubers | 0.40 | 10.9% | 0.04 | exata (tonelagem, todas as culturas) |
| Other crops | 3.50 | 10.0%–35.0% | 0.35–1.22 | suposição (mistura de culturas, fatores IEA desconhecidos) |
| Manure | 20.79 | 4.9%–5.7% | 1.02–1.18 | rebanhos ponderados (bovinos 4.5% exata; suinos 3.7% exata; aves 12.8% exata) |
| Municipal solid waste | 6.34 | 23.1% | 1.47 | exata (SINISA 2023, RSU coletado (soma municipal); população 21.9%) |
| Wastewater | 0.20 | 35.6% | 0.07 | exata (SINISA 2023, esgoto tratado (soma municipal); população 21.9%) |

## Como ler

- Mapa reescalado: valor do polígono × (área de SP ÷ área desenhada), o mesmo da reconciliação. Supõe densidade uniforme; como a borda desenhada pega vizinhos menos densos (MS, PR, sul de MG), tende a subestimar. O valor bruto do polígono inteiro tende a superestimar. SP fica entre os dois.
- 1 bcme = 1.0060 bi Nm³ de CH4 no PCI do PILAR (9.94 kWh/Nm³; a IEA usa 36 MJ/Nm³).
- Participação por tonelagem, cabeças e população. O BioGRAM pesa as culturas por fator de resíduo, então a faixa é uma régua de coerência, não um recálculo do modelo.
- Dejetos: pesos bovinos 75–90 %, suínos 5–10 %, aves 5–15 % do metano de dejetos do Brasil são estimativa nossa (sólidos voláteis × B0, mesma recuperação de 65 %). Com os três rebanhos exatos, a faixa que resta em dejetos vem só desses pesos.

## Limites e próximos dados

- Todos os totais nacionais do seed estão preenchidos.
- "Other crops" segue como suposição: mistura café, laranja, algodão, forrageiras e hortaliças com fatores que a nota metodológica não detalha por cultura.
- RSU e esgoto: soma dos municípios que declararam ao SINISA; SP declara em proporção maior que o Brasil, o que puxa a participação para cima. O BioGRAM usa What a Waste 3.0 e HydroWASTE, não SINISA; a participação de SP é a régua, não o volume.
