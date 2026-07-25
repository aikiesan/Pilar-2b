# Inventário — toda citação da "Fronteira do Biogás" e de seus valores

**Data:** 2026-07-25 · **Lote:** 1a-ter · **Modo:** levantamento, sem correção
**Correção:** escopo do **Lote 5**. Nada aqui foi alterado.

Decisões que motivam este inventário:

- **`FRONTIER_ALPHA = 0.5` — ELIMINADO.** Não vai para a submissão.
- **Cenário Fronteira — SUSPENSO.** O manuscrito passa a reportar min / medio / max
  e a retenção medio/medio.
- **Definição A** (Otimista + lodo de ETE sob mandato PNRS/CONAMA) fica registrada
  como candidata a cenário de política. **Não reimplementar `_compute_fronteira` agora.**

Valores da Definição B, a rastrear: **CH₄ 9,19 · Biogás 16,42 · Biometano 8,92** Mm³/d.

---

## 1. Resumo por camada

| Camada | Arquivos | Natureza do vínculo |
|---|---:|---|
| Backend — cálculo | 1 | Define `FRONTIER_ALPHA` e imprime o cenário |
| Frontend — dados | 2 | 11 multiplicadores por resíduo, **derivados de α = 0,5** |
| Frontend — lógica | 3 | Interpolação e seleção de cenário |
| Frontend — UI | 4 | Seletor, mapa, painel, aba |
| Frontend — i18n | 2 | Textos ao usuário que **afirmam superar o FIESP** |
| Frontend — testes | 3 | Asserções sobre o cenário |
| Documentação | 5 | Tabelas e narrativa |
| **Total** | **20 arquivos** | |

---

## 2. Backend

### `backend/scripts/compute_sp_canonical_totals.py`

| Linha | Conteúdo |
|---:|---|
| 303-307 | Bloco de comentário `── Fronteira do Biogás (4º cenário) ──`, justificando 0,5 como "ponto médio" |
| **308** | **`FRONTIER_ALPHA = 0.5`** — variável local dentro de `_scenario_print()` |
| 309-312 | `fro = tuple(m + FRONTIER_ALPHA * (x - m) for m, x in [...])` |
| 313-316 | `print(... '→ Fronteira do Biogás (4º cenário, mid medio↔max)' ...)` |
| 321 | `print("  FIESP/Amplun 2025 (cana+aterro)          : 11,7 biogás / 6,4 biometano")` |
| 323-326 | `print(f"  PILAR-2b (Base/Médio/Fronteira/Otimista biogás): ... — Fronteira (31 resíduos) > FIESP 6,4 biometano")` |

Observação: `FRONTIER_ALPHA` é local, não módulo. Não é importável nem testável —
nenhum teste do repositório cobre o 4º cenário.

---

## 3. Frontend — os 11 multiplicadores derivados

### `frontend/src/data/scenarioFactors.ts` — **o ponto mais sensível**

O cabeçalho declara a derivação explicitamente:

```
* Each factor is scenario_biogas / medio_biogas for that residue's stream(s):
*   - conservador  = min / medio
*   - fronteira     = (medio + 0.5·(max−medio)) / medio   ← "Fronteira do Biogás"
*   - otimista      = max / medio
*
* State-level check (sum across SP): biogás Base/Médio≈6.5, Fronteira≈16.4,
* Otimista≈26.3 Mm³/d — Fronteira surpasses the FIESP benchmark (~11.7 biogás / 6.4 biometano).
```

Onze constantes numéricas **calculadas a partir de α = 0,5** e gravadas à mão:

| Resíduo | `fronteira` | Resíduo | `fronteira` |
|---|---:|---|---:|
| `sugarcane` | 2.208 | `swine` | 3.203 |
| `citrus` | 2.071 | `poultry` | 2.173 |
| `soybean` | 2.504 | `aquaculture` | 1.0 |
| `corn` | 1.869 | `rsu` | 2.349 |
| `coffee` | 1.799 | `rpo` | 6.273 |
| `cattle` | 4.862 | | |

Linhas 19, 22-32, 38. Eliminado o α, **estes onze números ficam órfãos**: não há
fórmula no repositório que os reproduza, e eles não constam de `feedstocks.yaml`.

### `frontend/src/lib/mapValues.ts`

| Linha | Conteúdo |
|---:|---|
| 82-83 | `'fronteira' — a "Fronteira do Biogás", the platform's headline optimistic-but-defensible band` |
| 91 | `otimista→max, fronteira→midpoint(medio,max)` |
| 104 | `case 'fronteira':` — implementa a interpolação |

### `frontend/src/types/analysis.ts`

| Linha | Conteúdo |
|---:|---|
| 284-288 | Objeto de cenário: `id: 'frontier'`, `name: 'Fronteira do Biogás'`, `nameKey`, `descKey` |
| 446 | `export type ScenarioType = 'baseline' \| 'conservative' \| 'optimistic' \| 'frontier' \| 'custom'` |
| 496 | Bloco `frontier: { ... }` com fatores de cenário |

---

## 4. Frontend — interface

