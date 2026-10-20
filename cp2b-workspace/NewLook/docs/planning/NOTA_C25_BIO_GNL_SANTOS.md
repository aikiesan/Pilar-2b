# Nota C25: bio-GNL de SP para navios em Santos

Estratégia 2027, rodada 2, ideia C25 (especulativa). Uma página, para decidir se o
tema merece trabalho de produto. Números de
[`analysis/build_sp_biolng_santos.py`](../../../../analysis/build_sp_biolng_santos.py)
(relatório em `analysis/outputs/sp_biolng_santos/RELATORIO.md`). Tudo é triagem:
conferir antes de citar.

## Pergunta

O FuelEU Maritime (Reg. UE 2023/1805, em vigor desde jan/2025) obriga os navios que
tocam portos europeus a reduzir a intensidade de GEE da energia a bordo: −2 % sobre
91,16 gCO₂e/MJ em 2025, −6 % em 2030, −80 % em 2050. Navios a GNL já escalam em
Santos (o primeiro porta-contêineres a GNL chegou em jan/2024), e em jul/2026 o
porto fez o primeiro abastecimento de etanol num porta-contêineres. Faz sentido o
biometano paulista virar bio-GNL para esses navios?

## Resposta curta

**Ainda não.** A oferta perto do porto existe e o valor do atributo seria maior que
o do mercado interno. O que impede é a certificação: hoje o bio-GNL de Santos não
conta no FuelEU. O PILAR-2b não deve investir em produto para isso agora. Vale
acompanhar três gatilhos (abaixo).

## Números

| | |
|---|---|
| **Oferta a 100 km** (linha reta) | 845 mil m³/dia de CH₄ no Atlas Real, 78 % de RSU, ou seja, gás de aterro da Grande SP. Plantas da ANP: 3 (Metagás, Essencis Caieiras, ZEG Jambeiro), 127 mil m³/dia de capacidade e cerca de 65 mil m³/dia produzidos hoje |
| **Escala** | 1 t de GNL ≈ 1.500 m³ de CH₄. Uma liquefação pequena de 25 t/dia pede 37 mil m³/dia; só a Essencis Caieiras, com capacidade cheia, dá cerca de 45 t/dia. A única referência brasileira encontrada: Golar Power, 45 t/dia em duas unidades (2020; sem confirmação de construção) |
| **Valor do atributo no FuelEU** | R$ 2,6–4,8/m³ de CH₄ para navio que abastece em Santos e vai à Europa (só metade da energia da viagem conta), com bio-GNL de 20 gCO₂e/MJ e o excedente vendido em *pool* (€ 1.300–2.300 por t de VLSFO equivalente) ou abatido da penalidade (€ 2.400). Usado dentro da UE, o dobro |
| **Valor no Brasil** | Molécula R$ 2,25 mais atributo do Mercado Cativo Verde R$ 1,40, ou seja, R$ 3,65/m³ (painel do mandato) |

A diferença (cerca de R$ 1–3/m³ a mais no atributo) teria de pagar a liquefação, o
caminhão pela Serra do Mar, a certificação e o abastecimento por barcaça. Nenhum
desses custos está no PILAR-2b.

## Por que "ainda não"

1. **Certificação.** O FuelEU só aceita biocombustível com prova de
   sustentabilidade registrada na Union Database (UDB). A Comissão sinalizou que
   não reconhece biometano que passa por rede de gás fora da UE (balanço de massa),
   e em set/2025 nem o RNG americano com ISCC era aceito. A UDB para gases continua
   atrasada em 2026, sem decisão para terceiros países.
2. **O mercado interno disputa o mesmo gás.** SP queima cerca de 2,9 milhões de m³/dia
   de metano; a meta nacional de 2027 pede 1,0 milhão. Cada m³ exportado sai da
   cobertura do mandato.
3. **Não achamos oferta de bunker de GNL em Santos.** Os navios a GNL já escalam,
   mas a busca não encontrou abastecimento de GNL no porto (conferir com a APS).

