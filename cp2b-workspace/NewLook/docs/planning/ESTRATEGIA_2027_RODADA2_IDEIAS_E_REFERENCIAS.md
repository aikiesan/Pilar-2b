# Estratégia 2027, rodada 2: o que mudou, quem mais faz isso, e 12 ideias novas

**Data:** 2026-10-19
**Complementa:** [`ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md`](ESTRATEGIA_2027_LIDERANCA_BIOECONOMIA.md) (a "v1"). Este documento não repete a v1; aponta onde cada item a altera.
**Protótipos citados:** em `analysis/build_sp_*.py`, com saídas em `analysis/outputs/sp_*/` e testes em `tests/test_sp_*.py`.

---

## 0. Resumo

1. **Apareceu um concorrente global de peso.** O mapa BioGRAM da IEA (jul/2026) estima potencial de biogás por área desenhada, com curva de custo e proximidade a gasoduto. O PILAR-2b não ganha em cobertura; ganha em **resolução municipal, parâmetros brasileiros auditáveis e ligação com a regulação** (CGOB, mandato, TUSD-Verde). A primeira ação é publicar uma **reconciliação BioGRAM × PILAR para SP** (C16).
2. **A pergunta de 2026 deixou de ser "onde há potencial" e passou a ser "por que ele não vira biometano".** SP já queima cerca de 4,9 M Nm³/dia de biogás, a maior parte para eletricidade. O protótipo de **troca de rota** (C17) mostra que, com eletricidade abaixo de cerca de R$ 214/MWh, o biometano já paga mais por m³ de CH₄ mesmo sem atributo ambiental (molécula do Mercado Cativo Verde). Quando a energia é autoconsumida, o CGOB decide.
3. **O dinheiro público já está em movimento e é dado aberto.** O BNDES aprovou em 2025–2026 várias plantas de biometano com 70–80 % de Fundo Clima. Cada operação traz valor e capacidade, o que dá o **benchmark de CAPEX brasileiro** que falta ao motor econômico da v1 (§3.3). Ver C18.
4. **O satélite agora vê aterros paulistas.** Carbon Mapper e EMIT detectaram plumas em aterros de SP e RJ, e o MMA anunciou na COP30 um plano nacional para super-emissores do setor de resíduos. O PILAR-2b pode ser a camada que transforma pluma em projeto (C19).

---

## 1. O que mudou desde a v1 (fatos de 2026)

