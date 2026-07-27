# Relatório A8 — Arqueologia da Calibração de Parâmetros (feedstocks.yaml)
**Data de Emissão**: 2026-07-28  
**Escopo**: Somente Leitura (Auditoria Diagnóstica) — Lote A8  
**Branch**: `fix/canonical-consistency-2026-07`  
**Objetivo**: Delimitar o escopo real da recalibração. Reconstruir a série temporal completa de `feedstocks.yaml` desde a origem no histórico git, auditando todas as alterações numéricas de parâmetros, justificativas documentadas, coincidências temporais com alvos externos (FIESP 2025) e parâmetro não auditados.

---

## 1. Sumário Executivo e Contagem Quantitativa Final

| Métrica | Valor Absoluto | Percentual | Observação |
| :--- | :---: | :---: | :--- |
| **Total de parâmetros numéricos hoje** | **762** | 100,0 % | Total de folhas numéricas em `feedstocks.yaml` |
| **Parâmetros alterados pós-criação** | **119** | 15,6 % | Modificados em pelo menos um commit pós 05/06/2026 |
| ├─ `[COM JUSTIFICATIVA]` | 28 | 3,7 % (23,5 % dos alterados) | Citação explícita de fonte externa/DOI/relatório/regra R2 |
| ├─ `[JUSTIFICATIVA VAGA]` | 91 | 11,9 % (76,5 % dos alterados) | Menção a ajuste/calibração/acoplamento sem fonte externa |
| └─ `[SEM JUSTIFICATIVA]` | 0 | 0,0 % (0,0 % dos alterados) | Nenhuma menção na mensagem do commit |
| **Parâmetros NUNCA alterados** | **643** | 84,4 % | `[ORIGEM NÃO AUDITADA]` — preservam valores da criação inicial |

---

## 2. Lacunas e Estrutura do Histórico Git

### 2.1 Mapeamento de Tags e Branches de Histórico
- **Criação do Banco Canônico**: 05/06/2026 07:36:19 -0300 (`92fb365`), no commit `docs(audit): add scientific parameter audit report (#89)`. O arquivo `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` foi criado nesta data com 450 parâmetros numéricos iniciais.
- **Série Pre-Squash**: A tag `archive/dev-history-pre-squash` registra o histórico anterior ao squash de maio/2026. A verificação confirma que o arquivo unificado `feedstocks.yaml` não existia antes de 05/06/2026; os parâmetros legados eram dispersos em código TypeScript (`calculatorEngine.ts`), migrations SQL e CSVs de entrada. A série temporal canônica unificada inicia-se em `92fb365` sem lacunas de squash para este arquivo.
- **Commits com Alteração Numérica**: Das 27 revisões registradas no repositório afetando `feedstocks.yaml`, apenas **4 janelas de commit** alteraram valores numéricos de parâmetros existentes (as demais adicionaram novos blocos FDE/subfluxos ou formataram metadados).

---

## 3. Investigação Específica do Commit 24b4095 (Elevação do BMP da Vinhaça)

### 3.1 Ficha Técnica do Commit
- **Commit Hash**: `24b40955d687528e54668e838f4d0eaa0f05eb0d` (`24b4095`)
- **Data/Hora**: 12/06/2026 às 09:48:03 +0000 (06:48 -0300)
- **Autor**: Claude (`noreply@anthropic.com`)
- **Mensagem do Commit**:
```text
feat: recalibrate canonical BMP from 367-paper corpus + propagate to all layers

Untreated mono-digestion revisions (sourced per feedstock):
  VINHACA 90->160, FORSU 310->360, CASCA_CAFE 140->165, DEJETOS_SUINO 210->245
Other feedstocks confirmed within corpus range (no change).

- feedstocks.yaml: BMP updated with inline source notes
- propagated via generate_from_canonical.py to 016_canonical_sync.sql,
  _canonical_biomass_configs.py, calculatorEngine.canonical.ts,
  fde_all_residues_patch.json, PARAMETER_CITATIONS.md
- 35/35 regression tests pass
- SP scenarios: biogas medio 6.39->6.53, max 25.78->26.30 Mm3/d
- FIESP report updated with new scenario + subset numbers and BMP source table
```

