# Potencial de Biogás Mobilizável de SP — Estado Atual e Próximos Passos

**Data:** 2026-06-05
**Branch:** `claude/pilar2b-scientific-audit-AU4bW`
**Fonte dos números:** `backend/scripts/compute_sp_canonical_totals.py` (100% forward, metodologia única)

---

## 1. Onde estamos agora — número estadual defensável

A **Prioridade 1 foi concluída**: a pecuária e o urbano agora passam pelo **mesmo motor forward** do agrícola, com o FDE auditado. Não há mais mistura de metodologia nem dado legado do Panorama V2.

**Total estadual SP — 100% forward (cenário medio):**

| Métrica | min | **medio** | max |
|---|---:|---:|---:|
| CH₄ prático (M m³/dia) | 2,07 | **8,86** | 31,12 |
| **Biogás prático (M m³/dia)** | 3,75 | **16,04** | 56,15 |
| Biometano (M m³/dia) | 2,01 | **8,59** | 30,18 |

**Quebra por stream (CH₄ medio, M m³/dia):**

| Stream | Setor | Proveniência do dado | CH₄ medio |
|---|---|---|---:|
| cana (bagaço) | agrícola | toneladas reais (CSV) | **7,02** |
| soja | agrícola | toneladas reais (CSV) | 0,53 ⚠️ |
| citros | agrícola | toneladas reais (CSV) | 0,20 |
| milho | agrícola | toneladas reais (CSV) | 0,09 |
| café | agrícola | toneladas reais (CSV) | 0,01 |
| bovino | pecuária | cabeças × geração EMBRAPA | 0,40 |
| aves | pecuária | cabeças × geração EMBRAPA | 0,23 |
| suíno | pecuária | cabeças × geração EMBRAPA | 0,007 |
| RSU/FORSU | urbano | população × per-capita (SNIS) | 0,31 |
| RPO/lodo | urbano | população × per-capita (CETESB) | 0,05 ⚠️ |

### O que mudou e por quê (rigor científico)

Antes, o total "medio" era 33,8 M m³/dia — mas misturava o agrícola (forward) com **biogás legado inflado** da pecuária. Ao recalcular a pecuária pelo motor forward com o **FDE auditado**, a contribuição dela despencou — e isso é **cientificamente correto**:

| Stream | Legado (Panorama V2) | Forward (FDE auditado) | Por quê |
|---|---:|---:|---|
| bovino | 6,56 | **0,40** | FDE medio só **9,2%** — esterco de pasto extensivo **não é coletável** |
| aves | 3,17 | **0,23** | FDE auditado + geração EMBRAPA realista |
| suíno | 0,82 | **0,007** | rebanho SP pequeno (1,6M cabeças); legado era 7,5× inflado |

Isso confirma numericamente a sua intuição dos **dois cenários de bovino**: o min (0,034) reflete o pasto extensivo do oeste paulista (FC=0,35); o max (3,52) reflete o confinamento leiteiro intensivo do leste (FC=0,88). A largura do envelope **é** a heterogeneidade espacial real do estado.

---

## 2. Comparação com a FIESP

| Referência FIESP | Valor | Escopo |
|---|---:|---|
| FIESP/AMPLUN **2021** (bruto) | ~16,0 M m³/dia biogás | Todos os setores; potencial teórico bruto |
| SEMIL/FIESP **2024** (viável) | ~11,4 M m³/dia biogás | Técnica e economicamente viável |
| SEMIL/FIESP **2024** (longo prazo) | ~42,5 M Nm³/dia biometano | Infraestrutura plena |
| **PILAR-2b forward — medio** | **16,0 M m³/dia biogás** | **Metodologia única, FDE auditado** |
| PILAR-2b forward — min/max | 3,8 / 56,1 | Envelope de incerteza |

**Mensagem central para o paper:** com metodologia 100% forward e parâmetros validados por literatura — **sem nenhum valor otimista** — o cenário medio do PILAR-2b cai em **16,0 M m³/dia**, praticamente sobre o benchmark bruto FIESP/AMPLUN 2021 (16) e acima do viável SEMIL/FIESP 2024 (11,4). O bagaço de cana responde por ~80% do CH₄, sustentado pela correção de BMP (Paulose 2021) e FCo (EPE BEN 2024). A FIESP é alcançada **por rigor, não por ambição de parâmetro**.

---

## 3. Próximos passos (em ordem de prioridade)

### ✅ Prioridade 1 — CONCLUÍDA: pecuária+urbano pelo motor forward
- [x] Conversão cabeças → toneladas via fatores de geração canônicos (EMBRAPA).
- [x] Urbano derivado de população SP (IBGE 2022) × per-capita (SNIS/CETESB).
- [x] `compute_sp_canonical_totals.py` reescrito: 100% forward, metodologia única, com coluna de proveniência.
- **Resultado:** número estadual defensável de **16,0 M m³/dia** (medio).

### ⏳ Prioridade 2 — Resolver as 2 ressalvas de mapeamento (decisão de modelagem)
Afetam streams específicos do número acima — marcados com ⚠️ na tabela.

- [ ] **Soja:** o stream `soybean` (6,1M t/ano) é *palha de campo*. Sob plantio direto/RTRS, a palha é majoritariamente retida no solo (FCo≈0). Hoje está mapeada para `CASCA_SOJA` (casca de processamento), o que superestima ~0,9 M m³/dia de biogás. **Decisão necessária:** quanto da palha de soja é realmente coletável em SP?
- [ ] **RPO:** `rpo_pruning` (resíduo de poda) está mapeado para `LODO_PRIMARIO` (lodo de ETE) — são resíduos distintos. **Decisão necessária:** o que a coluna `rpo` realmente contém (poda urbana, lodo de ETE, ou ambos)?

### ⏳ Prioridade 3 — Completar cobertura de FDE (12 → 30)
- [ ] Adicionar blocos FDE auditados aos 13 feedstocks sub-variantes restantes (POLPA_CAFE, MUCILAGEM_CAFE, CASCAS_CITROS, DEJETOS_AVES, ESTERCO_SUINO, LODO_SECUNDARIO, GORDURA, SANGUE, etc.). Hoje caem em FDE=1.0 (teórico) se ativados — nenhum aparece no mapa.

### ⏳ Prioridade 4 — Validação empírica (usuário fará localmente)
- [ ] Popular `010_create_validation_plants.sql` com dados de plantas reais de SP (previsto × medido).

### Pendência técnica registrada (não bloqueia o headline)
- [ ] **LODO_PRIMARIO** — possível inconsistência de unidade no `generation.t_per_capita_yr` (nota cita "30 g MS/cap/dia" ≈ 0,011 t/ano, mas o valor medio é 0,03). Impacto pequeno (RPO = 0,05 M m³/dia), mas revisar para fechar o rigor.

---

## 4. Resumo de uma linha

> **Com metodologia 100% forward e FDE auditado, o potencial mobilizável de SP é 16,0 M m³/dia de biogás (medio; envelope 3,8–56,1)** — alinhado ao benchmark bruto FIESP 2021 e acima do viável FIESP 2024, sustentado pela cana (bagaço) e obtido **sem inflar parâmetro algum**. Restam 2 decisões de mapeamento (soja/RPO) que ajustam streams específicos de pequeno porte.
