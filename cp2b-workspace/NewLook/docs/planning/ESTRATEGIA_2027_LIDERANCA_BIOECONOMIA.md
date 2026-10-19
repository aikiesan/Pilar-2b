# PILAR-2b — Estratégia 2027: de atlas de potencial a infraestrutura de decisão da bioeconomia

> **Documento interno de estratégia, NIPE/UNICAMP CP2B, 19/10/2026.**
> Escrito depois de uma leitura completa do repositório: backend, frontend, dados,
> metodologia e os planos já existentes. Ele **não repete** o catálogo de ideias de
> [`FUTURE_VISION_AND_POSSIBILITIES.md`](FUTURE_VISION_AND_POSSIBILITIES.md) nem o plano
> de expansão nacional de [`BRAZIL_EXPANSION_ROADMAP.md`](BRAZIL_EXPANSION_ROADMAP.md).
> O que ele faz é escolher. Diz o que vem primeiro, por quê e o que fica de fora,
> e acrescenta ideias novas ligadas ao que mudou no setor em 2026.
>
> Documentos irmãos: [`IMPROVEMENT_BACKLOG.md`](IMPROVEMENT_BACKLOG.md),
> [`POST_FOSS4G_ROADMAP.md`](POST_FOSS4G_ROADMAP.md),
> [`../DECISOES_METODOLOGICAS.md`](../DECISOES_METODOLOGICAS.md),
> [`../audit/CP2B_CANONICAL_AUDIT.md`](../audit/CP2B_CANONICAL_AUDIT.md).


> **Rodada 2 (2026-10-19):** fatos novos de 2026, benchmark com o IEA BioGRAM e outras ferramentas, ideias C16–C27 e o protótipo de troca de rota estão em [`ESTRATEGIA_2027_RODADA2_IDEIAS_E_REFERENCIAS.md`](ESTRATEGIA_2027_RODADA2_IDEIAS_E_REFERENCIAS.md).
---

## 0. Resumo executivo (uma página)

**Tese.** O mercado brasileiro de biometano saiu do "potencial" e entrou na "obrigação" em 2026.
- **Mandato nacional e certificado.** A Lei 14.993/2024 e o Decreto 12.614/2025 criaram o mandato de biometano para produtores e importadores de gás natural. As Resoluções ANP 995 e 996/2026 criaram o certificado de origem, o CGOB. A Resolução CNPE 4/2026 fixou a meta de 2026 em **0,5 %** de redução de GEE, abaixo do 1 % da lei, e criou uma Mesa de Monitoramento do Mercado de Biometano para retomar o 1 %. O PILAR-2b é candidato natural a fornecer evidência a essa mesa.
- **São Paulo.** A Arsesp criou a TUSD-Verde em dezembro de 2025. A SEMIL abriu consulta pública para um certificado paulista de origem e projeta passar de cerca de 0,7 para 1,3 milhão de m³/dia de biometano até 2027.
- **Lacuna de informação.** Quem vai investir, regular ou comprar biometano precisa saber **onde está a biomassa, quanto dela é de fato mobilizável, a que custo chega a uma planta, e quanto carbono isso evita**. Nenhuma ferramenta pública brasileira responde isso com rastreabilidade de parâmetro e resolução municipal:
  - o BiogasMap da CIBiogás mostra plantas existentes, não potencial;
  - o painel da ABiogás é fechado para associados;
  - os Atlas são documentos estáticos.

**Ativo diferencial do PILAR-2b.** O ativo que ninguém mais tem é a **cadeia rastreável**: dado público, depois gate de ingestão, depois parâmetro canônico com DOI, depois o número no mapa. Isso já está construído:
- `backend/ingest/` com 8 gates;
- `data/canonical_parameters/`;
- 668 referências;
- o dossiê municipal em PDF e XLSX.

O passo estratégico é transformar esse ativo em **confiança verificável** e depois em **decisão**.

**Três movimentos, nesta ordem:**

| # | Movimento | Pergunta que responde | Horizonte |
|---|---|---|---|
| 1 | **Credibilidade auditável** (um número, uma fonte, uma incerteza) | "Posso citar este número num laudo, num edital ou num paper?" | nov/2026–fev/2027 |
| 2 | **Da biomassa ao projeto** (custo logístico, carbono, digestato, rede de gás) | "Onde vale a pena construir, de que tamanho, e com que retorno?" | mar–ago/2027 |
| 3 | **Monitoramento vivo** (realizado vs. potencial, dinâmica temporal, alertas) | "O que está mudando, e onde está a lacuna de realização?" | set/2027 em diante |

**Cinco ações para começar já** (detalhadas na §2):
1. Pôr em quarentena o número de Minas Gerais "publication-ready", que usa rebanho sintético.
2. Corrigir o "CO₂ reduzido" da calculadora, que hoje conta a queima do metano como redução.
3. Publicar o snapshot de fatores do CP2b v5.1 no repositório, ou um hash e um DOI dele.
4. Criar um "registro de números oficiais", com um único valor por indicador.
5. Fechar o CORS com credenciais para domínios de terceiros.

---

## 1. Diagnóstico: onde o PILAR-2b está hoje

### 1.1 O que já é forte (e raro)

- **Disciplina de dados.** O contrato de ingestão tem 8 gates: esquema, cobertura, faixa, agregação, cruzamento entre fontes, idempotência, linhagem e regressão. Cada execução gera um relatório, e a promoção é deliberadamente manual (`backend/ingest/`). Poucos atlas de bioenergia no mundo têm isso.
- **Rastreabilidade científica.**
  - `feedstocks.yaml` traz níveis de confiança.
  - Há 668 referências e uma auditoria de DOIs (`docs/data/CITATION_DOI_AUDIT.md`).
  - Há uma matriz de rastreabilidade FDE (`docs/data/FDE_TRACEABILITY_MATRIX.md`).
  - A reconciliação numérica é exata: 7.832.143.834 Nm³ (`docs/data/VALIDACAO_CADEIA_NUMERICA_2026-08-01.md`).
- **Produto municipal.**
  - Página por município com slug legível, imagem Open Graph, link de citação e link de erro.
  - Dossiê em PDF e XLSX nos dois idiomas, com mapa vetorial (`backend/app/services/municipality_dossier.py`).
  - Comparação de até 4 municípios.
- **Engenharia madura para uma equipe pequena.**
  - CI com typecheck, verificação de i18n (1960 chaves em paridade e varredura de português hardcoded) e testes de acessibilidade.
  - 1.437 testes no backend; quase nenhum TODO.
  - Analytics anônimo sem cookie; LGPD com ROPA e DPIA.
