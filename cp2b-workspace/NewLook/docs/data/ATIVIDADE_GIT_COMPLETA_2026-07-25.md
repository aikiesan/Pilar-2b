# Atividade Git completa — PILAR-2b

**Data:** 2026-07-25 · **Lote:** 0c
**Escopo:** `git log --all` sobre o repositório com histórico completo
(`git fetch --unshallow`, executado em 2026-07-25).
**Substitui:** Bloco G de `AUDITORIA_PILAR2B_2026-07-25.md`.

Somente o que o log sustenta. Nenhuma inferência.

---

## ERRATA — o que está superado na auditoria de 2026-07-25

> O **Bloco G** da auditoria foi construído sobre um **clone raso** (`.git/shallow`
> com 2 pontos enxertados, 52 commits alcançáveis, o mais antigo em 2026-06-05).
> Está **superado por este arquivo**. Cinco correções, mais duas constatações
> materiais que o clone raso escondia.

### E1 — Bloco G: cobertura e contagens (SUPERADO)

| Item | Auditoria (clone raso) | Correto (`--all`) |
|---|---|---|
| Commits alcançáveis | 52 | **1.363** (1.360 sem contar os 3 desta sessão) |
| Commit mais antigo | 2026-06-05 | **2025-11-16** |
| Cobertura mensal | só 2026-06 e 2026-07 | **2025-11 a 2026-07**, nove meses |
| Contribuidores | 3 identidades | **8 identidades** (4 pessoas + 1 bot + Claude) |

A tabela mensal do Bloco G da auditoria (`29` em 2026-06, `22` em 2026-07)
corresponde à coluna *"só ancestrais de HEAD"* deste arquivo, que hoje se sabe ser
**artefato do squash de 2026-05-19** e não medida de atividade.

### E2 — Bloco G.6: "Releases/tags: NENHUMA" (ERRADO)

A auditoria afirmou *"**NENHUMA.** `git tag` retorna vazio"*. Verdadeiro no clone
raso; **falso** no repositório completo. Existia, desde 2025-11-17, a tag
**`v3.0-day2-auth-complete`** → `e673d81`,
`feat(auth): Implement complete Supabase authentication system`.

Tags existentes hoje: ver §3.

### E3 — Bloco I.5 #44: mecanismo dos 13 códigos canônicos (número certo, explicação errada)

A auditoria escreveu: *"apenas 13 estão mapeados a streams municipais ativos **via
`STREAM_TO_CANONICAL`**"*. O número 13 está certo; o mecanismo, não.

Medido em `baseline_2026-07-25.json` (`counts_as_found`):

| Grandeza | Valor |
|---|---:|
| Chaves em `STREAM_TO_CANONICAL` (`canonical_loader.py:54-67`) | **12** |
| Códigos canônicos distintos que essas 12 chaves resolvem | **10** |
| Streams somados por `compute_sp_canonical_totals.py` | **13** |
| Códigos canônicos distintos efetivamente somados | **13** |
| Feedstocks em `feedstocks.yaml` | **26** |

As quatro sub-correntes da cana (`BAGACO`, `TORTA_FILTRO`, `PALHA`, `VINHACA`)
entram por `get_params(code)` **direto**, sem passar pelo mapa de streams
(`compute_sp_canonical_totals.py:204-217`). Por isso 12 chaves produzem 13 códigos
somados. O saldo `26 − 13 = 13` feedstocks sem stream ativo permanece correto.

### E4 — Bloco F.5 e lacuna I.3 #18: enquadramento do 19,69 (ERRADO)

A auditoria classificou "19.69 vs 6.39" como **discrepância de unidade elétrica da
ANEEL** (kW lido como MW/GW), seguindo `docs/planning/BRAZIL_EXPANSION_ROADMAP.md:39`
e `backend/ingest/sources/aneel_siga/source.py:15-16`.

O outline recuperado do pré-squash desfaz isso
(`docs/archive/2026-05-pre-squash/Outline_Paper_CP2b _) (1).md:107`):

