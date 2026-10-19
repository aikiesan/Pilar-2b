# Mandato do biometano × oferta de SP

Gerado por `analysis/build_sp_mandate_coverage.py`. Estratégia 2027, C11 (cenários de política).

Base: consumo nacional de gás natural de 54,40 M m³/dia (Abegás, 2025). Conversão de meta de GEE para volume com CI do biometano 8,55 e do gás natural 66 gCO₂e/MJ (este último assumido; conferir).

Cada célula de oferta é o % da demanda do mandato que aquela oferta cobriria.

| Meta (redução GEE) | Biometano exigido (M m³/dia) | Brasil produz hoje (04/2026) | SP, biometano produzido | SP, capacidade autorizada ANP | SP, biogás hoje queimado (CH₄, meio da faixa) | SP, potencial CP2b N4 |
|---|---|---:|---:|---:|---:|---:|
| 0,5 % (meta de 2026, CNPE Res. 4/2026) | 0,31 | 142 % | 38 % | 178 % | 941 % | 5236 % |
| 1 % (patamar inicial da Lei 14.993/2024) | 0,62 | 71 % | 19 % | 89 % | 470 % | 2618 % |
| 2 % | 1,25 | 35 % | 9 % | 45 % | 235 % | 1309 % |
| 5 % | 3,12 | 14 % | 4 % | 18 % | 94 % | 524 % |
| 10 % | 6,25 | 7 % | 2 % | 9 % | 47 % | 262 % |

## Leitura

1. **A meta de 2026 (0,5 %) pede cerca de 0,31 M m³/dia.** O Brasil produz hoje 142 % disso, e SP sozinho 38 %. É coerente com o CNPE ter baixado a meta: com 1 %, a produção nacional atual cobriria 71 %.
2. **O biogás que SP já queima para eletricidade cobriria 470 % da meta de 1 %.** Converter a rota de projetos que já existem (purificação em vez de motor-gerador) é o caminho mais curto para o mandato; o PILAR-2b pode mapear essas plantas (ANEEL SIGA + CIBiogás) e estimar a receita de CGOB que a troca de rota destrava.
3. **O potencial N4 de SP cobriria 262 % de uma meta de 10 %.** O recurso não limita o mandato em nenhum patamar discutido; a realização limita.

## Limites

- Base nacional de consumo de 2025 mantida fixa; a demanda futura cresce com o mercado.
- A base de cálculo do mandato (que volumes de gás entram no denominador) é definida pela ANP; se incluir consumo térmico e de E&P além do mercado distribuído, a demanda em m³ sobe na mesma proporção.
- CI do gás natural assumido. Uma CI menor aumenta o volume exigido por ponto de meta.
- Biometano tratado como CH₄; biogás queimado no meio da faixa de 55–65 % de CH₄.
- O mandato é nacional e o CGOB é negociável: SP não precisa cobrir a meta sozinho. A tabela mede peso relativo, não obrigação estadual.
