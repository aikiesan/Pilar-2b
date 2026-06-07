# Potencial de Biogás Mobilizável de SP — Estado Atual e Próximos Passos

**Data:** 2026-06-06 (rev. Phase 3 — 4 cenários + Fronteira do Biogás)
**Branch:** `claude/pilar2b-scientific-audit-AU4bW` → PRs separados por fase
**Fonte dos números:** `backend/scripts/compute_sp_canonical_totals.py` (100% forward, metodologia única)

---

## 1. Onde estamos agora — número estadual defensável

**Fases 1, 2 e 3 concluídas.** O plataforma agora apresenta **4 cenários nomeados** alinhados
com a estrutura científica do motor forward canônico:

**Total estadual SP — 100% forward — 4 Cenários:**

| Cenário | CH₄ (M m³/dia) | **Biogás (M m³/dia)** | Biometano (M m³/dia) |
|---|---:|---:|---:|
| **Linha de Base** (min FDE/geração) | 0,81 | 1,45 | 0,79 |
| **Médio Prazo** (medio FDE/geração) | **3,90** | **6,97** | **3,78** |
| **Otimista** (max FDE/geração) | 13,62 | 24,32 | 13,21 |
| **Fronteira do Biogás** (Otimista + ETE sludge) | 14,66 | 25,85 | 14,22 |

**Quebra por stream (CH₄ Médio Prazo, M m³/dia) — com split espacial bovino (Phase 2):**

| Stream | Setor | Mapeamento canônico | CH₄ Médio Prazo |
|---|---|---|---:|
| cana_bagaco (×0,280) | agrícola | BAGACO | **1,966** |
| cattle_leiteiro (33% leiteiro SP Leste) | pecuária | ESTERCO_BOVINO_LEITEIRO | **0,696** |
| RSU/FORSU | urbano | FORSU | 0,310 |
| cana_torta (×0,030) | agrícola | TORTA_FILTRO | **0,251** |
| aves | pecuária | CAMA_AVIARIO | 0,234 |
| citros (×0,500) | agrícola | BAGACO_CITROS | 0,101 |
| milho | agrícola | PALHA_MILHO | 0,093 |
| soja | agrícola | PALHA_SOJA | 0,083 |
| cana_palha (×0,053) | agrícola | PALHA | 0,062 |
| cana_vinhaca (×0,420) | agrícola | VINHACA | 0,035 |
| cattle_corte (67% corte SP Oeste) | pecuária | ESTERCO_BOVINO_CORTE | 0,037 |
| café | agrícola | CASCA_CAFE | 0,014 |
| poda urbana | urbano | PODA_URBANA | 0,009 |
| suíno | pecuária | DEJETOS_SUINO | 0,007 |
| **TOTAL** | | | **3,898** |

**Leiteiro (SP Leste):** 0,696 M m³/dia = 17,8% do total — **2º maior contribuinte** individual.
**Gado de corte (SP Oeste):** apenas 0,037 M m³/dia apesar de 67% do rebanho — FDE disperso baixo.
**Complexo sucroalcooleiro (4 sub-fluxos):** 2,314 M m³/dia = 59,4% do total.

### O que mudou em cada fase

| Fase | Antes | Depois (Médio Prazo) | Mudança |
|---|---:|---:|---|
| Phase 1: cana (unit fix) | 7,02 (verde→bagaço direto) | **2,31** (4 sub-fluxos) | −4,71 |
| Phase 1: citros (unit fix) | 0,201 (fruta inteira) | **0,101** (casca ×0,50) | −0,100 |
| Phase 2: bovino split | 0,403 (medio único) | **0,733** (0,696 leiteiro + 0,037 corte) | +0,330 |
| **Total CH₄ Médio Prazo** | **8,38** | **3,90** | **−4,48** |
| **Biogás Médio Prazo** | **15,17** | **6,97** | **−8,20** |

**Phase 1** corrigiu superestimativas sistemáticas nas fontes agrícolas dominantes.
**Phase 2** revelou o hotspot leiteiro do SP Leste (gado intensivo, FDE 9× maior que o corte
extensivo) — anteriormente oculto pelo FDE médio estadual único.

