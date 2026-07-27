# B-URG-4c — saneamento final das superfícies

**Data de referência:** 2026-07-29
**Branch:** `fix/canonical-consistency-2026-07`
**Escopo:** itens 2, 3 e 4 do B-URG-4, sem alteração de parâmetro canônico.

## 1. Item 2 — identidade pública da chave `rpo`

### 1.1 Decisão aplicada

A decisão de domínio fornecida para este lote foi aplicada sem reabertura:
`rpo` representa `PODA_URBANA`, isto é, poda urbana/resíduo verde. O
mapeamento efetivo permaneceu inalterado em
`backend/app/services/canonical_loader.py:65-66`; BMP, VS e demais parâmetros
também permaneceram inalterados.

### 1.2 Endereços verificados

O inventário do B-URG-4b §1.3 foi conferido antes da edição. Foram confirmados
os filtros desktop e mobile, choropleth, heatmap, popup, perfil e página
municipal, comparador, export, proximidade, análise e codigestão. Também foram
conferidos os catálogos compartilhados e os dois componentes alternativos.

### 1.3 Antes/depois das strings públicas

| Superfície | Antes | Depois pt-BR | Depois en |
| --- | --- | --- | --- |
| Filtros desktop/mobile | `RPO` / `POW` | `Poda urbana` | `Urban pruning waste` |
| Choropleth e heatmap | `RPO` | `Poda urbana` | `Urban pruning waste` |
| Popup e perfil municipal | `RPO` / `RPO (Resíduos Orgânicos)` | `Poda urbana` | `Urban pruning waste` |
| Página municipal | `RPO` / `RPO (Resíduos Orgânicos)` | `Poda urbana (resíduo verde)` | `Urban pruning waste (green waste)` |
| Comparador | `RPO` | `Poda urbana` | `Urban pruning waste` |
| Cabeçalho do export | `RPO Biogas (m³/year)` | `Poda urbana Biogas (m³/year)` | `Urban pruning waste Biogas (m³/year)` |
| Resultado de proximidade | `RPO (Resíduos Orgânicos)` | `Poda urbana` | traduzido pela superfície consumidora quando aplicável |
| Catálogo de análise | `Resíduos Orgânicos` | `Poda urbana` | traduzido pela superfície consumidora quando aplicável |
| Codigestão | `Lodo de ETE` | `Poda urbana` | traduzido pela superfície consumidora quando aplicável |
| Modal de referências | `Lodo de ETE` | `Poda urbana` | componente ainda não internacionalizado |

Os componentes usam `messages/pt-BR.json` e `messages/en.json` nas superfícies
internacionalizadas. Os rótulos devolvidos diretamente pelo backend continuam
em pt-BR, conforme o contrato existente; não houve mudança de contrato da API.

### 1.4 Artefatos legados

- `_canonical_biomass_configs.py`: o registro antigo `rpo`/lodo foi marcado
  explicitamente como legado e impróprio para importação/publicação.
- `006_biomass_tons.sql`: os comentários antigos de lodo foram marcados como
  semântica legada de 2023 e não como definição de valor publicado.

Nenhum valor numérico foi alterado nesses artefatos.

### 1.5 Invariantes do item

- `feedstocks.yaml`: diff vazio.
- `STREAM_TO_CANONICAL`: diff vazio.
- BMP, VS, FDE e totais: sem alteração.
- A chave `rpo` e os campos `rpo_*`: preservados.

## 2. Item 3 — camada persistida legada

Pendente neste ponto do histórico.

## 3. Item 4 — marca de revisão metodológica

Pendente neste ponto do histórico.
