# Documentation Index — PILAR-2b

> **~43 documentation files | ~18,500+ lines** organized in `docs/` subdirectories.
> Last updated: May 2026

---

## Quick Navigation

- [Project Root](#1-project-root)
- [docs/ Root Files](#1b-docs-root-files)
- [docs/api/](#2-api)
- [docs/architecture/](#3-architecture)
- [docs/data/](#4-data--scientific-methodology)
- [docs/deployment/](#5-deployment)
- [docs/planning/](#6-planning)
- [docs/qa/](#7-qa--testing)
- [docs/security/](#8-security)
- [docs/sql/](#9-sql-scripts)
- [Backend READMEs](#10-backend-readmes)

---

## 1. Project Root

Standard open-source project files at `cp2b-workspace/NewLook/`:

| File | Lines | Description |
|---|---|---|
| `README.md` | — | **Main entry point** — project overview, features, quick start, live URLs, tech stack, INPI registration |
| `CHANGELOG.md` | — | Version history following Keep a Changelog format (v3.0.3 current) |
| `CONTRIBUTING.md` | 454 | Contribution guidelines, code standards, PR process for external contributors |
| `LICENSE` | 675 | GPL-3.0 License (2025) |
| `.cursorrules` | 53 | AI assistant coding rules — project context, patterns, SOLID principles |

---

## 1b. docs/ Root Files

| File | Description |
|---|---|
| [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) | This file — master index of all documentation |
| [`LOCAL_DOCKER_SETUP.md`](LOCAL_DOCKER_SETUP.md) | Local development with Docker Compose — backend + frontend + PostgreSQL |
| [`VM_UPDATE_GUIDE.md`](VM_UPDATE_GUIDE.md) | Unicamp VM update guide — Apache2/PM2 deployment for `cp2b.unicamp.br` |
| [`BIOMASS_PAIRING_ROADMAP.md`](BIOMASS_PAIRING_ROADMAP.md) | Biomass data pairing plan — MapBiomas integration roadmap |

---

## 2. API

| File | Description |
|---|---|
| [`api/API_DOCUMENTATION.md`](api/API_DOCUMENTATION.md) | **Complete API reference** — all endpoints, request/response schemas, auth, examples (628 lines) |

---

## 3. Architecture

| File | Description |
|---|---|
| [`architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md`](architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md) | Technology routes implementation guide (594 lines) |
| [`architecture/HOW_TO_ADD_TECHNOLOGIES.md`](architecture/HOW_TO_ADD_TECHNOLOGIES.md) | Quick start: add new technology cards via SQL (154 lines) |
| [`architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md`](architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md) | Enhanced map visualization integration guide (478 lines) |
| [`architecture/PERFORMANCE_OPTIMIZATIONS.md`](architecture/PERFORMANCE_OPTIMIZATIONS.md) | Performance optimization details — map loading, caching, bundle size (525 lines) |
| [`architecture/REFERENCES_SYSTEM.md`](architecture/REFERENCES_SYSTEM.md) | Bibliographic references system — FDE factors, scientific database (368 lines) |

---

## 4. Data & Scientific Methodology

| File | Description |
|---|---|
| [`data/FDE_METHODOLOGY.md`](data/FDE_METHODOLOGY.md) | FDE (Fator de Disponibilidade Efetivo) methodology — V2.0 (365 lines) |
| [`data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md`](data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md) | Feedstock availability factors (FC, FCo, FS, FL) with scientific references — 31 feedstocks (701 lines) |
| [`data/README_FEEDSTOCK_FACTORS_SYNC.md`](data/README_FEEDSTOCK_FACTORS_SYNC.md) | Guide for syncing feedstock availability factors to the database (310 lines) |
| [`data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md`](data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md) | Realistic biogas potential analysis for SP using FDE (285 lines) |
| [`data/IBGE_IO_DATA_PROCESSING_GUIDE.md`](data/IBGE_IO_DATA_PROCESSING_GUIDE.md) | Processing 15 IBGE Input-Output tables (2015, 67 sectors) into PostgreSQL (925 lines) |
| [`data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md`](data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md) | IBGE 67-sector Leontief model integration — economic impact analysis (608 lines) |
| [`data/INGESTION_GUIDE.md`](data/INGESTION_GUIDE.md) | **Step-by-step manual for ingesting any new data source** — the ingestion contract lifecycle, gates, fixtures, yearly refresh |
| [`data/METADATA.json`](data/METADATA.json) | Formal data lineage — every upstream dataset with version, reference year, URL/DOI, retrieval date |

---

## 5. Deployment

| File | Description |
|---|---|
| [`deployment/DEPLOYMENT_GUIDE.md`](deployment/DEPLOYMENT_GUIDE.md) | Deployment guide for Unicamp VM (primary), Cloudflare/Vercel (frontend) (184 lines) |
| [`deployment/DEPLOYMENT_CHECKLIST.md`](deployment/DEPLOYMENT_CHECKLIST.md) | Step-by-step deployment checklist (514 lines) |
| [`deployment/PRODUCTION_SETUP_GUIDE.md`](deployment/PRODUCTION_SETUP_GUIDE.md) | Complete production setup — PostgreSQL + PostGIS (354 lines) |
| [`deployment/DOCKER_RESOURCE_LIMITS.md`](deployment/DOCKER_RESOURCE_LIMITS.md) | Docker resource limits config — **CRITICAL**: must configure before production (546 lines) |
| [`VM_UPDATE_GUIDE.md`](VM_UPDATE_GUIDE.md) | Unicamp Apache2 + PM2 VM update guide — primary production deployment procedure |

---

## 6. Planning

| File | Description |
|---|---|
| [`planning/BRAZIL_EXPANSION_ROADMAP.md`](planning/BRAZIL_EXPANSION_ROADMAP.md) | **Master plan Jul–Dec 2026: national coverage** — code-analysis snapshot, ingestion contract, per-source plan, month-by-month milestones, progress indicators |
| [`planning/playbooks/`](planning/playbooks/README.md) | **Month playbooks Jul–Dec 2026** — executable step-by-step checklists per month: commands, file paths, verification queries, exit criteria |
| [`planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md`](planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md) | Development roadmap April–August 2026 — sprint targets, milestones |
| [`planning/IMPROVEMENT_BACKLOG.md`](planning/IMPROVEMENT_BACKLOG.md) | Living lean-and-stable backlog — CI gate hardening status, dead code, large-file, and tech-debt tracker |

---

## 7. QA & Testing

| File | Description |
|---|---|
| [`qa/TESTING.md`](qa/TESTING.md) | **Testing strategy** — what to test, how to test, coverage status (530 lines) |
| [`qa/TEST_STRUCTURE.md`](qa/TEST_STRUCTURE.md) | Test structure reference — Pytest (backend) and Jest (frontend) organization (322 lines) |
| [`qa/COVERAGE_STATUS.md`](qa/COVERAGE_STATUS.md) | Test coverage status report — ~10,650 lines of test code (359 lines) |
| [`qa/QA_GUIDE_LUCAS.md`](qa/QA_GUIDE_LUCAS.md) | QA onboarding guide — setup, test plan, bug reporting template (512 lines) |
| [`qa/ACCESSIBILITY.md`](qa/ACCESSIBILITY.md) | WCAG 2.1 Level AA accessibility standards and testing procedures (389 lines) |

---

## 8. Security

| File | Description |
|---|---|
| [`security/SECURITY.md`](security/SECURITY.md) | Security policy — supported versions, vulnerability reporting (178 lines) |
| [`security/SECURITY_AUDIT_REPORT.md`](security/SECURITY_AUDIT_REPORT.md) | Security audit report (Dec 24, 2025) — findings, testing infrastructure (686 lines) |
| [`security/CSRF_PROTECTION.md`](security/CSRF_PROTECTION.md) | CSRF analysis — conclusion: **NOT NEEDED** for this API (151 lines) |
| [`security/DATABASE_AUDIT_LOGGING.md`](security/DATABASE_AUDIT_LOGGING.md) | Audit logging setup — **CRITICAL**: must enable before production (422 lines) |

---

## 9. SQL Scripts

| File | Description |
|---|---|
| [`sql/REMOVE_ECONOMIC_TABLES.sql`](sql/REMOVE_ECONOMIC_TABLES.sql) | Remove economic simulation tables from database |
| [`sql/sql_insert_literature_references.sql`](sql/sql_insert_literature_references.sql) | Insert literature references for feedstock factors |
| [`sql/sql_sync_factors_to_database.sql`](sql/sql_sync_factors_to_database.sql) | Sync feedstock factors to database |

---

## 10. Backend READMEs

These remain in their respective directories for context:

| File | Description |
|---|---|
| `backend/data/README.md` | Geospatial data directory — shapefiles, rasters (104 lines) |
| `backend/data/shapefiles/brazil/README.md` | Brazil intermediary regions shapefile — 133 regions (224 lines) |
| `backend/migrations/README.md` | Migrations directory overview (146 lines) |
| `backend/app/migrations/README.md` | V2 to V3 migration guide — schema migration history (355 lines) |
| `backend/scripts/archive/README.md` | Archived scripts — kept for reference (85 lines) |

---

## Summary by Category

| Category | Files | Key Docs |
|---|---|---|
| **Project Root** | 4 | `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md` |
| **API Reference** | 1 | `api/API_DOCUMENTATION.md` |
| **Architecture** | 8 | `architecture/DEVELOPMENT_STRATEGY.md`, `architecture/BIOROUTE_COMPREHENSIVE_ANALYSIS.md` |
| **QA & Testing** | 5 | `qa/TESTING.md`, `qa/QA_GUIDE_LUCAS.md` |
| **Security** | 5 | `security/SECURITY_AUDIT_REPORT.md`, `security/SECURITY.md` |
| **Deployment** | 5 | `deployment/DEPLOYMENT_GUIDE.md`, `deployment/DEPLOYMENT_CHECKLIST.md` |
| **Data / Methodology** | 6 | `data/FDE_METHODOLOGY.md`, `data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md` |
| **Planning** | 2 | `planning/IMPROVEMENT_ROADMAP.md`, `planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md` |
| **SQL Scripts** | 3 | `sql/REMOVE_ECONOMIC_TABLES.sql` |
| **Backend READMEs** | 5 | `backend/migrations/README.md` |
| **Total** | **~48** | |
