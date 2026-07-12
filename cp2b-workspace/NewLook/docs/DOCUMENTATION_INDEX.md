# Documentation Index — PILAR-2b

> **73 markdown files · ~18,600 lines** organized under `docs/` (plus SQL and
> data assets). This is the master map of the documentation tree.
> Last updated: 2026-07-04.

---

## Quick Navigation

- [Project Root](#1-project-root)
- [docs/ Root Files](#1b-docs-root-files)
- [docs/api/](#2-api)
- [docs/architecture/](#3-architecture)
- [docs/data/](#4-data--scientific-methodology)
- [docs/data/dynamics/](#4b-datadynamics--temporal-views)
- [docs/deployment/](#5-deployment)
- [docs/planning/](#6-planning)
- [docs/planning/playbooks/](#6b-planningplaybooks--monthly-checklists)
- [docs/qa/](#7-qa--testing)
- [docs/security/](#8-security)
- [docs/compliance/](#9-compliance--lgpd)
- [docs/sql/](#10-sql-scripts)
- [Backend READMEs](#11-backend-readmes)

---

## 1. Project Root

Standard open-source project files at `cp2b-workspace/NewLook/`:

| File | Description |
|---|---|
| `README.md` | **Main entry point** — project overview, features, quick start, live URLs, tech stack, INPI registration |
| `CHANGELOG.md` | Version history following Keep a Changelog format (v3.0.3 current) |
| `CONTRIBUTING.md` | Contribution guidelines, code standards, PR process for external contributors |
| `LICENSE` | GPL-3.0 License |
| `.cursorrules` | AI-assistant coding rules — project context, patterns, SOLID principles |

> The repository root also carries `README.md`, `CITATION.cff`,
> `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md` and `LICENSE` for the public
> GitHub-facing project (`aikiesan/Pilar-2b`).

---

## 1b. docs/ Root Files

| File | Lines | Description |
|---|--:|---|
| [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) | — | This file — master index of all documentation |
| [`PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md`](PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md) | 185 | Platform overview + development history (v3.0.3) |
| [`CALCULATOR_METHODOLOGY.md`](CALCULATOR_METHODOLOGY.md) | 737 | Full methodology for the biogas viability calculator |
| [`GEOSERVER_INTEGRATION.md`](GEOSERVER_INTEGRATION.md) | 308 | GeoServer 3.0 / OGC (WMS/WFS) integration guide |
| [`FOSS4G_2026.md`](FOSS4G_2026.md) | 61 | FOSS4G Europe 2026 one-pager |
| [`BIOMASS_PAIRING_ROADMAP.md`](BIOMASS_PAIRING_ROADMAP.md) | 351 | Biomass data pairing plan — MapBiomas integration roadmap |
| [`LOCAL_DOCKER_SETUP.md`](LOCAL_DOCKER_SETUP.md) | 160 | Local development with Docker Compose — backend + frontend + PostgreSQL |
| [`VM_UPDATE_GUIDE.md`](VM_UPDATE_GUIDE.md) | 231 | Unicamp VM update guide — Apache2/PM2 deployment for `cp2b.unicamp.br` |

---

## 2. API

| File | Lines | Description |
|---|--:|---|
| [`api/API_DOCUMENTATION.md`](api/API_DOCUMENTATION.md) | 628 | **Complete API reference** — all endpoints, request/response schemas, auth, examples |

---

## 3. Architecture

| File | Lines | Description |
|---|--:|---|
| [`architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md`](architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md) | 594 | Technology-routes implementation guide |
| [`architecture/HOW_TO_ADD_TECHNOLOGIES.md`](architecture/HOW_TO_ADD_TECHNOLOGIES.md) | 154 | Quick start: add new technology cards via SQL |
| [`architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md`](architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md) | 478 | Enhanced map visualization integration guide |
| [`architecture/PERFORMANCE_OPTIMIZATIONS.md`](architecture/PERFORMANCE_OPTIMIZATIONS.md) | 525 | Performance optimization details — map loading, caching, bundle size |
| [`architecture/REFERENCES_SYSTEM.md`](architecture/REFERENCES_SYSTEM.md) | 368 | Bibliographic references system — FDE factors, scientific database |

---

## 4. Data & Scientific Methodology

| File | Lines | Description |
|---|--:|---|
| [`data/FDE_METHODOLOGY.md`](data/FDE_METHODOLOGY.md) | 405 | FDE (Fator de Disponibilidade Efetivo) methodology |
| [`data/FDE_TRACEABILITY_MATRIX.md`](data/FDE_TRACEABILITY_MATRIX.md) | 95 | FDE factor → source traceability matrix |
| [`data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md`](data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md) | 701 | Feedstock availability factors (FC, FCo, FS, FL) with references — 31 feedstocks |
| [`data/README_FEEDSTOCK_FACTORS_SYNC.md`](data/README_FEEDSTOCK_FACTORS_SYNC.md) | 310 | Guide for syncing feedstock availability factors to the database |
| [`data/PARAMETER_CITATIONS.md`](data/PARAMETER_CITATIONS.md) | 87 | Citations for every model parameter |
| [`data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md`](data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md) | 285 | Realistic biogas potential analysis for SP using FDE |
| [`data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md`](data/SP_POTENTIAL_STATUS_AND_NEXT_STEPS.md) | 118 | SP potential — current status and next steps |
| [`data/SCIENTIFIC_AUDIT_REPORT.md`](data/SCIENTIFIC_AUDIT_REPORT.md) | 833 | Full scientific audit of parameters, methods and outputs |
| [`data/CANONICAL_VERIFICATION_PLAN.md`](data/CANONICAL_VERIFICATION_PLAN.md) | 139 | Plan for verifying the canonical parameter set |
| [`data/DATA_CONSOLIDATION_INVENTORY.md`](data/DATA_CONSOLIDATION_INVENTORY.md) | 57 | Inventory of consolidated datasets |
| [`data/CITATION_DOI_AUDIT.md`](data/CITATION_DOI_AUDIT.md) | 52 | Audit of citation DOIs |
| [`data/SUSPECT_DOI_WORKLIST.md`](data/SUSPECT_DOI_WORKLIST.md) | 48 | Worklist of suspect/unverified DOIs to resolve |
| [`data/REFERENCE_CORPUS_SUMMARY.md`](data/REFERENCE_CORPUS_SUMMARY.md) | 46 | Summary of the reference corpus |
| [`data/REFERENCE_DB_AUDIT.md`](data/REFERENCE_DB_AUDIT.md) | 88 | Reference-database audit |
| [`data/FIESP_BENCHMARK_EXTRACTION.md`](data/FIESP_BENCHMARK_EXTRACTION.md) | 178 | FIESP benchmark data extraction |
| [`data/FIESP_BENCHMARK_AUDIT_REPORT.md`](data/FIESP_BENCHMARK_AUDIT_REPORT.md) | 114 | FIESP benchmark audit report |
| [`data/OPEN_DATA_API_LANDSCAPE.md`](data/OPEN_DATA_API_LANDSCAPE.md) | 283 | Open-data & API landscape for biomass/biogas mapping (SP → Brazil) |
| [`data/ENERGY_LOGISTICS_BIOECONOMY_DATA.md`](data/ENERGY_LOGISTICS_BIOECONOMY_DATA.md) | 179 | Energy, logistics & bioeconomy municipal data layer |
| [`data/IBGE_IO_DATA_PROCESSING_GUIDE.md`](data/IBGE_IO_DATA_PROCESSING_GUIDE.md) | 925 | Processing 15 IBGE Input-Output tables (2015, 67 sectors) into PostgreSQL |
| [`data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md`](data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md) | 619 | IBGE 67-sector Leontief model integration — economic impact analysis |
| [`data/FOSS4G_PAPER_SUPPLEMENT.md`](data/FOSS4G_PAPER_SUPPLEMENT.md) | 279 | Supplementary material for the FOSS4G paper |
| [`data/INGESTION_GUIDE.md`](data/INGESTION_GUIDE.md) | 113 | **Step-by-step manual for ingesting any new data source** — contract lifecycle, gates, fixtures, yearly refresh |
| [`data/METADATA.json`](data/METADATA.json) | — | Formal data lineage — every upstream dataset with version, reference year, URL/DOI, retrieval date |

---

## 4b. data/dynamics/ — Temporal Views

| File | Lines | Description |
|---|--:|---|
| [`data/dynamics/BIOMASS_SEASONALITY_SP.md`](data/dynamics/BIOMASS_SEASONALITY_SP.md) | 92 | SP biomass seasonality & temporal availability |
| [`data/dynamics/WASTE_FLOW_DYNAMICS_SP.md`](data/dynamics/WASTE_FLOW_DYNAMICS_SP.md) | 67 | SP waste generation & flow dynamics |
| [`data/dynamics/ENERGY_PRICE_TEMPORAL_DYNAMICS_SP.md`](data/dynamics/ENERGY_PRICE_TEMPORAL_DYNAMICS_SP.md) | 76 | SP energy price & temporal dynamics |

---

## 5. Deployment

| File | Lines | Description |
|---|--:|---|
| [`deployment/DEPLOYMENT_GUIDE.md`](deployment/DEPLOYMENT_GUIDE.md) | 187 | Deployment guide — Unicamp VM (primary), Cloudflare/Vercel (frontend) |
| [`deployment/DEPLOYMENT_CHECKLIST.md`](deployment/DEPLOYMENT_CHECKLIST.md) | 514 | Step-by-step deployment checklist |
| [`deployment/PRODUCTION_SETUP_GUIDE.md`](deployment/PRODUCTION_SETUP_GUIDE.md) | 354 | Complete production setup — PostgreSQL + PostGIS |
| [`deployment/DOCKER_RESOURCE_LIMITS.md`](deployment/DOCKER_RESOURCE_LIMITS.md) | 546 | Docker resource limits config — **CRITICAL**: configure before production |
| [`deployment/AUTH_VM_DEPLOYMENT.md`](deployment/AUTH_VM_DEPLOYMENT.md) | 95 | Internal-auth (JWT) VM deployment steps |
| [`VM_UPDATE_GUIDE.md`](VM_UPDATE_GUIDE.md) | 231 | Unicamp Apache2 + PM2 VM update guide — primary production deployment |

---

## 6. Planning

| File | Lines | Description |
|---|--:|---|
| [`planning/BRAZIL_EXPANSION_ROADMAP.md`](planning/BRAZIL_EXPANSION_ROADMAP.md) | 358 | **Master plan Jul–Dec 2026: national coverage** — code-analysis snapshot, ingestion contract, per-source plan, month milestones, progress indicators |
| [`planning/POST_FOSS4G_ROADMAP.md`](planning/POST_FOSS4G_ROADMAP.md) | 109 | Post-FOSS4G development roadmap (tracks A–G) |
| [`planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md`](planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md) | 339 | Development roadmap April–August 2026 — sprint targets, milestones |
| [`planning/COMPLIANCE_AND_ROADMAP.md`](planning/COMPLIANCE_AND_ROADMAP.md) | 157 | Month round-up & forward plan — compliance, cadence, sandbox limits |
| [`planning/FUTURE_VISION_AND_POSSIBILITIES.md`](planning/FUTURE_VISION_AND_POSSIBILITIES.md) | 184 | Future vision & full possibility map (strategy) |
| [`planning/IMPROVEMENT_BACKLOG.md`](planning/IMPROVEMENT_BACKLOG.md) | 152 | Living lean-and-stable backlog — CI gate hardening, dead code, tech-debt tracker |
| [`planning/UI_UX_REVIEW_2026-07.md`](planning/UI_UX_REVIEW_2026-07.md) | — | Frontend UI/UX review — municipality panel/popup/tooltip, mobile bottom sheet, prioritized P0–P2 backlog |

---

## 6b. planning/playbooks/ — Monthly Checklists

Executable month-by-month checklists (commands, file paths, verification
queries, exit criteria) expanding `BRAZIL_EXPANSION_ROADMAP.md` §6. Start with
the [README](planning/playbooks/README.md).

| File | Description |
|---|---|
| [`playbooks/2026-07_JULY.md`](planning/playbooks/2026-07_JULY.md) | Consolidation, discrepancy resolution, first real ingest (ANEEL SIGA) |
| [`playbooks/2026-08_AUGUST.md`](planning/playbooks/2026-08_AUGUST.md) | National DB spine + core national sources |
| [`playbooks/2026-09_SEPTEMBER.md`](planning/playbooks/2026-09_SEPTEMBER.md) | MapLibre + PMTiles rendering at scale |
| [`playbooks/2026-10_OCTOBER.md`](planning/playbooks/2026-10_OCTOBER.md) | National FDE + MapBiomas C10.1 + restricted areas v1 |
| [`playbooks/2026-11_NOVEMBER.md`](planning/playbooks/2026-11_NOVEMBER.md) | Bioeconomics, readiness scoring, ILUC |
| [`playbooks/2026-12_DECEMBER.md`](planning/playbooks/2026-12_DECEMBER.md) | Papers, yearly-refresh runbook, 2027 runway |

---

## 7. QA & Testing

| File | Lines | Description |
|---|--:|---|
| [`qa/TESTING.md`](qa/TESTING.md) | 530 | **Testing strategy** — what to test, how to test, coverage status |
| [`qa/TEST_STRUCTURE.md`](qa/TEST_STRUCTURE.md) | 322 | Test structure reference — Pytest (backend) and Jest (frontend) organization |
| [`qa/COVERAGE_STATUS.md`](qa/COVERAGE_STATUS.md) | 359 | Test coverage status report |
| [`qa/QA_GUIDE_LUCAS.md`](qa/QA_GUIDE_LUCAS.md) | 512 | QA onboarding guide — setup, test plan, bug reporting template |
| [`qa/ACCESSIBILITY.md`](qa/ACCESSIBILITY.md) | 389 | WCAG 2.1 Level AA accessibility standards and testing procedures |
| [`qa/CODE_REVIEW_ROUND2_AND_DEMOCK_PLAN.md`](qa/CODE_REVIEW_ROUND2_AND_DEMOCK_PLAN.md) | 232 | Code review round 2 & "no-mock" test strategy |
| [`qa/TEST_INFRA_PHASE2_HANDOFF.md`](qa/TEST_INFRA_PHASE2_HANDOFF.md) | 64 | Test-infrastructure hardening — phase 2 handoff |

---

## 8. Security

| File | Lines | Description |
|---|--:|---|
| [`security/SECURITY.md`](security/SECURITY.md) | 178 | Security policy — supported versions, vulnerability reporting |
| [`security/SECURITY_AUDIT_REPORT.md`](security/SECURITY_AUDIT_REPORT.md) | 686 | Security audit report — findings, testing infrastructure |
| [`security/CSRF_PROTECTION.md`](security/CSRF_PROTECTION.md) | 151 | CSRF analysis — conclusion: **NOT NEEDED** for this API |
| [`security/DATABASE_AUDIT_LOGGING.md`](security/DATABASE_AUDIT_LOGGING.md) | 422 | Audit logging setup — **CRITICAL**: enable before production |

---

## 9. Compliance & LGPD

| File | Lines | Description |
|---|--:|---|
| [`compliance/ROPA.md`](compliance/ROPA.md) | 44 | Registro das Operações de Tratamento (ROPA) — LGPD processing record |
| [`compliance/DPIA_RIPD.md`](compliance/DPIA_RIPD.md) | 41 | Data Protection Impact Assessment (RIPD/DPIA) — calculator lead form |
| [`compliance/DPO_INTAKE_MEMO.md`](compliance/DPO_INTAKE_MEMO.md) | 34 | Memo to the UNICAMP DPO — registration of the processing |
| [`compliance/INTERNAL_AUTH_LGPD.md`](compliance/INTERNAL_AUTH_LGPD.md) | 56 | Internal authentication — LGPD record & notice |
| [`compliance/EMAG_WCAG_MAPPING.md`](compliance/EMAG_WCAG_MAPPING.md) | 44 | e-MAG ↔ WCAG 2.1 alignment |

---

## 10. SQL Scripts

| File | Description |
|---|---|
| [`sql/REMOVE_ECONOMIC_TABLES.sql`](sql/REMOVE_ECONOMIC_TABLES.sql) | Remove economic simulation tables from database |
| [`sql/sql_insert_literature_references.sql`](sql/sql_insert_literature_references.sql) | Insert literature references for feedstock factors |
| [`sql/sql_sync_factors_to_database.sql`](sql/sql_sync_factors_to_database.sql) | Sync feedstock factors to database |
| [`sql/audit_and_fix_reference_urls.sql`](sql/audit_and_fix_reference_urls.sql) | Audit and fix reference URLs in the database |

---

## 11. Backend READMEs

These remain in their respective directories for context:

| File | Description |
|---|---|
| `backend/ingest/README.md` | **Ingestion framework** — the 8-gate validation contract, CLI runner, per-source layout |
| `backend/data/README.md` | Geospatial data directory — shapefiles, rasters |
| `backend/data/shapefiles/brazil/README.md` | Brazil intermediary regions shapefile — 133 regions |
| `backend/migrations/README.md` | Migrations directory overview |
| `backend/app/migrations/README.md` | V2 → V3 migration guide — schema migration history |

---

## Summary by Category

| Category | Files | Key Docs |
|---|--:|---|
| **Project Root** | 5 | `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md` |
| **docs/ Root** | 8 | `PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md`, `CALCULATOR_METHODOLOGY.md` |
| **API Reference** | 1 | `api/API_DOCUMENTATION.md` |
| **Architecture** | 5 | `architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md`, `architecture/PERFORMANCE_OPTIMIZATIONS.md` |
| **Data / Methodology** | 23 + dynamics | `data/FDE_METHODOLOGY.md`, `data/INGESTION_GUIDE.md`, `data/SCIENTIFIC_AUDIT_REPORT.md` |
| **Deployment** | 5 | `deployment/DEPLOYMENT_GUIDE.md`, `deployment/DOCKER_RESOURCE_LIMITS.md` |
| **Planning** | 6 + playbooks | `planning/BRAZIL_EXPANSION_ROADMAP.md`, `planning/IMPROVEMENT_BACKLOG.md` |
| **QA & Testing** | 7 | `qa/TESTING.md`, `qa/QA_GUIDE_LUCAS.md` |
| **Security** | 4 | `security/SECURITY_AUDIT_REPORT.md`, `security/SECURITY.md` |
| **Compliance / LGPD** | 5 | `compliance/ROPA.md`, `compliance/DPIA_RIPD.md` |
| **SQL Scripts** | 4 | `sql/REMOVE_ECONOMIC_TABLES.sql` |
| **Backend READMEs** | 5 | `backend/ingest/README.md`, `backend/migrations/README.md` |
| **Total (docs/ tree)** | **73 md** | ~18,600 lines |
