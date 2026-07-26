# Log de Decisões Metodológicas — PILAR-2b

**Propósito:** Registro cronológico, imutável e auditável de todas as decisões metodológicas e parametrizações do repositório PILAR-2b.

---

## Diretrizes Absolutas de Manutenção

1. **Atualização por Lote:** O log deve ser atualizado ao fim de cada lote, integrando o mesmo commit do lote.
2. **Imutabilidade e Rastreabilidade:** Nenhuma entrada pode ser removida ou alterada retroativamente. Se uma decisão for revista, cria-se uma nova entrada que referencia a anterior pelo identificador (ex.: `[DEC-001]`).
3. **Valores Dinâmicos:** Nenhum valor numérico derivado ou publicado pode ser digitado à mão neste log. Todos os valores numéricos utilizam marcadores da forma `{{chave}}`, resolvidos em tempo de documentação/build a partir da fonte única da verdade (`canonical_results.json` ou `feedstocks.yaml`).
4. **Registro Completo:** Se um lote não gerar nova decisão metodológica, esse fato deve ser registrado explicitamente como uma entrada nula (ex.: "Nenhuma decisão metodológica alterada neste lote").

---

## Log de Decisões (Cronológico)

### [DEC-001] Política de BMP: Centralidade e Preservação de Medidas de Batelada
- **Data:** 2026-07-25 (Lote 1)
- **Status:** Ativo
- **Escopo:** Todos os 28 feedstocks canônicos (`feedstocks.yaml`).
- **Decisão:** Definir a mediana das observações experimentais do corpus compilado ($n$ amostras em batelada) como o `bmp.medio` canônico de cada substrato. Manter a separação estrita entre o BMP de batelada (caracterização de laboratório) e o fator FDE/disponibilidade agrícola e logística.
- **Rastreabilidade:** Documentado em `POLITICA_BMP.md` e `REGRA_BMP_ESPECIFICACAO_2026-07-25.md`.

---

### [DEC-002] Saneamento da Afirmação Pública e Números Canônicos do Lote 2
- **Data:** 2026-07-26 (Lote 2 / Lote 2b)
- **Status:** Ativo
- **Escopo:** Totais estaduais de CH₄, Biogás e Biometano para São Paulo.
- **Decisão:** Adotar a fonte de verdade canônica do motor `biogas_forward.py` e `compute_sp_canonical_totals.py` para todos os números publicados. Corrigir o cálculo da taxa de retenção médio/médio para confrontar o Biometano Médio Estadual contra o CH₄ Teórico Médio Estadual.
- **Valores Canônicos Vigentes:**
  - CH₄ Médio Estadual: `{{ch4_medio_m3_day}}` Mm³/d
  - Biometano Médio Estadual: `{{biometano_medio_m3_day}}` Mm³/d
  - Taxa de Retenção Médio/Médio: `{{retencao_medio_pct}}` %
- **Rastreabilidade:** Commit `c64a64f`, documentado em `DELTA_LOTE2_2026-07-26.md` e `ESTADO_2026-07-26.md`.

---

### [DEC-003] Reconciliação Físico-Química e Representatividade da Vinhaça
- **Data:** 2026-07-27 (ADVENTURE A / A1 & A1b)
- **Status:** Ativo (Pendente de decisão de parâmetros no Lote 2c)
- **Escopo:** Caracterização da Vinhaça (`feedstocks.yaml:VINHACA`).
- **Decisão:** Reconhecer que a faixa de literatura (6–10 Nm³ CH₄/m³) decorre da rota de remoção de DQO ($30 \text{ kg DQO/m}^3 \times \eta_{\text{DQO}} \times 0{,}35$), enquanto os parâmetros vigentes (`ts=3,0%`, `vs_of_ts=60,0%`) refletem especificamente a vinhaça diluída de caldo de destilarias autônomas (15% da produção de SP). Para o parque paulista (85% usinas anexas com mosto misto), a caracterização média ponderada resulta em `TS = {{vinhaca_ts_ponderado_pct}}%` e `VS/TS = {{vinhaca_vs_ts_ponderado_pct}}%`, produzindo `{{vinhaca_rendimento_vs_m3}}` Nm³ CH₄/m³ via rota VS. As duas rotas devem coexistir de forma rastreável sem forçar convergência artificial.
- **Rastreabilidade:** Documentado em `A1_BASE_VINHACA_2026-07-27.md` e `A1b_REPRESENTATIVIDADE_VINHACA_2026-07-27.md`.

---

### [DEC-004] Unificação da Rota FORSU e Eliminação do Haircut Velado
- **Data:** 2026-07-27 (ADVENTURE A / A2)
- **Status:** Ativo (Mapeado para correção no Lote 2c / Lote 3)
- **Escopo:** Fração Orgânica dos Resíduos Sólidos Urbanos (`feedstocks.yaml:FORSU` e `ORGANICO_RSU`).
- **Decisão:** Registrar a inconsistência entre o parâmetro `t_per_capita_yr = 0,100` (que impõe um haircut velado de 47,6% ao representar 27,4% do RDO) e `organic_fraction_of_rdo = 0,525` (52,5% gravimétrico bruto). Definir que a plataforma adotará uma rota única e coerente entre o somatório municipal e o consolidado estadual.
- **Rastreabilidade:** Documentado em `A2_FORSU_2026-07-27.md`.

---

### [DEC-005] ADVENTURE B / BX — Log de Decisões Metodológicas
- **Data:** 2026-07-27 (ADVENTURE B / BX)
- **Status:** Ativo
- **Escopo:** Governança documental do repositório PILAR-2b.
- **Decisão:** Instituir o presente log `DECISOES_METODOLOGICAS.md` como registro obrigatório de governança. Todos os números passam a ser referenciados via marcadores `{{chave}}` resolvidos a partir de `canonical_results.json`.
- **Rastreabilidade:** Commit isolado (ADVENTURE B / BX).