- **Reconhecimento institucional.** Registro INPI BR512026003115-0, FAPESP, FOSS4G Europe 2026.

### 1.2 O que limita a liderança

| Limitação | Evidência no repositório | Por que importa para o setor |
|---|---|---|
| **Proliferação de números** | O teórico de SP aparece como 19,9 bi, 33,99 M/dia e 133,82 M/dia. O mobilizável aparece como 3,04, 3,12, 3,30, 7,83 e 16,36 M/dia-eq. O Real vem do Atlas (FDE) e também do CP2b N4 (`docs/DECISOES_METODOLOGICAS.md`). | Um investidor ou um regulador que encontra dois números para a mesma pergunta descarta os dois. |
| **Fatores do CP2b fora do git** | `backend/scripts/load_cp2b_potential.py` carrega um CSV com hash que vem de `Metodo_CP2b/` ("paper não publicado"). | O número principal do mapa (Real = N4) não pode ser auditado a partir do repositório. |
| **Incerteza sem estatística** | min/med/max são extremos acoplados. `canonical_results.json` tem `"monte_carlo": false`. Não há análise de sensibilidade. | Sem intervalo de confiança, o número não entra em due diligence nem em inventário de emissões. |
| **FS = FL = 1,0 nos 15 fluxos Real/Ideal** | `docs/data/METODOLOGIA_CENARIOS_SP_2026-07-30.md` | A logística e a sazonalidade, que decidem a viabilidade de um projeto, não estão no número publicado. |
| **Sem motor econômico no backend** | Nenhum CAPEX, OPEX, VPL ou LCOE em `app/`. A calculadora calcula no navegador com constantes de tarifa "atualizar periodicamente" (`calculatorEngine.ts`). | Sem custo, o mapa mostra onde há biomassa, mas não onde há projeto. |
| **Sem contabilidade de GEE** | `co2TonsYear = CH4 × 0,657 × 44/16` (`calculatorEngine.ts:376`) é o CO₂ biogênico da *queima*. Mesmo assim aparece como "Redução de CO₂" e é monetizado como crédito de carbono. | É o argumento central de valor do biogás, e hoje ele está conceitualmente errado. |
| **Retrato estático** | Ano-base 2023, misturado com parâmetros do Atlas de 2017. PPM 2008–2024 carregada, mas só 2024 validada. | "Monitoramento" exige série temporal e realizado vs. potencial. |
| **Realizado vs. potencial não fechado** | Dados ANP e ANEEL montados (`analysis/data/05*`). `validation_plants` não está populada no mapa. A métrica de erro está "pendente" (`FDE_METHODOLOGY.md` §Limitações 4). | É exatamente o indicador que a SEMIL e a ANP precisam acompanhar. |
| **Mapa no limite do Leaflet com SVG** | `MapComponent.tsx` tem 1.386 linhas e cerca de 30 `useState`. PMTiles e MapLibre estão planejados, mas não começaram (`package.json` não tem maplibre). | Bloqueia a escala nacional (5.571 municípios) e camadas raster finas. |
| **Promessas falsas na landing** | "download gratuito", "exportar Shapefile", "criar conta gratuita", "MapBiomas 10 m" (`HANDOFF_2026-07-30.md`). O formulário da newsletter simulava o envio. `DATA_EXPORT_ENABLED=false`. | Corrói a credibilidade, que é o principal ativo. |

### 1.3 Problemas de integridade encontrados nesta análise (prioridade máxima)

1. **O número de MG chamado "publication-ready" depende de rebanho sintético.**
   - `analysis/build_mg_master_residues.py:753-837` calcula bovinos, suínos e aves como `área_rural × densidade_assumida_por_RGint × ocupação`. Aplica pisos de 50 bovinos, 10 suínos e 100 aves por município. Nenhum dado do IBGE PPM é lido nesse caminho.
   - Mesmo assim, as linhas de saída rotulam a fonte como `CP2B_municipalities_DB+IBGE_PAM_PPM_PEVS`.
   - Os suínos usam 380 m³/cabeça sobre o rebanho inteiro (linha ~1105). É o mesmo fator que a auditoria de SP identificou como inflando suínos em cerca de 9,7×.
   - `analysis/paper_verification/MG_PAPER_DATA_VERIFICATION.md` declara 21,61 bi Nm³/ano "fully verified, publication-ready". Isso é 2,8× SP, e suínos respondem por 34%.
   - **Tamanho do erro:** os rebanhos implícitos no CSV de saída são 19,6 M suínos e 729 M galináceos. Cada um equivale a **45 % do rebanho do Brasil inteiro** (PPM 2023: 43,0 M e 1,6 bi). Já os bovinos (10,4 M) ficam abaixo da metade do efetivo oficial de MG (22,5 M). Detalhes em [`../auditorias/A20_MG_REBANHO_SINTETICO_2026-10-19.md`](../auditorias/A20_MG_REBANHO_SINTETICO_2026-10-19.md).
   - **Feito:** aviso de retirada do selo no topo do relatório de verificação de MG. A plataforma não consome esse dataset; o impacto é no paper.
   - **Pendente:** trocar o caminho de pecuária pela PPM real (o promotor `promote_ibge_ppm.py` já existe) e reemitir o número com a regra de SP (sem bagaço e suínos por massa de dejeto).
2. **CO₂ da calculadora.**
   - O valor atual é a emissão biogênica de combustão. Pelas regras do IPCC e do GHG Protocol ela é neutra.
   - A redução real tem duas partes:
     - (a) metano evitado em relação à linha de base de manejo, por exemplo lagoa anaeróbia, com fator de conversão de metano (MCF) do IPCC 2019 e GWP100 de 27–28 (AR6);
     - (b) deslocamento de diesel, gás natural ou eletricidade do grid (fator de emissão do SIN publicado pelo MCTI).
   - Para dejeto de suínos em lagoa, (a) costuma ser uma ordem de grandeza maior que o número exibido hoje. O erro, portanto, não é só de rótulo: subestima o principal benefício.
3. **CORS.** `backend/app/main.py:101-105` aceita qualquer `https://new-look*.vercel.app` ou `cp2b-maps*.vercel.app` com `allow_credentials=True`. Qualquer pessoa pode criar um projeto Vercel com esse prefixo. Como o JWT fica em localStorage, o risco imediato é baixo, mas a regra é desnecessária: o deploy é só na VM. **Ação:** remover a regex ou restringi-la a nomes exatos.
4. **Dados pessoais na calculadora.** `routers/calculator.py` (~linha 105) guarda IP, user-agent e referrer, embora o módulo declare minimização. **Ação:** guardar só um hash truncado com TTL, ou não guardar.
5. **Endpoint de debug público:** `/municipalities/test-geometry`. **Ação:** remover ou proteger.

