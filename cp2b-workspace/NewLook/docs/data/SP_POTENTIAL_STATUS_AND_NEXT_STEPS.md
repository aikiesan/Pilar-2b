# Potencial de Biogás Mobilizável de SP — Estado Atual e Próximos Passos

**Data:** 2026-06-06 (rev. Phase 1 — unidades IBGE PAM corrigidas para cana e citros)
**Branch:** `claude/pilar2b-scientific-audit-AU4bW` → PRs separados por fase
**Fonte dos números:** `backend/scripts/compute_sp_canonical_totals.py` (100% forward, metodologia única)

---

## 1. Onde estamos agora — número estadual defensável

**Phase 1 foi concluída**: a interpretação das unidades do IBGE PAM foi corrigida.
A cana-de-açúcar é agora decomposta em **4 sub-fluxos industriais** com frações de resíduo
documentadas, e o citros aplica a fração de casca/bagaço (×0,50, FUNDECITRUS) antes do motor
forward. Isso eliminou os dois maiores erros sistemáticos da metodologia anterior.

**Total estadual SP — 100% forward (cenário medio) — Phase 1 corrigido:**

| Métrica | min | **medio** | max |
|---|---:|---:|---:|
| CH₄ prático (M m³/dia) | 0,74 | **3,57** | 14,45 |
| **Biogás prático (M m³/dia)** | 1,32 | **6,39** | 25,78 |
| Biometano (M m³/dia) | 0,71 | **3,46** | 14,02 |

**Quebra por stream (CH₄ medio, M m³/dia):**

| Stream | Setor | Fração de resíduo | Mapeamento canônico | CH₄ medio |
|---|---|---:|---|---:|
| cana_bagaco | agrícola | × 0,280 | BAGACO | **1,966** |
| bovino | pecuária | — | ESTERCO_BOVINO | 0,403 |
| RSU/FORSU | urbano | — | FORSU | 0,310 |
| aves | pecuária | — | CAMA_AVIARIO | 0,234 |
| cana_torta | agrícola | × 0,030 | TORTA_FILTRO | **0,251** |
| citros | agrícola | × 0,500 | BAGACO_CITROS | 0,101 |
| milho | agrícola | — | PALHA_MILHO | 0,093 |
| soja | agrícola | — | PALHA_SOJA | 0,083 |
| cana_palha | agrícola | × 0,053 | PALHA | **0,062** |
| cana_vinhaca | agrícola | × 0,420 | VINHACA | **0,035** |
| café | agrícola | — | CASCA_CAFE | 0,014 |
| suíno | pecuária | — | DEJETOS_SUINO | 0,007 |
| poda urbana | urbano | — | PODA_URBANA | 0,009 |
| **TOTAL** | | | | **3,568** |

**Complexo sucroalcooleiro (4 sub-fluxos):** 2,314 M m³/dia = **64,9%** do total.

### O que mudou vs. pré-Phase-1

| Stream | Antes (mapeamento errado) | Depois (correto) | Mudança |
|---|---:|---:|---|
| cana (total) | 7,02 (1 t verde → bagaço direto, fator 3,6×) | **2,31** (4 sub-fluxos × frações) | −4,71 |
| citros | 0,201 (fruta inteira → BAGACO_CITROS) | **0,101** (casca ×0,50) | −0,100 |
| **Total** | **8,38** | **3,57** | **−4,81** |
| **Biogás** | **15,17** | **6,39** | **−8,78** |

A redução é **metodologicamente correta e esperada**: o IBGE PAM registra produção de cana verde
(t/ano), não bagaço. Aplicar BMP do bagaço (TS=58,9%) diretamente à cana verde produzia um
**fator de superestimativa de 3,6×**. O citros IBGE PAM registra fruta inteira, não casca
processada; a correção ×0,50 (FUNDECITRUS) elimina a superestimativa de ~2×.

---

## 2. Comparação com a FIESP

| Referência FIESP | Valor | Escopo |
|---|---:|---|
| FIESP/AMPLUN **2021** (bruto) | ~16,0 M m³/dia biogás | Todos os setores; potencial teórico bruto |
| SEMIL/FIESP **2024** (viável) | ~11,4 M m³/dia biogás | Técnica e economicamente viável |
| SEMIL/FIESP **2024** (longo prazo) | ~42,5 M Nm³/dia biometano | Infraestrutura plena |
| **PILAR-2b forward — medio (Phase 1)** | **6,39 M m³/dia biogás** | **FDE auditado; unidades IBGE PAM corrigidas** |
| PILAR-2b forward — min/max | 1,3 / 25,8 | Envelope de incerteza |