### 3.2 Alterações Numéricas de BMP no Commit 24b4095
| Feedstock | Parâmetro | Valor Antes | Valor Depois | Delta % | Marca | Justificativa Registrada no Commit |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `VINHACA` | `bmp.min` | 40,0 | 90,0 | +125,00 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (Moura 2023 165.5; Ferreira 2016 150-180; Bonomi 2015) |
| `VINHACA` | `bmp.medio` | 90,0 | 160,0 | +77,78 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (elevação de 90 para 160 NmL/gVS mono-digestão) |
| `VINHACA` | `bmp.max` | 160,0 | 200,0 | +25,00 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (ajuste da banda superior) |
| `CASCA_CAFE` | `bmp.min` | 90,0 | 120,0 | +33,33 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (Gebremedhin 2016 131; Passos 2018 196; Czekala 2023) |
| `CASCA_CAFE` | `bmp.medio` | 140,0 | 165,0 | +17,86 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (elevação de 140 para 165 NmL/gVS) |
| `CASCA_CAFE` | `bmp.max` | 190,0 | 220,0 | +15,79 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos |
| `DEJETOS_SUINO` | `bmp.min` | 140,0 | 150,0 | +7,14 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (Kunz 2009 / EMBRAPA) |
| `DEJETOS_SUINO` | `bmp.medio` | 210,0 | 245,0 | +16,67 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (elevação de 210 para 245 NmL/gVS) |
| `DEJETOS_SUINO` | `bmp.max` | 280,0 | 300,0 | +7,14 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos |
| `FORSU` | `bmp.min` | 200,0 | 250,0 | +25,00 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos |
| `FORSU` | `bmp.medio` | 310,0 | 360,0 | +16,13 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos (elevação de 310 para 360 NmL/gVS) |
| `FORSU` | `bmp.max` | 400,0 | 420,0 | +5,00 % | `[COM JUSTIFICATIVA]` | Corpus 367 artigos |

### 3.3 Arquivos Co-alterados no Commit 24b4095
1. `cp2b-workspace/NewLook/data/canonical_parameters/feedstocks.yaml` (banco de origem)
2. `cp2b-workspace/NewLook/backend/app/migrations/016_canonical_sync.sql` (espelho SQL)
3. `cp2b-workspace/NewLook/backend/app/services/_canonical_biomass_configs.py` (espelho Python)
4. `cp2b-workspace/NewLook/frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.canonical.ts` (espelho TS)
5. `cp2b-workspace/NewLook/data/fde_all_residues_patch.json` (patch FDE)
6. `cp2b-workspace/NewLook/docs/data/PARAMETER_CITATIONS.md` (tabela de citações de parâmetros)
7. `cp2b-workspace/NewLook/docs/data/FIESP_BENCHMARK_AUDIT_REPORT.md` (relatório de benchmark FIESP)

---

## 4. Cruzamento Temporal Factos & Coincidências (Timeline Facto-a-Facto)

> [!NOTE]
> Conforme regra de auditoria A8, as coincidências temporais são registradas como **fatos cronológicos documentados no git**, sem inferir intenção subjetiva dos autores.

| Data / Hora (UTC/BRT) | Commit Hash | Ação / Evento Registrado | Documentos / Parâmetros Envolvidos | Observação Factual |
| :--- | :---: | :--- | :--- | :--- |
| **12/06/2026 01:55 UTC** (22:55 BRT -01d) | `1c8db39` | Extração do benchmark FIESP 2025 | Criação de `fiesp_2025.yaml` | Primeiro registro de integração dos dados FIESP 2025 no repositório |
| **12/06/2026 07:02 BRT** | `c588a4f` | PR #100 mergeado | `docs: FIESP benchmark extraction + citation/reference DB audits` | Consolidação do relatório inicial de alinhamento FIESP |
| **12/06/2026 09:38 UTC** (06:38 BRT) | `f851259` | Relatório de confronto FIESP | `FIESP_BENCHMARK_AUDIT_REPORT.md` | Apontou que potencial médio do modelo estava abaixo da estimativa FIESP |
| **12/06/2026 09:48 UTC** (06:48 BRT) | **`24b4095`** | **Recalibração do BMP no corpus** | **Vinhaça 90→160, FORSU 310→360, Café 140→165, Suíno 210→245** | **10 minutos após o relatório FIESP**, o BMP da vinhaça e outros 3 foram elevados. A mensagem de commit registra explicitamente: *'SP scenarios: biogas medio 6.39->6.53, max 25.78->26.30 Mm3/d. FIESP report updated with new scenario...'* |
| **12/06/2026 09:58 UTC** (06:58 BRT) | `154cfae` | Adição de cenário intermediário | Criação do cenário 'Fronteira do Biogás' | 10 minutos após `24b4095`, o novo cenário foi formalizado |
| **06/06/2026 10:58 UTC** | `7f150a2` | Suplemento do artigo FOSS4G | `FOSS4G_PAPER_SUPPLEMENT.md` | Manuscrito FOSS4G integrado 6 dias antes da recalibração FIESP |
| **26/07/2026 07:44 BRT** | `c64a64f` | Auditoria Lote 2 / Aplicação R2 | `feedstocks.yaml`, `DELTA_LOTE2_2026-07-26.md` | Aplicação da Regra R2 da `POLITICA_BMP.md`, alargando `bmp.max` para conter medianas do corpus |

---

## 5. Tabela Completa de Alterações de Valores Numéricos (202 Alterações Históricas)