> Esses cinco itens custam pouco (de dias a 2 semanas) e protegem o ativo mais valioso, a confiança.
> Devem vir **antes** de qualquer funcionalidade nova.

---

## 2. Movimento 1: credibilidade auditável (nov/2026 a fev/2027)

**Objetivo:** qualquer número exibido pelo PILAR-2b tem **um** valor oficial, **uma** proveniência clicável e **um** intervalo de incerteza.

### 2.1 Registro de Números Oficiais (`official_figures`)

- Uma tabela, com um YAML gêmeo em `data/canonical_parameters/official_figures.yaml`. Campos: `id`, `valor`, `unidade`, `escopo`, `ano_base`, `método` (Atlas-FDE | CP2b-v5.1 | Teórico), `versão`, `hash_dos_insumos`, `DOI`, `substitui`.
- Landing, painel do mapa, dossiê, patch notes e paper **leem daqui**. Um teste de CI falha se algum literal numérico de potencial aparecer hardcoded no frontend. A varredura AST de português é o precedente para esse teste.
- Resolve, de uma vez:
  - **a colisão de nomes no "Cenário Real".**
    - O mapa mostra Real = **5,97 bi** Nm³ CH₄/ano, que é o CP2b N4 (`DesktopLeftPanel.tsx:647-652`, via `/statistics/summary`).
    - `METODOLOGIA_CENARIOS_SP_2026-07-30.md` e `SP_TOTAIS_CONSOLIDADOS` chamam de Real **7,83 bi**, que é o Atlas-FDE.
    - São dois números diferentes com o mesmo rótulo. Pelo menos um precisa ser renomeado, por exemplo "Real (CP2b N4)" e "Real Atlas".
    - O 19,9 bi teórico legado já foi tirado da manchete; falta este passo.
  - a proliferação de números;
  - o risco de o manuscrito citar pares velhos (A18 §1.3).

### 2.2 Abrir o CP2b v5.1

- Publicar no Zenodo `cp2b_pacote_plataforma.py` e o snapshot de fatores (FC, FCo, U, FS e FL espacial), com DOI, mesmo sob embargo até o paper sair. O hash já existe.
- Se o embargo for inegociável: publicar ao menos o **hash, o schema e um "cartão do método"** de uma página. O teste de reprodutibilidade fica no CI privado e o resultado é exibido como selo na página do método.
- Unificar os cinco usos conflitantes de FC, FCo, FS e FL (auditoria §8.1) num glossário normativo, com um teste que impede a reintrodução de `(1 − FCp)`.

### 2.3 Incerteza de verdade

- **Monte Carlo sobre os fatores**, com distribuições triangulares a partir de min/med/max e correlação explícita entre fatores do mesmo setor.
  - Roda **offline** no script de carga; não pesa no servidor.
  - Grava P10, P50 e P90 por município × substrato.
  - O mapa ganha uma opção "mostrar faixa P10–P90" e hachura de baixa confiança. A hachura já está prevista no playbook de outubro.
- **Sensibilidade global (Sobol, com SALib)** em escala estadual.
  - Gera um gráfico tornado: "o que mais move o número de SP".
  - O resultado vira **agenda de pesquisa** para o CP2B: medir primeiro o que mais importa.
- **Protótipo já feito:** `analysis/build_sp_real_uncertainty.py`, com resultados em `analysis/outputs/sp_real_uncertainty/` e teste em `tests/test_sp_real_uncertainty.py`.
  - Reproduz o Real publicado fluxo a fluxo, com Monte Carlo de 200 mil amostras e Sobol de Saltelli/Jansen só com numpy, em cerca de 5 s.
  - Resultado com as faixas provisórias: **P10 7,30 · P50 8,06 · P90 8,89 bi Nm³ CH₄/ano**. O número publicado (7,83) fica no percentil 36, ou seja, é levemente conservador.
  - **Ranking por índice total (ST):**
    1. BMP da palha de cana: 0,24
    2. fração removível da palha: 0,17
    3. kg de esterco bovino coletável por dia: 0,15
    4. BMP bovino: 0,14
    5. palha por tonelada de cana: 0,11
    6. retenção de milho, soja e silvicultura: 0,10
  - **A palha de cana sozinha responde por cerca de 50 % da variância.** A hipótese inicial apostava na fração de milho e soja; ela pesa, mas menos.
  - Agenda de medição que sai daí: BMP de palha com pré-tratamento realista, fração de recolhimento em usinas reais (CTC, UNICA) e esterco coletável por sistema de manejo.
  - O FDE = 1,0 da vinhaça é uma escolha **estrutural**, não um parâmetro, e precisa de análise de cenário à parte.

### 2.4 Validação empírica fechada

- Popular `validation_plants` com ANP (biometano autorizado e produção mensal 2020–2026) e ANEEL GD/SIGA. Os builders já existem em `analysis/build_anp_biometano_dataset.py` e `analysis/build_aneel_biogas_gd.py`; falta uma fonte de ingestão `anp_biometano` com os 8 gates.
- **Índice de Realização Municipal (IRM)** = capacidade instalada ou produzida ÷ potencial Real (N4).
  - É o primeiro indicador de "monitoramento" e o mais citável.
  - **Protótipo já feito:** `analysis/build_sp_realization_index.py`, com saída em `analysis/outputs/sp_realization_index/` e teste em `tests/test_sp_realization_index.py`. Ele lê a produção mensal da ANP de 07/2022 a 04/2026.
    - Em 04/2026, SP produziu **118 mil m³/dia** de biometano, ou **IRM = 0,72 %** do Real que o mapa serve (CP2b N4, 16,36 M Nm³ CH₄/dia) e 0,55 % do Real Atlas.
    - A capacidade **autorizada** (558 mil m³/dia) equivale a 3,4 % do Real, mas operou a **21 %** no mês.
    - Manchete com dado: *"SP realiza menos de 1 % do seu potencial de biometano, e as plantas que já existem rodam a um quinto da capacidade"*. A lacuna é de realização (conexão, contrato, licenciamento), não de recurso.
    - As metas de 0,7 a 1,3 M m³/dia levariam o IRM a cerca de 4–8 %. O script acompanha isso mês a mês.
    - **Ressalva que muda a manchete:** o CIBiogás (Panorama 2025) registra 4,9 M Nm³/dia de **biogás** em SP, quase todo sucroenergético e usado para eletricidade. São 2,7–3,2 M Nm³ CH₄/dia, ou **16–19 % do N4**, 23 a 27 vezes o biometano. A manchete honesta é: *"SP já aproveita cerca de um sexto do seu metano, mas menos de 1 % chega à rede como biometano"*. A lacuna principal é de **rota** (eletricidade → biometano), e isso aponta para o CGOB e a TUSD-Verde, não só para plantas novas.
    - Antes de publicar, conferir se o U do CP2b (`existing_use_subtracted_ch4_nm3_year`) já inclui esse biogás. Se não incluir, o N4 está superestimado na mesma ordem.