| Fato | Fonte | O que muda na v1 |
|---|---|---|
| Meta do mandato de 2026 fixada em **0,5 %**, abaixo do 1 % da lei, com uma Mesa de Monitoramento para retomar 1 % | Res. CNPE 4/2026 (Lefosse; eixos) | §0 e C11. Protótipo `build_sp_mandate_coverage.py` já incorporado. |
| Comgás fez a primeira **chamada pública de interconexão de biometano** (fev–mar/2026): 5 propostas, 3 proponentes, **126,5 mil m³/dia ofertados** | Edital Comgás 2026; eixos | §3.6: a chamada é o primeiro dado público de **oferta disposta a entrar na rede** em SP. Acompanhar o volume contratado. |
| Arsesp autorizou o **Mercado Cativo Verde** (set/2026): a Comgás vende biometano a clientes cativos, com atributo ambiental destinado ao cliente | Agência iNFRA; eixos | Abre **demanda** nova (indústria, cogeração, mobilidade) sem migrar para o mercado livre. Ver C21. |
| Tarifa do Cativo Verde: molécula R$ 2,25/m³ e atributo R$ 1,40/m³, sem PIS/Cofins; R$ 4,009694/m³ com PIS/Cofins. **Confirmado na fonte primária** em 20/10/2026 (Del. Arsesp 1.846/2026, art. 1º, IV e § 2º; em vigor desde 10/09/2026). Entre a manhã e a noite de 20/10 o painel usou o custo do gás natural (R$ 2,63) e o piso pedido para o CGOB (R$ 1,00), enquanto os valores só apareciam sem fonte | [Del. Arsesp 1.846/2026](https://www.comgas.com.br/media/ctfk1j4p/deliberacao_1846.pdf); [Comgás, tarifas](https://www.comgas.com.br/sobre-sua-conta/tarifas/); [Agência iNFRA](https://agenciainfra.com/blog/comgas-obtem-aval-para-vender-biometano-no-mercado-cativo-verde/) | O CGOB ainda não tem preço; acompanhar a primeira emissão (B3). |
| BNDES: Bioo (Toledo, PR), R$ 148,5 mi; São Leopoldo (RS), R$ 76,4 mi; dois aterros (SP e ES), R$ 180,7 mi; Onebio/BVP (Paulínia, SP), cerca de R$ 450 mi. **Fundo Clima cobre 70–80 %** | Cenário Energia; Agência iNFRA; eixos | §3.3: fonte de CAPEX real. Ver C18. |
| Caieiras: planta de biometano de **68 mil m³/dia** apoiada pelo BNDES; Bandeirantes comprado pela Thopen (Denham Capital) | BNDES; Capital Aberto | C12 (aterros): os dois maiores aterros da RMSP já têm dono e rota. O espaço está nos aterros médios do interior. |
| Governo de SP projeta **1 M m³/dia de capacidade** de biometano em 2026 e diz ter 9 das 19 plantas em operação no país | SEMIL (mai/2026) | O registro ANP que o repositório usa dá **558 mil m³/dia autorizados** em 04/2026. A diferença é o que o IRM existe para acompanhar; conferir se Paulínia já entrou no registro. |
| Carbon Mapper: quatro aterros em SP e RJ somam cerca de **7 % do metano de resíduos sólidos** do inventário nacional; plumas do EMIT sobre Caieiras | Carbon Mapper; Frontiers in Earth Science 2025 | §4.3: deixa de ser "quando públicos". Ver C19. |
| CBIO caiu cerca de **43 %**, para **R$ 31,40** (média jan–fev/2026), por excesso de oferta | Novacana (fonte única; conferir na B3) | §3.3: o CBIO não sustenta projeto sozinho; o CGOB é o atributo que importa. |
| CO₂ biogênico virou produto: unidade de liquefação da Gás Verde (Seropédica, RJ) com BNDES; Be8 + Air Liquide (RS) | eixos; BNDES | Nova linha de receita. Ver C20. |
| Medição dinamarquesa em 60 plantas: **perda de metano de 2,5 %** na produção; teto regulatório de **1 %** na purificação desde 2023 | Danish Energy Agency, via gasworld e IEA Task 37 | §3.4 (GEE): o módulo de carbono precisa de um termo de vazamento. Ver C22. |
| Programa estadual **Integra Resíduos**: PPPs regionais de resíduos, primeiras licitações previstas para 2026 (Ceriso, Grande ABC) | ABC do ABC; SEMIL | Janela concreta para o cartão de pré-viabilidade (C2). Ver C23. |
| Corredor verde TransJordano: **100 caminhões a biometano** e postos em Sumaré, Cubatão e Ribeirão Preto (BNDES, R$ 140 mi); Iconic com cerca de 28 % das viagens SP–RJ a biometano | Agência iNFRA; eixos | §3.6: os corredores deixaram de ser hipótese. Ver C24. |
| FuelEU Maritime (desde jan/2025) puxa demanda europeia de bio-GNL certificado | Argus; eixos | Possível rota de exportação via Santos. Ver C25 (especulativa). |

---

## 2. Quem mais faz isso (benchmark)

| Ferramenta | O que faz bem | O que não faz | O que o PILAR-2b copia | Onde o PILAR-2b se diferencia |
|---|---|---|---|---|
| **IEA BioGRAM** (jul/2026) | Potencial global por área desenhada; mais de 40 matérias-primas; curva de custo; proximidade a gasoduto e estrada; só matérias-primas sem competição com alimento | Sem resíduo florestal; dados agregados globais (OECD-FAO, What a Waste 3.0); sem parâmetros locais auditáveis | **Curva de custo de suprimento** como saída padrão; desenhar uma área e receber o potencial | Resolução municipal com PAM/PPM e SNIS; parâmetros do corpus brasileiro com fonte; registro de números oficiais; ligação com CGOB e mandato |
| **European Biomethane Map** (GIE/EBA) | Inventário de plantas por país, atualizado anualmente; virou referência de imprensa | Não estima potencial | A **cadência anual com lançamento público** (a v1 já propõe isso para o IPMB, C5) | Potencial e realização no mesmo mapa (IRM) |
| **DataSebrae Biogás** (Sebrae + GEF Biogás Brasil) | Plantas do Brasil, potencial por região, biblioteca de legislação, conversor de energia | Lançado em 2020; não está claro se é mantido; sem incerteza nem auditoria | A **biblioteca regulatória** como aba do produto | Metodologia aberta e versionada; incerteza; dado municipal |
| **BiogasMap** (CIBiogás) | O cadastro de plantas mais usado no Brasil | Cadastro, não modelo | Fonte de validação (já prevista em `validation_plants`) | Parceria natural: CIBiogás dá as plantas, PILAR dá o potencial (C15 da v1) |
| **EPA AD Screening Tool, LMOP, AgSTAR** (EUA) | Pré-viabilidade por planta; base de aterros com status de captura | Calculadora isolada, sem mapa de oferta | **Base de aterros com status de captura** (o LMOP é o modelo para C12) | Integração com oferta espacial |
| **SEEG Municípios** | Emissões de todos os 5.570 municípios, série de 20 anos | Setores agregados; não identifica a fonte de metano capturável | Camada de emissões municipais (já prevista na §3.4) | "% do metano municipal que o biogás abateria" |

**Conclusão estratégica.** O PILAR-2b não deve tentar ser o BioGRAM brasileiro. Deve ser **a camada de evidência auditável que o regulador, o financiador e o comprador de CGOB usam em SP**, e que explica onde e por que diverge do BioGRAM. Concordar com a IEA não vira notícia; explicar onde e por que diverge, com fonte, vira.

---

## 3. Doze ideias novas (C16–C27)

Esforço: P (semanas), M (1–3 meses), G (trimestre ou mais).

| # | Ideia | Como funciona | Por que agora | Esforço |
|---|---|---|---|---|
| C16 | **Reconciliação BioGRAM × PILAR (SP)** | Desenhar no BioGRAM as mesmas áreas (estado, regiões intermediárias, os 30 sítios do Mapa de Oportunidades) e comparar por matéria-prima. Publicar a tabela de diferenças com a causa de cada uma (parâmetro, disponibilidade, escopo). | O BioGRAM vai ser citado em todo relatório de 2027. Quem tiver a reconciliação define o debate em SP. | P |
| C17 | **Troca de rota: eletricidade → biometano** (*protótipo feito*) | Por planta existente: biogás atual, receita como eletricidade, receita como biometano mais atributo, custo de purificação. Saída: o **atributo de equilíbrio** por planta e a curva estadual "quantos m³/dia trocam de rota a cada R$ de CGOB". | SP queima 23 a 27 vezes mais metano do que injeta como biometano. É o caminho mais curto para o mandato. | M |
| C18 | **Observatório do financiamento** | Ingerir as operações aprovadas do BNDES (dados abertos de operações, mais as notas de imprensa) com valor, Fundo Clima vs. Finem, capacidade e rota. Derivar **R$ por m³/dia de capacidade** por rota e escala. | Resolve a maior lacuna de dados do motor econômico (§3.3) com dado brasileiro e público. Também mostra onde o dinheiro está indo e onde não está. | P |
| C19 | **"Metano visto do espaço, não capturado"** | Sobrepor as plumas públicas de Carbon Mapper e EMIT, mais as inversões do TROPOMI, aos aterros e confinamentos do PILAR-2b. Cada pluma recebe a capacidade de captura estimada, o dono, se há projeto e o caminho de financiamento. | O MMA, a CATF e a Carbon Mapper montam um plano nacional para super-emissores de resíduos. O plano precisa de uma lista de projetos, e não só de plumas. | M |
| C20 | **CO₂ biogênico como coproduto** (*oferta feita; compradores dependem da RAIS*) | Para cada planta de biometano (real ou candidata): t/ano de CO₂ biogênico separado na purificação. Camada de compradores próximos (bebidas, alimentos, estufas, futuras rotas de e-metanol) e ligação com o SBCE (Lei 15.042/2024). Ordem de grandeza: o biogás que SP queima, se purificado, separaria cerca de **1,15–1,48 Mt de CO₂ por ano**¹. | A EPE já trata o CO₂ biogênico como insumo de combustíveis sintéticos, e as primeiras unidades de liquefação estão sendo financiadas. Nenhuma ferramenta mapeia a oferta. | M |
| C21 | **Casamento com o Mercado Cativo Verde** | Indústrias na área da Comgás com consumo de gás estimado (RAIS/CNAE × intensidade) a menos de X km de oferta candidata. Saída: "carteira de demanda" por cluster de oferta. | A modalidade nova de set/2026 cria compradores que antes precisavam ir ao mercado livre. Eles não sabem onde está a oferta. | M |
| C22 | **Vazamento e *slip* no módulo de GEE** | Termo explícito de perda de metano: 2,5 % na produção (média dinamarquesa) e *slip* da purificação por tecnologia (lavagem com água até cerca de 2 %, aminas cerca de 0,04 %, membranas abaixo de 1 %). Tudo editável, e com o efeito na redução líquida mostrado. | Sem esse termo, a redução de emissões da §3.4 é otimista, e o comprador de CGOB vai perguntar. Já incorporado em `docs/data/ESPEC_MODULO_GEE.md` §2.3 e §5: na palha, o vazamento que zera o benefício é cerca de 14 %, e 4,5 % de perda corta um terço da redução. | P |
| C23 | **Pacote Integra Resíduos** | Para cada região do programa estadual: FORSU disponível, rota (biodigestão, aterro com captura, compostagem), escala mínima, nutriente novo (protótipo de digestato) e o cartão de pré-viabilidade (C2). | As primeiras licitações das PPPs regionais são esperadas para 2026–2027. Quem chegar com o estudo pronto entra no edital. | M |
| C24 | **Corredores verdes com dados reais** | Atualizar a §3.6 com os postos e frotas que já existem (TransJordano, Iconic, postos de GNV da ANP) e calcular, por corredor, a **oferta a menos de X km** de cada posto e o déficit. | Os corredores deixaram de ser hipótese, e os operadores procuram oferta perto das rotas. | P |
| C25 | **Janela de bio-GNL para exportação** (especulativa; *nota feita*) | Oferta a menos de X km do porto de Santos; volume para uma planta de liquefação; requisitos de certificação (ISCC, base europeia UDB) como lista de verificação. | FuelEU Maritime cria demanda certificada. Vale um estudo de uma página antes de qualquer investimento de produto. | P |
| C26 | **Painel do mandato, ao vivo** | Uma página: meta do CNPE do ano, produção nacional e de SP (ANP, mensal), CGOB emitidos (quando houver registro), cobertura da meta e a curva de troca de rota de C17. | A Mesa de Monitoramento do Mercado de Biometano precisa exatamente disso, e o protótipo de mandato já calcula a cobertura. | P |
| C27 | **Pilha de receitas sem dupla contagem** | Um explicador interativo das receitas de um m³ de biometano: molécula, CGOB, CBIO, crédito voluntário, CO₂ biogênico, digestato. Mostra o que é cumulativo e o que se exclui. O digestato aparece nas três linhas do protótipo (valor preservado, reposição obrigatória, nutriente novo). | Os projetos e os financiadores somam receitas que não se somam. Fazer essa conta direito é parte da credibilidade do Movimento 1. | P |

¹ 4,9 M Nm³/dia de biogás com 35–45 % de CO₂ dá 1,7–2,2 M m³/dia de CO₂. A 1,84 kg/m³ (20 °C e 1 atm, a referência da ANP; 1,977 seria a 0 °C), isso é 1,15–1,48 Mt/ano. Só é capturável onde o biogás for purificado; queimado em motor, o CO₂ sai diluído no gás de exaustão.

### Atualizações das ideias da v1

- **C1 (prova de lastro para CGOB)** ganha o termo de vazamento de C22 e o CO₂ biogênico de C20 como campos do relatório.
- **C3 (gêmeo de bacia, P90)**: as plantas financiadas pelo BNDES (C18) são o primeiro conjunto de validação, porque o valor financiado revela a oferta que o financiador aceitou.
- **C11 (cenários de política)** já tem protótipo; C17 e C26 o estendem.
- **C12 (aterros)**: usar o LMOP da EPA como modelo de esquema (status da captura, uso do gás, operador) e as plumas de C19 como prioridade.

---

## 4. Priorização para os próximos 90 dias

Critérios: impacto na credibilidade ou na adoção, esforço, e se a ideia depende de algo ainda não feito.

| Ordem | Item | Por quê | Depende de |
|---|---|---|---|
| 1 | **C16, reconciliação BioGRAM** | Barato, e define o posicionamento antes que outros o façam | Nada |
| 2 | **C18, observatório do financiamento** | Dá ao motor econômico (§3.3) o dado que falta, com fonte brasileira | Nada |
| 3 | **C22, vazamento no GEE** | Corrige um otimismo sistemático antes do módulo de GEE ir para a interface | ESPEC_MODULO_GEE |
| 4 | **C17, troca de rota por planta** | O protótipo estadual existe; falta o cadastro por planta (ANEEL SIGA, CIBiogás) | Ingestão `validation_plants` (v1 §2.4) |
| 5 | **C26, painel do mandato** | Público definido (a Mesa de Monitoramento) e cálculo pronto | Ingestão `anp_biometano` (v1 §2.4) |

C19, C20, C21 e C23 entram no Movimento 2 da v1 (mar–ago/2027). C25 fica como nota de uma página ([`NOTA_C25_BIO_GNL_SANTOS.md`](NOTA_C25_BIO_GNL_SANTOS.md)): ainda não, porque a UDB não reconhece biometano de fora da UE.

---

## 5. Protótipos desta rodada

| Script | Resultado principal |
|---|---|
| `analysis/build_sp_route_conversion.py` | Atributo de equilíbrio: nenhum até cerca de R$ 214/MWh, o que cobre o PLD SE/CO baixo e médio de abr–jul/2026 (R$ 135 e 190); R$ 0,04/m³ a R$ 225 e R$ 0,89/m³ a R$ 450/MWh (energia autoconsumida). No biogás atual de SP, a diferença entre rotas vai de −R$ 0,96 bi a +R$ 1,8 bi por ano, conforme os preços. Molécula e atributo do Mercado Cativo Verde (ver a linha do Cativo Verde acima). |
| `analysis/build_bndes_capex_benchmarks.py` (C18, 7 operações do BNDES em `data/canonical_parameters/bndes_biometano_operacoes.csv`) | Aterro: R$ 2.000–2.600 por m³/dia de capacidade, ou R$ 0,71–1,06 por m³ só de capital. Agroindustrial com digestão: R$ 4.100 (vinhaça, GO) a 6.500 (PR) por m³/dia. **O custo de purificação europeu usado na troca de rota (R$ 1,44/m³, capital e operação: € 25/MWh a R$ 5,80/€) é otimista para o Brasil**, então os atributos de equilíbrio acima são um piso. |
| `analysis/build_biogram_reconciliation.py` (C16, lado PILAR) | Estado, 11 regiões intermediárias e 30 sítios (círculo de 30 km), pelos 8 grupos de matéria-prima do BioGRAM 1.2 e pelas 3 abas do mapa (vinhaça, torta e silvicultura ficam fora do escopo da IEA). Mapa da IEA para SP (um polígono, reescalado pela área): Total 9,4 bi Nm³/ano contra CP2b N3 5,2 (1,8 vez); resíduos agrícolas 7,0 contra 4,4 (entre N3 e N2); dejetos 1,1 contra 0,56 (entre N2 e N1); biowaste 1,2 contra 0,24, acima até do N1 (escopo: papel e papelão); Atlas Real (7,83 bi Nm³/ano em SP) e CP2b N1–N4 quando o snapshot está presente. Gera `areas.geojson` para desenhar no BioGRAM e a planilha `analysis/data/07_biogram_sp_seed.csv`; falta digitar os valores do BioGRAM (a ferramenta não tem API). |
| `analysis/build_biogram_national_share.py` (C16, teste de cima para baixo) | Participação de SP no Brasil (cana 56 %, cereais 3,7 %, oleaginosas 3,8 %, raízes 10,9 %, bovinos 4,5 %, suínos 3,7 %, galináceos 12,8 %; RSU coletado 23,1 % e esgoto tratado 35,6 % no SINISA; IBGE 2023) aplicada ao BioGRAM 1.2 Brasil (67,2 bcme/ano): SP deveria ter 10,0–11,0 bcme/ano (14,9–16,4 % do Brasil). O polígono do mapa dá 9,3 reescalado e 11,3 bruto, e SP fica entre os dois. Logo a leitura é coerente, e a diferença de cerca de 2 vezes com o CP2b N3 (5,1) é de método, não do desenho. Totais nacionais em `analysis/data/08_brasil_totais_2023_seed.csv` (SIDRA 1612 e 3939, SINISA 2023); só "Other crops" e os pesos de cada rebanho no metano seguem como suposição. |
| `analysis/build_sp_mandate_coverage.py` (v2, C11 e C26, volumes oficiais via `mandate_service`) | 2026 (0,5 %, CNPE 4/2026) pede 0,50 M m³/dia e o Brasil produz 88 % disso; 2027 (1 %, Portaria MME 942/2026 em consulta) pede 1,00 M e a produção atual cobre 45 %. O biogás que SP queima cobriria 2,95 vezes a meta de 2027. O volume oficial implica uma base de gás de cerca de 88 M m³/dia, 1,6 vez os 54,4 M do mercado distribuído; a v1, sobre essa base menor, subestimava a demanda (0,31 M para 0,5 %). |
| `analysis/build_sp_biolng_santos.py` (C25) | A 100 km do porto de Santos: 287 mil m³/dia de CH₄ no CP2b N3 e 845 mil no Atlas Real (78 % RSU) e 127 mil de capacidade ANP em 3 plantas; uma liquefação de 25 t/dia pede 37 mil. No FuelEU, o atributo valeria R$ 2,4–4,4/m³ numa viagem para a Europa (bio-GNL de 20 gCO₂e/MJ, metade da energia no escopo), contra R$ 1,00 do piso pedido para o CGOB; mas o bio-GNL de fora da UE ainda não entra na UDB. |
| `analysis/build_sp_realization_index.py` (v1, §2.4) | 0,72 % do N4 vira biometano; o biogás total equivale a 16–19 % do N4. |

### Já na plataforma

| Item | Onde | Resultado |
|---|---|---|
| C22 | `data/canonical_parameters/ghg.yaml`, `backend/app/services/ghg_service.py`, `/api/v1/ghg/*`; calculadora (painel Clima), Comparar e página do município (cartão Clima) | Vazamento de 2,5 % e *slip* por tecnologia entram na redução líquida, com o vazamento de equilíbrio. A calculadora deixou de somar CO₂ da queima como redução e de contar crédito de carbono na receita. Palha com diesel deslocado: 1.673 tCO₂e por 10⁶ Nm³, equilíbrio em 10,3 % de vazamento. Palha para a rede elétrica (SIN limpo): −638, ou seja, piora. |
| C26 | `data/canonical_parameters/mandato_biometano.yaml` e `anp_biometano_producao_uf_mensal.csv` (cópia da série ANP escrita por `build_anp_biometano_dataset.py`), `backend/app/services/mandate_service.py`, `/api/v1/mandate/panel`; página Mandato do biometano (`/mandate`, em Dados). O protótipo usa os mesmos volumes | Abr/2026: Brasil 443 mil m³/dia, SP 117 mil (27 %). Cobertura: 88 % da meta de 2026 e 45 % da proposta de 2027; 2028–2030 indicativos (3, 4 e 5 %), escalados. Ainda sem registro público de CGOB e sem a curva de troca de rota (C17). |
| C20 | `co2_biogenico` em `mandato_biometano.yaml`, retrato por planta da ANP em `anp_biometano_plantas_ultimo_mes.csv`, `mandate_service.biogenic_co2`; cartão "CO₂ biogênico" na página Mandato do biometano | As 9 plantas de SP separam hoje 40–52 mil t/ano de CO₂ (cerca de 8 % do mercado brasileiro de CO₂, estimado em 1.100–1.600 t/dia); na capacidade, 0,27–0,35 Mt; todo o biogás de SP, purificado, daria 1,15–1,48 Mt, 2,0–2,5 vezes o mercado. Já há quem venda: Cocal (48 t/dia, purificação do biogás, Narandiba/SP) e Gás Verde (~100 t/dia, RJ). O etanol tem 27 Mt/ano disponíveis (caderno da EPE, 2025): o CO₂ do biometano só vale perto de um comprador ou, mais tarde, em e-combustíveis e estocagem geológica (Lei 14.993 e Decreto 13.095/2026 dão a autorização à ANP; as regras da ANP e as metodologias do SBCE ainda estão em elaboração). Falta a camada de compradores (RAIS, junto com C21). Fontes de cada número no registro `fontes` do YAML. |
| C18 | `data/canonical_parameters/bndes_biometano_operacoes.csv` (7 operações, uma fonte por linha) e `financiamento_biometano.yaml`, `backend/app/services/financing_service.py`, `/api/v1/financing/benchmarks`; página Financiamento do biometano (`/financing`, em Dados). O protótipo usa a mesma conta | Aterro: R$ 1.978–2.596 por m³/dia; agroindustrial com digestão: R$ 4.116 (vinhaça, GO) a 6.504 (PR). Só capital: R$ 0,71–1,06 por m³ no aterro. Falta a ingestão dos dados abertos do BNDES (o contêiner não alcança bndes.gov.br). |

**Premissas a conferir antes de citar qualquer número desta rodada:**
- a tarifa Arsesp (molécula e atributo), na deliberação;
- o custo de purificação, hoje uma referência europeia convertida para reais, que a semente BNDES indica ser otimista;
- o CI do gás natural do protótipo de mandato;
- o preço do CBIO, na B3;
- o volume final contratado na chamada da Comgás.

---

## Fontes (consultadas em out/2026)

- **Benchmark internacional:**
  - [IEA: "Where in the world is biogas? A new IEA tool maps its potential"](https://www.iea.org/commentaries/where-in-the-world-is-biogas-a-new-iea-tool-maps-its-potential)
  - [BioCycle: IEA BioGRAM mapping tool](https://www.biocycle.net/iea-biogas-biogram-mapping-tool/)
  - [Bioenergy News: IEA maps 900 bcm of global biogas potential](https://www.bioenergy-news.com/news/iea-maps-900-billion-cubic-metres-of-global-biogas-potential-with-new-tool/)
  - [EPA: AD Screening Tool e Biogas Toolkit](https://advancedbiofuelsusa.info/anaerobic-digestion-screening-tool-version-2-1-and-epa-biogas-toolkit)
  - [NREL: Biogas Potential in the United States](https://afdc.energy.gov/uploads/publication/biogas_potential_in_us.pdf)
- **Ferramentas brasileiras:**
  - [Sebrae e GEF Biogás Brasil lançam o DataSebrae Biogás](https://www.abcdoabc.com.br/sebrae-e-gef-biogas-brasil-lancam-ferramenta-digital-datasebrae-biogas/)
  - [SEEG Municípios: como usar](https://www.ecycle.com.br/como-usar-o-seeg-municipios-sistema-de-estimativas-de-emissoes-e-remocoes-de-gases-de-efeito-estufa/)
  - [SEEG 13: soluções para metano](https://americadosul.iclei.org/wp-content/uploads/2026/08/SEEG13-solucoes-metano.pdf)
- **Mandato, rede e mercado em SP:**
  - [Lefosse: resoluções do CNPE sobre o mandato](https://lefosse.com/noticias/alerta/cnpe-publica-resolucoes-sobre-mandato-do-biometano-para-reducao-de-emissoes-de-gases-de-efeito-estufa-no-mercado-de-gas-natural-percentual-minimo-de-biodiesel-e-combate-ao-uso-irregular-de-etanol/)
  - [Comgás: edital da chamada pública de interconexão 2026](https://www.comgas.com.br/media/bbwjf3qw/edital-chamada-pública-para-interconexão-de-plantas-de-biometano-2026.pdf)
  - [eixos: Comgás recebe propostas para interconexão](https://eixos.com.br/gas-natural/mercado-de-gas/comgas-recebe-propostas-para-plano-de-interconexao-de-plantas-de-biometano-a-rede/)
  - [Agência iNFRA: Comgás obtém aval para o Mercado Cativo Verde](https://agenciainfra.com/blog/comgas-obtem-aval-para-vender-biometano-no-mercado-cativo-verde/)
  - [Diário do Transporte: consulta e tarifas de biometano](https://diariodotransporte.com.br/2026/09/10/bombeiros-de-sao-paulo-abrem-consulta-publica-para-revisar-instrucao-de-comercializacao-distribuicao-utilizacao-e-producao-de-gas-natural-e-biometano/)
  - [Correio da Manhã: tarifas da Comgás em set/2026](https://www.correiodamanha.com.br/nacional/sao-paulo/2026/09/318093-tarifa-de-gas-fica-estavel-para-casas-e-comercio.html)
  - [CCEE: InfoPLD diário (exemplo, 30/07/2026)](https://www.ccee.org.br/documents/80415/35629354/InfoPLD_Diario30072026.pdf/1a4ac8d1-b541-e513-63ba-a066190ca457)
  - [Novacana: RenovaBio e CBIOs](https://www.novacana.com/guias/renovabio-cbios-creditos-descarbonizacao)
- **Financiamento:**
  - [Cenário Energia: BNDES aprova R$ 148,5 mi para biometano no Paraná](https://cenarioenergia.com.br/2026/02/09/bndes-aprova-r-1485-milhoes-para-usina-de-biometano-no-parana-e-impulsiona-mercado-de-gas-renovavel/)
  - [Agência iNFRA: BNDES financia usina de biometano no RS](https://agenciainfra.com/blog/bndes-financia-usina-de-biometano-de-r-954-mi-no-rs/)
  - [Cenário Energia: BNDES aprova R$ 180,7 mi para plantas em SP e ES](https://cenarioenergia.com.br/2026/09/22/bndes-financia-plantas-biometano-sao-paulo-espirito-santo/)
  - [eixos: JV Edge e Orizon recebe R$ 450 mi do BNDES](https://eixos.com.br/combustiveis-e-bioenergia/biocombustiveis/jv-entre-edge-e-orizon-recebe-financiamento-de-r-450-mi-do-bndes-para-usina-de-biometano/)
  - [BNDES: R$ 230 mi para biometano em aterro e no setor sucroenergético](https://www.bndes.gov.br/wps/portal/site/home/imprensa/noticias/conteudo/com-230-milhoes-de-reais-o-bndes-apoia-projetos-de-biometano-no-terceiro-maior-aterro-sanitario-do-mundo-e-no-setor-sucroenergetico)
- **Aterros e metano por satélite:**
  - [Carbon Mapper: dados do Tanager-1 sobre super-emissores](https://carbonmapper.org/articles/carbon-mapper-data-from-tanager1-satellite-reveals-methane-and-co2-super-emitters)
  - [CATF: Brasil vai criar plano nacional para super-emissores do setor de resíduos](https://www.catf.us/2025/11/brazil-develop-national-plan-address-super-emitters-waste-sector-curb-methane-emissions-with-support-from-catf-and-carbon-mapper/)
  - [Frontiers in Earth Science 2025: aterro de Caieiras com TROPOMI, EMIT e CRDS](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2025.1549385/text)
  - [Remote Sensing 17(24):3973: plumas em 16 aterros brasileiros](https://www.mdpi.com/2072-4292/17/24/3973)
  - [UCLA Emmett Institute: top 25 plumas de 2025, aterros](https://law.ucla.edu/academics/centers/emmett-institute-climate-change-environment/announcing-ucla-emmett-institutes-stop-methane-project/spotlight-top-25-plumes-25-landfills)
  - [SRON: dados de satélite de metano de resíduos](https://www.sron.nl/en/actueel/nieuwe-satellietdata-methaanuitstoot-uit-afval-openbaar-gemaakt/)
  - [Capital Aberto: Denham/Thopen e o Aterro Bandeirantes](https://capitalaberto.com.br/empresas/2026/05/private-equity-dos-eua-expande-operacao-de-biogas-no-brasil)
  - [SEMIL: capacidade de biometano em SP em 2026](https://semil.sp.gov.br/?p=143784)
- **Vazamento de metano e MRV:**
  - [gasworld: vazamentos no setor de biogás, o dobro do estimado](https://www.gasworld.com/story/methane-leaks-in-biogas-sector-twice-as-much-as-previously-thought/2094305.article)
  - [IEA Bioenergy Task 37: workshop sobre emissões de metano](https://task37.ieabioenergy.com/wp-content/uploads/sites/32/2023/12/2023_10_25_IEA-Task-37-Workshop-aktuallisiert.pdf)
  - [IWA: Q&A sobre *slip* por tecnologia de purificação](https://iwa-network.org/wp-content/uploads/2015/12/Q-A-Report_27_06_2023.pdf)
  - [Sistema.bio: aquisição da Inclusive Energy (dMRV)](https://sistema.bio/blog/sistema-bio-acquires-inclusive-energy/)
- **CO₂ biogênico:**
  - [eixos: na corrida pelos biocombustíveis, CO₂ vira produto](https://eixos.com.br/newsletters/dialogos-da-transicao/na-corrida-pelos-biocombustiveis-co2-vira-produto/)
  - [eixos: CO₂ biogênico e combustíveis sintéticos (EPE)](https://eixos.com.br/eventos/co%C2%B2-biogenico-pode-impulsionar-combustiveis-sinteticos-e-descarbonizar-industria-no-brasil-diz-heloisa-borges/)
- **Resíduos urbanos e corredores:**
  - [ABC do ABC: regionalização da gestão de resíduos (Integra Resíduos)](https://abcdoabc.com.br/governo-paulista-avanca-em-regionalizacao-da-gestao-de-residuos-solidos/)
  - [Agência iNFRA: BNDES libera R$ 140 mi para corredor verde em SP](https://agenciainfra.com/blog/bndes-libera-r-140-mi-para-corredor-verde-em-sp/)
  - [eixos: Iconic adota corredor a biometano entre Rio e SP](https://eixos.com.br/combustiveis-e-bioenergia/iconic-adota-corredor-a-biometano-entre-rio-e-sao-paulo/)
- **Sucroenergético:**
  - [eixos: Raízen investirá R$ 300 mi em biometano em SP](https://eixos.com.br/gas-natural/raizen-investira-r-300-milhoes-em-planta-de-biometano-em-sao-paulo/)
  - [Cenário Energia: segunda planta 100 % de biogás da Cocal](https://cenarioenergia.com.br/2025/09/29/sao-paulo-inaugura-segunda-planta-100-de-biogas-e-reforca-lideranca-na-producao-de-energia-renovavel/)
- **Exportação:**
  - [Argus: viewpoint biogas 2026, shipping](https://www.argusmedia.com/en/news-and-insights/latest-market-news/2768669-viewpoint-biogas-growth-uneven-shipping-drives-2026)
  - [eixos: bio-GNL e FuelEU Maritime, a janela europeia](https://eixos.com.br/gas-natural/biogas/bio-gnl-e-fueleu-maritime-a-janela-europeia-para-o-biometano-brasileiro/)
