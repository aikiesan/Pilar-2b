# Log final de decisões metodológicas — PILAR-2b

**Estado:** normativo · **Consolidação:** B5-FS · **Data:** 2026-08-03

Este é o log consecutivo vigente. Relatórios anteriores permanecem no arquivo de
auditorias; uma decisão revista não é apagada, mas recebe estado e sucessora.
Resultados derivados devem usar marcadores `{{canonical:<caminho>}}`, resolvidos <!-- canonical-ignore: sintaxe ilustrativa -->
de `canonical_results.json`.

## Mapa de renumeração

| Identificador histórico | Identificador final | Motivo |
|---|---|---|
| DEC-001…DEC-005 | DEC-001…DEC-005 | sequência original preservada |
| DEC-013 | DEC-006 | fechamento do intervalo 006–012 |
| DEC-015 (colidente) | DEC-007 | colisão removida e lacuna 014 fechada |
| DEC-020 | DEC-008 | fechamento do intervalo 008–019 |
| DEC-021 | DEC-009 | sequência final |
| — | DEC-010 | decisão produzida pelo B2-CLOSE |
| — | DEC-011 | decisão produzida pelo B3-CONSOLIDA |
| — | DEC-012 | decisão produzida pelo B4-MINIMO |
| — | DEC-013 | decisão produzida pelo B5-FS |

## Log consecutivo

### [DEC-001] Política inicial de BMP por corpus

- **Data:** 2026-07-25.
- **Estado:** **SUPERADA por DEC-007**.
- **Decisão histórica:** usar o corpus agregado para enquadrar BMP.
- **Motivo da superação:** o corpus não possui gerador nem observações versionadas.

### [DEC-002] Motor canônico como fonte dos totais estaduais

- **Data:** 2026-07-26.
- **Estado:** **ATIVA, ampliada por DEC-010 e DEC-011**.
- **Decisão:** `compute_sp_canonical_totals.py` e
  `canonical_results.json` são a fonte única dos resultados publicados.
- **Rastreabilidade:** `c64a64f`; B2-CLOSE.

### [DEC-003] Rotas físico-químicas da vinhaça

- **Data:** 2026-07-27.
- **Estado:** **ATIVA**.
- **Decisão:** manter separadas as rotas VS e DQO, com base experimental e
  conversões explícitas; divergências não autorizam ajuste por alvo.

### [DEC-004] Rota única de FORSU

- **Data:** 2026-07-27.
- **Estado:** **IMPLEMENTADA por DEC-010**.
- **Decisão:** eliminar caminhos concorrentes e haircut implícito.

### [DEC-005] Governança pelo log metodológico

- **Data:** 2026-07-27.
- **Estado:** **ATIVA**.
- **Decisão:** toda mudança metodológica integra o log e aponta para dados,
  código, relatório e commit.

### [DEC-006] Contagem bibliográfica não é lastro observacional

- **Data:** 2026-07-28.
- **Estado:** **ATIVA**.
- **Decisão:** `reference_count` não pode ser apresentado como número de
  estudos, ensaios, amostras ou observações de BMP.
- **Rastreabilidade:** B-URG-2, commit `3ff2356`.

### [DEC-007] Quarentena do corpus BMP agregado

- **Data:** 2026-07-28.
- **Estado:** **ATIVA**.
- **Decisão:** `data/quarantine/feedstock_bmp_from_refs.csv` e os campos
  `bmp.corpus` são evidência histórica, proibida como entrada paramétrica; R2
  fica suspensa até reconstrução observacional reproduzível.
- **Rastreabilidade:** B-Q1, commit `69243a3`.

### [DEC-008] Métricas públicas calculadas pela rota canônica

- **Data:** 2026-07-29.
- **Estado:** **ATIVA, corrigida por DEC-010**.
- **Decisão:** snapshots SQL legados não são fonte publicada; mapa, API e
  agregações usam o mesmo pipeline canônico.
- **Rastreabilidade:** `0c0d38a`, com regressão corrigida no B2-CLOSE.

### [DEC-009] Marca provisória de revisão metodológica

- **Data:** 2026-07-29.
- **Estado:** **SUPERADA por DEC-010**.
- **Decisão histórica:** marcar agregados enquanto B1/B2 estivessem abertos.
- **Rastreabilidade:** commit `56bfc84`.

### [DEC-010] Atividade medida, biomassa e superfícies reconciliadas

- **Data:** 2026-08-01.
- **Estado:** **ATIVA**.
- **Decisão:** usar SNIS 2022 CO111 para FORSU com fallback populacional
  municipal explícito; instanciar lodos por ES006; derivar biomassa e gases da
  mesma instância por feedstock; exigir igualdade dos 645 municípios entre
  rota pública e script.
- **Rastreabilidade:** B2-CLOSE e `canonical_results.json`.

### [DEC-011] Gate automático de consistência canônica

- **Data:** 2026-08-01.
- **Estado:** **ATIVA**.
- **Decisão:** toda afirmação numérica canônica em README, documentação,
  manuscrito ou UI usa caminho do JSON; o CI extrai todas as folhas numéricas,
  aplica escala/arredondamento e rejeita literal divergente. Tolerância absoluta
  máxima `1e-6` e relativa declarada `1e-9`.
- **Rastreabilidade:** `scripts/validate_canonical_consistency.py` e workflow CI.

### [DEC-012] Fechamento mínimo de publicação

- **Data:** 2026-08-02.
- **Estado:** **ATIVA**.
- **Decisão:** publicar concentração espacial para CH4 médio; representar a
  energia como cogeração com eficiências conjuntas em arquivo paramétrico;
  retirar PODA_URBANA da interface enquanto `coverage:none`; publicar a
  cobertura FORSU; e tratar min/médio/max como extremos determinísticos
  acoplados, não incerteza estatística.
- **Rastreabilidade:** B4-MINIMO e `canonical_results.json`.

### [DEC-013] FS sobre atividade anual

- **Data:** 2026-08-03.
- **Estado:** **ATIVA; FECHAMENTO PARAMÉTRICO**.
- **Decisão:** FS representa somente retenção de massa após perda documentada
  em estocagem, nunca dias de oferta/365. Sem fonte específica de perda,
  FS=1,00. Os 15 subfluxos instanciados passam a 1,00 nos três cenários.
  Nenhum FC, FCo, FL, BMP, TS ou VS foi alterado.
- **Rastreabilidade:** B5-FS, `POLITICA_FATORES.md`, `feedstocks.yaml` e
  `canonical_results.json`.
