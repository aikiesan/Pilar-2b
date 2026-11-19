# Mapa de Oportunidades de SP: protótipo de localização de plantas

> Gerado por `analysis/build_sp_opportunity_sites.py`. Triagem, não estudo de viabilidade:
> raios de captação e tortuosidade são **suposições** declaradas no topo do script.

- Oferta considerada: 6.27 bi Nm³ CH₄/ano, os 8 fluxos do Cenário Real
  (Atlas-FDE) com dado municipal. Ficam de fora os fluxos que o script de cenários só tem como total estadual.
- Corte por planta: 15,000 Nm³ CH₄/dia.
- **265 locais** passam o corte e capturam **88 %** da oferta (15.06 M Nm³ CH₄/dia).
- Tamanho dos locais: mediana 38 mil, maior 594 mil Nm³/dia.
- Fluxo dominante por local: palha de cana 114, bovinos 74, vinhaça 70, RSU (FORSU) 6, aves 1.

## Os 15 maiores locais

| # | Município | CH₄ (mil Nm³/dia) | Municípios no raio | Fluxo dominante |
|---:|---|---:|---:|---|
| 1 | São Paulo | 594 | 31 | RSU (FORSU) (92 %) |
| 2 | Taquaral | 228 | 15 | palha de cana (95 %) |
| 3 | Morro Agudo | 212 | 7 | palha de cana (56 %) |
| 4 | Barra Bonita | 212 | 11 | palha de cana (90 %) |
| 5 | Barretos | 205 | 6 | palha de cana (48 %) |
| 6 | Sertãozinho | 197 | 10 | palha de cana (70 %) |
| 7 | Valparaíso | 188 | 7 | palha de cana (63 %) |
| 8 | Rancharia | 178 | 7 | palha de cana (47 %) |
| 9 | Guará | 167 | 10 | palha de cana (83 %) |
| 10 | São Carlos | 164 | 8 | palha de cana (59 %) |
| 11 | Potirendaba | 161 | 18 | palha de cana (71 %) |
| 12 | Guaíra | 158 | 2 | palha de cana (51 %) |
| 13 | Monte Mor | 158 | 20 | RSU (FORSU) (50 %) |
| 14 | Motuca | 156 | 9 | palha de cana (89 %) |
| 15 | José Bonifácio | 156 | 10 | palha de cana (58 %) |

## Validação contra as plantas ANP autorizadas em SP (04/2026)

O algoritmo não sabe onde estão as plantas existentes. A pergunta é se elas caem perto dos
locais que ele escolhe **mais do que um município qualquer cairia**.

| Operador | Município | Distância ao local mais próximo (todos) | Idem, só os 30 maiores |
|---|---|---:|---:|
| BIOMETANO VERDE PAULINIA S.A. | Paulínia | 24 km | 37 km |
| CRI GEO BIOGAS S.A. | Elias Fausto | 19 km | 19 km |
| METAGÁS BIOGÁS E ENERGIA S.A | São Paulo | 0 km | 0 km |
| COCAL ENERGIA PPT PARTICIPAÇÕES LTDA | Paraguaçu Paulista | 0 km | 48 km |
| RAÍZEN-GEO BIOGÁS COSTA PINTO LTDA. | Piracicaba | 0 km | 0 km |
| COCAL ENERGIA S.A. | Narandiba | 0 km | 71 km |
| ESSENCIS BIOMETANO S.A. | Caieiras | 42 km | 42 km |
| ENGEP AMBIENTAL LTDA | Jambeiro | 30 km | 135 km |
| BIOENERGIA SANTA CRUZ LTDA. | Américo Brasiliense | 19 km | 35 km |

| Conjunto de locais | Plantas a ≤ 30 km | Linha de base: município qualquer a ≤ 30 km |
|---|---:|---:|
| Todos os 265 | 7/9 (78 %) | 81 % |
| Os 30 maiores | 3/9 (33 %) | 21 % |

Com todos os locais, o estado fica quase todo coberto e o acerto não discrimina nada.
O teste que importa é o dos 30 maiores: com 9 plantas a amostra é pequena,
então isso é indício, não validação.

## Limites

- O candidato é o centróide do município, não um terreno. A versão completa usa a grade H3
  e exclui áreas restritas (estratégia §3.2).
- A distância é em linha reta × 1,3, não por malha viária.
- Vinhaça e torta são atribuídas ao município, não à usina. O cadastro de usinas
  (UNICA/ANP) deve substituir isso.
- Não há custo nem receita: o corte é de volume. O motor tecno-econômico (§3.3) entra depois.
- Aterros que já captam gás não são descontados; o RSU aparece como oferta nova.
