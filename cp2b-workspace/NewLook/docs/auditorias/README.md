# Arquivo de auditorias do PILAR-2b

Esta pasta reúne campanhas de auditoria concluídas ou em andamento. Ela existe para
preservar a sequência de investigação, as evidências produzidas e a relação entre
diagnósticos, decisões e correções sem misturar histórico com o estado canônico vigente.

## Campanhas

| Período | Campanha | Escopo | Índice |
|---|---|---|---|
| 2026-07-25 a 2026-07-28 | Consistência canônica | Auditoria técnica, reconciliação de parâmetros, Adventure A e correções urgentes de superfície | [Abrir registro cronológico](2026-07-consistencia-canonica/README.md) |

## Convenção para novas campanhas

1. Criar uma pasta `AAAA-MM-tema` ou `AAAA-MM-DD-tema`.
2. Manter dentro dela um `README.md` com ordem de leitura, data, lote, status e commit.
3. Usar subpastas numeradas quando houver fases dependentes.
4. Preservar os relatórios como evidência histórica; correções posteriores ganham novo
   artefato em vez de apagar conclusões antigas.
5. Manter fontes normativas e resultados canônicos em `docs/data`; a auditoria deve
   apontar para eles, não duplicá-los.
6. Atualizar caminhos de scripts geradores e referências operacionais quando um
   artefato for arquivado.

## Separação de responsabilidades

- `docs/auditorias`: evidência, diagnóstico, deltas e histórico de execução.
- `docs/data/DECISOES_METODOLOGICAS.md`: decisões normativas vigentes.
- `docs/data/canonical_results.json`: resultados publicados gerados pelo pipeline.
- `data/canonical_parameters/feedstocks.yaml`: parâmetros canônicos.
- `docs/manuscrito`: versões de trabalho do artigo.
