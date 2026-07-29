# Datasets & Canonical Results Artefacts

This directory contains reference documentation and guidelines for the dataset outputs and baseline files used in **PILAR-2b**.

> **Note on Data Management**: Heavy generated dataset outputs (`canonical_results.json`, `municipality_biomass_tons.csv`, baseline snapshots, etc.) are excluded from Git tracking to maintain repository performance and prevent large binary/JSON diff bloat.

---

## Dataset Generation & Seeding

All canonical calculation outputs and baseline dataset files can be regenerated or populated into PostgreSQL using the automated pipeline scripts in the codebase:

### 1. Database Ingestion & Factor Synchronization
- Synchronize feedstock availability factors (FC, FCo, FS, FL) and scientific references:
  ```bash
  psql -d cp2b_maps -f docs/sql/sql_sync_factors_to_database.sql
  psql -d cp2b_maps -f docs/sql/sql_insert_literature_references.sql
  ```

### 2. Ingestion Contracts & Data Verification
- Execute dataset ingestion and validation pipeline:
  ```bash
  # Execute backend calculation engine to generate fresh municipal biomass potentials
  python backend/scripts/ingest_national_data.py
  ```

### 3. Fetching Pre-built Results
- Production dataset snapshots and GeoJSON layers are accessible via the live platform API endpoints:
  - **Municipal GeoJSON**: `GET https://cp2b.unicamp.br/pilar2b/api/v1/municipalities/geojson`
  - **API Documentation**: `https://cp2b.unicamp.br/pilar2b/api/docs`

---

## File Lineage & Reference Metadata

| File | Purpose / Description | Source / Generation Script |
|---|---|---|
| `METADATA.json` | Upstream data source lineage catalog | Manual / Ingestion Contract |
| `baseline_2026-07-25.json` | Benchmark baseline state snapshot | `backend/scripts/export_baseline.py` |
| `canonical_results.json` | Full 645 municipal calculation results | `backend/app/services/calculator.py` |
| `municipality_biomass_tons.csv` | Municipal biomass tonnage matrix | `scripts/generate_inventory.py` |
| `biogas_canonical_state_summary.csv` | State-wide biogas potential summary | `scripts/generate_inventory.py` |
| `validator_exclusions.json` | Outlier validation rules | `backend/app/core/validator.py` |