> *"O Potencial Mobilizável corrigido pelos quatro fatores de correção (FC, FCo,
> FS, FL) totalizou 19,69 milhões de m³ CH4/dia"*

**19,69 é o potencial de CH₄ em M m³/dia do Estado de São Paulo** — a grandeza
central do manuscrito, não capacidade elétrica. Contra o valor canônico congelado
(**3,6488 M m³/dia**, cenário medio): razão **5,40×**.

Detalhamento completo em `docs/data/FORENSE_VALIDACAO_2026-07-25.md`.

### E5 — Bloco B: `mill_delivery_fraction` "definida mas não aplicada" (IMPRECISO)

A linha da tabela de números canônicos diz *"definida mas não aplicada (ver D6)"*,
sem qualificar. É impreciso: existem **dois caminhos** de cálculo, e o parâmetro é
aplicado em um deles.

| Caminho | Aplica `mill_delivery_fraction`? | Evidência |
|---|---|---|
| Canônico estadual — `backend/scripts/compute_sp_canonical_totals.py` | **NÃO** | Nenhuma chamada; sub-correntes usam a produção PAM integral (`:202-217`) |
| Promoção nacional de safras — `backend/scripts/promote_pam.py` | **SIM** | `:48-49` (*"PAM production × mill_delivery_fraction × rpr"*), importado em `:81`, chamado em `:157` |

