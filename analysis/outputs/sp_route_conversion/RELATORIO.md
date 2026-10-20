# Troca de rota: eletricidade ou biometano?

Gerado por `analysis/build_sp_route_conversion.py`. Estratégia 2027, rodada 2 (C17).

Por Nm³ de CH₄: PCI 9,94 kWh e rendimento elétrico 38 % (os do script de cenários). Molécula R$ 2,63/m³ (custo do gás natural da Comgás, o que o biometano substitui); purificação R$ 1,44/m³ (referência europeia convertida). Preços de triagem em `mandato_biometano.yaml` (`troca_de_rota`), cada um com fonte.

## Atributo ambiental de equilíbrio

Quanto o atributo ambiental (CGOB ou equivalente) precisa valer para o biometano pagar o mesmo que a eletricidade:

| Preço da eletricidade (R$/MWh) | Rota elétrica (R$/m³ CH₄) | Atributo de equilíbrio (R$/m³) |
|---:|---:|---:|
| 135 | 0,51 | nenhum (já vence sem atributo) |
| 190 | 0,72 | nenhum (já vence sem atributo) |
| 225 | 0,85 | nenhum (já vence sem atributo) |
| 450 | 1,70 | R$ 0,51 |

## Vantagem do biometano, por m³ de CH₄ (R$)

| Eletricidade (R$/MWh) \ Atributo (R$/m³) | 0,00 | 0,50 | 1,00 |
|---:|---:|---:|---:|
| 135 | 0,68 | 1,18 | 1,68 |
| 190 | 0,47 | 0,97 | 1,47 |
| 225 | 0,34 | 0,84 | 1,34 |
| 450 | -0,51 | -0,01 | 0,49 |

Aplicado ao biogás que SP já produz (CIBiogás: 4,9 M Nm³/dia, meio da faixa de CH₄ = 1,07 bi Nm³ CH₄/ano), a diferença entre rotas vai de R$ -0,55 bi a R$ 1,80 bi por ano na grade acima.

## Leitura

1. **Com eletricidade abaixo de cerca de R$ 315/MWh, o biometano vence mesmo sem atributo ambiental.** O PLD SE/CO ficou em abr–jul/2026 entre cerca de R$ 135 e 225/MWh (boletins da CCEE), abaixo desse limiar: para a energia vendida ao mercado, a troca de rota já se paga.
2. **Quando a eletricidade é autoconsumida e vale perto da tarifa evitada, o atributo decide.** É o caso típico da usina, que usa o biogás para não comprar energia. Ali, o CGOB precisa valer algo como o atributo de equilíbrio da última linha da primeira tabela.
3. **Isso liga o mandato à troca de rota.** O patamar do mandato define a escassez e, com ela, o preço do CGOB; o preço do CGOB define quantas usinas trocam o motor-gerador pela purificação. O PILAR-2b pode mostrar essa curva por planta, com o biogás de cada uma (ANEEL SIGA, CIBiogás).

## Limites

- Não inclui o custo de conexão à rede (TUSD-Verde, gasoduto dedicado ou caminhão), que pode dominar para plantas longe da malha. O Mapa de Oportunidades (§3.2) é onde essa distância entra.
- Ignora o motor-gerador já pago (custo afundado) e o O&M dele; também ignora que a usina pode precisar comprar a energia que deixa de gerar, o que é exatamente o caso de preço de 450 R$/MWh.
- Molécula = custo do gás natural da Comgás (o que o biometano substitui), não preço de biometano; atributo = piso pedido para o CGOB, sem preço público; purificação = referência europeia. Fontes por número em `fontes` do YAML; conferir antes de citar.