---

## 2. Comparação com a FIESP — 4 cenários

| Referência | Valor (M m³/dia biogás) | Escopo |
|---|---:|---|
| FIESP/AMPLUN **2021** (bruto) | ~16,0 | Todos os setores; potencial teórico bruto |
| SEMIL/FIESP **2024** (viável) | ~11,4 | Técnica e economicamente viável |
| SEMIL/FIESP **2024** (longo prazo) | ~42,5 Nm³/dia biometano | Infraestrutura plena |
| **PILAR-2b Linha de Base** | **1,45** | Min FDE/geração — máximas restrições |
| **PILAR-2b Médio Prazo** | **6,97** | FDE canônico auditado; Phase 1+2 |
| **PILAR-2b Otimista** | **24,32** | Max FDE — condições favoráveis |
| **PILAR-2b Fronteira do Biogás** | **25,85** | Otimista + ETE sludge mandatório |

**Interpretação honesta:** o Médio Prazo (6,97 Mm³/dia) representa o mobilizável com
restrições realistas documentadas. A distância do bruto FIESP 2021 (16,0) é metodológica:
bagaço=28% da cana verde × FDE≈0,12, gado corte extensivo com FDE≈0,032, e frações de
resíduo corrigidas. O Otimista (24,3) e a Fronteira (25,9) demonstram o teto com política
pública e infraestrutura plena — mas exigem CAPEX e regulação mandatória.

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

### ✅ Phase 2 — CONCLUÍDA: Diferenciação espacial do gado
- [x] ESTERCO_BOVINO_CORTE: gado de corte extensivo SP Oeste (FDE médio=0,032).
- [x] ESTERCO_BOVINO_LEITEIRO: gado leiteiro intensivo SP Leste (FDE médio=0,293).
- [x] Split 67%/33% baseado em IBGE Censo Agropecuário 2017.
- [x] `test_spatial_livestock.py`: 10 testes incluindo FDE ordering e dairy hotspot.
- [x] Resultado: leiteiro = 0,696 Mm³/dia CH₄ (2º maior contribuinte individual).

### ✅ Phase 3 — CONCLUÍDA: 4 cenários + Fronteira do Biogás
- [x] Renomeação de MIN/MÉDIO/MAX → Linha de Base/Médio Prazo/Otimista no script e docs.
- [x] Fronteira do Biogás: Otimista + LODO_PRIMARIO(max) + LODO_SECUNDARIO(max).
  - LODO_PRIMARIO: 0,913 Mm³/dia CH₄ (max); LODO_SECUNDARIO: 0,126 Mm³/dia CH₄ (max).
  - Premissa: AD mandatório para lodo de ETE (PNRS + regulação específica).
  - Barreira: alto CAPEX; não realizável sem política pública.
- [x] LODO_SECUNDARIO: bloco `generation.t_per_capita_yr` adicionado ao YAML.
- [x] `analysis.ts` frontend: `PREDEFINED_SCENARIOS` e `RESIDUE_SCENARIOS` renomeados para
  Linha de Base/Médio Prazo/Otimista/Fronteira do Biogás (IDs preservados).

### ⏳ Prioridade — Validação empírica (usuário fará localmente)
- [ ] Popular `010_create_validation_plants.sql` com dados de plantas reais de SP (previsto × medido).

---

## 4. Resumo de uma linha

> **Com 3 fases completas — unidades IBGE PAM corrigidas (Phase 1), split espacial bovino leiteiro/corte (Phase 2), e 4 cenários nomeados com Fronteira do Biogás (Phase 3) — o potencial mobilizável de SP é: Linha de Base 1,5 / Médio Prazo 7,0 / Otimista 24,3 / Fronteira 25,9 M m³/dia biogás.** O Médio Prazo representa o substrato real disponível sob restrições documentadas; o hotspot leiteiro do SP Leste (0,7 Mm³/dia, 2º maior contribuinte) foi revelado pela diferenciação espacial. Verificado por 21 testes de regressão automatizados.