| # | Commit | Data | Feedstock | Parâmetro | Valor Antes | Valor Depois | Delta % | Mensagem do Commit | Justificativa / Marca |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| 1 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `bmp.medio` | 115 | 165 | +43.48 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 2 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `bmp.min` | 86.25 | 115 | +33.33 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 3 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `fde.availability.max` | 0.1539 | 0.3467 | +125.28 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 4 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `fde.availability.medio` | 0.1399 | 0.1693 | +21.02 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 5 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `fde.availability.min` | 0.1259 | 0.0803 | -36.22 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 6 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `fde.components.fco.max` | 0.2 | 0.38 | +90.00 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 7 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `fde.components.fco.medio` | 0.1818 | 0.22 | +21.01 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 8 | `6ee5ebf` | 2026-06-05 | `BAGACO` | `fde.components.fco.min` | 0.1636 | 0.15 | -8.31 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 9 | `6ee5ebf` | 2026-06-05 | `CASCA_SOJA` | `fde.availability.max` | 0.2247 | 0.3097 | +37.83 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 10 | `6ee5ebf` | 2026-06-05 | `CASCA_SOJA` | `fde.availability.min` | 0.1341 | 0.0927 | -30.87 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 11 | `6ee5ebf` | 2026-06-05 | `DEJETOS_SUINO` | `fde.availability.max` | 0.4748 | 0.4913 | +3.48 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.85->0.95, FL 0.90->0.75) |
| 12 | `6ee5ebf` | 2026-06-05 | `DEJETOS_SUINO` | `fde.availability.medio` | 0.3527 | 0.3387 | -3.97 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.85->0.95, FL 0.90->0.75) |
| 13 | `6ee5ebf` | 2026-06-05 | `DEJETOS_SUINO` | `fde.availability.min` | 0.2431 | 0.2057 | -15.38 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.85->0.95, FL 0.90->0.75) |
| 14 | `6ee5ebf` | 2026-06-05 | `DEJETOS_SUINO` | `fde.components.fl.max` | 0.85 | 0.88 | +3.53 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.85->0.95, FL 0.90->0.75) |
| 15 | `6ee5ebf` | 2026-06-05 | `DEJETOS_SUINO` | `fde.components.fl.medio` | 0.75 | 0.72 | -4.00 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.85->0.95, FL 0.90->0.75) |
| 16 | `6ee5ebf` | 2026-06-05 | `DEJETOS_SUINO` | `fde.components.fl.min` | 0.65 | 0.55 | -15.38 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.85->0.95, FL 0.90->0.75) |
| 17 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.availability.max` | 0.3368 | 0.3994 | +18.59 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 18 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.availability.medio` | 0.2142 | 0.132 | -38.38 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 19 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.availability.min` | 0.1197 | 0.0437 | -63.49 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 20 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fc.medio` | 0.8 | 0.55 | -31.25 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 21 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fc.min` | 0.7 | 0.35 | -50.00 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 22 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fco.max` | 0.52 | 0.58 | +11.54 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 23 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fco.min` | 0.38 | 0.32 | -15.79 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 24 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fl.max` | 0.8 | 0.85 | +6.25 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 25 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fl.medio` | 0.7 | 0.65 | -7.14 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 26 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fl.min` | 0.6 | 0.52 | -13.33 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 27 | `6ee5ebf` | 2026-06-05 | `ESTERCO_BOVINO` | `fde.components.fs.medio` | 0.85 | 0.82 | -3.53 % | audit: BAGACO + livestock FDE corrections on  | `[COM JUSTIFICATIVA]` — Audit FDE contra FEEDSTOCK_FACTORS (FS 0.90->0.85, FL 0.90->0.70, |
| 28 | `6ee5ebf` | 2026-06-05 | `PALHA` | `bmp.max` | 280 | 250 | -10.71 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 29 | `6ee5ebf` | 2026-06-05 | `PALHA` | `bmp.medio` | 210 | 175 | -16.67 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 30 | `6ee5ebf` | 2026-06-05 | `PALHA_MILHO` | `fde.availability.max` | 0.0522 | 0.0849 | +62.64 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 31 | `6ee5ebf` | 2026-06-05 | `PALHA_MILHO` | `fde.availability.medio` | 0.0475 | 0.0475 | +0.08 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 32 | `6ee5ebf` | 2026-06-05 | `PALHA_MILHO` | `fde.availability.min` | 0.0427 | 0.0098 | -77.05 % | audit: BAGACO + livestock FDE corrections on  | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 33 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.availability.max` | 0.2008 | 0.2742 | +36.55 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 34 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.availability.medio` | 0.0915 | 0.162 | +77.05 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 35 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.availability.min` | 0.0351 | 0.0916 | +160.97 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 36 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fc.max` | 0.97 | 0.88 | -9.28 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 37 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fc.medio` | 0.92 | 0.8 | -13.04 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 38 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fc.min` | 0.85 | 0.72 | -15.29 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 39 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fco.max` | 0.3 | 0.4 | +33.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 40 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fco.medio` | 0.18 | 0.3 | +66.67 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 41 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fco.min` | 0.1 | 0.22 | +120.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 42 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fl.max` | 0.92 | 0.82 | -10.87 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 43 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fl.medio` | 0.85 | 0.75 | -11.76 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 44 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fl.min` | 0.75 | 0.68 | -9.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 45 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fs.max` | 0.75 | 0.95 | +26.67 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 46 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fs.medio` | 0.65 | 0.9 | +38.46 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 47 | `ebd2ce6` | 2026-06-05 | `CASCAS_CITROS` | `fde.components.fs.min` | 0.55 | 0.85 | +54.55 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 48 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.availability.max` | 0.1512 | 0.2372 | +56.88 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 49 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.availability.medio` | 0.0554 | 0.1521 | +174.55 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 50 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.availability.min` | 0.0151 | 0.092 | +509.27 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 51 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fc.max` | 0.6 | 0.72 | +20.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 52 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fc.medio` | 0.45 | 0.65 | +44.44 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 53 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fc.min` | 0.3 | 0.58 | +93.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 54 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fco.max` | 0.4 | 0.52 | +30.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 55 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fco.medio` | 0.28 | 0.45 | +60.71 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 56 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fco.min` | 0.18 | 0.38 | +111.11 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 57 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fl.max` | 0.7 | 0.72 | +2.86 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 58 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fl.medio` | 0.55 | 0.65 | +18.18 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 59 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fl.min` | 0.4 | 0.58 | +45.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 60 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fs.max` | 0.9 | 0.88 | -2.22 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 61 | `ebd2ce6` | 2026-06-05 | `CASCA_MILHO` | `fde.components.fs.min` | 0.7 | 0.72 | +2.86 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 62 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.availability.max` | 0.4537 | 0.4175 | -7.98 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 63 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.availability.medio` | 0.2565 | 0.2898 | +12.98 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 64 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.availability.min` | 0.1309 | 0.1929 | +47.36 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 65 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fc.max` | 0.92 | 0.82 | -10.87 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 66 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fc.medio` | 0.82 | 0.75 | -8.54 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 67 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fc.min` | 0.7 | 0.68 | -2.86 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 68 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fco.max` | 0.62 | 0.68 | +9.68 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 69 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fco.medio` | 0.5 | 0.6 | +20.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 70 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fco.min` | 0.4 | 0.52 | +30.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 71 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fl.max` | 0.82 | 0.78 | -4.88 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 72 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fl.medio` | 0.68 | 0.7 | +2.94 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 73 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fl.min` | 0.55 | 0.62 | +12.73 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 74 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fs.max` | 0.97 | 0.96 | -1.03 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 75 | `ebd2ce6` | 2026-06-05 | `DEJETOS_AVES` | `fde.components.fs.min` | 0.85 | 0.88 | +3.53 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 76 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.availability.max` | 0.3931 | 0.3398 | -13.56 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 77 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.availability.medio` | 0.1825 | 0.2244 | +22.96 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 78 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.availability.min` | 0.0676 | 0.1405 | +107.84 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 79 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fc.max` | 0.85 | 0.82 | -3.53 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 80 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fc.medio` | 0.65 | 0.75 | +15.38 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 81 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fc.min` | 0.45 | 0.68 | +51.11 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 82 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fco.max` | 0.6 | 0.58 | -3.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 83 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fco.medio` | 0.48 | 0.5 | +4.17 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 84 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fco.min` | 0.35 | 0.42 | +20.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 85 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fl.max` | 0.82 | 0.76 | -7.32 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 86 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fl.min` | 0.55 | 0.6 | +9.09 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 87 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fs.medio` | 0.86 | 0.88 | +2.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 88 | `ebd2ce6` | 2026-06-05 | `DEJETOS_BOVINO` | `fde.components.fs.min` | 0.78 | 0.82 | +5.13 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 89 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.availability.max` | 0.5026 | 0.4733 | -5.83 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 90 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.availability.medio` | 0.3412 | 0.3527 | +3.37 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 91 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.availability.min` | 0.2095 | 0.2409 | +14.99 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 92 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.components.fc.max` | 0.94 | 0.95 | +1.06 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 93 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.components.fc.medio` | 0.88 | 0.9 | +2.27 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 94 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.components.fc.min` | 0.8 | 0.82 | +2.50 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 95 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.components.fl.max` | 0.88 | 0.82 | -6.82 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 96 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.components.fl.min` | 0.62 | 0.68 | +9.68 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 97 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.components.fs.medio` | 0.94 | 0.95 | +1.06 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 98 | `ebd2ce6` | 2026-06-05 | `ESTERCO_SUINO` | `fde.components.fs.min` | 0.88 | 0.9 | +2.27 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 99 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.availability.max` | 0.3457 | 0.2475 | -28.41 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 100 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.availability.medio` | 0.1507 | 0.1425 | -5.44 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 101 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.availability.min` | 0.0497 | 0.0793 | +59.56 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 102 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fc.medio` | 0.75 | 0.8 | +6.67 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 103 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fc.min` | 0.6 | 0.72 | +20.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 104 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fco.max` | 0.45 | 0.35 | -22.22 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 105 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fco.medio` | 0.28 | 0.25 | -10.71 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 106 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fco.min` | 0.15 | 0.18 | +20.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 107 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fl.max` | 0.9 | 0.82 | -8.89 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 108 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fl.medio` | 0.78 | 0.75 | -3.85 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 109 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fl.min` | 0.65 | 0.68 | +4.62 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 110 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fs.max` | 0.97 | 0.98 | +1.03 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 111 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fs.medio` | 0.92 | 0.95 | +3.26 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 112 | `ebd2ce6` | 2026-06-05 | `GORDURA` | `fde.components.fs.min` | 0.85 | 0.9 | +5.88 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 113 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.availability.max` | 0.728 | 0.6347 | -12.82 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 114 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.availability.medio` | 0.5451 | 0.4635 | -14.97 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 115 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.availability.min` | 0.3659 | 0.3308 | -9.59 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 116 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fc.max` | 0.92 | 0.88 | -4.35 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 117 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fc.medio` | 0.85 | 0.82 | -3.53 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 118 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fc.min` | 0.78 | 0.76 | -2.56 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 119 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fco.max` | 0.85 | 0.8 | -5.88 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 120 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fco.medio` | 0.75 | 0.7 | -6.67 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 121 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fco.min` | 0.65 | 0.62 | -4.62 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 122 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fl.max` | 0.95 | 0.92 | -3.16 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 123 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fl.medio` | 0.9 | 0.85 | -5.56 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 124 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fl.min` | 0.82 | 0.78 | -4.88 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 125 | `ebd2ce6` | 2026-06-05 | `LODO_SECUNDARIO` | `fde.components.fs.min` | 0.88 | 0.9 | +2.27 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 126 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.availability.max` | 0.1572 | 0.3473 | +120.93 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 127 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.availability.medio` | 0.0575 | 0.2142 | +272.52 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 128 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.availability.min` | 0.0152 | 0.1323 | +770.39 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 129 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fc.max` | 0.6 | 0.92 | +53.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 130 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fc.medio` | 0.45 | 0.85 | +88.89 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 131 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fc.min` | 0.3 | 0.78 | +160.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 132 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fco.max` | 0.52 | 0.55 | +5.77 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 133 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fco.medio` | 0.38 | 0.45 | +18.42 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 134 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fco.min` | 0.25 | 0.38 | +52.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 135 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fl.max` | 0.72 | 0.78 | +8.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 136 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fl.medio` | 0.58 | 0.7 | +20.69 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 137 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fl.min` | 0.45 | 0.62 | +37.78 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 138 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fs.max` | 0.7 | 0.88 | +25.71 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 139 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fs.medio` | 0.58 | 0.8 | +37.93 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 140 | `ebd2ce6` | 2026-06-05 | `MUCILAGEM_CAFE` | `fde.components.fs.min` | 0.45 | 0.72 | +60.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 141 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.availability.max` | 0.189 | 0.1447 | -23.44 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 142 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.availability.medio` | 0.0693 | 0.065 | -6.20 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 143 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.availability.min` | 0.0168 | 0.0259 | +54.17 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 144 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fc.max` | 0.5 | 0.92 | +84.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 145 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fc.medio` | 0.35 | 0.85 | +142.86 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 146 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fc.min` | 0.2 | 0.78 | +290.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 147 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fco.max` | 0.6 | 0.18 | -70.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 148 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fco.medio` | 0.45 | 0.1 | -77.78 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 149 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fco.min` | 0.3 | 0.05 | -83.33 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 150 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fl.max` | 0.7 | 0.92 | +31.43 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 151 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fl.medio` | 0.55 | 0.85 | +54.55 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 152 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fl.min` | 0.4 | 0.78 | +95.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 153 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fs.max` | 0.9 | 0.95 | +5.56 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 154 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fs.medio` | 0.8 | 0.9 | +12.50 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 155 | `ebd2ce6` | 2026-06-05 | `PALHA` | `fde.components.fs.min` | 0.7 | 0.85 | +21.43 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 156 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.availability.max` | 0.264 | 0.3157 | +19.58 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 157 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.availability.medio` | 0.1204 | 0.1904 | +58.14 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 158 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.availability.min` | 0.0454 | 0.1114 | +145.37 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 159 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fc.max` | 0.8 | 0.88 | +10.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 160 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fc.medio` | 0.68 | 0.8 | +17.65 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 161 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fc.min` | 0.55 | 0.72 | +30.91 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 162 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fco.max` | 0.55 | 0.5 | -9.09 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 163 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fco.medio` | 0.42 | 0.4 | -4.76 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 164 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fco.min` | 0.3 | 0.32 | +6.67 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 165 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fl.max` | 0.75 | 0.78 | +4.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 166 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fl.medio` | 0.62 | 0.7 | +12.90 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 167 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fl.min` | 0.5 | 0.62 | +24.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 168 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fs.max` | 0.8 | 0.92 | +15.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 169 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fs.medio` | 0.68 | 0.85 | +25.00 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 170 | `ebd2ce6` | 2026-06-05 | `POLPA_CAFE` | `fde.components.fs.min` | 0.55 | 0.78 | +41.82 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 171 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.availability.max` | 0.2757 | 0.31 | +12.44 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 172 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.availability.medio` | 0.1063 | 0.2095 | +97.08 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 173 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.availability.min` | 0.0348 | 0.1315 | +277.87 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 174 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fc.max` | 0.85 | 0.78 | -8.24 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 175 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fc.min` | 0.55 | 0.62 | +12.73 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 176 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fco.max` | 0.38 | 0.52 | +36.84 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 177 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fco.medio` | 0.22 | 0.45 | +104.55 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 178 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fco.min` | 0.12 | 0.38 | +216.67 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 179 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fl.max` | 0.88 | 0.78 | -11.36 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 180 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fl.medio` | 0.75 | 0.7 | -6.67 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 181 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fs.max` | 0.97 | 0.98 | +1.03 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 182 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fs.medio` | 0.92 | 0.95 | +3.26 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 183 | `ebd2ce6` | 2026-06-05 | `SANGUE` | `fde.components.fs.min` | 0.85 | 0.9 | +5.88 % | audit(fde): full per-factor traceability + re | `[JUSTIFICATIVA VAGA]` — Mensagem de commit menciona audit/correção sem citar DOI/ref expl |
| 184 | `7f150a2` | 2026-06-06 | `LODO_PRIMARIO` | `generation.t_per_capita_yr.max` | 0.045 | 0.122 | +171.11 % | fix(data): LODO_PRIMARIO unit + status doc +  | `[COM JUSTIFICATIVA]` — CETESB: 30 g MS/cap/day @ TS=15% -> 0.037/0.073/0.122 t WET/cap/y |
| 185 | `7f150a2` | 2026-06-06 | `LODO_PRIMARIO` | `generation.t_per_capita_yr.medio` | 0.03 | 0.073 | +143.33 % | fix(data): LODO_PRIMARIO unit + status doc +  | `[COM JUSTIFICATIVA]` — CETESB: 30 g MS/cap/day @ TS=15% -> 0.037/0.073/0.122 t WET/cap/y |
| 186 | `7f150a2` | 2026-06-06 | `LODO_PRIMARIO` | `generation.t_per_capita_yr.min` | 0.015 | 0.037 | +146.67 % | fix(data): LODO_PRIMARIO unit + status doc +  | `[COM JUSTIFICATIVA]` — CETESB: 30 g MS/cap/day @ TS=15% -> 0.037/0.073/0.122 t WET/cap/y |
| 187 | `24b4095` | 2026-06-12 | `CASCA_CAFE` | `bmp.max` | 190 | 220 | +15.79 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Gebremedhin 2016 131; Passos 2018 196; Czekal |
| 188 | `24b4095` | 2026-06-12 | `CASCA_CAFE` | `bmp.medio` | 140 | 165 | +17.86 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Gebremedhin 2016 131; Passos 2018 196; Czekal |
| 189 | `24b4095` | 2026-06-12 | `CASCA_CAFE` | `bmp.min` | 90 | 120 | +33.33 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Gebremedhin 2016 131; Passos 2018 196; Czekal |
| 190 | `24b4095` | 2026-06-12 | `DEJETOS_SUINO` | `bmp.max` | 280 | 300 | +7.14 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Kunz 2009 / EMBRAPA 210->245) |
| 191 | `24b4095` | 2026-06-12 | `DEJETOS_SUINO` | `bmp.medio` | 210 | 245 | +16.67 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Kunz 2009 / EMBRAPA 210->245) |
| 192 | `24b4095` | 2026-06-12 | `DEJETOS_SUINO` | `bmp.min` | 140 | 150 | +7.14 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Kunz 2009 / EMBRAPA 210->245) |
| 193 | `24b4095` | 2026-06-12 | `FORSU` | `bmp.max` | 420 | 500 | +19.05 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (FORSU untreated mono-digestion 310->360) |
| 194 | `24b4095` | 2026-06-12 | `FORSU` | `bmp.medio` | 310 | 360 | +16.13 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (FORSU untreated mono-digestion 310->360) |
| 195 | `24b4095` | 2026-06-12 | `FORSU` | `bmp.min` | 200 | 250 | +25.00 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (FORSU untreated mono-digestion 310->360) |
| 196 | `24b4095` | 2026-06-12 | `VINHACA` | `bmp.max` | 160 | 200 | +25.00 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Moura 2023 165.5; Ferreira 2016 150-180; Bono |
| 197 | `24b4095` | 2026-06-12 | `VINHACA` | `bmp.medio` | 90 | 160 | +77.78 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Moura 2023 165.5; Ferreira 2016 150-180; Bono |
| 198 | `24b4095` | 2026-06-12 | `VINHACA` | `bmp.min` | 40 | 90 | +125.00 % | feat: recalibrate canonical BMP from 367-pape | `[COM JUSTIFICATIVA]` — Corpus 367 artigos (Moura 2023 165.5; Ferreira 2016 150-180; Bono |
| 199 | `c64a64f` | 2026-07-26 | `CASCA_MILHO` | `bmp.max` | 185 | 307 | +65.95 % | fix(canonical): recálculo único — moagem da c | `[COM JUSTIFICATIVA]` — Regra R2 (POLITICA_BMP.md §4): alargamento da banda max para cobr |
| 200 | `c64a64f` | 2026-07-26 | `LODO_SECUNDARIO` | `bmp.max` | 260 | 310 | +19.23 % | fix(canonical): recálculo único — moagem da c | `[COM JUSTIFICATIVA]` — Regra R2 (POLITICA_BMP.md §4): alargamento da banda max para cobr |
| 201 | `c64a64f` | 2026-07-26 | `PALHA` | `bmp.max` | 250 | 293.5 | +17.40 % | fix(canonical): recálculo único — moagem da c | `[COM JUSTIFICATIVA]` — Regra R2 (POLITICA_BMP.md §4): alargamento da banda max para cobr |
| 202 | `c64a64f` | 2026-07-26 | `PALHA_MILHO` | `bmp.max` | 300 | 390 | +30.00 % | fix(canonical): recálculo único — moagem da c | `[COM JUSTIFICATIVA]` — Regra R2 (POLITICA_BMP.md §4): alargamento da banda max para cobr |

---

## 6. Lista de Parâmetros Nunca Alterados — `[ORIGEM NÃO AUDITADA]` (643 Parâmetros)

Estes 643 parâmetros numéricos foram introduzidos na criação inicial (`92fb365` em 05/06/2026) e **nunca foram modificados no histórico git**. Eles representam um problema distinto de auditoria: **origem não auditada** (não contaminação por deriva, mas ausência de rastreabilidade documentada desde a origem).

| Feedstock | Quantidade de Parâmetros Não Auditados | Exemplo de Parâmetros e Valores | Marca |
| :--- | :---: | :--- | :--- |
| `BAGACO` | 30 | `rpr.min`=0.25, `rpr.medio`=0.28, `rpr.max`=0.3, `mill_delivery_fraction.min`=0.76 ... (+26) | `[ORIGEM NÃO AUDITADA]` |
| `BAGACO_CITROS` | 29 | `rpr.min`=0.48, `rpr.medio`=0.5, `rpr.max`=0.52, `bmp.min`=170.0 ... (+25) | `[ORIGEM NÃO AUDITADA]` |
| `CAMA_AVIARIO` | 29 | `bmp.min`=200.0, `bmp.medio`=280.0, `bmp.max`=360.0, `bmp.corpus.n`=1.0 ... (+25) | `[ORIGEM NÃO AUDITADA]` |
| `CASCAS_CITROS` | 17 | `bmp.min`=160.0, `bmp.medio`=210.0, `bmp.max`=290.0, `bmp.corpus.n`=1.0 ... (+13) | `[ORIGEM NÃO AUDITADA]` |
| `CASCA_CAFE` | 26 | `rpr.min`=1.0, `rpr.medio`=1.0, `rpr.max`=1.18, `bmp.corpus.n`=2.0 ... (+22) | `[ORIGEM NÃO AUDITADA]` |
| `CASCA_MILHO` | 17 | `bmp.min`=110.0, `bmp.medio`=145.0, `bmp.corpus.n`=30.0, `bmp.corpus.median`=307.0 ... (+13) | `[ORIGEM NÃO AUDITADA]` |
| `CASCA_SOJA` | 25 | `bmp.min`=230.0, `bmp.medio`=300.0, `bmp.max`=380.0, `bmp.corpus.n`=0.0 ... (+21) | `[ORIGEM NÃO AUDITADA]` |
| `DEJETOS_AVES` | 18 | `bmp.min`=150.0, `bmp.medio`=250.0, `bmp.max`=340.0, `bmp.corpus.n`=2.0 ... (+14) | `[ORIGEM NÃO AUDITADA]` |
| `DEJETOS_BOVINO` | 18 | `bmp.min`=90.0, `bmp.medio`=155.0, `bmp.max`=220.0, `bmp.corpus.n`=0.0 ... (+14) | `[ORIGEM NÃO AUDITADA]` |
| `DEJETOS_SUINO` | 23 | `bmp.corpus.n`=10.0, `bmp.corpus.median`=265.0, `ts.min`=1.5, `ts.medio`=3.0 ... (+19) | `[ORIGEM NÃO AUDITADA]` |
| `ESTERCO_BOVINO` | 22 | `bmp.min`=120.0, `bmp.medio`=200.0, `bmp.max`=270.0, `bmp.corpus.n`=0.0 ... (+18) | `[ORIGEM NÃO AUDITADA]` |
| `ESTERCO_BOVINO_CORTE` | 28 | `bmp.min`=80.0, `bmp.medio`=120.0, `bmp.max`=180.0, `bmp.corpus.n`=0.0 ... (+24) | `[ORIGEM NÃO AUDITADA]` |
| `ESTERCO_BOVINO_LEITEIRO` | 28 | `bmp.min`=150.0, `bmp.medio`=230.0, `bmp.max`=300.0, `bmp.corpus.n`=0.0 ... (+24) | `[ORIGEM NÃO AUDITADA]` |
| `ESTERCO_SUINO` | 18 | `bmp.min`=150.0, `bmp.medio`=235.0, `bmp.max`=320.0, `bmp.corpus.n`=0.0 ... (+14) | `[ORIGEM NÃO AUDITADA]` |
| `FORSU` | 29 | `bmp.corpus.n`=9.0, `bmp.corpus.median`=472.0, `ts.min`=26.0, `ts.medio`=30.58 ... (+25) | `[ORIGEM NÃO AUDITADA]` |
| `GORDURA` | 18 | `bmp.min`=700.0, `bmp.medio`=850.0, `bmp.max`=1050.0, `bmp.corpus.n`=2.0 ... (+14) | `[ORIGEM NÃO AUDITADA]` |
| `LODO_PRIMARIO` | 26 | `bmp.min`=190.0, `bmp.medio`=310.0, `bmp.max`=440.0, `bmp.corpus.n`=11.0 ... (+22) | `[ORIGEM NÃO AUDITADA]` |
| `LODO_SECUNDARIO` | 18 | `bmp.min`=80.0, `bmp.medio`=180.0, `bmp.corpus.n`=8.0, `bmp.corpus.median`=310.0 ... (+14) | `[ORIGEM NÃO AUDITADA]` |
| `MUCILAGEM_CAFE` | 16 | `bmp.min`=260.0, `bmp.medio`=320.0, `bmp.max`=390.0, `bmp.corpus.n`=0.0 ... (+12) | `[ORIGEM NÃO AUDITADA]` |
| `ORGANICO_RSU` | 25 | `bmp.min`=170.0, `bmp.medio`=270.0, `bmp.max`=360.0, `bmp.corpus.n`=0.0 ... (+21) | `[ORIGEM NÃO AUDITADA]` |
| `PALHA` | 15 | `bmp.min`=140.0, `bmp.corpus.n`=14.0, `bmp.corpus.median`=293.5, `ts.min`=18.0 ... (+11) | `[ORIGEM NÃO AUDITADA]` |
| `PALHA_MILHO` | 28 | `rpr.min`=1.0, `rpr.medio`=1.1, `rpr.max`=1.2, `bmp.min`=150.0 ... (+24) | `[ORIGEM NÃO AUDITADA]` |
| `PALHA_SOJA` | 28 | `rpr.min`=1.35, `rpr.medio`=1.4, `rpr.max`=1.5, `bmp.min`=150.0 ... (+24) | `[ORIGEM NÃO AUDITADA]` |
| `PODA_URBANA` | 28 | `bmp.min`=100.0, `bmp.medio`=175.0, `bmp.max`=250.0, `bmp.corpus.n`=0.0 ... (+24) | `[ORIGEM NÃO AUDITADA]` |
| `POLPA_CAFE` | 17 | `bmp.min`=190.0, `bmp.medio`=245.0, `bmp.max`=290.0, `bmp.corpus.n`=1.0 ... (+13) | `[ORIGEM NÃO AUDITADA]` |
| `SANGUE` | 18 | `bmp.min`=300.0, `bmp.medio`=450.0, `bmp.max`=620.0, `bmp.corpus.n`=0.0 ... (+14) | `[ORIGEM NÃO AUDITADA]` |
| `TORTA_FILTRO` | 26 | `bmp.min`=200.0, `bmp.medio`=280.0, `bmp.max`=380.0, `bmp.corpus.n`=14.0 ... (+22) | `[ORIGEM NÃO AUDITADA]` |
| `VINHACA` | 23 | `bmp.corpus.n`=7.0, `bmp.corpus.median`=180.0, `ts.min`=1.0, `ts.medio`=3.0 ... (+19) | `[ORIGEM NÃO AUDITADA]` |

---

## 7. Conclusões da Auditoria Arqueológica

1. **Escopo Real da Recalibração Canônica**: Apenas 119 dos 762 parâmetros atualmente em `feedstocks.yaml` sofreram modificação pós-criação. Destes, 28 possuem justificativa científica explicitada com referências/regras formalizadas (`[COM JUSTIFICATIVA]`), enquanto 91 foram ajustados durante reorganizações estruturais de blocos FDE (`[JUSTIFICATIVA VAGA]`).
2. **Evidência do Commit 24b4095**: O commit `24b4095` de 12/06/2026 elevou expressamente o BMP da vinhaça de 90 para 160 NmL/gVS (+77,78 %), citando o corpus de 367 artigos. A mensagem do commit menciona diretamente o impacto nos totais de biogás do estado de SP e a sincronização com o relatório de benchmark da FIESP.
3. **Risco dos Parâmetros Não Auditados**: 643 parâmetros (84,4 % do banco canônico) permanecem com `[ORIGEM NÃO AUDITADA]`, pois nunca foram revisados desde a inclusão inicial em 05/06/2026. Qualquer revisão futura do modelo deve priorizar a validação primária desses 643 parâmetros.
4. **Parada do Lote**: Diagnóstico concluído sem alterações em arquivos de produção do projeto. NENHUM total estadual foi consultado nesta auditoria.