- Validar uma amostra de usinas sucroenergéticas contra a vinhaça declarada (UNICA, CTC) para testar o FDE = 1,0.

### 2.5 Higiene de produto

- Tirar da landing toda promessa não entregue, ou entregar: exportação CSV/GeoJSON já existe atrás de `DATA_EXPORT_ENABLED`.
- O fallback silencioso para dados vazios em `geospatialClient.ts:15-80` deve virar estado de erro visível ("dados indisponíveis, tente de novo"). Um mapa vazio que parece válido é pior que um erro.
- `settings/page.tsx` simula salvar 2FA e notificações. Remover até existir de verdade.

**Critério de saída do Movimento 1:**
- 100 % dos números exibidos vêm de `official_figures`;
- P10–P90 publicados para SP;
- IRM visível no mapa;
- MG reemitido com PPM real ou rebaixado a "exploratório";
- os itens da §1.3 resolvidos.

---

## 3. Movimento 2: da biomassa ao projeto (mar a ago/2027)

O setor não compra "potencial municipal"; compra **local de planta + escala + custo + receita + carbono**. Este movimento transforma o atlas em ferramenta de pré-viabilidade.

### 3.1 Superfície de custo logístico (o FL que falta)

- Grade **H3 resolução 7** (cerca de 5 km²) ou 8, como previsto para dezembro em `2027_GRID_SITING_DESIGN.md`. Biomassa por hexágono:
  - PAM e PPM desagregados por uso do solo MapBiomas, isto é, mapeamento dasimétrico: cana em pixels de cana, pasto em pixels de pasto;
  - pontos conhecidos (usinas, ETEs, aterros, abatedouros com SIF, granjas licenciadas pela CETESB).
- **Custo de transporte em R$/t·km** sobre a malha viária OSM/DNIT, com tempo de viagem calculado offline por OSRM ou Valhalla em contêiner. Parâmetros separados para dejeto líquido, sólido e vinhaça, porque a densidade energética é muito diferente e o caminhão de chorume não é o caminhão de palha.
- Resultado: **curva de oferta de biomassa** para qualquer ponto ("quanto CH₄ chega a este ponto a menos de X R$/Nm³"). Esse é o FL espacial de verdade, e substitui o FL = 1,0.

### 3.2 Localização ótima de plantas (MCDA + location-allocation)

- **Etapa A, adequação:** MCDA com pesos configuráveis pelo usuário (MCDA configurável está no "Planned" do CHANGELOG). Critérios:
  - distância a gasoduto (Comgás, Necta e a distribuidora da área Sul) e à TUSD-Verde;
  - distância a subestação com folga;
  - áreas restritas (CNUC, FUNAI, APP);
  - declividade;
  - distância a núcleo urbano (odor).
- **Etapa B, alocação:** p-mediana capacitada ou MCLP com `PuLP`/`OR-Tools` sobre os hexágonos candidatos. Restrição de escala mínima por rota: biometano viável a partir de cerca de 10–15 mil Nm³/dia; geração distribuída a partir de cerca de 300 kW.
- **Saída: "Mapa de Oportunidades"**, com N clusters de oferta e a planta ideal de cada um: tamanho, mix de substratos, raio de captação, custo médio de biomassa entregue.
- **Diferencial:** o mix de substratos vem do motor de co-digestão que já existe (`codigestion_service.py`), agora com C:N harmonizada pela Fase 1 do `DOSSIE_SP_INTEGRACAO_MAPA.md`.
- **Protótipo já feito** (`analysis/build_sp_opportunity_sites.py`, saída em `analysis/outputs/sp_opportunity_sites/`). Cobertura máxima gulosa sobre a oferta Real por município, com raio de captação por fluxo (palha 30 km, dejetos 15 km, RSU 50 km, vinhaça/torta/esgoto só no próprio município) e escala mínima de 15 mil Nm³/dia:
  - 265 sítios capturam 88 % da oferta modelada; sítio mediano de 38 mil Nm³/dia;
  - os maiores sítios são dominados por palha de cana (Taquaral, Morro Agudo, Barra Bonita), o que reforça que a palha é ao mesmo tempo a maior oportunidade e a maior incerteza (Sobol, §2.3);
  - validação contra as 9 plantas ANP de SP: os 30 maiores sítios ficam a até 30 km de 3/9 plantas (33 %), contra 21 % de uma linha de base aleatória. É indício, não validação; a Etapa A (gasoduto, restrições) é o que falta para discriminar.

### 3.3 Motor tecno-econômico no backend (versionado)

- Mover `calculatorEngine.ts` para um serviço Python `techno_economics.py` com parâmetros em `data/canonical_parameters/economics.yaml`, versionado e com fontes:
  - CAPEX e OPEX por rota e escala (curvas de escala com expoente aproximado de 0,6–0,7);
  - tarifas (CCEE PLD, TUSD, Arsesp);
  - preço do biometano, CGOB, CBIO e crédito voluntário;
  - câmbio.
- Saídas: VPL, TIR, payback, **LCOE e custo nivelado do biometano (R$/MMBtu)** comparado ao gás natural do city-gate. A comparação com o city-gate é o número que o comprador entende.
- Uma única fonte para a calculadora, o dossiê e o Mapa de Oportunidades. Elimina os três modelos de cenário divergentes no frontend.

### 3.4 Módulo de carbono (GEE) com metodologia reconhecida

- **Linha de base por substrato:**
  - dejetos: MCF do IPCC 2019 por sistema de manejo (lagoa, esterqueira, a pasto);
  - RSU: modelo FOD de aterro;
  - esgoto: tratamento anaeróbio sem queima;
  - vinhaça: N₂O da fertirrigação.
- **Projeto:**
  - escape no upgrading (*methane slip*, hoje ignorado);
  - queima incompleta no flare;
  - transporte;
  - deslocamento de fósseis (diesel em frota, GNV, grid do SIN).
