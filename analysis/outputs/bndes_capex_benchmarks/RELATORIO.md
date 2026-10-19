# Quanto custa um m³/dia de biometano no Brasil? (semente BNDES)

Gerado por `analysis/build_bndes_capex_benchmarks.py` a partir de `analysis/data/06_bndes_biomethane_deals_seed.csv` (uma fonte por linha). Estratégia 2027, rodada 2, C18.

Capital nivelado = CAPEX por m³/dia × fator de recuperação (20 anos) ÷ (365 × 90 % de fator de capacidade). Só capital: sem O&M, sem matéria-prima.

| Projeto | UF | Rota | Capacidade (m³/dia) | Base | CAPEX (R$ por m³/dia) | Capital nivelado a 10 % (R$/m³) | Capital nivelado a 12 % (R$/m³) |
|---|---|---|---:|---|---:|---:|---:|
| Onebio / Biometano Verde Paulínia (Edge + Orizon) | SP | aterro | 225.000 | só financiamento BNDES | 2.000 (mín.) | 0,72 | 0,82 |
| GNR Mauá (Lara + MDC Energia) + GNR Vila Velha (Lara + MDC Energia) | SP/ES | aterro | 97.000 | investimento total conjunto | 2.526 | 0,90 | 1,03 |
| Biometano São Leopoldo (Solví) | RS | aterro (purificação PSA de biogás já captado) | 36.744 | investimento total | 2.596 | 0,93 | 1,06 |
| Bioo Paraná | PR | agroindustrial (efluente + digestão + purificação; também CO2 e fertilizante) | 30.137 | investimento total | 6.504 | 2,33 | 2,65 |

## Leitura

1. **Os projetos de aterro custam cerca de R$ 2.526–2.596 por m³/dia**; o projeto agroindustrial, que inclui a digestão e não só a purificação, custa cerca de R$ 6.504 por m³/dia, 2 a 3 vezes mais. A rota define o CAPEX mais do que a escala nesta amostra.
2. **Só o capital de um projeto de aterro custa R$ 0,90–1,06 por m³ produzido.** O protótipo de troca de rota usa R$ 1,19/m³ para a purificação **inteira** (capital e operação), a partir de uma referência europeia. O dado brasileiro sugere que esse valor é **otimista**: com O&M, a purificação no Brasil deve ficar acima dele. Isso desloca para cima o atributo de equilíbrio da troca de rota.
3. **Cinco operações não são uma curva de custo.** São o começo dela. Cada nova aprovação do BNDES entra como uma linha do CSV, e o motor econômico (v1 §3.3) passa a ter uma curva brasileira com fonte.

## Limites

- O investimento dos projetos de aterro inclui o que cada um precisa (purificação, compressão, conexão); a captação do biogás pode já existir. Não é comparável a um projeto que começa do zero.
- O projeto agroindustrial também produz CO₂ biogênico e fertilizante, e o CAPEX inclui essas linhas.
- Taxa de capital, vida útil e fator de capacidade são premissas.
