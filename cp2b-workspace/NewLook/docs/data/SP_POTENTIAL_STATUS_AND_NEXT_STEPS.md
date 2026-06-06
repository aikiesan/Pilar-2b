# Potencial de Biogás Mobilizável de SP — Estado Atual e Próximos Passos

**Data:** 2026-06-06 (rev. Priority 3 — todos os 26 FDEs auditados; LODO_PRIMARIO unit fix)
**Branch:** `main` (mergeado via PR #95)
**Fonte dos números:** `backend/scripts/compute_sp_canonical_totals.py` (100% forward, metodologia única)

---

## 1. Onde estamos agora — número estadual defensável

As **Prioridades 1 e 2 foram concluídas**: toda a cadeia (agrícola, pecuária, urbano) passa pelo **mesmo motor forward** com FDE auditado; os dois mapeamentos incorretos (soja e RPO) foram corrigidos com base em decisão do usuário (2026-06-05).

**Total estadual SP — 100% forward (cenário medio):**

| Métrica | min | **medio** | max |
|---|---:|---:|---:|
| CH₄ prático (M m³/dia) | 1,89 | **8,38** | 29,97 |
| **Biogás prático (M m³/dia)** | 3,42 | **15,17** | 54,18 |
| Biometano (M m³/dia) | 1,83 | **8,12** | 29,07 |

**Quebra por stream (CH₄ medio, M m³/dia):**

| Stream | Setor | Proveniência do dado | Mapeamento canônico | CH₄ medio |
|---|---|---|---|---:|
| cana (bagaço) | agrícola | toneladas reais (CSV) | BAGACO | **7,02** |
| citros | agrícola | toneladas reais (CSV) | BAGACO_CITROS | 0,20 |
| milho | agrícola | toneladas reais (CSV) | PALHA_MILHO | 0,09 |
| soja | agrícola | toneladas reais (CSV) | **PALHA_SOJA** ✅ | **0,08** |
| café | agrícola | toneladas reais (CSV) | CASCA_CAFE | 0,01 |
| bovino | pecuária | cabeças × geração EMBRAPA | ESTERCO_BOVINO | 0,40 |
| aves | pecuária | cabeças × geração EMBRAPA | CAMA_AVIARIO | 0,23 |
| suíno | pecuária | cabeças × geração EMBRAPA | DEJETOS_SUINO | 0,007 |
| RSU/FORSU | urbano | população × per-capita (SNIS) | FORSU | 0,31 |
| poda urbana | urbano | população × per-capita (ABRELPE) | **PODA_URBANA** ✅ | **0,009** |

### O que mudou vs. pré-Priority-2

| Stream | Antes (mapeamento errado) | Depois (mapeamento correto) | Mudança |
|---|---:|---:|---|
| soja | 0,53 (CASCA_SOJA — casca de processamento) | **0,08** (PALHA_SOJA — palha de campo, FCo=0,15) | −0,45 |
| RPO | 0,05 (LODO_PRIMARIO — lodo de ETE) | **0,009** (PODA_URBANA — poda lignocelulósica) | −0,04 |
| **Total** | **8,86** | **8,38** | **−0,48** |
| **Biogás** | **16,04** | **15,17** | **−0,87** |

A redução de ~0,9 M m³/dia é **correta e esperada**: antes inflávamos a soja usando BMP de casca industrial (300 NmL/gVS) com disponibilidade de 18% sobre 6,1 M t/ano de **palha de campo**. A palha real tem FCo=0,15 (85% deve permanecer no solo por exigência RTRS/plantio direto). A poda urbana tem BMP 175 NmL/gVS (vs. 310 do lodo) e geração per-capita muito menor.

---

## 2. Comparação com a FIESP

| Referência FIESP | Valor | Escopo |
|---|---:|---|
| FIESP/AMPLUN **2021** (bruto) | ~16,0 M m³/dia biogás | Todos os setores; potencial teórico bruto |
| SEMIL/FIESP **2024** (viável) | ~11,4 M m³/dia biogás | Técnica e economicamente viável |
| SEMIL/FIESP **2024** (longo prazo) | ~42,5 M Nm³/dia biometano | Infraestrutura plena |
| **PILAR-2b forward — medio** | **15,2 M m³/dia biogás** | **Metodologia única, FDE auditado, 2 mapeamentos corrigidos** |
| PILAR-2b forward — min/max | 3,4 / 54,2 | Envelope de incerteza |

**Mensagem central para o paper:** com metodologia 100% forward, mapeamentos corrigidos e parâmetros validados por literatura — **sem nenhum valor otimista** — o cenário medio do PILAR-2b é **15,2 M m³/dia**, a 95% do benchmark bruto FIESP 2021 (16,0) e 33% acima do viável SEMIL/FIESP 2024 (11,4). O bagaço de cana responde por ~83% do CH₄ (7,02 de 8,38 M m³/dia), sustentado pela correção de BMP (Paulose 2021) e FCo (EPE BEN 2024). A FIESP é alcançada **por rigor, não por ambição de parâmetro**.

---

## 3. Próximos passos (em ordem de prioridade)

### ✅ Prioridade 1 — CONCLUÍDA: pecuária+urbano pelo motor forward
- [x] Conversão cabeças → toneladas via fatores de geração canônicos (EMBRAPA).
- [x] Urbano derivado de população SP (IBGE 2022) × per-capita (SNIS/CETESB).
- [x] `compute_sp_canonical_totals.py` reescrito: 100% forward, metodologia única, com coluna de proveniência.

### ✅ Prioridade 2 — CONCLUÍDA: Resolver as 2 ressalvas de mapeamento
- [x] **Soja:** mapeamento corrigido `soybean → PALHA_SOJA`. FCo=0,15 (plantio direto RTRS; usuário confirmou "fração pequena ~15%"). Impacto: 0,53 → 0,08 M m³/dia CH₄.
- [x] **RPO:** mapeamento corrigido `rpo → PODA_URBANA`. Criado novo feedstock PODA_URBANA (BMP 100–250 NmL/gVS, TS 35–70%, lignocelulósico). Impacto: 0,05 → 0,009 M m³/dia CH₄.
- [x] `STREAM_TO_CANONICAL` em `canonical_loader.py` atualizado.
- [x] `biomass_availability.py` atualizado (parâmetros do reverse-BMP para RPO corrigidos).

### ✅ Prioridade 3 — CONCLUÍDA: cobertura FDE completa (26/26 feedstocks)
- [x] **Todos os 26 blocos FDE** auditados com traceabilidade por fator (FC/FCo/FS/FL).
- [x] Cada fator cita a fonte que **de fato reporta** o valor (não citação contextual).
- [x] 23 novas referências com URLs/DOIs; 5 DOIs verificados na web.
- [x] Tiers de confiança: 6 HIGH / 17 MEDIUM / 3 LOW — todos documentados.
- [x] `validate_fde_traceability.py` — guarda re-executável (aritmética, ordem, refs, URLs, confiança).
- [x] `FDE_TRACEABILITY_MATRIX.md` — tabela per-factor gerada automaticamente (26 feedstocks, 53 refs).
- [x] `test_fde_traceability.py` — 3 testes CI; 54 testes totais passando.
- [x] GORDURA: corrigido erro aritmético legado (42,75% → 14,25%: `0,80×0,25×0,95×0,75`).
- [x] LODO_PRIMARIO: corrigida inconsistência de unidade (valores DRY → WET equivalente, CETESB 30 g/dia).

### ⏳ Prioridade 4 — Validação empírica (usuário fará localmente)
- [ ] Popular `010_create_validation_plants.sql` com dados de plantas reais de SP (previsto × medido).

---

## 4. Resumo de uma linha

> **Com metodologia 100% forward, FDE auditado e mapeamentos corrigidos (soja=palha/15% + RPO=poda urbana), o potencial mobilizável de SP é 15,2 M m³/dia de biogás (medio; envelope 3,4–54,2)** — a 95% do benchmark bruto FIESP 2021 e 33% acima do viável FIESP 2024, dominado pela cana (bagaço, 83%) e obtido **sem inflar parâmetro algum**.
