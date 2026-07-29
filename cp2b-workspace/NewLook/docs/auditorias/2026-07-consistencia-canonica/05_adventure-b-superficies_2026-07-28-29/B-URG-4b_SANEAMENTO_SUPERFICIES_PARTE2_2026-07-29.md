# B-URG-4b — Saneamento das superfícies, parte 2

**Data:** 2026-07-29
**Branch:** `fix/canonical-consistency-2026-07`
**Estado:** relatório parcial do item 2; itens 3 e 4 não executados.

## 1. Item 2 — chave `rpo`

### 1.1 Verificação dos endereços do gate

Os endereços centrais foram conferidos antes de qualquer edição:

| Evidência | Endereço verificado | Conteúdo real |
| --- | --- | --- |
| Mapeamento efetivo | `backend/app/services/canonical_loader.py:65-66` | `"rpo"` e `"rpo_pruning"` apontam para `PODA_URBANA`. |
| Configuração efetiva do mapa | `backend/app/services/biomass_availability.py:106-109` | `rpo` usa BMP 175 e VS úmido 47,85%, explicitamente descrito como poda urbana. |
| pt-BR | `frontend/messages/pt-BR.json:646` | `RPO (Resíduos Putrescíveis Orgânicos)`. |
| en | `frontend/messages/en.json:646` | `POW (Putrescible Organic Waste)`. |

As linhas 646 estavam corretas. Já a afirmação do A2c de que
`MapComponent.tsx` e `HeatmapLayer.tsx` exibiam por si mesmos o texto extenso
“putrescíveis” era imprecisa: os componentes usam a chave `rpo` e, no heatmap,
o rótulo curto `RPO`; o texto extenso está nos catálogos de mensagens e em
outras superfícies listadas abaixo.

### 1.2 Condição de parada: existe material putrescível canônico

Antes de editar os rótulos, o YAML foi inspecionado. Foram encontrados três
conceitos canônicos urbanos distintos:

| Código | Nome canônico | BMP médio | Semântica |
| --- | --- | ---: | --- |
| `PODA_URBANA` | Resíduo de poda urbana | 175 NmL/gVS | Poda, jardim e resíduo verde lignocelulósico |
| `ORGANICO_RSU` | Fração orgânica RSU | 270 NmL/gVS | Fração orgânica mista do RSU, não separada na fonte |
| `FORSU` | Fração orgânica dos RSU separada na fonte | 360 NmL/gVS | Orgânicos separados na fonte |

`ORGANICO_RSU` corresponde diretamente a material orgânico/putrescível e não
ocupa a camada `rpo`; `FORSU` é um segundo candidato orgânico, com semântica
própria. Assim, a instrução de parada da tarefa 3 foi acionada: trocar apenas o
rótulo para “poda urbana” escolheria implicitamente o mapeamento atual sem
resolver qual dos três conceitos a camada pública deve representar.

**Decisão deste item:** nenhuma string, mapeamento, BMP ou parâmetro foi
alterado. O defeito deve ser decidido como contrato/mapeamento de domínio antes
de uma correção textual.

### 1.3 Inventário das superfícies

#### Superfícies públicas ativas

| Superfície | Arquivo:linha | Rótulo atual | Campo/dado associado |
| --- | --- | --- | --- |
| Filtro do mapa — desktop | `DesktopLeftPanel.tsx:358-373` + `messages/*:300` | `RPO` / `POW` | `rpo` → métrica recalculada de `PODA_URBANA` |
| Filtro do mapa — mobile | `MobileBottomSheet.tsx:326-340` + `messages/*:300` | `RPO` / `POW` | idem |
| Choropleth/popup por resíduo | `MunicipalityLayer.tsx:149-163` | `RPO` | `rpo_biogas_m3_year` |
| Heatmap e tooltip | `HeatmapLayer.tsx:92-101` | `RPO` | `rpo_biogas_m3_year` |
| Pills do popup municipal | `MunicipalityPopup.tsx:217-227` + `biomassAvailability.ts:42` | `RPO` | `rpo_biomass_tons_year` |
| Perfil lateral do município | `MunicipalityProfilePanel.tsx:372-381` | `RPO (Resíduos Orgânicos)` | `rpo` |
| Página individual — gráfico | `municipality/[ibge_code]/page.tsx:185-196` | `RPO` | `rpo_biogas_m3_year` |
| Página individual — detalhe | `municipality/[ibge_code]/page.tsx:404-415` | `RPO (Resíduos Orgânicos)` | `rpo_biogas_m3_year` |
| Comparador municipal | `ComparisonPanel.tsx:97-101` | `RPO` | `rpo_biogas_m3_year` |
| Export CSV | `ExportControl.tsx:96-108,134` | `RPO Biogas (m³/year)` | `rpo_biogas_m3_year` |
| Resultado de proximidade | `backend/app/services/proximity_service.py:358-360` | `RPO (Resíduos Orgânicos)` | coluna `rpo_biogas_m3_year` |
| Catálogo da análise | `backend/app/api/v1/endpoints/analysis.py:570-579` | `Resíduos Orgânicos` | coluna `rpo_biogas_m3_year` |
| Matriz/serviço de codigestão | `backend/app/services/codigestion_service.py:51-52` | `Lodo de ETE` | código `lodo_primario_ete` sob a chave `rpo` |

