# C16 — Participação de SP no Brasil × leitura do mapa BioGRAM

Teste de cima para baixo da leitura do mapa: BioGRAM 1.2 Brasil (67.19 bcme/ano) × participação de SP na produção agrícola, no rebanho e na população de 2023 (IBGE). Se o produto cai onde o polígono desenhado cai, a diferença com o PILAR não é efeito do polígono.

## Por aba do mapa (bcme/ano)

| Aba | Esperado pela participação | Mapa reescalado à área de SP | Posição | Mapa bruto (polígono inteiro) | Posição | PILAR N3 | Esperado ÷ N3 |
|---|---:|---:|---|---:|---|---:|---:|
| Crop residues | 7.31–8.39 | 6.97 | -5% abaixo da faixa | 8.46 | +1% acima da faixa | 4.35 | 1.7–1.9× |
| Manure | 1.00–1.46 | 1.13 | dentro da faixa | 1.37 | dentro da faixa | 0.55 | 1.8–2.6× |
| Biowaste | 1.43–1.67 | 1.21 | -15% abaixo da faixa | 1.47 | dentro da faixa | 0.24 | 6.0–7.1× |
| Total | 9.74–11.53 | 9.32 | -4% abaixo da faixa | 11.33 | dentro da faixa | 5.15 | 1.9–2.2× |

SP fica com 14.5%–17.2% do potencial brasileiro pelo cálculo de participação; o mapa dá 13.9 % reescalado e 16.9 % bruto.

## Por grupo do BioGRAM

| Grupo | Brasil (bcme/ano) | Participação de SP | SP esperado (bcme/ano) | Método |
|---|---:|---:|---:|---|
| Sugar crops | 10.83 | 56.2% | 6.08 | exata (tonelagem, todas as culturas) |
| Cereals and grains | 8.84 | 3.7%–4.4% | 0.32–0.39 | faixa: só a cultura principal / cota superior (falta Brasil: Arroz_em_casca, Trigo_em_grão, Sorgo_em_grão) |
| Oil and protein | 16.29 | 3.3%–3.9% | 0.53–0.64 | faixa: só a cultura principal / cota superior (falta Brasil: Amendoim_em_casca, Feijão_em_grão) |
| Roots and tubers | 0.40 | 5.0%–15.0% | 0.02–0.06 | suposição (sem total nacional no repo) |
| Other crops | 3.50 | 10.0%–35.0% | 0.35–1.22 | suposição (mistura de culturas, fatores IEA desconhecidos) |
| Manure | 20.79 | 4.8%–7.0% | 1.00–1.46 | rebanhos ponderados (bovinos 4.5% exata; suinos 3.0%–5.0% suposição; aves 12.0%–20.9% suposição; teto = participação em galinhas poedeiras) |
| Municipal solid waste | 6.34 | 21.9%–25.1% | 1.39–1.59 | população (21.9%) até +15% per capita |
| Wastewater | 0.20 | 21.9%–40.0% | 0.04–0.08 | população (21.9%) até 40% (volume tratado) |

## Como ler

- Mapa reescalado: valor do polígono × (área de SP ÷ área desenhada), o mesmo da reconciliação. Supõe densidade uniforme; como a borda desenhada pega vizinhos menos densos (MS, PR, sul de MG), tende a subestimar. O valor bruto do polígono inteiro tende a superestimar. SP fica entre os dois.
- 1 bcme = 1.0060 bi Nm³ de CH4 no PCI do PILAR (9.94 kWh/Nm³; a IEA usa 36 MJ/Nm³).
- Participação por tonelagem, cabeças e população. O BioGRAM pesa as culturas por fator de resíduo, então a faixa é uma régua de coerência, não um recálculo do modelo.
- Dejetos: pesos bovinos 75–90 %, suínos 5–10 %, aves 5–15 % do metano de dejetos do Brasil são estimativa nossa (sólidos voláteis × B0, mesma recuperação de 65 %).

## Limites e próximos dados

- Faltam totais nacionais 2023 em `analysis/data/08_brasil_totais_2023_seed.csv`: arroz, trigo, sorgo, amendoim, feijao, mandioca, batata_doce, batata_inglesa, suino_total, galinaceos_total. Preenchidos, as faixas de cereais, oleaginosas, raízes e dejetos viram participação exata.
- "Other crops" segue como suposição: mistura café, laranja, algodão, forrageiras e hortaliças com fatores que a nota metodológica não detalha por cultura.
- RSU e esgoto por população; o BioGRAM usa What a Waste 3.0 e HydroWASTE, não SNIS.