- **Saídas em tCO₂e/ano por município e por planta candidata**, com alinhamento a:
  - **CGOB** (ANP Res. 995/996);
  - **RenovaBio/CBIO** (nota de eficiência energético-ambiental do RenovaCalc para biometano);
  - **mercado voluntário**: metodologias do CDM usadas no mercado voluntário (AMS-III.D para dejetos, AMS-III.H para efluentes, ACM0001 para aterros) e o certificado paulista em consulta pública.
- Validar contra o **SEEG** municipal (agropecuária e resíduos). O SEEG publica emissões por município e o PILAR-2b pode mostrar "**% das emissões de metano do município que o biogás poderia abater**". Essa é uma métrica inédita e de alto apelo para prefeituras.

### 3.5 Digestato e nutrientes (a segunda receita esquecida)

- Substituir o `digestato = 0,75 × massa` por um **balanço N-P-K** por substrato. Os dados de N, P e K de dejetos e vinhaça já existem na literatura do corpus.
- Saída: **toneladas de N, P₂O₅ e K₂O equivalentes por município**, em R$ a preço de fertilizante importado (ComexStat), e "**% da demanda de fertilizante do município atendível por digestato**". A demanda vem de área PAM × recomendação de adubação do IAC Boletim 100.
- É o momento certo:
  - a CIBiogás afirma que nenhuma planta no Brasil valoriza o digestato por recuperação de nutrientes;
  - o Plano Nacional de Fertilizantes ainda não trata o tema;
  - o acordo SEMIL–Swedfund (jan/2026) inclui estudar o digestato.
  - O PILAR-2b pode ser **a base de evidência** dessa regulamentação.
- **Protótipo já feito** (`analysis/build_sp_digestate_nutrients.py`, saída em `analysis/outputs/sp_digestate_nutrients/`). Ele mudou a tese desta seção:
  - o digestato do Cenário Real carrega cerca de 381 mil t de N, 249 mil t de P₂O₅ e 826 mil t de K₂O por ano, o equivalente a 53 %, 72 % e 96 % da demanda das lavouras de SP (sem pastagem);
  - mas **81 % desse valor vem de fluxos que já voltam ao solo hoje** (vinhaça, torta, dejetos). O biodigestor preserva esses nutrientes, não os cria; contá-los como receita é dupla contagem;
  - **a remoção de palha exporta** cerca de 122 mil t de K₂O e 65 mil t de N por ano (R$ 794 mi a preço de importação). É um custo que nenhum cenário registra, e o digestato é a forma de devolvê-lo;
  - **o nutriente novo vem do RSU** (R$ 328 mi/ano hoje aterrados): o argumento de economia circular para prefeituras.
  - Consequência: a calculadora deve separar o digestato em **valor preservado**, **reposição obrigatória** e **nutriente novo**. Coeficientes, recomendações e preços estão marcados `conferir` no script.

### 3.6 Biometano na rede: casar oferta e demanda

- Camadas de **demanda**:
  - frota pesada (ANTT e RNTRC por município, garagens de ônibus municipais);
  - indústrias consumidoras de gás (RAIS/CNAE com intensidade energética);
  - postos de GNV;
  - pontos de entrega da distribuidora.
- **"Corredores de biometano":** trechos de rodovia (por exemplo, Anhanguera, Washington Luís, Raposo Tavares) onde a oferta de biomassa a menos de X km e a demanda de frota se sobrepõem. É o tipo de mapa que a SEMIL usa no Plano Estadual de Energia 2050, que aponta o transporte como principal vetor.
- Para municípios como Presidente Prudente, que se prepara para 100 % de biometano no transporte público: um "**simulador de autossuficiência municipal**" (frota × consumo vs. potencial Real em um raio).

**Critério de saída do Movimento 2:**
- Mapa de Oportunidades publicado para SP, com pelo menos 20 clusters candidatos;
- motor econômico e de carbono único servindo calculadora e dossiê;
- balanço NPK por município;
- um estudo de caso validado com um parceiro real (usina, cooperativa ou prefeitura).

---

## 4. Movimento 3: monitoramento vivo (set/2027 em diante)

### 4.1 Séries temporais e a pergunta "o que mudou?"