| Arquivo | Linha | Conteúdo |
|---|---:|---|
| `components/map/MapComponent.tsx` | **190** | **`useState<MapScenarioKey>('fronteira')`** — Fronteira é o **cenário padrão do mapa** |
| `components/map/MapComponent.tsx` | 594 | `title={key === 'fronteira' ? t('scenario_fronteira_tip') : undefined}` |
| `components/analysis/ScenarioSelector.tsx` | 51 | `type: 'frontier'` |
| `components/map/MobileBottomSheet.tsx` | — | 1 ocorrência |
| `app/[locale]/dashboard/advanced-analysis/page.tsx` | 813-815 | `{currentScenario === 'frontier' && ( ... t('advanced_analysis.frontier_note') )}` |
| `types/geospatial.ts` | — | 1 ocorrência |
| `data/scientificData.ts` | — | 1 ocorrência |

---

## 5. Frontend — textos ao usuário (pt-BR e en)

Estes são os pontos em que a plataforma **afirma ao público** superar o benchmark.

`frontend/messages/pt-BR.json`:

| Linha | Conteúdo |
|---:|---|
| 400 | `"scenario_fronteira": "Fronteira"` |
| **402** | `"scenario_fronteira_tip": "Fronteira do Biogás: mobilização realista-alta dos 31 resíduos — supera o benchmark FIESP (~6,4 Mm³/d de biometano)."` |
| **430** | `"frontier_note": "Fronteira do Biogás: mobilização realista-alta dos 31 resíduos — supera o benchmark FIESP (~6,4 Mm³/d de biometano)."` |
| 899 | `"frontier_name": "Fronteira do Biogás"` |
| **900** | `"frontier_desc": "Mobilização realista-alta dos 31 resíduos sob política dedicada; supera o benchmark FIESP (~6,4 Mm³/d de biometano)"` |
| 909 | `"frontier_name"` (segunda ocorrência) |

`frontend/messages/en.json`: 7 ocorrências equivalentes.

Nota cruzada: estes textos também repetem os **"31 resíduos"** da divergência D3 —
o `feedstocks.yaml` tem 26 feedstocks, e o script soma 13.

---

## 6. Frontend — testes

| Arquivo | Ocorrências |
|---|---:|
| `lib/mapMetrics.test.ts` | 3 |
| `lib/sectorMetrics.test.ts` | 2 |
| `components/map/MapComponent.test.tsx` | 2 |

Nenhum deles testa o **valor** de α; testam a seleção e a propagação do cenário.

---

## 7. Documentação

| Arquivo | Linhas | Conteúdo |
|---|---:|---|
| `docs/data/FIESP_BENCHMARK_AUDIT_REPORT.md` | 15 | `\| **Fronteira do Biogás** (mobilização realista-alta) \| **9,19** \| **16,42** \| **8,92** \|` |
| idem | 22-25 | Seção *"o caminho intermediário que supera a FIESP"*; cita `FRONTIER_ALPHA = 0,5` |
| idem | **28** | `> **Fronteira = 8,92 Mm³/d de biometano (16,42 de biogás) — ~40% acima do benchmark FIESP (6,4).**` |
| idem | 30-38 | *"Por que é defensável dizer que o potencial de SP é maior que o da FIESP"* |
| idem | **41-42** | Resquício da **Definição A**: *"envelope superior com disponibilidade plena … Coincide com os números do handoff (14,66 / 25,85 / 14,22)"* |
| | | **→ já marcado como SUPERADO no topo, nesta sessão** |
| `docs/data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md` | 2 ocorrências | Fase 3 listada como pendente: *"Definir cenário 'Fronteira do Biogás' (além do max)"* — descreve a **Definição A**, não a B |
| `docs/data/SCIENTIFIC_AUDIT_REPORT.md` | 2 ocorrências | — |
| `docs/data/REFERENCE_DB_AUDIT.md` | 1 ocorrência | — |
| `docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md` | 3 ocorrências | — |
| `backend/app/migrations/004_import_panorama_data.sql` | 2 ocorrências | Verificar se é homônimo (contexto de fronteira agrícola) antes de tocar |

Fora de escopo de correção, por serem registros datados e já isentos em
`validator_exclusions.json`: `AUDITORIA_PILAR2B_2026-07-25.md` (16),
`docs/data/baseline_2026-07-25.json` (2), e os documentos de auditoria desta sessão.

---

## 8. Pontos que exigem decisão no Lote 5

Levantados, não resolvidos:

1. **Os 11 multiplicadores de `scenarioFactors.ts`** ficam órfãos sem α. Ou a coluna
   `fronteira` é removida do tipo `MapScenarioKey` — o que altera a assinatura usada
   por mapa, painéis e três arquivos de teste — ou os multiplicadores passam a ser
   gerados por `generate_from_canonical.py`, como as demais camadas.
2. **O padrão do mapa** (`MapComponent.tsx:190`) precisa de um substituto explícito.
   `'baseline'` corresponde ao cenário medio.
3. **Os textos de i18n** que afirmam *"supera o benchmark FIESP"* são afirmação
   pública de superioridade sobre uma referência externa, agora sem cenário que a
   sustente. São 14 strings (7 pt-BR + 7 en).
4. **`SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md`** descreve a Definição A como trabalho
   futuro. Se a Definição A permanece candidata, esse texto continua correto — é o
   único lugar do repositório que a descreve sem contradição.
5. **A migração `004_import_panorama_data.sql`** pode conter "fronteira" em sentido
   agrícola, não de cenário. Verificar antes de qualquer edição.
