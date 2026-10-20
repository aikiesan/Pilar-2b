# Verificação das fontes do painel do mandato do biometano

Registro da conferência, número a número, do que a página **Mandato do
biometano** (`/[locale]/mandate`) mostra: metas (C26), troca de rota (C17),
pilha de receitas (C27) e CO₂ biogênico (C20). Conferido em **20/10/2026**.

Cada fonte tem uma entrada no registro `fontes` de
[`data/canonical_parameters/mandato_biometano.yaml`](../../data/canonical_parameters/mandato_biometano.yaml),
com título, citação curta, autor, data, link e tipo. A API
(`/api/v1/mandate/panel`) devolve as referências de cada número, e a página as
mostra de três formas:

- **Botão ao lado de cada número**, com a citação curta (por exemplo, "CCEE,
  InfoPLD jul/2026") na cor do tipo de fonte. O botão abre a fonte direto, em
  outra aba; passar o mouse (ou o leitor de tela) dá a citação completa. Uma
  suposição do PILAR-2b aparece com borda tracejada e sem link.
- **Botão "conta"** ao lado de cada número que o PILAR-2b calcula. Ele leva ao
  bloco "Como calculamos" do cartão, que escreve a conta com os valores usados.
  O cartão da troca de rota abre com as "Premissas deste quadro": cada
  insumo, o valor e as fontes dele.
- **Lista "Fontes deste quadro"** no fim de cada cartão, e os cartões "Onde
  conferir" e "Como citar este painel" no fim da página. O cartão "Onde conferir" reúne as páginas vivas, onde o
número mais recente aparece primeiro. Um teste do backend
(`test_every_canonical_source_is_used_dated_and_linked`) exige que toda fonte
do registro seja usada, tenha data e tenha link `https`. Só uma suposição
(`estimativa`) pode ficar sem link.

## Como foi feito

- **Busca na web** pelo número e pelo ato, comparando ao menos duas fontes
  quando havia.
- **Limite do método:** do ambiente de nuvem, gov.br, planalto.gov.br, ccee.org.br
  e comgas.com.br não abrem (DNS ou 403). O texto integral desses sites não foi
  lido; o número foi conferido no resumo da busca e em fontes secundárias. A
  coluna "Como conferir" diz onde abrir o original.
- **Status:**
  - **Confirmado:** o número aparece na fonte citada.
  - **Corrigido:** o valor anterior divergia da fonte; o novo está no YAML.
  - **Não confirmado:** nenhuma fonte achada. O painel deixou de usar o
    número, ou ele aparece marcado.
  - **Suposição:** escolha do PILAR-2b, marcada como `estimativa`.

## Metas e CGOB (C26)

| Número no painel | Valor | Status | Fonte (chave no YAML) | Como conferir |
|---|---|---|---|---|
| Meta de 2026 | 0,5 %; 181.728.000 m³/ano; 504,8 mil m³/dia | Confirmado | [Resolução CNPE 4/2026](https://www.gov.br/mme/pt-br/assuntos/conselhos-e-comites/cnpe/resolucoes-do-cnpe/2026/resolucao-4-publicada.pdf) (`cnpe_4_2026`) | No PDF: anual ÷ diário dá 360 dias; o painel usa o diário |
| Meta proposta de 2027 | 1 %; 363.249.200 m³; 995,2 mil m³/dia; 3.632.492 CGOB | Confirmado | [Portaria MME 942/2026](https://www.gov.br/mme/pt-br/acesso-a-informacao/legislacao/portarias/2026/portaria-mme-n-942-2026.pdf) (`portaria_942`) | Em consulta pública até 06/11/2026 ([consultas do MME](https://consultas-publicas.mme.gov.br/), `consulta_234`) |
| Trajetória 2028–2030 | 3, 4 e 5 % | Confirmado (indicativa) | `portaria_942` | O link anterior era uma notícia (Cenário Energia); passou a ser a portaria |
| Limites da lei | começa em 1 %, até 10 % | Confirmado | [Lei 14.993/2024, art. 17](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14993.htm) (`lei_14993`) | Texto no Planalto |
| 1 CGOB = 100 m³ | 100 | Confirmado | [Resolução ANP 995/2026](https://www.legisweb.com.br/legislacao/?id=491704) (`res_anp_995`) | Espelho do LegisWeb; oficial no DOU de 04/03/2026 |
| Nenhum CGOB emitido; registro público | ainda não existe | Confirmado (set–out/2026) | [Exame](https://exame.com/esg/cgob-o-que-e-o-certificado-de-garantia-de-origem-de-biometano-e-o-que-falta-para-operacionaliza-lo/), [eixos: B3 credenciada](https://eixos.com.br/gas-natural/biogas/b3-e-a-terceira-entidade-credenciada-para-registro-de-cgob/), [Res. ANP 996/2026](https://www.legisweb.com.br/legislacao/?id=491705) | Registradoras credenciadas: ACX Brasil, Instituto Totum e B3 |
| Produção mensal BR e SP | abr/2026: BR ≈ 443 mil m³/dia; SP ≈ 117 mil | Confirmado (dado baixado) | [Painel Dinâmico de Produtores de Biometano](https://www.gov.br/anp/pt-br/centrais-de-conteudo/paineis-dinamicos-da-anp/paineis-e-mapa-dinamicos-de-produtores-de-combustiveis-e-derivados/painel-dinamico-de-produtores-de-biometano) (`anp_painel_biometano`) | Refazer com `analysis/build_anp_biometano_dataset.py` |

## Troca de rota (C17)

| Número no painel | Antes | Agora | Status | Fonte (chave no YAML) |
|---|---|---|---|---|
| Molécula | R$ 2,25/m³ (Cativo Verde) | **R$ 2,63/m³** (custo do gás da Comgás, sem impostos, segmentos não térmicos) | **Corrigido** | [Comgás, tarifas](https://www.comgas.com.br/sobre-sua-conta/tarifas/) (`comgas_tarifas`); [ajuste Arsesp de set/2026: R$ 2,629087/m³](https://www.correiodamanha.com.br/nacional/sao-paulo/2026/09/318093-tarifa-de-gas-fica-estavel-para-casas-e-comercio.html) (`arsesp_ajuste_set2026`) |
| Atributo de referência | R$ 1,40/m³ (Cativo Verde) | **R$ 1,00/m³** (piso pedido pelos fornecedores para o CGOB) | **Corrigido** | [Argus, jan/2026](https://www.argusmedia.com/pt/news-and-insights/latest-market-news/2771482-viewpoint-brazil-s-biomethane-at-a-crossroads) (`argus_biometano_2026`) |
| Tabela do Mercado Cativo Verde | R$ 2,25 + R$ 1,40 | fora do painel | **Não confirmado** | O link antigo (Diário do Transporte) era sobre os Bombeiros e não tinha esses valores. A [Agência iNFRA](https://agenciainfra.com/blog/comgas-obtem-aval-para-vender-biometano-no-mercado-cativo-verde/) confirma a autorização da Arsesp, mas não os valores |
| Purificação | € 19/MWh, R$ 1,19/m³ | **€ 25/MWh ≈ R$ 1,44/m³** | **Corrigido** | [PMC9821904](https://pmc.ncbi.nlm.nih.gov/articles/PMC9821904/) (`purificacao_custos`): ~€ 0,25/m³ a 250 m³/h, abaixo de € 0,15 acima de 2.000 m³/h. É referência europeia |
| Câmbio euro | R$ 6,30 | **R$ 5,80** | **Corrigido** | [PTAX do BCB](https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes) (`bcb_ptax`): média de set/2026 ≈ 5,92; 16/10/2026 = 5,71 |
| PLD SE/CO (baixo, médio, alto) | R$ 185, 250, 300/MWh | **R$ 135, 190, 225/MWh** | **Corrigido** | [Painel de Preços da CCEE](https://www.ccee.org.br/precos/painel-precos) (`ccee_painel_precos`), [PLD diário, dados abertos](https://dadosabertos.ccee.org.br/dataset/pld_media_diaria) (`ccee_pld_dados`), [InfoPLD de 30/07/2026](https://www.ccee.org.br/documents/80415/35629354/InfoPLD_Diario30072026.pdf/1a4ac8d1-b541-e513-63ba-a066190ca457). Abr–jul/2026: 133 (jul), 177–206 (abr–jun), 222 (máximo diário, mai). Os valores antigos estavam acima de todo o período |
| Energia autoconsumida | R$ 450/MWh | igual | Suposição | `autoconsumo_suposto` (sem link) |
| Biogás de SP | 4,9 M Nm³/dia | igual | Confirmado | [CIBiogás, Panorama 2025](https://materiais.cibiogas.org/panorama-do-biogas-2025-download-lp) (`cibiogas_panorama_2025`). A condição de referência do Nm³ não foi conferida |
| PCI do metano | 9,94 kWh/Nm³ (sem fonte) | igual | **Fonte acrescentada** | [NIST Chemistry WebBook](https://webbook.nist.gov/cgi/cbook.cgi?ID=C74828&Mask=1) (`nist_metano`): calor de combustão de cerca de 890 kJ/mol, menos a água vaporizada, dá cerca de 802 kJ/mol; ÷ 22,414 L/mol = 35,8 MJ/Nm³ = 9,94 kWh/Nm³ (0 °C) |
| Rendimento elétrico do motor | 38 % (sem fonte) | igual | **Suposição, agora marcada** | `rendimento_suposto` (sem link); teto de motor grande: [Cat CG170B-16, 44,7 %](https://www.cat.com/pt_BR/products/new/power-systems/electric-power/gas-generator-sets/110821.html) (`cat_cg170`, página do fabricante) |
| Metano no biogás | 55–65 % (sem fonte) | igual | **Fonte acrescentada** | [Embrapa Agroenergia, 2014](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/998908/1/CIT13.pdf) (`embrapa_reforma_biogas`): 60–65 % de CH₄. O limite inferior de 55 % é escolha do PILAR-2b, para incluir biogás mais pobre, como o de aterro |

**Efeito no resultado:** o limiar passou de R$ 281 para **R$ 315/MWh**. Agora
todo o PLD de abr–jul/2026 fica abaixo dele: o biometano vence sem atributo
para a energia vendida ao mercado. Com energia autoconsumida (R$ 450/MWh), o
atributo de equilíbrio caiu de R$ 0,64 para **R$ 0,51/m³**, ainda abaixo do
piso de R$ 1,00. No biogás atual de SP, a diferença entre as rotas vai de
−R$ 0,55 bi a +R$ 1,8 bi por ano (antes, −0,7 a +1,9).

## Pilha de receitas (C27)

| Número no painel | Valor | Status | Fonte (chave no YAML) |
|---|---|---|---|
| Fóssil de referência do biometano | 86,7 g CO₂e/MJ | Confirmado (fonte trocada) | [RenovaCalc](https://www.gov.br/anp/pt-br/assuntos/renovabio/renovacalc) e [Pereira et al. 2025](https://www.gov.br/anp/pt-br/assuntos/renovabio/arq/arquivos-estudos-relatorio-e-seminarios/renovacalc-pereira-et-al-2025.pdf) (86,70). Antes, a fonte era um comentário do CIBiogás de 2018. A ANP revisa a RenovaCalc (consulta encerrada em 16/10/2026) |
| 1 CBIO = 1 t CO₂e | — | Confirmado | [ANP, CBIO](https://www.gov.br/anp/pt-br/assuntos/renovabio/credito-de-descarbonizacao-cbio) (`anp_cbio`) |
| Preço do CBIO | R$ 31,40 (jan–fev/2026); R$ 54,70 (média de 2025) | Confirmado (imprensa) | [Itaú BBA via Novidades MT](https://novidadesmt.com.br/agronegocio/renovabio-inicia-2026-com-metas-menores-e-precos-de-cbios-em-queda-aponta-relatorio-do-itau-bba/) (`cbio_itau_2026`). Em mar/2026 chegou a R$ 19,90. Preço atual no [ICBIO da B3](https://www.b3.com.br/pt_br/market-data-e-indices/indices/indices-de-segmentos-e-setoriais/indice-de-credito-de-descarbonizacao-b3-icbio-b3.htm) |
| CBIO e CGOB da mesma nota | permitido, com o CGOB indicando o CBIO | Confirmado (resumo) | [Res. ANP 996/2026](https://www.legisweb.com.br/legislacao/?id=491705); resumo [Tauil & Chequer](https://www.tauilchequer.com.br/pt/insights/publications/2026/03/anp-issues-rules-on-biomethane-targets-and-cgob-issuance) |
| Crítica à dupla contagem | — | Contexto | [Brasil Energia (Abrace), jul/2025](https://brasilenergia.com.br/energia/certificado-de-garantia-de-origem-de-biometano-um-fim-em-si-mesmo), anterior à resolução |
| Densidade do CO₂ | 1,977 kg/m³ → **1,84 kg/m³** | **Corrigido** | Os m³ da ANP são a 20 °C e 1 atm ([Res. ANP 906/2022](https://www.legisweb.com.br/legislacao/?id=438796)); 1,977 é a 0 °C. O CO₂ por m³ de biometano passou de 1,06–1,62 para **0,99–1,51 kg** |
| Molécula + atributo | R$ 2,25 + 1,40 → **R$ 2,63 + 1,00** | **Corrigido** | Os mesmos da troca de rota. A soma possível passou de R$ 3,82 para **R$ 3,80/m³** |
| Digestato por destino | 81 % / 13 % / 6 % | Suposição (modelo) | `modelo_digestato`: protótipo `analysis/build_sp_digestate_nutrients.py` |

## CO₂ biogênico (C20)

| Número no painel | Valor | Status | Fonte (chave no YAML) |
|---|---|---|---|
| Plantas de SP e biogás processado | 9 plantas, abr/2026 | Confirmado (dado baixado) | `anp_painel_biometano` |
| CO₂ separado hoje em SP | 43–56 → **40–52 mil t/ano** | Corrigido (densidade) | Conta do painel. Essencis Caieiras: 41–53 t/dia |
| Na capacidade | 0,29–0,37 → **0,27–0,35 Mt/ano** | Corrigido (densidade) | Conta do painel |
| Todo o biogás de SP, purificado | 1,24–1,59 → **1,15–1,48 Mt/ano** | Corrigido (densidade) | Conta do painel: cerca de 2 vezes o mercado |
| Mercado brasileiro de CO₂ | 1.600 t/dia (584 mil t/ano) | Confirmado (estimativa de imprensa) | [AgFeed, out/2023](https://agfeed.com.br/negocios/depois-do-biometano-venda-de-co2-da-mais-um-gas-a-usinas-de-etanol), estimativa do diretor da Air and Parts. Outra estimativa dá ~1.100 t/dia ([eixos, 2022](https://eixos.com.br/urca-energia-investe-r-45-milhoes-na-producao-de-co2-verde-a-partir-de-biometano/)). Não há número oficial; o painel diz isso |
| Parcela de SP no mercado | cerca de 8 % (meio da faixa de hoje, 46 mil t, ÷ 584 mil t) | Igual: a densidade baixou a faixa, mas o meio continua perto de 8 % | Conta do painel |
| Cocal, Narandiba (SP) | 48 t/dia, desde 2021 | Confirmado | [Cocal](https://www.cocal.com.br/negocios/co2/) e AgFeed |
| Gás Verde, Seropédica (RJ) | ~100 t/dia | Confirmado (página da empresa) | [Gás Verde](https://gasverde.com.br/en/green-co%E2%82%82/) |
| CO₂ do etanol / do biogás (EPE) | ~27 Mt/ano; 491 mil t/ano (99 mil em operação) | Confirmado | [Caderno da EPE](https://www.epe.gov.br/pt/publicacoes-dados-abertos/publicacoes/caderno-co-biogenico-na-bioenergia) (antes só o resumo da eixos, que continua como apoio) |
| Remoção e estocagem | SBCE; CCS | Confirmado; fonte acrescentada | [Lei 15.042/2024](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l15042.htm) (o link da Câmara foi trocado pelo do Planalto); [Lei 14.993/2024, arts. 26–29](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14993.htm); [Decreto 13.095/2026](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d13095.htm); [ANP, CCS](https://www.gov.br/anp/pt-br/assuntos/ccs) |

## Onde conferir (páginas vivas)

O cartão no fim da página lista estas páginas, onde o número mais recente
aparece primeiro:

- painel de biometano da ANP
- consulta pública do MME
- tarifas da Comgás
- painel de preços da CCEE
- ICBIO da B3
- RenovaCalc
- PTAX do BCB

## O que ainda falta conferir

1. **Tabela do Mercado Cativo Verde** (Comgás, ajuste Arsesp de set/2026): abrir
   a página de tarifas da Comgás ou a deliberação da Arsesp e anotar a tabela.
   Se ela publicar um valor para o atributo, ele substitui o piso de R$ 1,00.
2. **Texto oficial das Resoluções ANP 995 e 996/2026** no DOU de 04/03/2026. O
   painel cita o espelho do LegisWeb.
3. **Condição de referência do Nm³** do CIBiogás (0 °C ou 20 °C). O PCI do
   metano (9,94 kWh/Nm³) é a 0 °C, enquanto os preços por m³ são a 20 °C. A
   diferença é de cerca de 7 % na rota elétrica; o painel não corrige isso.
4. **Purificação brasileira:** trocar a referência europeia por custo nacional
   quando houver. O observatório do BNDES (C18) dá só o capital.
5. **Títulos e notas das fontes** estão só em português, também na versão em
   inglês da página.
