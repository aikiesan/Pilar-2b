# Documentation Index — PILAR-2b

> Master repository documentation index for **PILAR-2b** (*Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogás e Bioprodutos*).
> Fully organized into modular subdirectories under `docs/`.
> Last updated: July 2026

---

## Quick Navigation

- [1. Root & Core Project Docs](#1-root--core-project-docs)
- [2. API Reference](#2-api-reference)
- [3. Architecture & System Design](#3-architecture--system-design)
- [4. Data, Methodology & Data Ingestion](#4-data-methodology--data-ingestion)
- [5. Deployment & Operations](#5-deployment--operations)
- [6. Planning, Roadmaps & Playbooks](#6-planning-roadmaps--playbooks)
- [7. QA, Testing & Accessibility](#7-qa-testing--accessibility)
- [8. Security & Compliance](#8-security--compliance)
- [9. Manuscripts & Scientific Publications](#9-manuscripts--scientific-publications)
- [10. Audits & Consistency Records](#10-audits--consistency-records)
- [11. SQL Scripts & Database Seeds](#11-sql-scripts--database-seeds)
- [12. Datasets & Baseline Artefacts](#12-datasets--baseline-artefacts)

---

## 1. Root & Core Project Docs

Standard repository entry points located at project root `cp2b-workspace/NewLook/`:

| File | Description |
|---|---|
| [`README.md`](../README.md) | **Main entry point** — project overview, features, live URLs, tech stack, INPI registration |
| [`CHANGELOG.md`](../CHANGELOG.md) | Version history following Keep a Changelog format (v3.0.3 current) |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Contribution guidelines, code standards, PR process for external contributors |
| [`LICENSE`](../LICENSE) | GPL-3.0 License |
| [`docs/README.md`](README.md) | `docs/` landing page for GitHub rendering |
| [`docs/DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md) | Master index of all documentation |

---

## 2. API Reference

| File | Description |
|---|---|
| [`api/API_DOCUMENTATION.md`](api/API_DOCUMENTATION.md) | **Complete API reference** — all endpoints, request/response schemas, auth, examples |

---

## 3. Architecture & System Design

| File | Description |
|---|---|
| [`architecture/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md`](architecture/PLATFORM_OVERVIEW_AND_DEVELOPMENT_HISTORY.md) | Comprehensive architecture overview, platform history, and evolution |
| [`architecture/CALCULATOR_METHODOLOGY.md`](architecture/CALCULATOR_METHODOLOGY.md) | Payback & economic feasibility calculator mathematical formulation |
| [`architecture/GEOSERVER_INTEGRATION.md`](architecture/GEOSERVER_INTEGRATION.md) | GeoServer WMS/WFS layer integration and GIS server setup guide |
| [`architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md`](architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md) | Biogas & bioproduct conversion technology routes architecture guide |
| [`architecture/HOW_TO_ADD_TECHNOLOGIES.md`](architecture/HOW_TO_ADD_TECHNOLOGIES.md) | Quick start guide for registering new technology pathways via database seeds |
| [`architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md`](architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md) | Interactive map visualization engine and Leaflet integration details |
| [`architecture/PERFORMANCE_OPTIMIZATIONS.md`](architecture/PERFORMANCE_OPTIMIZATIONS.md) | Map tile loading, caching strategies, and frontend bundle size optimizations |
| [`architecture/REFERENCES_SYSTEM.md`](architecture/REFERENCES_SYSTEM.md) | Bibliographic reference mapping system for scientific parameters and FDE factors |

---

## 4. Data, Methodology & Data Ingestion

| File | Description |
|---|---|
| [`data/NATIONAL_DATA_LOAD.md`](data/NATIONAL_DATA_LOAD.md) | National biomass dataset loading pipeline and automated processing rules |
| [`data/FDE_METHODOLOGY.md`](data/FDE_METHODOLOGY.md) | FDE (*Fator de Disponibilidade Efetivo*) methodology formulation (V2.0) |
| [`data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md`](data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md) | Feedstock availability factors (FC, FCo, FS, FL) across 31 agricultural & urban residues |
| [`data/README_FEEDSTOCK_FACTORS_SYNC.md`](data/README_FEEDSTOCK_FACTORS_SYNC.md) | Guide for synchronizing feedstock availability factors to PostgreSQL |
| [`data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md`](data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md) | Realistic biogas potential assessment for São Paulo State using FDE metrics |
| [`data/IBGE_IO_DATA_PROCESSING_GUIDE.md`](data/IBGE_IO_DATA_PROCESSING_GUIDE.md) | IBGE Input-Output matrix (67 sectors) ETL processing pipeline |
| [`data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md`](data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md) | IBGE Leontief economic multiplier model integration specifications |
| [`data/INGESTION_GUIDE.md`](data/INGESTION_GUIDE.md) | **Ingestion Manual** — lifecycle contracts, verification gates, and source refresh guidelines |
| [`data/CANONICAL_VERIFICATION_PLAN.md`](data/CANONICAL_VERIFICATION_PLAN.md) | Verification plan for canonical biomass potential calculations |
| [`data/SCIENTIFIC_AUDIT_REPORT.md`](data/SCIENTIFIC_AUDIT_REPORT.md) | Detailed scientific audit report for residue parameters and literature citations |
| [`data/dynamics/BIOMASS_SEASONALITY_SP.md`](data/dynamics/BIOMASS_SEASONALITY_SP.md) | Crop harvesting seasonality and biomass availability curves for SP State |
| [`data/dynamics/ENERGY_PRICE_TEMPORAL_DYNAMICS_SP.md`](data/dynamics/ENERGY_PRICE_TEMPORAL_DYNAMICS_SP.md) | Electricity, natural gas, and diesel temporal pricing dynamics |
| [`data/dynamics/WASTE_FLOW_DYNAMICS_SP.md`](data/dynamics/WASTE_FLOW_DYNAMICS_SP.md) | Temporal and spatial waste flow dynamics across SP municipalities |

---

## 5. Deployment & Operations

| File | Description |
|---|---|
| [`deployment/LOCAL_DOCKER_SETUP.md`](deployment/LOCAL_DOCKER_SETUP.md) | Local development setup with Docker Compose (FastAPI, Next.js, PostgreSQL/PostGIS) |
| [`deployment/VM_UPDATE_GUIDE.md`](deployment/VM_UPDATE_GUIDE.md) | **Primary deployment guide** — Unicamp VM production update procedure (Apache2 + PM2) |
| [`deployment/VM_DEPLOY_CHECK.md`](deployment/VM_DEPLOY_CHECK.md) | Production server deployment verification checklist and health checks |
| [`deployment/DEPLOYMENT_GUIDE.md`](deployment/DEPLOYMENT_GUIDE.md) | Overview of deployment targets (Unicamp VM, Cloudflare Pages, Vercel) |
| [`deployment/DEPLOYMENT_CHECKLIST.md`](deployment/DEPLOYMENT_CHECKLIST.md) | Comprehensive step-by-step production release checklist |
| [`deployment/PRODUCTION_SETUP_GUIDE.md`](deployment/PRODUCTION_SETUP_GUIDE.md) | Production database installation & configuration guide (PostgreSQL 15 + PostGIS 3.4) |
| [`deployment/DOCKER_RESOURCE_LIMITS.md`](deployment/DOCKER_RESOURCE_LIMITS.md) | Container resource limits and memory optimization tuning |

---

## 6. Planning, Roadmaps & Playbooks

| File | Description |
|---|---|
| [`planning/BRAZIL_EXPANSION_ROADMAP.md`](planning/BRAZIL_EXPANSION_ROADMAP.md) | **Master expansion plan**: National coverage roadmap across Brazilian states |
| [`planning/BIOMASS_PAIRING_ROADMAP.md`](planning/BIOMASS_PAIRING_ROADMAP.md) | MapBiomas integration and spatial biomass pairing roadmap |
| [`planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md`](planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md) | Mid-term development roadmap and sprint milestones |
| [`planning/IMPROVEMENT_BACKLOG.md`](planning/IMPROVEMENT_BACKLOG.md) | Technical debt, code cleanup, and CI gate hardening backlog |
| [`planning/HANDOFF_2026-07-21.md`](planning/HANDOFF_2026-07-21.md) | System state handoff report (July 2026) |
| [`planning/playbooks/README.md`](planning/playbooks/README.md) | Monthly executable sprint playbooks index |

---

## 7. QA, Testing & Accessibility

| File | Description |
|---|---|
| [`qa/TESTING.md`](qa/TESTING.md) | **Master testing strategy** — unit, integration, and e2e testing procedures |
| [`qa/TEST_STRUCTURE.md`](qa/TEST_STRUCTURE.md) | Pytest (backend) and Jest/Playwright (frontend) suite architecture |
| [`qa/COVERAGE_STATUS.md`](qa/COVERAGE_STATUS.md) | Code coverage reports and critical test path tracking |
| [`qa/QA_GUIDE_LUCAS.md`](qa/QA_GUIDE_LUCAS.md) | Quality assurance onboarding guide and bug reporting standards |
| [`qa/ACCESSIBILITY.md`](qa/ACCESSIBILITY.md) | WCAG 2.1 AA & eMAG accessibility compliance test guidelines |

---

## 8. Security & Compliance

| File | Description |
|---|---|
| [`security/SECURITY.md`](security/SECURITY.md) | Security vulnerability disclosure policy and supported versions |
| [`security/SECURITY_AUDIT_REPORT.md`](security/SECURITY_AUDIT_REPORT.md) | Formal security audit findings, CVE analysis, and remediation logs |
| [`security/CSRF_PROTECTION.md`](security/CSRF_PROTECTION.md) | Token authentication and CSRF threat analysis |
| [`security/DATABASE_AUDIT_LOGGING.md`](security/DATABASE_AUDIT_LOGGING.md) | PostgreSQL audit logging (pgaudit) configuration and security rules |
| [`compliance/PROCEDENCIA.md`](compliance/PROCEDENCIA.md) | Data provenance, licensing compliance, and official data source citations |
| [`compliance/DPIA_RIPD.md`](compliance/DPIA_RIPD.md) | Data Protection Impact Assessment (DPIA / RIPD - LGPD) |
| [`compliance/ROPA.md`](compliance/ROPA.md) | Record of Processing Activities (ROPA - LGPD Article 37) |
| [`compliance/INTERNAL_AUTH_LGPD.md`](compliance/INTERNAL_AUTH_LGPD.md) | LGPD compliance evaluation for internal user authentication |

---

## 9. Manuscripts & Scientific Publications

| File | Description |
|---|---|
| [`manuscrito/PILAR-2b_CEUS_2026-04.md`](manuscrito/PILAR-2b_CEUS_2026-04.md) | Complete scientific manuscript draft submitted for journal publication |
| [`manuscrito/FOSS4G_2026.md`](manuscrito/FOSS4G_2026.md) | FOSS4G 2026 conference paper abstract and presentation outline |

---

## 10. Audits & Consistency Records

| File | Description |
|---|---|
| [`auditorias/README.md`](auditorias/README.md) | Canonical consistency audits index and audit trail documentation |
| [`auditorias/2026-07-consistencia-canonica/README.md`](auditorias/2026-07-consistencia-canonica/README.md) | July 2026 canonical consistency audit campaign documentation |

---

## 11. SQL Scripts & Database Seeds

| File | Description |
|---|---|
| [`sql/sql_sync_factors_to_database.sql`](sql/sql_sync_factors_to_database.sql) | SQL seed script for syncing feedstock availability factors into PostgreSQL |
| [`sql/sql_insert_literature_references.sql`](sql/sql_insert_literature_references.sql) | SQL seed script for populating bibliographic references and DOIs |
| [`sql/audit_and_fix_reference_urls.sql`](sql/audit_and_fix_reference_urls.sql) | SQL maintenance script for repairing reference URL links |
| [`sql/REMOVE_ECONOMIC_TABLES.sql`](sql/REMOVE_ECONOMIC_TABLES.sql) | SQL cleanup script for deprecated economic tables |

---

## 12. Datasets & Baseline Artefacts

Located at `docs/data/datasets/`:

| File | Description |
|---|---|
| [`data/datasets/METADATA.json`](data/datasets/METADATA.json) | Data lineage catalog for all imported upstream datasets |
| [`data/datasets/baseline_2026-07-25.json`](data/datasets/baseline_2026-07-25.json) | Canonical state baseline snapshot (July 2026) |
| [`data/datasets/canonical_results.json`](data/datasets/canonical_results.json) | Full canonical calculation output dataset for SP municipalities |
| [`data/datasets/biogas_canonical_state_summary.csv`](data/datasets/biogas_canonical_state_summary.csv) | State-wide biogas potential summary CSV |
| [`data/datasets/municipality_biomass_tons.csv`](data/datasets/municipality_biomass_tons.csv) | Municipal biomass tonnage matrix for São Paulo State |
| [`data/datasets/validator_exclusions.json`](data/datasets/validator_exclusions.json) | Validator exclusion definitions and outlier rule overrides |