O corpo de D6 já era exato (*"`compute_sp_canonical_totals.py` **não a chama em
nenhum ponto**"*) e o impacto declarado — o total de SP não desconta a cana não
moída — permanece válido. Corrige-se apenas a linha-resumo da tabela do Bloco B,
que generalizava para o repositório inteiro.

Entregue por `2e607c3` (2026-07-21), `feat(crops): promote sugarcane nationally via
the mill-delivery fraction`.

### E6 — Constatação nova: a Fase 2 (gado espacial) foi implementada e NÃO está em `main`

A auditoria (lacuna I.5 #42) e `docs/data/FOSS4G_PAPER_SUPPLEMENT.md:268-271`
registram a diferenciação espacial do rebanho bovino como **planejada**. Ela foi
**implementada** em `b279978`, 2026-06-07, `feat(livestock): Phase 2 — spatial split
of SP cattle into beef (west) and dairy (east) (#97)`.

O commit existe apenas em `origin/pr/phase1-biomass-units`. Confirmado que o
conteúdo **não está em `main`**: `grep` por `ESTERCO_BOVINO_CORTE` e
`ESTERCO_BOVINO_LEITEIRO` em `data/canonical_parameters/feedstocks.yaml` retorna
**0 ocorrências**.

O que o commit entrega, conforme sua própria mensagem:

- dois feedstocks canônicos novos — `ESTERCO_BOVINO_CORTE` (corte extensivo, oeste
  paulista; BMP 80–120–180 NmL/gVS; FC=0,35; FDE medio 0,0323; 2,00–2,92–4,00
  t/cabeça/ano) e `ESTERCO_BOVINO_LEITEIRO` (leite intensivo, leste; BMP
  150–230–300; FC=0,88; FDE medio 0,2929; 3,65–5,11–6,57 t/cabeça/ano);
- constantes `CATTLE_BEEF_FRACTION=0.67` e `CATTLE_DAIRY_FRACTION=0.33`, atribuídas
  ao IBGE Censo Agropecuário 2017;
- `test_spatial_livestock.py`, 10 testes, declarados verdes.

Efeito declarado sobre o total estadual (medio), contra a base Fase 1 vigente à
época (3,57 / 6,39 / 3,46):

| Grandeza | Fase 1 | Fase 2 declarada | Δ |
|---|---:|---:|---:|
| CH₄ (M m³/dia) | 3,57 | **3,90** | +0,33 (+9,2 %) |
| Biogás (M m³/dia) | 6,39 | **6,97** | +0,58 |
| Biometano (M m³/dia) | 3,46 | **3,78** | +0,32 |
| Bovino isolado | 0,403 | 0,037 (corte) + 0,696 (leite) = **0,733** | +0,330 (+82 %) |

**Estes números não foram verificados por esta sessão** — são os declarados na
mensagem do commit, sobre uma base (3,57) que o próprio pipeline já não reproduz
(ver `baseline_2026-07-25.json`: 3,6488). Registrados como fato do log, não como
resultado validado.

---

## 1. Commits por mês, todas as refs

Deduplicado por SHA. Exclui merges. Janela FAPESP a partir de 01/08/2025.

| Mês | Commits | Só ancestrais de `main` | Observação |
|---|---:|---:|---|
| 2025-08 | **0** | 0 | Nada em ref nenhuma |
| 2025-09 | **0** | 0 | Nada em ref nenhuma |
| 2025-10 | **0** | 0 | Nada em ref nenhuma — mas o CHANGELOG data `[2.0.0]` em 2025-10-13 (ver §5) |
| 2025-11 | **273** | 0 | Início do repositório em 16/11 |
| 2025-12 | **231** | 0 | |
| 2026-01 | **20** | 0 | |
| 2026-02 | **9** | 0 | |
| 2026-03 | **17** | 0 | |
| 2026-04 | **59** | 0 | |
| 2026-05 | **71** | 17 | Squash público em 19/05 |
| 2026-06 | **124** | 35 | |
| 2026-07 | **131** | 23 | |
| **Total** | **935** sem merges · **1.363** com merges | 75 | |

A coluna da direita é o que o clone raso enxergava. A diferença não mede atividade:
mede o corte do squash de 2026-05-19, que criou uma segunda raiz de commit
(`41c9ea0`) sem ancestralidade com a raiz real (`2fce883`, 2025-11-16).

Commits com prefixo `feat`/`perf`, por mês, como proxy de entrega:

| Mês | `feat`/`perf` |
|---|---:|
| 2025-11 | 70 |
| 2025-12 | 61 |
| 2026-01 | 7 |
| 2026-02 | 1 |
| 2026-03 | 8 |
| 2026-04 | 11 |
| 2026-05 | 14 |
| 2026-06 | 30 |
| 2026-07 | 32 |

---

## 2. Entregas funcionais por tema

Agrupamento por tema, com data e commit. Só commits `feat`, `perf` ou `audit`.
Alguns aparecem duas vezes no grafo (versão de trabalho + squash do PR); indica-se
o SHA da versão de trabalho.

### 2.1 Fundação da plataforma V3 — nov/2025

| Data | Commit | Entrega |
|---|---|---|
| 2025-11-16 | `2fce883` | `CP2B Maps V3 - Modern Web Platform Foundation` — commit raiz do desenvolvimento |
| 2025-11-17 | `e673d81` | `feat(auth): Implement complete Supabase authentication system` — **tag `v3.0-day2-auth-complete`** |
| 2025-11-17 | `658b4a5` | `feat(database): Implement full production PostgreSQL + PostGIS stack` |
| 2025-11-17 | `0f90a50` | `feat(dashboard): Build interactive map with biogas potential visualization` |
| 2025-11-17 | `724654c` | `feat(landing): Build professional DBFZ-inspired landing page` |
| 2025-11-17 | `e17f5d1` | `feat(dashboard): Implement Phase 1 Layer Management & Filtering System` |
| 2025-11-17 | `a3e7a52` | `feat(dashboard): Add municipality detail page and comparison feature` |
| 2025-11-17 | `908d85e` | `feat(migration): Add Supabase data migration and diagnostic tools` |
| 2025-11-17 | `1e2a33e` | `feat: Add Vercel deployment configuration and deployment guide` |
| 2025-11-17 | `71eb8a4` | `perf(database): Add performance indexes migration` |
| 2025-11-17 | `92831f6` | `fix(security): Prevent SQL injection in geospatial endpoints` |
| 2025-11-17 | `fb70108` | `fix(security): Add environment validation, remove CORS wildcard` |
| 2025-11-18 | `084bdf1` | `fix(security): Address critical authentication vulnerabilities` |
| 2025-11-18 | `016c880` | `docs: Add V2 project analysis and migration documentation` |

### 2.2 Simulação econômica e rotas tecnológicas — dez/2025

| Data | Commit | Entrega |
|---|---|---|
| 2025-12-01 | `72a0744` | `feat(simulation): Add Brazil-wide economic simulation infrastructure` |
| 2025-12-01 | `3fa30a9` | `feat(simulation): Expand to Brazil-wide economic simulation (133 regions)` |
| 2025-12-04 | `df1565d` | `feat(education): add Technology Routes visual pathway builder` |
| 2025-12-04 | `74a5252` | `feat(ui/ux): redesign Technology Routes with CP2B branding` |
| 2025-12-04 | `efe1a94` | `feat: add 20 new technology cards for expanded biogas routes` |
| 2025-12-04 | `e3c14ea` | `feat(validation): add intelligent connection validation with visual feedback` |
| 2025-12-05 | `5095366` | `feat(tech-routes): add drag-to-delete, undo/redo, auto-layout, and export` |
| 2025-12-10 | `bb952ee` | `feat: add Sugarcane biogas templates and template loader` |

### 2.3 Qualidade, observabilidade e CI — dez/2025 a jan/2026

| Data | Commit | Entrega |
|---|---|---|
| 2025-12-04 | `dd70ab8` | `perf: implement comprehensive deployment optimizations` |
| 2025-12-05 | `f0f9bb9` | `perf: comprehensive performance optimizations across the project` |
| 2025-12-07 | `59623db` | `feat: add CI/CD pipeline, security scanning, and contribution guidelines` |
| 2025-12-07 | `41df736` | `feat: add Sentry error monitoring and performance tracking` |
| 2025-12-07 | `eb7fae3` | `perf: comprehensive map loading optimizations with TanStack Query` |
| 2025-12-23 | `0d38958` | `feat: Significantly improve test coverage with comprehensive testing strategy` |
| 2025-12-26 | `56db85c` | `feat: Implement comprehensive testing infrastructure for CP2B Maps V3` |
| 2025-12-30 | `ee435ef` | `feat: Implement comprehensive WCAG 2.1 Level AA accessibility testing infrastructure` |
| 2026-01-02 | `cafed10` | `feat: Implement comprehensive Playwright E2E testing infrastructure` |

Nota: `41df736` (Sentry, 2025-12-07) é anterior à entrada `[Unreleased]` do
CHANGELOG que anuncia Sentry como novidade. A divergência D14 da auditoria
(CHANGELOG "integrado" × README "roadmap") tem, portanto, uma terceira leitura:
o Sentry foi integrado em dez/2025 e **não está em `main`** — `grep` por
`@sentry/nextjs` em `frontend/package.json` retorna 0.

### 2.4 Base científica e referências — dez/2025 a jan/2026

| Data | Commit | Entrega |
|---|---|---|
| 2025-12-08 | `eed4fdb` | `feat: expand scientific database with DOIs and new references` |
| 2025-12-09 | `25fc5f1` | `feat: add validation plants database schema and collection protocol` |
| 2025-12-09 | `3528532` | `feat: add UNICA 2024/2025 calibration for validation plants` |
| 2025-12-15 | `703cb85` | `feat(scientific): connect frontend kinetics charts to live Supabase data` |
| 2025-12-16 | `ce4d950` | `feat: add range display for scientific chemical parameters` |
| 2025-12-17 | `1067a9d` | `feat: Add comprehensive data sources to Advanced Analysis references modal` |
| 2026-01-06 | `2763935` | `feat: Add comprehensive feedstock availability factors with 60+ literature references` |

### 2.5 Internacionalização — dez/2025 a abr/2026

| Data | Commit | Entrega |
|---|---|---|
| 2025-12-13 | `17ea722` | `feat: implement internationalization (i18n) with English and Portuguese support` |
| 2025-12-15 | `64dca8f` | `feat(i18n): implement full i18n support for landing page and header` |
| 2026-04-03 | `5cd01d0` | `feat(i18n): extend translations and fix about page navigation` |
| 2026-04-06 | `83eddfc` | `feat: harden i18n framework and add breadcrumb coverage to all pages` |
| 2026-04-09 | `8f7da08` | `feat: complete i18n coverage and navigation consistency across all pages` |

### 2.6 Modelo econômico IBGE 67 setores — jan/fev 2026

| Data | Commit | Entrega |
|---|---|---|
| 2026-01-30 | `d54e885` | `feat: Add IBGE 67-sector Leontief I-O model integration` |
| 2026-01-31 | `2d0d927` | `feat: Add complete frontend integration for IBGE 67-sector Leontief model` |
| 2026-01-31 | `300bfc5` | `feat: Integrate 67-sector IBGE model into simulation page with mode toggle` |
| 2026-01-31 | `a518518` | `feat: Rebuild 67-sector dashboard with map-first UX and make it default` |
| 2026-02-03 | `8056acc` | `feat: Enhance UI/UX with tabbed sidebar drawer and regional sector tooltips` |

Nota: `README.md:463` lista o modelo Leontief como *"designed; backend service
pending"*. Quatro commits de jan/2026 declaram integração completa, frontend
incluído. Não verifiquei o estado em `main`.

### 2.7 Rebranding e redesenho do mapa — mar/abr 2026

| Data | Commit | Entrega |
|---|---|---|
| 2026-03-19 | `fb28870` | `feat: replace floating panels with unified Desktop Bottom Drawer` |
| 2026-03-19 | `8887b9c` | `feat(mobile): add bottom sheet, quick filter bar, URL state, and responsive popup` |
| 2026-03-20 | `51db445` | `feat: add intermediate regions layer, performance fixes, console→logger migration` |
| **2026-03-20** | **`5eb637d`** | **`feat: rebrand platform to PILAR-2b with code quality improvements`** — data do rebranding CP2B Maps V3 → PILAR-2b |
| 2026-03-21 | `9be978d` | `feat: replace desktop bottom drawer with compact left panel + i18n` |
| 2026-04-24 | `e8e8d91` | `feat: configure basePath /pilar2b and update hardcoded URLs for cp2b.unicamp.br` |
| 2026-04-26 | `25eb76c` | `feat(ui): replace floating panels with persistent sidebar + mobile tab bar` |
| 2026-04-26 | `8f9f28e` | `feat: biomass display metric + co-digestion clustering` |

### 2.8 Calculadora de viabilidade e payback — mai/2026

| Data | Commit | Entrega |
|---|---|---|
| 2026-05-03 | `a9fbc19` | `feat: Docker dev env, fix validation middleware, add security/sanity tests` |
| 2026-05-04 | `8f062fa` | `feat: Phase 0+1 biomass pairing — C/N profiles API + map choropleth` |
| 2026-05-05 | `43e8314` | `feat: add LGPD/GDPR cookie consent popup and enhance sitemap` |
| 2026-05-09 | `80a27ec` | `feat: i18n overhaul for analysis charts/panels + Sankey visual redesign` |
| 2026-05-10 | `d73e7e7` | `feat: outcome-first wizard UX + SP 2025 financial estimator` |
| 2026-05-13 | `9dc2788` | `feat: biogas viability calculator — multi-feedstock expansion` |
| 2026-05-15 | `887c7d9` | `feat: payback overhaul + UX improvements on biogas calculator` |
| 2026-05-16 | `5b4ad20` | `feat: calculator UX overhaul + site-wide dark mode pass` |
| **2026-05-16** | **`ec52631`** | **`feat: scenario-specific CAPEX tiers replace ±30% multiplier (Sprint 5)`** — último commit da linhagem original; alvo da tag `archive/dev-history-pre-squash` |
| 2026-05-17 | `58340c6` | `feat: Sankey visual polish + multi-residue split flow diagram` |
| **2026-05-19** | **`41c9ea0`** | **`Initial public release: PILAR-2b v3.0.3`** — squash; segunda raiz do grafo |

### 2.9 Auditoria científica e metodologia canônica — jun/2026

| Data | Commit | Entrega |
|---|---|---|
| 2026-06-05 | `00b3beb` | `audit(canonical): BAGACO BMP + livestock FDE corrections (Paulose 2021, EPE BEN 2024)` |
| 2026-06-05 | `8d0c072` | `audit(fde): complete FDE blocks for all 26 canonical feedstocks (12 added)` |
| 2026-06-05 | `ebd2ce6` | `audit(fde): full per-factor traceability + reproducibility for all 26 FDE blocks` |
| 2026-06-05 | `e0f05c2` | `feat(compute): 100% forward SP state biogas totals — single methodology` |
| 2026-06-06 | (PR #96) | `fix(compute): correct IBGE PAM unit interpretation — sugarcane 4 sub-streams + citrus peel fraction` |
| **2026-06-07** | **`b279978`** | **`feat(livestock): Phase 2 — spatial split of SP cattle into beef/dairy`** — **NÃO está em `main`**, ver E6 |
| 2026-06-07 | `8c2d8f3` | `feat(scenarios): Phase 3 — 4 named scenarios + Fronteira do Biogás` |
| 2026-06-12 | `154cfae` | `feat: add 'Fronteira do Biogás' intermediate scenario (>FIESP benchmark)` |
| 2026-06-12 | `24b4095` | `feat: recalibrate canonical BMP from 367-paper corpus + propagate to all layers` |
| 2026-06-12 | `236a502` | `feat: unify reference stores into canonical references_unified.csv` |
| 2026-06-12 | `54ca660` | `feat: unifier handles scientific_references schema + flags DOI-reuse` |
| 2026-06-12 | `6059500` | `feat(frontend): 'How to Cite' page (ABNT/APA/BibTeX) + INPI/GPL/CC info` |
| 2026-06-12 | `6ac8072` | `feat(map): per-municipality scenario toggle incl. Fronteira do Biogas` |

### 2.10 Conformidade legal e segurança — jun/2026

| Data | Commit | Entrega |
|---|---|---|
| 2026-06-25 | `3a30a71` | `feat(privacy): LGPD consent gate, data-subject rights, real privacy/terms` |
| 2026-06-25 | `428a06e` | `feat(a11y): complete WCAG 2.1 Level A (non-text content + keyboard)` |
| 2026-06-25 | `56a2055` | `feat(compliance): data minimisation, WCAG-A fixes, security headers, LGPD docs` |
| 2026-06-27 | `e050770` | `feat(auth): real VM-local internal auth (RBAC + clearance), replace mock` |
| 2026-06-29 | `4e90aa7` | `feat(lgpd): drop CPF/CNPJ collection + add compliance guardrail tests` |
| 2026-06-29 | `4ef76bc` | `feat(security): baseline HTTP security headers middleware (+ guardrail)` |
| 2026-06-29 | `60fb946` | `feat(geoserver): additive GeoServer 3.0 integration scaffold` |
| 2026-06-30 | `cc91974` | `feat(lgpd): PII log-sanitizer — redact emails + CPF/CNPJ from logs` |

### 2.11 Expansão nacional — jul/2026

| Data | Commit | Entrega |
|---|---|---|
| 2026-07-02 | `c3d6afa` | `perf(backend): batch reference fetch in get_all_technologies (fixes N+1)` |
| 2026-07-03 | `89403c3` | `perf(map): canvas renderer + restyle-without-remount for the choropleth` |
| 2026-07-10 | `a54189d` | `feat(frontend): offline auth mode for the pre-VM phase` |
| 2026-07-11 | `56ba508` | `feat(frontend): guide section + guided tour (recovered from lucas-boaro)` |
| 2026-07-17 | `b10774b` | `feat(ingest): national spine seeding + IBGE ingest helpers` |
| 2026-07-17 | `114b709` | `feat(ingest): IBGE PPM livestock source (1.43M rows, 5,543 municipalities)` |
| 2026-07-17 | `6140a91` | `feat(ingest): SNIS waste source (420k rows, 5,570 municipalities)` |
| 2026-07-17 | `b33a894` | `feat(canonical): one accessor for head/population to tonnes conversion` |
| 2026-07-17 | `f048d72` | `feat(biomass): distinguish 'no data' from zero on the national map` |
| 2026-07-17 | `7fc42c4` | `feat(map): geometry LOD (migration 022) for national-scale rendering` |
| 2026-07-17 | `dbbf818` | `feat(db): migration 024 — municipality time series (2008-2024)` |
| 2026-07-17 | `298f436` | `feat(map): infrastructure layers (migration 023) from MapBiomas 10.1` |
| 2026-07-17 | `3f71ac2` | `fix(canonical): make feedstocks.yaml reachable in Docker, and its absence loud` |
| 2026-07-19 | `ebdcc3b` | `feat(map): four metric toggles (biomass/biogas/biomethane/bioenergy) + daltonic mode` |
| 2026-07-21 | `914f3d8` | `feat(ingest): national crop biomass from IBGE PAM (1612 + 1613)` |
| 2026-07-21 | `2e607c3` | `feat(crops): promote sugarcane nationally via the mill-delivery fraction` |
| 2026-07-21 | `653ce10` | `feat(urban): use SNIS measured waste tonnage instead of modelling it` |
| 2026-07-21 | `10da404` | `feat(crops): record every PAM product, not just the five modelled streams` |
| 2026-07-21 | `ab27231` | `perf(map): serve the choropleth only what it paints` |
| 2026-07-21 | `18246fc` | `perf(api): make response compression actually compress` |
| 2026-07-23 | `dcff2a5` | `feat(map): state scope switcher + mobile-first municipality panel` |
| 2026-07-23 | `0464ae0` | `feat(nav): make the interactive map the landing page; home becomes the guide hub` |
| 2026-07-23 | `9f89039` | `feat(map): selectable CVD-safe palettes for daltonic mode` |

---

## 3. Tags existentes

| Tag | Aponta para | Data do commit | Assunto | No remoto? |
|---|---|---|---|---|
| `v3.0-day2-auth-complete` | `e673d81` | 2025-11-17 08:53:09 -0300 | `feat(auth): Implement complete Supabase authentication system` | **sim** |
| `pre-fix-2026-07-25` | `dbea3a7` | 2026-07-25 18:10:27 +0000 | `docs: auditoria técnica factual do estado atual do PILAR-2b` | **não** — criada em 2026-07-25; push de `refs/tags/*` bloqueado com HTTP 403 nesta sessão |
| `archive/dev-history-pre-squash` | `ec52631` | 2026-05-16 13:33:11 -0300 | `feat: scenario-specific CAPEX tiers replace ±30% multiplier (Sprint 5)` | **não** — idem; redundância provisória via branch `origin/archive/dev-history-pre-squash` |

Nenhuma tag de release semântico (`v3.0.0`, `v3.0.3`) existe em ponto algum do
grafo. As versões `3.0.0`–`3.0.3` do CHANGELOG, do `CITATION.cff` e do README
**não têm commit imutável correspondente**.

---

## 4. Contribuidores e volume, todas as refs

Por identidade Git (`git shortlog -sne --all`):

| Identidade | E-mail | Commits |
|---|---|---:|
| Claude | `noreply@anthropic.com` | 551 |
| Lucas Nakamura Cerejo | `lucassnakamura@gmail.com` | 469 |
| aikiesan | `lucassnakamura@gmail.com` | 254 |
| Lucas Nakamura | `lucassnakamura@gmail.com` | 67 |
| dependabot[bot] | `49699333+dependabot[bot]@users.noreply.github.com` | 11 |
| Lucas Boaro | `email_do_lucas@exemplo.com` | 7 |
| Lucas Nakamura Cerejo | `lucasnc@unicamp.br` | 2 |
| lucasBoaro | `lucasmboaro@gmail.com` | 2 |

Consolidado por pessoa:

| Pessoa | Identidades | Commits | Participação |
|---|---|---:|---:|
| Lucas Nakamura Cerejo | 4 (`lucassnakamura@gmail.com` ×3 + `lucasnc@unicamp.br`) | **792** | 58,1 % |
| Claude (assistente) | 1 | **551** | 40,4 % |
| Lucas Boaro | 2 | **9** | 0,7 % |
| dependabot | 1 | **11** | 0,8 % |

Total 1.363. O e-mail `email_do_lucas@exemplo.com` é literal, um placeholder não
substituído. A auditoria contabilizava 48 / 2 / 1 sobre o clone raso.

---

## 5. O que o log NÃO sustenta

Registrado para que nada seja inferido.

1. **Nada existe entre 01/08/2025 e 15/11/2025** em nenhuma ref. O primeiro commit
   do repositório é de 2025-11-16.
2. **O `CHANGELOG.md` data `[2.0.0]` em 2025-10-13**, anterior ao commit mais antigo
   de qualquer ref. Ele descreve um **predecessor fora deste repositório**. Duas
   evidências versionadas:
   - `CHANGELOG.md:88,93` — *"Removido código legado V2 (Streamlit) - ~97MB de
     arquivos"*, *"Removidos diretórios: `config/`, `src/` (código Streamlit antigo)"*;
   - `docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md:15,24,36-37` — descreve o
     repositório `cp2b_maps` como *"Streamlit **prototype** (V1→V2), ~87 commits,
     Python 99.5%, Folium + SQLite/GeoParquet, 15 residue types, 645 municipalities"*
     e a era `2.0.0` de 2025-10-13 com *"8 functional modules, Bagacinho IA (RAG),
     WCAG 2.1 Level A, 20+ references, FAPESP-validated data"*.

   Esse repositório **não faz parte deste grafo** e não foi verificado por esta
   sessão. Sua existência e integridade são pendência externa.
3. **Contagens declaradas na documentação e não verificáveis aqui:** `~87 commits`
   (cp2b_maps) e `~967 commits` (NewLook) em
   `docs/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md:24-25`. Este grafo tem 1.363
   commits somando todas as refs, incluindo os 75 posteriores ao squash — nenhuma
   das duas contagens é reproduzível a partir dele.
4. **Nenhum commit corresponde às versões `3.0.0`, `3.0.1`, `3.0.2` ou `3.0.3`.**
   O CHANGELOG as data em 2025-11-16, 2025-12-07, 2026-04-12 e 2026-05-18; não há
   tag nem marcação de release em nenhuma delas.
5. **Os 214 commits `feat`/`audit` presentes em refs e ausentes de `origin/main`
   não são, em maioria, trabalho perdido**: o repositório usa squash-merge, de modo
   que a versão de trabalho e o commit mesclado têm SHAs distintos. A exceção
   confirmada por inspeção de conteúdo é `b279978` (Fase 2, gado espacial) — ver E6.
   Nenhuma varredura sistemática dos 214 foi feita.

---

## 6. Reprodução

```bash
git fetch --unshallow
git log --all --no-merges --date=format:'%Y-%m' --format='%ad' | sort | uniq -c
git shortlog -sne --all
git tag -l
git log --all --no-merges --date=short --format='%ad|%h|%s' | grep -iE "\|(feat|perf|audit)"
git merge-base --is-ancestor 2fce883 HEAD   # falso: as raízes são disjuntas
```

Preservação: bundle `--all` sha256
`5bff22478d919b8091588420a6e974975bca8c0fd3b0011f217e374bc06e5999`, fora do
repositório; branch `origin/archive/dev-history-pre-squash` → `ec52631`.
