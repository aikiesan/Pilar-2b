# Quarentena de dados

Esta pasta contém artefatos preservados para auditoria, mas impedidos de atuar
como fonte canônica enquanto sua proveniência e sua linhagem não forem
reconstituídas.

## `feedstock_bmp_from_refs.csv`

**Estado:** `quarantined_unversioned_source`

**Entrada na quarentena:** 2026-07-28, ADVENTURE B / B-Q1

**SHA-256 do conteúdo:** `b2208eb833e7e3735275a8497b89398994178aadc91c9b54c2ce60184f5956a8`

Motivos:

- a proveniência das observações agregadas é desconhecida;
- nenhum script gerador do CSV está versionado;
- as 196 observações declaradas não estão preservadas individualmente;
- não há linhagem observação → condição experimental → unidade → referência;
- cada linha guarda somente `n`, mínimo, mediana, máximo e uma URL de exemplo.

O arquivo não é lido por código de produção rastreado. Um script local não
rastreado, `scripts/generate_a3b_report.py`, ainda referencia o caminho antigo;
ele não integra runtime, API ou frontend e não é corrigido neste lote.

### Parâmetros publicados derivados pela Regra R2

O commit `c64a64f` usou as medianas agregadas para alargar quatro bandas
superiores até igualdade exata. Os valores permanecem publicados e não são
revertidos no B-Q1:

| Feedstock | Campo | Valor pré-R2 | Valor vigente | Mediana do artefato |
|---|---|---:|---:|---:|
| `PALHA` | `bmp.max` | 250 | 293,5 | 293,5 |
| `PALHA_MILHO` | `bmp.max` | 300 | 390 | 390 |
| `CASCA_MILHO` | `bmp.max` | 185 | 307 | 307 |
| `LODO_SECUNDARIO` | `bmp.max` | 260 | 310 | 310 |

A eventual reversão ou requalificação pertence ao Lote B1 e exige tabela de
delta. Até essa decisão:

- não usar este CSV para criar, recalibrar ou validar parâmetros;
- não aplicar a Regra R2;
- não interpretar `n` como estudos, amostras ou observações auditáveis;
- preservar o arquivo sem edição para investigação forense.

O `.gitattributes` desta pasta desativa a normalização textual de CSV para que
o blob versionado preserve os bytes originais, inclusive finais de linha.
