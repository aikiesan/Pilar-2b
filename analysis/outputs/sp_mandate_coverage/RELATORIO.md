# Mandato do biometano × oferta de SP

Gerado por `analysis/build_sp_mandate_coverage.py`. Estratégia 2027, C11 e C26.

Volumes oficiais lidos de `data/canonical_parameters/mandato_biometano.yaml` pelo `mandate_service` da plataforma (os mesmos do painel /mandate). Anos indicativos (≈) escalam o volume publicado mais recente pelo percentual.

Cada célula de oferta é o % do volume da meta que aquela oferta cobriria.

| Ano (redução GEE) | Biometano exigido (M m³/dia) | Brasil produz hoje (04/2026) | SP, biometano produzido | SP, capacidade autorizada ANP | SP, biogás hoje queimado (CH₄, meio da faixa) | SP, potencial CP2b N4 |
|---|---:|---:|---:|---:|---:|---:|
| 2026 (0,5 %, vigente) | 0,50 | 88 % | 23 % | 111 % | 582 % | 3241 % |
| 2027 (1 %, proposta) | 1,00 | 45 % | 12 % | 56 % | 295 % | 1644 % |
| 2028 (3 %, indicativa) | ≈ 2,99 | 15 % | 4 % | 19 % | 98 % | 548 % |
| 2029 (4 %, indicativa) | ≈ 3,98 | 11 % | 3 % | 14 % | 74 % | 411 % |
| 2030 (5 %, indicativa) | ≈ 4,98 | 9 % | 2 % | 11 % | 59 % | 329 % |

## Leitura

1. **A meta de 2026 (0,5 %) pede 0,50 M m³/dia.** O Brasil produz hoje 88 % disso, e SP sozinho 23 %. Para 2027 (1 %), a produção nacional atual cobre 45 %.
2. **O biogás que SP já queima para eletricidade cobriria 295 % da meta de 2027.** Converter a rota de projetos que já existem (purificação em vez de motor-gerador) é o caminho mais curto para o mandato; o PILAR-2b pode mapear essas plantas (ANEEL SIGA + CIBiogás) e estimar a receita de CGOB que a troca de rota destrava.
3. **O potencial N4 de SP cobriria 329 % da trajetória indicativa de 2030 (5 %).** O recurso não limita o mandato; a realização limita.
4. **A base oficial é mais larga que o mercado distribuído.** Pela conversão de intensidade (CI do biometano 8,55, do gás natural 66 gCO₂e/MJ), o volume de 2026 implica uma base de 87,88 M m³/dia de gás, 1,6 vezes os 54,40 M do consumo distribuído (Abegás, 2025), o que sugere um denominador com consumo térmico e de E&P.

## Limites

- A meta de 2027 está em consulta pública (Portaria MME 942/2026) e pode mudar; 2028–2030 são trajetória indicativa, sem volume publicado.
- Oferta de SP fixa no mês mais recente; a demanda de anos futuros cresce com o mercado.
- CI do gás natural assumido (conferir no RenovaCalc); só afeta a base implícita.
- Biometano tratado como CH₄; biogás queimado no meio da faixa de 55–65 % de CH₄.
- O mandato é nacional e o CGOB é negociável: SP não precisa cobrir a meta sozinho. A tabela mede peso relativo, não obrigação estadual.
