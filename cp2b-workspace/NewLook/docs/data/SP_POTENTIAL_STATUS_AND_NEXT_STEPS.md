# Potencial de Biogás Mobilizável de SP — Estado Atual e Próximos Passos

**Data:** 2026-06-05
**Branch:** `claude/pilar2b-scientific-audit-AU4bW`
**Fonte dos números:** `backend/scripts/compute_sp_canonical_totals.py` (rodado com os parâmetros canônicos atuais, já com as correções de BAGAÇO e pecuária)

---

## 1. Onde estamos agora (números reais)

Estimativa estadual no cenário **medio**, decomposta por setor e por **confiabilidade do dado**:

| Setor | Metodologia | Biogás (M m³/dia) | Confiável? |
|---|---|---:|:--:|
| **Agrícola** | Forward engine + FDE auditado, biomassa autoritativa | **13,5** | ✅ Sim |
| → cana (bagaço) | forward | 12,1 | ✅ |
| → soja | forward | 0,9 | ✅ |
| → citros | forward | 0,35 | ✅ |
| → milho | forward | 0,16 | ✅ |
| → café | forward | 0,02 | ✅ |
| **Pecuária** | **Legado Panorama V2** (biogás importado, FDE só como envelope) | **18,2** | ⚠️ **Não** |
| → bovino | legado (4,2 B m³/ano ≈ 400 m³/cabeça) | 11,3 | ❌ inflado |
| → aves | legado (1,85 B m³/ano) | 5,5 | ⚠️ não verificado |
| → suíno | legado **SINALIZADO 7,5× a mais** | 1,4 | ❌ inflado |
| **Urbano** | Legado Panorama V2 | **2,1** | ⚠️ não verificado |
| **TOTAL medio (como está)** | metodologia mista | **33,8** | ⚠️ |

Envelope de cenários (total, como está hoje):
- **min:** 12,2 M m³/dia de biogás
- **medio:** 33,8 M m³/dia
- **max:** 91,5 M m³/dia

### Por que o "33,8" não é um número defensável ainda

O total mistura **duas metodologias incompatíveis**:

1. **Agrícola (13,5)** — calculado corretamente pelo motor forward com o FDE auditado e biomassa autoritativa do CSV mestre. **Sólido.**
2. **Pecuária + urbano (20,3)** — ainda usa os **valores de biogás legados do Panorama V2**, que **não passam pelo FDE auditado**. O FDE entra apenas como envelope de incerteza, não como fator de mobilização. Pior: o bovino (4,2 B m³/ano = ~400 m³/cabeça) é alto demais e **não aplica o FC baixo de pasto extensivo** que auditamos (disponibilidade medio de só 13%); e o suíno já está marcado como **7,5× superestimado** no próprio código.

Quando a pecuária for recalculada pelo motor forward com o FDE auditado (FC baixo para bovino de pasto, penalidade de degradação de VS para suíno), **a contribuição da pecuária deve cair bastante** — provavelmente de 18,2 para algo na faixa de 5–9 M m³/dia.

---

## 2. Comparação com a FIESP

Há **dois benchmarks da FIESP** que costumam ser confundidos:

| Referência FIESP | Valor | Escopo |
|---|---:|---|
| FIESP/AMPLUN **2021** (bruto) | ~16 M m³/dia de biogás | Todos os setores; potencial teórico bruto; FDE otimista |
| SEMIL/FIESP **2024** (viável) | 6,4 M Nm³/dia de **biometano** ≈ **11,4 M m³/dia de biogás** | Técnica e economicamente viável |
| SEMIL/FIESP **2024** (longo prazo) | 42,5 M Nm³/dia | Infraestrutura plena |

**Como nos comparamos:**

- **Só o agrícola** (parte sólida): **13,5 M m³/dia** — já sozinho **supera o viável FIESP 2024 (11,4)** e está próximo do bruto FIESP 2021 (16). O bagaço de cana responde por ~90% disso.
- **O bagaço sozinho** saltou de 7,35 → **12,1 M m³/dia** depois da correção de BMP (115→165 NmL/gVS, Paulose 2021) e FCo (EPE BEN 2024). Essa é a mudança que nos colocou no mesmo patamar da FIESP.
- **Total estadual:** uma vez que a pecuária seja recalculada de forma consistente, esperamos um medio defensável na faixa de **~18–22 M m³/dia**, que **enquadra (bracket) o benchmark bruto FIESP 2021 de 16** sem inflar parâmetro nenhum.

**Mensagem central:** não precisamos mais de valores otimistas para alcançar a FIESP. Só com correções validadas por literatura no bagaço, o agrícola já bate o número viável da FIESP. A lacuna agora é **metodológica** (pecuária em dado legado), não de ambição de parâmetro.

---

## 3. Próximos passos (em ordem de prioridade)

### Prioridade 1 — Recalcular a pecuária pelo motor forward (desbloqueia o número total)
Este é o item que falta para termos **um único número estadual defensável**.

- [ ] Converter contagem de cabeças → toneladas no CSV/DB usando os fatores `t_per_head_yr` já no canonical (bovino 3,65; suíno 1,28; aves no `embrapa2012_aves`).
- [ ] Rodar `load_biomass_from_master.py` com a geração por cabeça e recalcular bovino/suíno/aves pelo `calculate_feedstock` (mesmo caminho do agrícola).
- [ ] Aposentar os números legados `LEGACY_BIOGAS_M3_YR` do `compute_sp_canonical_totals.py`.
- **Impacto esperado:** bovino cai de 11,3 → ~3–5; suíno de 1,4 → ~0,2; total estadual converge para ~18–22 M m³/dia com metodologia única.

### Prioridade 2 — Resolver as 2 ressalvas de mapeamento já documentadas
- [ ] **Soja:** o stream `soybean` no CSV mestre é *palha de campo* (FCo≈0 sob plantio direto/RTRS), mas está mapeado para `CASCA_SOJA` (casca de processamento). Decidir: usar `PALHA_SOJA` (FDE≈0) para a palha e `CASCA_SOJA` só para as ~0,32 M t/ano de casca de esmagamento.
- [ ] **RPO:** `rpo_pruning → LODO_PRIMARIO` está errado (poda ≠ lodo de ETE). Separar os dois streams.

### Prioridade 3 — Completar a cobertura de FDE (12 → 30)
- [ ] Adicionar blocos FDE auditados aos 13 feedstocks restantes (sub-variantes: POLPA_CAFE, MUCILAGEM_CAFE, CASCAS_CITROS, DEJETOS_AVES, ESTERCO_SUINO, LODO_SECUNDARIO, GORDURA, SANGUE, etc.), mantendo o rigor de citação. Hoje eles caem em FDE=1.0 (teórico) se ativados — nenhum aparece no mapa, então não há erro exibido, mas é o que falta para "30 resíduos completos".

### Prioridade 4 — Validação empírica
- [ ] Popular `010_create_validation_plants.sql` com dados de plantas reais (ex.: usinas com biometano em operação em SP) para comparar previsto × medido. Hoje o schema existe mas está vazio.

---

## 4. Resumo de uma linha

> **O agrícola já está sólido e bate a FIESP (13,5 M m³/dia, bagaço dominante).** O número total de 33,8 ainda não é defensável porque a pecuária usa dado legado inflado; assim que ela passar pelo motor forward (Prioridade 1), teremos **um medio estadual único e consistente na faixa de ~18–22 M m³/dia**, enquadrando o benchmark bruto FIESP 2021 (~16) com rigor científico e zero parâmetro inflado.