**Interpretação honesta:** o PILAR-2b (6,4 Mm³/dia) é ~40% do benchmark bruto FIESP 2021 (16,0)
e ~56% do viável SEMIL/FIESP 2024 (11,4). A diferença reflete que o PILAR-2b aplica fatores FDE
conservadores-a-moderados sobre **frações de resíduo real** (bagaço=28% da cana, casca=50% do
citros), enquanto as referências FIESP creditam biomassa bruta sem penalizar pela cadeia de
disponibilização. O número 6,4 representa **o que é mobilizável sob restrições realistas de
coleta, competição de uso e logística**, não o potencial teórico bruto.

---

## 3. Fases e status

### ✅ Prioridade 1 (Fase Inicial) — CONCLUÍDA: pecuária+urbano pelo motor forward
- [x] Conversão cabeças → toneladas via fatores de geração canônicos (EMBRAPA).
- [x] Urbano derivado de população SP (IBGE 2022) × per-capita (SNIS/CETESB).
- [x] `compute_sp_canonical_totals.py` reescrito: 100% forward, metodologia única.
- [x] FDE auditado para todos os 26 feedstocks (PR #95).

### ✅ Phase 1 — CONCLUÍDA: Correção de unidades IBGE PAM
- [x] **Cana:** decomposta em 4 sub-fluxos (bagaço ×0,28, torta ×0,030, palha ×0,053, vinhaça ×0,420).
  Elimina superestimativa 3,6× da abordagem anterior (cana bruta → BAGACO direto).
- [x] **Citros:** fração de casca ×0,50 (FUNDECITRUS 2022) aplicada antes do motor forward.
  Elimina superestimativa ~2× da abordagem anterior.
- [x] `SUGARCANE_SUBSTREAMS` e `CITRUS_RESIDUE_FRACTION` exportados como constantes auditáveis.
- [x] `test_biomass_residue_fractions.py`: 11 testes de regressão e limites de literatura.
- [x] `feedstocks.yaml`: comentários de `residue_fraction` adicionados aos 5 feedstocks afetados.
- [x] **LODO_PRIMARIO:** `t_per_capita_yr` corrigido de massa SECA (0,015/0,030/0,045 t/ano)
  para massa ÚMIDA equivalente (0,037/0,073/0,122 t WET/cap/ano). Stream não está no mapa ativo.
- [x] `FOSS4G_PAPER_SUPPLEMENT.md` atualizado com números corrigidos e tabela de sub-fluxos.

### ⏳ Phase 2 — Diferenciação espacial do gado
- [ ] Diferenciar bovinos leste SP (leiteiro intensivo, FC/FCo alto) vs. oeste SP
  (corte extensivo em pastagem, FC baixo) usando dados IBGE censo bovino confinamento/pastagem.
- [ ] Dividir ESTERCO_BOVINO em ESTERCO_BOVINO_LEITEIRO e ESTERCO_BOVINO_CORTE com parâmetros FDE distintos.
- [ ] PR separado: `pr/phase2-spatial-livestock`.

### ⏳ Phase 3 — Renomeação de cenários + Fronteira do Biogás
- [ ] Renomear min/medio/max → Linha de Base/Médio Prazo/Otimista na API, frontend, docs.
- [ ] Definir cenário "Fronteira do Biogás" (além do max — cenário de política pública plena).
- [ ] Atualizar visualização de mapa frontend para exibir os 4 cenários.

### ⏳ Prioridade — Validação empírica (usuário fará localmente)
- [ ] Popular `010_create_validation_plants.sql` com dados de plantas reais de SP (previsto × medido).

---

## 4. Resumo de uma linha

> **Com metodologia 100% forward, FDE auditado e unidades IBGE PAM corrigidas (cana→4 sub-fluxos; citros→casca ×0,50), o potencial mobilizável de SP é 6,4 M m³/dia de biogás (medio; envelope 1,3–25,8)** — representando o substrato real disponível sob restrições documentadas de coleta e uso competitivo, verificado por 11 testes de regressão automatizados.
