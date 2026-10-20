# Troca de rota: eletricidade ou biometano?

Gerado por `analysis/build_sp_route_conversion.py`. Estratégia 2027, rodada 2 (C17).

Por Nm³ de CH₄: PCI 9,94 kWh e rendimento elétrico 38 % (os do script de cenários). Molécula de biometano R$ 2,25/m³; purificação R$ 1,19/m³ (referência europeia convertida). Preços de triagem em `mandato_biometano.yaml` (`troca_de_rota`), cada um com fonte.

## Atributo ambiental de equilíbrio

Quanto o atributo ambiental (CGOB ou equivalente) precisa valer para o biometano pagar o mesmo que a eletricidade:

| Preço da eletricidade (R$/MWh) | Rota elétrica (R$/m³ CH₄) | Atributo de equilíbrio (R$/m³) |
|---:|---:|---:|
| 185 | 0,70 | nenhum (já vence sem atributo) |
| 250 | 0,94 | nenhum (já vence sem atributo) |
| 300 | 1,13 | R$ 0,07 |
| 450 | 1,70 | R$ 0,64 |

## Vantagem do biometano, por m³ de CH₄ (R$)

| Eletricidade (R$/MWh) \ Atributo (R$/m³) | 0,00 | 0,50 | 1,00 | 1,40 |
|---:|---:|---:|---:|---:|
| 185 | 0,36 | 0,86 | 1,36 | 1,76 |
| 250 | 0,12 | 0,62 | 1,12 | 1,52 |
| 300 | -0,07 | 0,43 | 0,93 | 1,33 |
| 450 | -0,64 | -0,14 | 0,36 | 0,76 |

Aplicado ao biogás que SP já produz (CIBiogás, Panorama do Biogás 2025: 4,9 M Nm³/dia, meio da faixa de CH₄ = 1,07 bi Nm³ CH₄/ano), a diferença entre rotas vai de R$ -0,69 bi a R$ 1,89 bi por ano na grade acima.

## Leitura

1. **Com eletricidade abaixo de cerca de R$ 281/MWh, o biometano vence mesmo sem atributo ambiental.** O PLD SE/CO ficou na maior parte de abr–jul/2026 entre R$ 185 e 300/MWh, ou seja, em torno desse limiar: para a energia vendida ao mercado, a troca de rota já se paga ou fica perto disso.
2. **Quando a eletricidade é autoconsumida e vale perto da tarifa evitada, o atributo decide.** É o caso típico da usina, que usa o biogás para não comprar energia. Ali, o CGOB precisa valer algo como o atributo de equilíbrio da última linha da primeira tabela.
3. **Isso liga o mandato à troca de rota.** O patamar do mandato define a escassez e, com ela, o preço do CGOB; o preço do CGOB define quantas usinas trocam o motor-gerador pela purificação. O PILAR-2b pode mostrar essa curva por planta, com o biogás de cada uma (ANEEL SIGA, CIBiogás).

## Limites

- Não inclui o custo de conexão à rede (TUSD-Verde, gasoduto dedicado ou caminhão), que pode dominar para plantas longe da malha. O Mapa de Oportunidades (§3.2) é onde essa distância entra.
- Ignora o motor-gerador já pago (custo afundado) e o O&M dele; também ignora que a usina pode precisar comprar a energia que deixa de gerar, o que é exatamente o caso de preço de 450 R$/MWh.
- Molécula, atributo e purificação vêm de fonte única ou estrangeira. Conferir antes de citar.
