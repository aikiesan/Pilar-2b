# PILAR-2b — Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogas e Bioprodutos

[![Version](https://img.shields.io/badge/version-3.0.3-blue.svg)](https://github.com/aikiesan/Pilar-2b)
[![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)](./LICENSE)
[![INPI](https://img.shields.io/badge/INPI%20BR-512026003115--0-green.svg)](https://www.gov.br/inpi)
[![UNICAMP](https://img.shields.io/badge/NIPE-UNICAMP-darkblue.svg)](https://nipe.unicamp.br/cp2b)
[![Live Platform](https://img.shields.io/badge/Live%20Platform-cp2b.unicamp.br-brightgreen.svg)](https://cp2b.unicamp.br/pilar2b/pt-BR)
[![FOSS4G Europe 2026](https://img.shields.io/badge/FOSS4G%20Europe-2026-orange.svg)](https://foss4g.org/)

<p align="center">
  <img src="./cp2b-workspace/NewLook/frontend/public/screenshots/interactive-map.png" alt="PILAR-2b — interactive choropleth of biogas potential across São Paulo's 645 municipalities" width="100%">
  <br>
  <sub><em>Interactive choropleth of mobilisable biogas potential across São Paulo's 645 municipalities — the live PILAR-2b platform.</em></sub>
</p>

**PILAR-2b** (_Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogas e Bioprodutos_) is an open-source microservices platform for analyzing **biogas and bioproduct potential** from agricultural, livestock, and urban residues across **645 municipalities** in São Paulo State, Brazil.

This study addresses identified gaps through three interconnected contributions:

1. **PILAR-2b** was designed and deployed as an open-source microservices platform that integrates heterogeneous government datasets into a unified geospatial database accessible through a browser-based interface without requiring desktop GIS.
2. A **feedstock-dependent correction factor (FDE) methodology** was implemented and validated, decomposing theoretical biomass potential into practical mobilisable availability through explicit factor-specific attribution across collection efficiency, competing uses, seasonal availability, and logistical constraints.
3. The **spatial distribution of biogas potential** was quantified across São Paulo State's 645 municipalities, demonstrating the framework's capacity to generate investment-relevant outputs at municipal resolution within an open and replicable computational architecture.

---

## Contents

[Institutional Recognition](#institutional-recognition) ·
[Live Platform](#live-platform) ·
[Key Features](#key-features) ·
[Screenshots](#screenshots) ·
[Architecture](#architecture) ·
[Repository Structure](#repository-structure) ·
[Quick Start](#quick-start) ·
[Documentation](#documentation) ·
[Project Status](#project-status) ·
[Citation](#citation) ·
[Contributing](#contributing) ·
[License](#license)

---

## Institutional Recognition

| | |
|---|---|
| **INPI Registration** | Process Nº **BR512026003115-0** — issued 12/05/2026, valid 50 years (until 2076) |
| **Institution** | Universidade Estadual de Campinas — UNICAMP |
| **Research Unit** | NIPE-UNICAMP · Campinas, SP |
| **Authors** | Lucas Nakamura Cerejo · Rubens Augusto Camargo Lamparelli · Bruna de Souza Moraes · Ana Beatriz Soares Aguiar |
| **Facilitation** | INOVA Unicamp |
| **Research Funding** | FAPESP 2024/01112-1 (CP2Bsd) |
| **Registry** | MINISTÉRIO DO DESENVOLVIMENTO, INDÚSTRIA, COMÉRCIO E SERVIÇOS — INPI — Diretoria de Patentes, Programas de Computador e Topografias de Circuitos |

> Registered under Law 9.609/1998 (§2°, art. 2°) as a Computer Program with SHA-512 integrity hash.
> Approved by Erica Guimaraes Correa, Chief of the Division of Computer Programs and Integrated Circuit Topographies.

---

## Live Platform

| Language | URL |
|----------|-----|
| Português (BR) | **[https://cp2b.unicamp.br/pilar2b/pt-BR](https://cp2b.unicamp.br/pilar2b/pt-BR)** |
| English | **[https://cp2b.unicamp.br/pilar2b/en](https://cp2b.unicamp.br/pilar2b/en)** |
| API Reference | [docs/api/API_DOCUMENTATION.md](./cp2b-workspace/NewLook/docs/api/API_DOCUMENTATION.md) |
| NIPE Website | [https://nipe.unicamp.br/cp2b](https://nipe.unicamp.br/cp2b) |

---

## Key Features

### Interactive Geospatial Maps
- **645 municipalities** in São Paulo State with real-time data visualization
- **Choropleth coloring** by biogas potential category
- **React Leaflet** maps with custom layers and controls
- **PostGIS spatial queries** for radius-based proximity analysis

### Proximity & Infrastructure Analysis
- **MapBiomas integration** for land-use classification data
- **Radius-based analysis** (1–100 km)
- **Infrastructure overlay** (railways, pipelines, electrical substations)
- **Biogas potential aggregation** by sector and residue type

### Scientific Database
- **50+ residue types** with biochemical parameters (BMP, VS, TS)
- **FDE correction factors** from peer-reviewed literature (31 feedstocks, 4 factor types)
- **Technology routes** comparison tool for 10+ biogas conversion pathways
- **58 curated scientific references** with DOI links

### Advanced Analysis
- **Sankey flow diagrams** for multi-residue split-flow visualization
- **Co-digestion C:N ratio** clustering — backend service implemented; UI in development
- **Economic impact modelling** (IBGE 67-sector Leontief) — _roadmapped (not yet in the backend service layer)_
- **Payback calculator** for biogas plant investment viability

### Bilingual Interface
- Full support for **Portuguese (pt-BR)** and **English (en)**
- Locale-aware routing via next-intl

---

## Screenshots

| Interactive Map | Proximity Analysis |
|---|---|
| [![Interactive map](./cp2b-workspace/NewLook/frontend/public/screenshots/interactive-map.png)](./cp2b-workspace/NewLook/frontend/public/screenshots/interactive-map.png) | [![Proximity analysis](./cp2b-workspace/NewLook/frontend/public/screenshots/proximity-analysis.png)](./cp2b-workspace/NewLook/frontend/public/screenshots/proximity-analysis.png) |
| **Data Analysis** | **Scientific Basis** |
| [![Data analysis](./cp2b-workspace/NewLook/frontend/public/screenshots/data-analysis.png)](./cp2b-workspace/NewLook/frontend/public/screenshots/data-analysis.png) | [![Scientific basis](./cp2b-workspace/NewLook/frontend/public/screenshots/scientific-basis.png)](./cp2b-workspace/NewLook/frontend/public/screenshots/scientific-basis.png) |

> Live at **[cp2b.unicamp.br/pilar2b](https://cp2b.unicamp.br/pilar2b/pt-BR)**.

---

## Architecture

### Frontend
- **Framework**: Next.js 16.2 + React 19.2 + TypeScript 5.7
- **Styling**: Tailwind CSS 3.4
- **Maps**: React Leaflet 4.2
- **Charts**: Recharts 3.8 + Chart.js 4.5
- **State Management**: TanStack React Query 5.90
- **Auth**: Supabase Auth (JWT)
- **i18n**: next-intl 4.9 (pt-BR, en) · _Spanish (es) planned_
- **Testing**: Jest 30 + Playwright 1.57 + Testing Library
- **Deployment**: Apache2 + PM2 (Unicamp VM) / Cloudflare Pages / Vercel
- **Security**: CVE-2025-66478 patched (Next.js 16.2.3)

### Backend
- **Framework**: FastAPI 0.135.3 + Uvicorn 0.32.1
- **Database**: PostgreSQL 15 + PostGIS 3.4 (Supabase)
- **ORM**: SQLAlchemy 2.0
- **Geospatial**: GeoPandas 1.0+, Shapely 2.0, PyProj 3.6, Rasterio 1.3
- **Data Processing**: Pandas 2.1, NumPy 1.24, scikit-learn 1.6
- **Testing**: Pytest 9.0 + pytest-cov + pytest-asyncio
- **Deployment**: Railway (primary)

### Performance
- **LRU Caching** — 5-minute TTL for analysis results
- **gzip Compression** — 60–70% bandwidth reduction
- **Rate Limiting** — 10 analyses/minute per IP
- **Connection Pooling** — 2–20 PostgreSQL connections
- **Response time**: <3s (p95), 0ms (cached)

---

## Repository Structure

This repository is a monorepo. The deployable application lives under `cp2b-workspace/NewLook/`:

```
Pilar-2b/
├── README.md                     # ← you are here (project front page)
├── LICENSE · CITATION.cff        # GPL-3.0 · how to cite this work
├── CONTRIBUTING.md · CODE_OF_CONDUCT.md
├── .github/                      # CI, CodeQL, issue/PR templates, Dependabot
├── analysis/                     # Reproducible data analysis + real-world plant datasets (ANP/ANEEL)
├── docs/                         # Cross-cutting datasets & documentation
└── cp2b-workspace/NewLook/       # ── THE APPLICATION ──
    ├── frontend/                 # Next.js 16 + React 19 + TypeScript (React-Leaflet maps)
    ├── backend/                  # FastAPI + PostGIS (REST API, FDE engine, migrations)
    ├── data/canonical_parameters/# Single source of truth: feedstocks.yaml + references
    └── docs/                     # ~43 technical docs (API, architecture, methodology, deployment)
```

> **Quick links:** [Application root](./cp2b-workspace/NewLook/) ·
> [Frontend](./cp2b-workspace/NewLook/frontend/) ·
> [Backend](./cp2b-workspace/NewLook/backend/) ·
> [Documentation index](./cp2b-workspace/NewLook/docs/DOCUMENTATION_INDEX.md)

---

## Quick Start

### Prerequisites
- Node.js 18+ (frontend)
- Python 3.10+ (backend)
- PostgreSQL 15+ with PostGIS (or Supabase account)

### 1. Clone Repository

```bash
git clone https://github.com/aikiesan/Pilar-2b.git
cd Pilar-2b/cp2b-workspace/NewLook
```

### 2. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
#   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
npm run dev
```

Frontend will be available at: http://localhost:3006

### 3. Setup Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
uvicorn app.main:app --reload
```

Backend will be available at: http://localhost:8000
API docs: http://localhost:8000/docs

### 4. Docker (Recommended for local dev)

```bash
cp .env.docker.example .env.docker
docker compose up --build
```

- Frontend: http://localhost:3006
- Backend API: http://localhost:8000
- DB: PostgreSQL on port 5432

---

## Database Setup

### Option 1: Supabase (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get the connection string from Settings → Database
4. Apply migrations from `backend/migrations/`

### Option 2: Local PostgreSQL

```bash
sudo apt-get install postgresql-15 postgresql-15-postgis-3
createdb cp2b_maps
psql cp2b_maps -c "CREATE EXTENSION postgis;"
psql cp2b_maps < backend/migrations/001_add_performance_indexes.sql
```

---

## Testing

### Frontend

```bash
cd frontend
npm run lint          # ESLint 9 flat config
npm run build         # Production bundle (<500KB gzipped)
npm run test          # Jest unit tests
npm run test:e2e      # Playwright end-to-end tests
npm run test:a11y     # WCAG 2.1 accessibility tests
```

### Backend

```bash
cd backend
black . --check       # Python formatting check
isort . --check-only  # Import order check
mypy app/             # Type checking
pytest --cov=app      # Unit + integration tests (target: 80% coverage)
curl http://localhost:8000/health
```

See: [docs/qa/TESTING.md](./cp2b-workspace/NewLook/docs/qa/TESTING.md)

---

## Documentation

### Core Docs

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Development workflow, coding standards, PR process |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Community standards |
| [SECURITY.md](./.github/SECURITY.md) | Security policy & responsible disclosure |
| [CHANGELOG.md](./cp2b-workspace/NewLook/CHANGELOG.md) | Version history |
| [docs/DOCUMENTATION_INDEX.md](./cp2b-workspace/NewLook/docs/DOCUMENTATION_INDEX.md) | Full index of all ~43 documentation files |

### API & Architecture

| Document | Description |
|----------|-------------|
| [docs/api/API_DOCUMENTATION.md](./cp2b-workspace/NewLook/docs/api/API_DOCUMENTATION.md) | Complete API reference with examples |
| [docs/architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md](./cp2b-workspace/NewLook/docs/architecture/TECHNOLOGY_ROUTES_IMPLEMENTATION_GUIDE.md) | Technology-routes architecture & implementation |
| [docs/architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md](./cp2b-workspace/NewLook/docs/architecture/ENHANCED_MAP_INTEGRATION_GUIDE.md) | Map visualization architecture & integration |
| [docs/architecture/PERFORMANCE_OPTIMIZATIONS.md](./cp2b-workspace/NewLook/docs/architecture/PERFORMANCE_OPTIMIZATIONS.md) | Caching, compression, bundle optimization details |

### Data & Methodology

| Document | Description |
|----------|-------------|
| [docs/data/FDE_METHODOLOGY.md](./cp2b-workspace/NewLook/docs/data/FDE_METHODOLOGY.md) | Feedstock-Dependent Efficiency methodology (V2.0) |
| [docs/data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md](./cp2b-workspace/NewLook/docs/data/FEEDSTOCK_FACTORS_LITERATURE_TABLE.md) | Literature table: 31 feedstocks × 4 factor types |
| [docs/data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md](./cp2b-workspace/NewLook/docs/data/SAO_PAULO_BIOGAS_POTENTIAL_FDE.md) | State-level biogas potential analysis |

### Deployment

| Document | Description |
|----------|-------------|
| [docs/LOCAL_DOCKER_SETUP.md](./cp2b-workspace/NewLook/docs/LOCAL_DOCKER_SETUP.md) | Docker local development setup |
| [docs/VM_UPDATE_GUIDE.md](./cp2b-workspace/NewLook/docs/VM_UPDATE_GUIDE.md) | Unicamp VM Apache2/PM2 deployment guide |
| [docs/deployment/DEPLOYMENT_GUIDE.md](./cp2b-workspace/NewLook/docs/deployment/DEPLOYMENT_GUIDE.md) | Railway + Cloudflare/Vercel deployment |
| [docs/deployment/DEPLOYMENT_CHECKLIST.md](./cp2b-workspace/NewLook/docs/deployment/DEPLOYMENT_CHECKLIST.md) | Step-by-step production checklist |

---

## Environment Variables

### Frontend (`.env.local`)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_USE_MOCK_DATA=false
```

### Backend (`.env`)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
SUPABASE_ANON_KEY=eyJhbGc...

# Security
SECRET_KEY=generate_with_openssl_rand_hex_32

# App Config
APP_ENV=development
HOST=0.0.0.0
PORT=8000
DEBUG=true

# CORS
FRONTEND_URL=http://localhost:3006
```

---

## Performance Metrics

| Metric | Target | Result | Status |
|--------|--------|--------|--------|
| Map tile load | <200ms | ~150ms | Pass |
| Proximity analysis (p95) | <3s | 2.1s | Pass |
| Cached response | — | 0ms | Pass |
| Page load time | <2s | 1.8s | Pass |
| Frontend bundle (gzipped) | <500KB | 380KB | Pass |
| Lighthouse Performance | >90 | 92 | Pass |
| Cache hit rate (warm) | >60% | 64% | Pass |

---

## Tech Stack

### Frontend Dependencies

```json
{
  "next": "^16.2.3",
  "react": "^19.2.1",
  "@supabase/supabase-js": "^2.45.4",
  "react-leaflet": "^4.2.1",
  "recharts": "^3.8.1",
  "next-intl": "^4.9.0",
  "tailwindcss": "^3.4.14",
  "@tanstack/react-query": "^5.90.12"
}
```

### Backend Dependencies

```python
fastapi==0.135.3
uvicorn[standard]==0.32.1
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
geopandas>=1.0.0
shapely==2.0.2
scikit-learn>=1.6.0
```

---

## Deployment

### Unicamp VM (Production)

```bash
# Apache2 + PM2 deployment at cp2b.unicamp.br/pilar2b
# See: cp2b-workspace/NewLook/docs/VM_UPDATE_GUIDE.md
cd cp2b-workspace/NewLook/frontend && npm run build
pm2 restart pilar2b-frontend
```

### Railway (Backend Auto-deploy)

```bash
git push origin main
# Railway auto-deploys from cp2b-workspace/NewLook/backend/
```

### Cloudflare Pages / Vercel (Frontend Alternative)

```bash
git push origin main
# Cloudflare Pages or Vercel auto-deploys from cp2b-workspace/NewLook/frontend/
```

---

## Project Status

### Completed (Sprints 1–5)
- [x] Foundation (Next.js 16 + FastAPI + Supabase)
- [x] Authentication system (Supabase JWT)
- [x] Interactive dashboard — 645 municipalities, choropleth map
- [x] Proximity analysis with MapBiomas land-use integration
- [x] FDE methodology implementation and validation
- [x] Performance optimization (LRU cache, gzip, rate limiting, connection pooling)
- [x] Sankey flow diagrams for multi-residue visualization
- [x] Co-digestion C:N ratio clustering (backend service; UI in development)
- [x] Payback calculator for biogas plant viability
- [x] Bilingual interface (pt-BR / en) via next-intl
- [x] Unicamp VM deployment (Apache2 + PM2 at cp2b.unicamp.br/pilar2b)
- [x] INPI Brazil registration (BR512026003115-0)
- [x] Security hardening (CVE-2025-66478, CVE-2025-62727, multiple patches)
- [x] ESLint 9 flat config + comprehensive E2E tests
- [x] Comprehensive documentation (~43 files, ~18,500+ lines)

### In Progress / Roadmapped
- [ ] IBGE 67-sector Leontief economic model (designed; backend service pending — see `docs/data/IBGE_67_SECTOR_INTEGRATION_COMPLETE.md`)
- [ ] MCDA multi-criteria decision analysis module (proximity + C:N screening exist; full optimizer pending)
- [ ] Co-digestion analysis exposed in the UI/API
- [ ] WCAG 2.1 AA full compliance
- [ ] Sentry observability integration (frontend + backend)

### Planned (Roadmap Apr–Aug 2026)
- [ ] Historical MapBiomas data (2020–2023)
- [ ] Multiple analysis points comparison
- [ ] Export to PDF reports
- [ ] Mobile app (React Native)

See: [docs/planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md](./cp2b-workspace/NewLook/docs/planning/DEVELOPMENT_ROADMAP_APR_AUG_2026.md)

---

## Contributing

**PILAR-2b** is open-source and welcomes contributions from the community.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution

- Bug fixes and issue resolution
- New data sources and residue types
- Additional geospatial analysis features
- Documentation improvements and translations
- Internationalization (i18n) — Spanish support planned
- Test coverage expansion
- UI/UX enhancements

See [CONTRIBUTING.md](./cp2b-workspace/NewLook/CONTRIBUTING.md) for full guidelines.

---

## Citation

If you use PILAR-2b in academic work, please cite it. Machine-readable metadata is in
[`CITATION.cff`](./CITATION.cff) (GitHub renders a **"Cite this repository"** button from it).

> Cerejo, L. N.; Lamparelli, R. A. C.; Moraes, B. S.; Aguiar, A. B. S. (2026).
> *PILAR-2b: Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogas e
> Bioprodutos* (Version 3.0.3) [Computer software]. NIPE — Universidade Estadual de Campinas
> (UNICAMP). INPI BR512026003115-0. https://github.com/aikiesan/Pilar-2b

Funded by **FAPESP** (Grant 2024/01112-1, CP2Bsd). Registered with **INPI** (BR512026003115-0).

---

## License

**PILAR-2b** is open-source software released under the **GNU General Public License v3.0 (GPL-3.0)**.

This project was developed as part of research funded by FAPESP (Grant 2024/01112-1 / CP2Bsd) at NIPE-UNICAMP and is freely available for use, modification, and distribution under the terms of the GPL-3.0.

See [LICENSE](./LICENSE) for full details.

### Why Open Source?

We believe in making research and technology accessible to everyone. By open-sourcing PILAR-2b, we aim to:
- Enable other researchers and institutions to build upon this work
- Foster collaboration in sustainable energy and waste valorization
- Support public-good initiatives in biogas and bioproducts development
- Promote transparency in environmental research tools

---

## Acknowledgments

- **FAPESP**: Research funding (Grant 2024/01112-1 / CP2Bsd)
- **INOVA Unicamp**: Support for INPI registration process
- **NIPE-UNICAMP**: Institutional support and research infrastructure
- **MapBiomas**: Land-use classification data ([mapbiomas.org](https://mapbiomas.org))
- **DBFZ**: Inspiration for UI/UX ([datalab.dbfz.de/resdb](https://datalab.dbfz.de/resdb))
- **Supabase**: Managed PostgreSQL + Auth hosting
- **Cloudflare Pages**: Frontend CDN hosting
- **Railway**: Backend cloud deployment

---

## Contact & Links

| | |
|---|---|
| **Repository** | https://github.com/aikiesan/Pilar-2b |
| **Live Platform** | https://cp2b.unicamp.br/pilar2b/pt-BR |
| **NIPE Website** | https://nipe.unicamp.br/cp2b |
| **Documentation** | [cp2b-workspace/NewLook/docs/](./cp2b-workspace/NewLook/docs/) |
| **Issues** | [GitHub Issues](https://github.com/aikiesan/Pilar-2b/issues) |
| **API Reference** | [cp2b-workspace/NewLook/docs/api/API_DOCUMENTATION.md](./cp2b-workspace/NewLook/docs/api/API_DOCUMENTATION.md) |

---

**Last Updated**: June 2026
**Version**: 3.0.3
**Status**: Production — live at [cp2b.unicamp.br/pilar2b](https://cp2b.unicamp.br/pilar2b/pt-BR)