#### Catálogos e componentes alternativos

Estes pontos também carregam a nomenclatura e precisam participar da decisão,
embora alguns sejam componentes antigos ou catálogos de apoio:

- `frontend/messages/pt-BR.json:300,646`
- `frontend/messages/en.json:300,646`
- `frontend/src/components/map/FloatingControlPanel.tsx:71`
- `frontend/src/components/map/LeftFilterPanel.tsx:58`
- `frontend/src/lib/biomassAvailability.ts:42`
- `backend/app/api/v1/endpoints/analysis.py:41`

Não foi encontrada legenda textual de `rpo` em `MapLegend.tsx` ou
`HeatmapLegend.tsx`. `MapComponent.tsx` transporta a chave e o campo, mas não
define o nome extenso.

### 1.4 Nova classe de contradição encontrada

Além da oposição prevista “poda” versus “putrescível”, existe uma terceira
semântica pública/operacional: **lodo de ETE**.

- `codigestion_service.py:52` associa `rpo` a `Lodo de ETE`.
- `_canonical_biomass_configs.py:29`, artefato gerado mas não usado pelo
  `RESIDUE_BIOMASS_CONFIGS` efetivo, ainda contém BMP 310 e VS 10,2 para `rpo`.
- `biomass_availability.py:47` conserva o comentário histórico `rpo/lodo`,
  embora a configuração efetiva das linhas 106–109 já seja poda.
- A migration `006_biomass_tons.sql:37` descreve
  `rpo_biomass_tons_year` como lodo de ETE.

Logo, a chave `rpo` possui hoje quatro leituras concorrentes no repositório:
acrônimo opaco, resíduo putrescível, poda urbana e lodo de ETE. O achado foi
registrado e não corrigido neste item por depender da decisão de mapeamento.

### 1.5 Tabela antes/depois

Como a condição expressa de parada foi satisfeita, o “depois” permanece igual
ao “antes”. Não há fonte de valor novo porque nenhuma mudança foi autorizada.

| Superfície | Antes | Depois neste item | Fonte efetiva preservada |
| --- | --- | --- | --- |
| Filtros desktop/mobile | `RPO` / `POW` | sem alteração | `rpo` → `PODA_URBANA` no loader |
| Choropleth, heatmap e tooltips | `RPO` | sem alteração | `rpo_biogas_m3_year` recalculado |
| Popup e perfil municipal | `RPO` / `RPO (Resíduos Orgânicos)` | sem alteração | campos `rpo_*` |
| Página municipal | `RPO` / `RPO (Resíduos Orgânicos)` | sem alteração | `rpo_biogas_m3_year` |
| Comparador | `RPO` | sem alteração | `rpo_biogas_m3_year` |
| Export CSV | `RPO Biogas (m³/year)` | sem alteração | `rpo_biogas_m3_year` |
| Proximidade | `RPO (Resíduos Orgânicos)` | sem alteração | coluna persistida `rpo_biogas_m3_year` |
| Análise | `Resíduos Orgânicos` | sem alteração | coluna `rpo_biogas_m3_year` |
| Codigestão | `Lodo de ETE` | sem alteração | `lodo_primario_ete` |

### 1.6 Ocorrências em documentação — listadas, não corrigidas

Não há ocorrência de `RPO` nos READMEs rastreados. Os documentos com sentido
orgânico, putrescível, lodo ou mistura semântica são:

- `docs/auditorias/2026-07-consistencia-canonica/04_adventure-a-fechamento_2026-07-28-29/A2c_DECOMPOSICAO_DIVERGENCIA_2026-07-28.md:62-77,119`
- `docs/auditorias/2026-07-consistencia-canonica/02_adventure-a_2026-07-27-28/A2b_CAMINHOS_CONSUMO_FORSU_2026-07-28.md:90-91`
- `docs/data/SCIENTIFIC_AUDIT_REPORT.md:193,195,403,407,467-470`
- `docs/data/OPEN_DATA_API_LANDSCAPE.md:30,100,229`
- `docs/data/dynamics/BIOMASS_SEASONALITY_SP.md:59`
- `docs/data/dynamics/WASTE_FLOW_DYNAMICS_SP.md:6,14`

Documentos que já tratam `rpo` explicitamente como poda foram preservados:
`A2d_IDENTIDADE_GERACAO_FORSU_2026-07-28.md` e
`A13_RANKING_COBERTURA_DUPLICIDADE_2026-07-29.md`.

### 1.7 Invariantes

- `feedstocks.yaml`: nenhuma alteração.
- Mapeamento `STREAM_TO_CANONICAL`: nenhuma alteração.
- Mensagens pt-BR/en: nenhuma alteração.
- Nenhum BMP, FDE ou total foi recalculado ou modificado.

## Parada do item 2

Item 2 encerrado sem correção textual porque `ORGANICO_RSU` e `FORSU` tornam a
escolha da camada uma decisão de domínio. Itens 3 e 4 não foram iniciados.