- Rodar o potencial **por ano, de 2008 a 2025**. PAM e PPM já estão no schema `bbp` com gates de 2008 a 2025 (PR #240).
- Novo controle no mapa: um **seletor de ano** com "animação".
- **Mapa de tendência:** Theil-Sen por município com teste de Mann-Kendall, para mostrar onde o potencial cresce e onde cai.
- **Variabilidade interanual como risco de suprimento.** A quebra de safra de cana de 2011 é o caso didático. Um coeficiente de variação por município entra direto no motor econômico como risco de oferta.

### 4.2 Sazonalidade mensal

- Implementar o que está só no papel em `docs/data/dynamics/*`:
  - moagem quinzenal da UNICA (vinhaça e torta só na safra, de abril a novembro);
  - calendário agrícola da CONAB;
  - PLD horário da CCEE.
- Saída: **curva mensal de oferta por cluster**, e com ela o **dimensionamento de armazenamento** ou a **co-digestão complementar na entressafra**. Exemplo: vinhaça na safra mais dejeto e resíduo urbano na entressafra. Isso transforma a sazonalidade, hoje FS = 1,0, num argumento de projeto.

### 4.3 Sensoriamento remoto como fonte de dados (não como enfeite)

- **Detecção de colheita de cana com Sentinel-2** (NDVI ou índice de solo exposto em série de 5 dias) via Google Earth Engine ou openEO. Dá o calendário real de palha disponível por talhão, hoje uma premissa.
- **Mapeamento de granjas e lagoas de dejeto** por detecção de objetos em imagem de alta resolução (CBERS-4A WPM a 2 m, gratuito pelo INPE), cruzado com o licenciamento da CETESB. Permite estimar dejeto **por ponto**, não só por município.
- **Metano por satélite.** Os dados do TROPOMI/Sentinel-5P e as plumas do Carbon Mapper e do MethaneSAT, quando públicos, servem de camada de "**hotspots de emissão de metano**" sobre aterros e grandes confinamentos. Cada hotspot vira uma oportunidade de projeto.

### 4.4 Observatório e alertas

- **Painel "Observatório do Biometano SP":**
  - plantas autorizadas pela ANP (mensal);
  - produção (mensal);
  - IRM por região;
  - leilões e chamadas públicas;
  - CGOB emitidos, quando houver registro público.
- **Alertas por e-mail.** A infraestrutura de newsletter com consentimento já existe. Exemplo: "nova planta autorizada no seu raio de interesse" ou "seu município mudou de faixa de potencial".
- **Atualização automatizada com humano no circuito.** Hoje, `fetch()` só verifica se o snapshot existe. Proposta:
  - uma GitHub Action mensal baixa as fontes com API estável (SIDRA, ANP, ANEEL);
  - roda os 8 gates em staging;
  - **abre um PR** com o relatório de ingestão.
  - A promoção continua manual (o princípio do `ingest/README.md` se mantém), mas o trabalho de buscar e validar deixa de ser.

---

## 5. Ideias criativas (novas, além do `FUTURE_VISION`)

Cada ideia diz o problema que resolve, por que agora, e o esforço (**P** ≤ 2 semanas · **M** 1–2 meses · **G** 3–6 meses).

| # | Ideia | O que é | Por que agora / diferencial | Esforço |
|---|---|---|---|---|
| C1 | **"Prova de lastro" para CGOB** | Dado um produtor de biometano, o PILAR-2b emite um relatório verificável: biomassa disponível no raio, consistência entre produção declarada e oferta física, intensidade de carbono estimada. | As Resoluções ANP 995/996 exigem critérios de lastro, e o mercado teme fraude e baixa liquidez. Ninguém tem uma base pública e independente de oferta física. | M |
| C2 | **Cartão de pré-viabilidade para editais** | Um PDF de 2 páginas com o formato pedido por BNDES Fundo Clima, FINEP e Desenvolve SP: potencial, carbono, NPK, custo, referências com DOI. | O dossiê municipal já gera PDF; é uma extensão. Reduz semanas de consultoria para minutos. | P |
| C3 | **"Gêmeo de bacia de suprimento"** | Para uma planta existente ou planejada: simulação mensal de 10 anos da oferta no raio, com variabilidade interanual (§4.1) e sazonalidade (§4.2). Saída: P90 de suprimento, que é o número que o financiador usa. | O conceito de P90 vem da eólica e da solar; para biomassa no Brasil não existe ferramenta pública. | G |
| C4 | **Mercado de resíduos (matchmaking, sem transação)** | Geradores (abatedouro, laticínio, CEASA) e consumidores (plantas de biogás) se cadastram com consentimento. O mapa sugere pares por distância, C:N e volume. | O motor de co-digestão e o pareamento por C:N já existem. Os resíduos agroindustriais que faltam no inventário (soro, efluente de abatedouro, manipueira, cervejaria) entram **pelo cadastro**, tapando um buraco do inventário. | M |
| C5 | **Índice de Prontidão Municipal para Biogás (IPMB)** | Um score de 0 a 100 que combina potencial, infraestrutura, capacidade institucional (SICONFI, consórcio intermunicipal de resíduos), demanda e IRM, com um painel "por que este score". | Já planejado para novembro (*readiness score*). A proposta é torná-lo **o** ranking público anual, com lançamento em evento (ABiogás, Fórum do Biogás). Gera mídia e backlinks. | M |
| C6 | **Pergunte ao PILAR (assistente com citação obrigatória)** | Consulta em linguagem natural sobre a API ("quais municípios do oeste paulista têm mais de 50 mil Nm³/dia de dejeto suíno a 20 km de gasoduto?"). **Toda resposta cita** `official_figures` e o DOI do parâmetro. | O "Bagacinho IA" está planejado, mas sem desenho. O diferencial é a recusa: o assistente nunca gera um número que não esteja no registro. Exige o Movimento 1 antes. Precisa de base legal LGPD e de `RESPONSIBLE_AI.md`, já planejado. | M |
| C7 | **Servidor MCP público do PILAR-2b** | Expor a API como ferramentas MCP (`get_municipality_potential`, `find_sites`, `get_reference`). | Pesquisadores e consultores já usam assistentes de IA; ser a fonte citável dentro deles é distribuição gratuita. É barato: é um invólucro da API FastAPI. | P |
| C8 | **Plugin QGIS + pacote Python `pilar2b`** | `pip install pilar2b`, e então `pilar2b.municipio(3509502).potencial(cenario="real", p=[10,50,90])`. | Os analistas de consultorias e da CETESB vivem no QGIS e no Python. O OGC API (pygeoapi) está planejado; o pacote é a camada de experiência por cima. | P–M |
| C9 | **Modo "Educação" (PILAR-Edu) com dados reais** | Roteiros de aula para engenharia ambiental e agronomia ("calcule o potencial de Piracicaba e compare com o mapa"), com gabarito gerado pela API. | A rota tecnológica educativa (`technology_routes.py`) e o mascote Metaninho já existem. Transforma universidades em usuários recorrentes. | P |
| C10 | **"Índice de Lacuna" para jornalistas** | Uma página de dados abertos atualizada mensalmente: "SP realiza X % do potencial; os 10 municípios com maior lacuna". Inclui gráfico incorporável (iframe) com licença CC-BY. | O dado vira notícia; a notícia vira tráfego e influência em política pública. | P |
| C11 | **Cenários de política** | Botões do tipo "e se a TUSD-Verde reduzir o custo de conexão em X?", "e se o CBIO valer R$ Y?", "e se o mandato chegar a Z %?". O motor econômico recalcula o Mapa de Oportunidades. | O mandato do Combustível do Futuro começa em 2026 com metas crescentes. Reguladores precisam ver o efeito territorial das metas. | M |
| C12 | **Aterros como "minas de metano"** | Uma camada dedicada de aterros (SINIR e CETESB, Inventário Estadual de Resíduos) com modelo FOD, idade e capacidade. Mostra quais estão **sem** captura de gás. | O biogás de aterro é a maior parte do biometano em operação em SP e está ausente como rota separada no inventário atual. | M |
| C13 | **Vinhaça concentrada e biometano em usinas** | Um módulo específico para o sucroenergético: biodigestão de vinhaça + torta + palha por usina (cadastro UNICA/ANP), com o caso da Raízen Bonfim e da Cocal como validação. | A vinhaça domina o potencial agrícola de SP (5,77 bi Nm³). O setor tem caixa e interesse; é o caminho mais curto para usuário pagante e parceiro de dados. | M |
| C14 | **Selo de dados "PILAR-verified"** | Fontes externas (cooperativas, prefeituras) enviam dados de geração de resíduo. Passam pelos 8 gates e recebem selo e DOI próprio. | Reaproveita o contrato de ingestão como serviço. Cria uma rede de colaboradores de dados, o efeito de rede que falta a um projeto acadêmico. | G |
| C15 | **Expansão "estado-parceiro"** | Em vez de cobrir o Brasil inteiro com parâmetros fracos, replicar o modelo SP **com um parceiro científico por estado** (MG com a UFV ou a UFMG, PR com a CIBiogás, GO com a Embrapa). | Resolve o problema documentado de "parâmetros fracos fora de SP" (ver `BRAZIL_EXPANSION_ROADMAP.md`) e compartilha o custo de manutenção. | G |

**Protótipo de C11 já feito** (`analysis/build_sp_mandate_coverage.py`), com os volumes oficiais que o painel `/mandate` da plataforma também mostra (C26):
- a meta de 2026 (0,5 %, CNPE 4/2026) pede 0,50 M m³/dia de biometano, e a de 2027 (1 %, Portaria MME 942/2026, em consulta pública) pede 1,00 M. A produção nacional de abril de 2026 cobre 88 % da primeira e 45 % da segunda;
- **o biogás que SP já queima para eletricidade cobriria cerca de 3 vezes a meta de 2027**. A troca de rota (motor-gerador → purificação) em plantas existentes é o caminho mais curto para o mandato, e o mapa dessas plantas com a receita de CGOB que a troca destrava é um produto óbvio para a Mesa de Monitoramento;
- o N4 de SP cobriria 3,3 vezes a trajetória indicativa de 2030 (5 %): o recurso não limita nenhum patamar discutido.

---

## 6. Posicionamento e público

| Público | Pergunta-chave | Produto PILAR-2b | Métrica de sucesso |
|---|---|---|---|
| Governo (SEMIL, ANP, Arsesp, prefeituras) | "Onde a política deve agir? A meta está sendo cumprida?" | IRM, Observatório, IPMB, cenários de política | Citação em plano, nota técnica ou consulta pública |
| Investidores e desenvolvedores | "Onde construir, de que tamanho, com que risco?" | Mapa de Oportunidades, gêmeo de bacia (P90), cartão de pré-viabilidade | Projetos que citam o PILAR-2b em estudo de viabilidade |
| Comprador de biometano e CGOB | "Esse lastro é real? Qual a intensidade de carbono?" | Prova de lastro, módulo GEE | Relatórios de lastro emitidos |
| Academia | "Posso reproduzir e citar?" | Zenodo DOI, pacote Python, OGC API, MCP | Citações; downloads do DOI |
| Produtor rural e cooperativa | "Vale a pena para mim?" | Calculadora com motor único, mercado de resíduos | Cadastros com consentimento |
| Imprensa e sociedade | "Quanto o Brasil desperdiça?" | Índice de Lacuna, embeds | Matérias e backlinks |

**Frase de posicionamento proposta:**
*"PILAR-2b: o número auditável da bioeconomia. Onde está a biomassa, quanto dela vira energia, a que custo, e quanto carbono evita, com a fonte de cada parâmetro."*

---

## 7. Arquitetura que sustenta a estratégia

Princípios já decididos e mantidos: equipe pequena, dados estáticos com atualização anual (e agora mensal para ANP e ANEEL), pré-computar e pré-tilear, VM da UNICAMP, GPL-3.0.

1. **Pipeline de cálculo offline e versionado.** Um `make potential YEAR=2023 METHOD=cp2b-v5.1` que gera todas as tabelas derivadas (Monte Carlo, H3, custo, GEE, NPK). O servidor só lê. Isso mantém a VM leve e torna cada número reprodutível por hash.
2. **PMTiles + MapLibre**, já planejado. É o pré-requisito técnico de H3, séries temporais animadas e escala nacional. Sugestão: quebrar `MapComponent.tsx` em hooks (`useMapUrlState`, `useMapLayers`, `useScenario`) **durante** a migração, não antes. É uma refatoração com propósito, dentro da regra "sem refatoração especulativa".
3. **DuckDB + GeoParquet para os artefatos de análise.** Arquivos versionados no Zenodo, legíveis direto pelo pacote Python e pelo QGIS, sem precisar de PostGIS para o usuário avançado.
4. **Um único motor de cálculo em Python.** O frontend nunca recalcula potencial, economia ou carbono; consome a API. Elimina `calculatorEngine.ts` e os três modelos de cenário divergentes.
5. **Atualização com PR automático** (§4.4) e **CI de reprodutibilidade**: um job que recalcula SP a partir do snapshot e compara com `official_figures` pelo hash.
6. **Limpeza de dívida que bloqueia a estratégia:**
   - unificar os diretórios de migração (`migrations/` legado vs `app/migrations/`) e ter `schema_migrations` completa na VM;
   - um só rate limiter;
   - remover a duplicação geospatial vs municipalities;
   - tirar o fallback silencioso de mock.

---

## 8. Roadmap integrado (proposta)

| Trimestre | Entregas | Depende de |
|---|---|---|
| **T4/2026** (nov–dez) | Os itens de integridade da §1.3. `official_figures`. Fim das promessas falsas da landing. Ingestão `anp_biometano`. `validation_plants` populada. IRM no mapa. O que já está nos playbooks de novembro e dezembro (*data freeze*, papers). | — |
| **T1/2027** | Monte Carlo + Sobol para SP. CP2b v5.1 no Zenodo. Glossário normativo de fatores. PMTiles + MapLibre. Motor econômico e de carbono no backend (v1, para a calculadora). | `official_figures` |
| **T2/2027** | Grade H3 + dasimetria MapBiomas. Custo logístico OSRM. Balanço NPK. Camada de aterros. MCP + pacote Python. | MapLibre, motor único |
| **T3/2027** | Mapa de Oportunidades (MCDA + alocação). Corredores de biometano. Cartão de pré-viabilidade. IPMB, primeira edição. | H3, custo, GEE |
| **T4/2027** | Séries 2008–2025 + seletor de ano. Sazonalidade mensal. Observatório + alertas. Prova de lastro, piloto com um produtor. | Séries `bbp`, ANP mensal |
| **2028** | Sensoriamento remoto (colheita, granjas, metano). Gêmeo de bacia P90. Expansão estado-parceiro (MG primeiro, refeito com PPM). Mercado de resíduos. | Tudo acima |

**O que deixar para depois, de propósito:**
- o atlas global (FAOSTAT);
- SAF, H₂ e biochar como rotas completas;
- marketplace com transação financeira;
- cobertura nacional "rasa" de todos os 5.571 municípios com parâmetros de SP.

Cada um desses dilui o ativo de credibilidade antes de ele estar consolidado.

---

## 9. Indicadores de sucesso (para o CP2B acompanhar)

| Indicador | Meta fim de 2027 |
|---|---|
| Números exibidos com proveniência no `official_figures` | 100 % |
| Municípios com intervalo P10–P90 publicado | 645 (SP) |
| Fontes com atualização por PR automático | ≥ 4 (SIDRA PAM, SIDRA PPM, ANP, ANEEL) |
| Citações em documento de governo (SEMIL, ANP, Arsesp, prefeituras) | ≥ 3 |
| Projetos ou estudos de viabilidade de terceiros que citam o PILAR-2b | ≥ 5 |
| Downloads do DOI Zenodo + instalações do pacote Python | ≥ 500 |
| Erro do potencial vs. realizado em plantas maduras (MAPE, onde houver dado) | publicado, qualquer valor |
| Usuários recorrentes mensais (analytics anônimo já existente) | linha de base em dez/2026, +3× até dez/2027 |

---

## 10. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Embargo do paper impede abrir o CP2b | Publicar hash, cartão do método e teste de reprodutibilidade agora; o DOI completo sai com o paper. |
| O número de MG já circulou externamente | Errata proativa com a regra de SP. Transparência é mais barata que contestação. |
| Equipe de uma pessoa | Os Movimentos 2 e 3 só começam com bolsista ou parceiro (BEPE/DBFZ, estado-parceiro). Priorizar por alavancagem: `official_figures` e o motor único reduzem a manutenção futura. |
| Dependência de dados que mudam de formato (SNIS → SINISA, MapBiomas C8 → C10) | Os 8 gates mais o PR automático detectam a mudança, em vez de falhar em silêncio. |
| Uso indevido como "laudo" | Cada saída carrega a faixa P10–P90, a data e um aviso de pré-viabilidade, e nunca substitui o estudo de campo. |
| Assistente de IA alucinando números | O assistente só responde com valores de `official_figures` e recusa o resto. É testado por um conjunto de perguntas-armadilha no CI. |

---

## Fontes externas consultadas (out/2026)

- Mandato de biometano, CGOB e Resoluções ANP 995/996: [eixos: os próximos passos do biometano no Combustível do Futuro](https://eixos.com.br/newsletters/dialogos-da-transicao/os-proximos-passos-do-biometano-no-combustivel-do-futuro/), [Machado Meyer: resoluções da ANP sobre o CGOB](https://www.machadomeyer.com.br/pt/imprensa-ij/resolucoes-da-anp-sobre-cgob-avancam-mas-lacunas-para-biometano-persistem), [ANP: estudo de fungibilidade do CGOB](https://www.gov.br/anp/pt-br/assuntos/descarbonizacao-transicao-energetica/arquivos-estudos-relatorios-e-seminarios/fungibilidade_cgob_gogas_gas_rec_20260425_lca.pdf)
- Política paulista (TUSD-Verde, acordo com a Suécia, certificado estadual, metas): [SEMIL: acordo com o governo sueco](https://semil.sp.gov.br/2026/01/sao-paulo-firma-acordo-com-governo-sueco-para-pesquisas-que-ampliem-a-oferta-e-a-infraestrutura-de-biometano-no-estado/), [eixos: consulta pública da certificação estadual](https://eixos.com.br/gas-natural/biogas/governo-de-sao-paulo-abre-consulta-publica-para-certificacao-estadual-de-biometano/), [AutoData: SP vai quase duplicar a produção até 2027](https://www.autodata.com.br/mobility/2026/07/21/sao-paulo-vai-quase-duplicar-a-producao-de-biometano-ate-2027/129939/)
- Panorama do setor e ferramentas existentes: [Cenário Energia: 1.803 plantas](https://cenarioenergia.com.br/2026/04/20/biogas-avanca-no-brasil-com-1-803-plantas-e-impulsiona-nova-fronteira-energetica-com-biometano/), [O Presente Rural: mapeamento da ABiogás](https://opresenterural.com.br/abiogas-lanca-mapeamento-estrategico-para-ampliar-acesso-a-financiamentos-e-politicas-de-incentivo-ao-biogas-e-biometano/), [GIE/EBA: European Biomethane Map](https://www.gie.eu/press/europe-surpasses-1600-biomethane-plants-gie-and-eba-release-2025-european-biomethane-map/)
- Digestato e fertilizantes: [eixos: biogás mira fertilizantes](https://eixos.com.br/newsletters/dialogos-da-transicao/biogas-mira-fertilizantes-como-nova-fronteira-economica/), [eixos: potencial de fertilizantes negligenciado](https://eixos.com.br/eventos/potencial-de-producao-de-fertilizantes-na-industria-do-biogas-foi-negligenciado-diz-ceo-da-bley-energias/)
- Emissões municipais: [SEEG 13: Resíduos](https://seeg.eco.br/wp-content/uploads/2026/01/SEEG13-NM-RESIDUOS-BR.pdf), [SEEG 13: Agropecuária](https://seeg.eco.br/wp-content/uploads/2026/01/SEEG13-NM-AGROPECUARIA-BR.pdf)
- Localização de plantas e sensoriamento: [Applied Energy 2026: otimização multiobjetivo de localização](https://avesis.inonu.edu.tr/yayin/08130909-2d6d-49a5-9e3d-769bbdb11a94/multi-objective-optimization-of-biogas-plant-siting-using-gis-based-suitability-mapping-xai-driven-machine-learning-and-network-constrained-logistics), [Remote Sensing 16(5):750: biomassa de cana com Sentinel-1/2](https://iris.unito.it/retrieve/9f3fc5c0-41b9-48a4-9b56-cb58a4399a1e/remotesensing-16-00750.pdf)
- Meta de 2026 e base de consumo do mandato: [Lefosse: CNPE publica resoluções sobre o mandato do biometano (meta de 0,5 % para 2026)](https://lefosse.com/noticias/alerta/cnpe-publica-resolucoes-sobre-mandato-do-biometano-para-reducao-de-emissoes-de-gases-de-efeito-estufa-no-mercado-de-gas-natural-percentual-minimo-de-biodiesel-e-combate-ao-uso-irregular-de-etanol/), [eixos: governo publica meta de descarbonização do gás natural com biometano](https://eixos.com.br/combustiveis-e-bioenergia/biocombustiveis/governo-publica-meta-de-descarbonizacao-do-gas-natural-com-biometano/), [Poder360: consumo de gás natural no Brasil cresce 3,8 % em 2025 (Abegás, 54,4 M m³/dia)](https://www.poder360.com.br/poder-infra/consumo-de-gas-natural-no-brasil-cresce-38-em-2025/), [MME: Portaria 942/2026 (meta de 2027 em consulta pública)](https://www.gov.br/mme/pt-br/acesso-a-informacao/legislacao/portarias/2026/portaria-mme-n-942-2026.pdf), [CNPE: Resolução 4/2026](https://www.gov.br/mme/pt-br/assuntos/conselhos-e-comites/cnpe/resolucoes-do-cnpe/2026/resolucao-4-publicada.pdf)
