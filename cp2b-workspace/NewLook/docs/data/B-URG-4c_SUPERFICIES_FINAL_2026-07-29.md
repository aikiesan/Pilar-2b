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

### 2.1 Endereços efetivamente encontrados

| ID | Endereço informado | Endereço/estado verificado antes da edição |
| --- | --- | --- |
| C2 | `municipalities.py:438` | O dicionário continha simultaneamente colunas persistidas e `canonical_metrics`; a rota `fields=map` já suprimia os campos legados, e o export está desabilitado por `DATA_EXPORT_ENABLED=false`. |
| C3/C4 | `geospatial.py:744` | O endpoint de detalhe lia diretamente todos os `*_biogas_m3_year` de `municipalities`. |
| C5 | `proximity_service.py:327` | A consulta selecionava e somava diretamente os campos persistidos. |
| C6 | `analysis.py:392` e aliases próximos de `:74` | `statistics/by-stream` lia `residue_streams_sp2023`; `statistics/by-category` fazia o mesmo. |

Foram encontrados três agregados auxiliares não destacados no gate:
`analysis/by-residue`, `analysis/statistics/by-region` e
`analysis/distribution`. Como ainda continham leitura legada e sua migração
segura não cabia no mesmo contrato, foram suprimidos com HTTP 503 explícito,
em vez de continuarem publicando o snapshot.

### 2.2 Solução aplicada

`MunicipalityMapMetrics.to_published_biogas_dict()` passou a produzir, a partir
do cálculo canônico, os nomes de compatibilidade ainda consumidos pelas
superfícies antigas. O carregamento de atividade PPM/SNIS e a conversão de
atividade em biomassa foram centralizados em `map_metrics.py`.

- C2: `fields=full` recebe os campos compatíveis recalculados; o controle de
  export continua suprimido pela feature flag existente.
- C3/C4: o endpoint de detalhe calcula antes de preencher o mesmo modelo
  Pydantic; não houve quebra do contrato da resposta.
- C5: cada município do raio é recalculado e só então agregado.
- C6: os totais por categoria e por stream são recalculados. As três rotas
  auxiliares inseguras foram suprimidas.
- `sync_db_canonical.py`: execução interrompida antes de abrir conexão, com
  mensagem DEC-020.
- `residue_streams_sp2023`: migration marcada como snapshot legado 2023,
  impróprio como fonte de valor publicado.

Execução literal da guarda:

```text
BLOCKED by DEC-020: sync_db_canonical.py consumes legacy residue_streams_sp2023 and cannot update published municipality values.
```

### 2.3 Execução da tabela de delta

O “antes” foi somado diretamente de
`analysis/data/01_master_residue_streams_SP_2023.csv`. O “depois” foi executado
com `compute_published_municipality_metrics()` sobre os 645 registros de
`docs/data/municipality_biomass_tons.csv`, usando população IBGE 2022 do
arquivo legado apenas como atividade demográfica, sem ler seu potencial.

Saída literal resumida da rota nova:

```text
cattle,257978692.06
citrus,131088135.42
coffee,10724092.98
corn,61701197.19
poultry,116244535.69
rpo,5857245.66
rsu,84154397.28
soybean,55115006.71
sugarcane,2435305765.39
swine,4668110.88
```

Tabela em m³ de biogás bruto por ano:

| Feedstock/camada | Antes legado | Depois canônico | Delta | Razão antes/depois | Superfícies |
| --- | ---: | ---: | ---: | ---: | --- |
| Café | 95.279.430 | 10.724.092,98 | -88,74% | 8,88× | C3/C4/C5/C6 |
| Milho | 1.361.216.163 | 61.701.197,19 | -95,47% | 22,06× | C3/C4/C5/C6 |
| Soja | 1.223.083.878 | 55.115.006,71 | -95,49% | 22,19× | C3/C4/C5/C6 |
| Cana agregada | 12.382.565.911 | 2.435.305.765,39 | -80,33% | 5,08× | C3/C4/C5/C6 |
| Florestal | 599.802.082 | suprimido | -100,00% | — | C3/C4/C5/C6 |
| Bovinos | 1.454.267.024 | 257.978.692,06 | -82,26% | 5,64× | C3/C4/C5/C6 |
| Aves | 308.529.800 | 116.244.535,69 | -62,32% | 2,65× | C3/C4/C5/C6 |
| Suínos | 603.292.940 | 4.668.110,88 | -99,23% | 129,24× | C3/C4/C5/C6 |
| Citros | 285.156.605 | 131.088.135,42 | -54,03% | 2,18× | C3/C4/C5/C6 |
| Aquicultura | 130.281 | suprimido | -100,00% | — | C3/C4/C5/C6 |
| FORSU (`rsu`) | 1.556.169.771 | 84.154.397,28 | -94,59% | 18,49× | C3/C4/C5/C6 |
| Poda urbana (`rpo`) | 31.204.438 | 5.857.245,66 | -81,23% | 5,33× | C3/C4/C5/C6 |

C2 não possui delta publicado: o export permanece suprimido. Quando
reativado com `fields=full`, sua fonte já será a mesma tabela recalculada acima.

### 2.4 Divergência adicional registrada

FORSU não caiu aproximadamente 6×; caiu **18,49×**. A fonte adicional foi
identificada: A2b usou 252.463.192 m³/ano como base canônica, mas a execução do
estado atual da rota pública produz 84.154.397,28 m³/ano de biogás bruto para
`rsu`. Além disso, `compute_sp_canonical_totals.py --json` encerra hoje com:

```text
RuntimeError: REFACTORING REGRESSION: CH4 medio is 2.7738201339 Mm3/day; expected 3.6367 Mm3/day
```

O saneamento não ajustou qualquer parâmetro para recuperar um valor esperado.
O fato foi registrado como divergência adicional de fonte/guard; nenhuma
recalibração foi feita neste lote.

### 2.5 Riscos e validação

- O cálculo em tempo de consulta aumenta CPU em C3–C6; elimina, em troca, a
  defasagem de snapshot.
- Florestal e aquicultura não têm mapeamento canônico no loader e foram
  suprimidos, não zerados como afirmação de ausência física.
- Compilação Python dos módulos alterados: OK.
- Smoke test direto dos campos de compatibilidade:
  `canonical compatibility smoke: OK`.
- Testes unitários não puderam ser executados neste ambiente porque o runtime
  não possui `pytest`; foram adicionados testes de compatibilidade e derivação.
- `feedstocks.yaml`: diff vazio.

## 3. Item 4 — marca de revisão metodológica

Pendente neste ponto do histórico.