## Lista de verificação (se os gatilhos acontecerem)

- [ ] Matéria-prima elegível pela diretiva RED (resíduos do Anexo IX: FORSU, lodo, dejetos), com rastreio desde a origem
- [ ] Certificação da cadeia inteira (planta, liquefação, transporte, fornecedor do bunker) por esquema reconhecido pela Comissão (ISCC EU ou equivalente)
- [ ] Cadeia física: liquefação na própria planta e caminhão até o porto, sem passar pela rede da Comgás
- [ ] Registro na UDB e prova de sustentabilidade (PoS) acompanhando a nota de entrega do bunker
- [ ] Intensidade de GEE calculada pela metodologia RED, com redução mínima (65 % para instalações a partir de 2021: conferir) e o *slip* do motor (padrões do Reg. 2023/1805: 3,1 % para Otto de média rotação, 1,7 % para lenta; ou valor medido)
- [ ] Autorização da ANP para liquefação e para a venda do GNL (conferir qual resolução se aplica)
- [ ] Nada de CBIO nem CGOB sobre o volume exportado: vender o atributo no Brasil e na UE seria dupla contagem (C27). Conferir a regra do RenovaBio para exportação

## Gatilhos para reabrir

1. A Comissão abrir a UDB a gás renovável de terceiros países, ao menos com cadeia física.
2. Um fornecedor oferecer GNL (fóssil ou bio) para navios em Santos.
3. Um projeto de liquefação de biometano a até cerca de 100 km do porto.

Quando um deles acontecer, rodar o protótipo de novo. O que o PILAR-2b já tem serve
de base: oferta por raio, plantas da ANP, mandato e pilha de receitas.

## Fontes

- FuelEU: metas ([Gard](https://gard.no/articles/getting-ready-for-fueleu-maritime/), [Sustainable Ships](https://sustainable-ships.org/tools/fueleu)); 50 % nas viagens de e para fora da UE ([Manifold Times](https://www.manifoldtimes.com/news/cti-maritec-fueleu-maritime-regulation-effective-1-january-2025/)); penalidade ([DNV](https://www.dnv.com/maritime/insights/topics/fueleu-maritime/compliance/)); preço de *pool* ([OceanScore via Maritime Executive](https://maritime-executive.com/corporate/fueleu-offers-business-opportunity-with-pooling-of-compliance-surpluses)); *slip* ([ABS](https://ww2.eagle.org/content/dam/eagle/regulatory-news/2025/RN%20-%20European%20Commission%20Guidelines%20-%20Actual%20Methane%20Slip%20Factors%20-%2019Dec.pdf))
- UDB e terceiros países: [Marine Log](https://www.marinelog.com/news/ecs-union-database-plan-could-limit-biofuel-availability-to-ships/), [Argus](https://www.argusmedia.com/en/news-and-insights/latest-market-news/2731821-us-bio-lng-bunkers-wait-fueleu-recognition-panel), [Eurogas](https://www.eurogas.org/resource/eurogas-45-other-organisations-call-for-urgent-action-allowing-imports-of-biomethane-and-biomethane-based-fuels-under-the-udb/), [Dentons (abr/2026)](https://www.dentons.com/en/insights/newsletters/2026/april/1/future-of-energy-markets-europe/challenges-affecting-the-development-of-a-pan-eu-biomethane-market)
- Santos: [DP World, navio a GNL](https://www.dpworld.com/pt-br/news/brazil/dp-world-brasil-recebe-primeiro-navio-movido-a-gnl); [Ship & Bunker, etanol](https://shipandbunker.com/news/am/659387-bunker-one-supplies-latin-americas-first-bioethanol-to-cma-cgm-boxship)
- Liquefação: [Energy Intelligence, Golar Power](https://www.energyintel.com/0000017b-a7db-de4c-a17b-e7db087d0000)
- Preços brasileiros, metas e biogás de SP: `data/canonical_parameters/mandato_biometano.yaml` (fontes por linha)
