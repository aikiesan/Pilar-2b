# QA Guide for PILAR-2b (NewLook)

**Author:** Project Lead
**For:** QA Contributor
**Date:** March 2026
**Task:** Quality Assurance of the NewLook Platform

---

## 1. What Is This Project?

**PILAR-2b** (_Plataforma Inteligente de Localização e Aproveitamento de Resíduos_) is a full-stack geospatial web application that analyzes **biogas and bioproduct potential** from agricultural, livestock, and urban residues across **645 municipalities in São Paulo State, Brazil**.

It is a FAPESP research project (2025/08745-2) with a production deployment.

**Live URLs:**
- Frontend: https://cp2bmaps.pages.dev
- Backend API: https://newlook-production.up.railway.app
- API Docs (Swagger): https://newlook-production.up.railway.app/docs

---

## 2. Tech Stack — What You Need to Know

| Layer | Technology | Your Role |
|---|---|---|
| Frontend | Next.js 16, React 19, TypeScript | Test UI, components, accessibility |
| Styling | Tailwind CSS | Verify responsiveness, layout |
| Maps | React Leaflet | Test map interactions, layers |
| Charts | Recharts, Chart.js | Verify data visualization |
| Auth | Supabase Auth + JWT | Test login flows |
| State | React Query (TanStack) | Verify data caching/loading states |
| i18n | next-intl | Test language switching |
| Backend | FastAPI (Python) | Test API endpoints |
| Database | PostgreSQL 15 + PostGIS | Understand spatial queries |
| Geospatial | GeoPandas, Shapely | Understand analysis logic |
| Tests (FE) | Jest, Playwright, React Testing Library | Run and improve coverage |
| Tests (BE) | Pytest | Run and improve coverage |
| CI/CD | GitHub Actions | Understand pipeline |

---

## 3. Setting Up Your Development Environment

### Prerequisites

```bash
# You need:
node >= 18.x
python >= 3.11
git
```

### Clone and Explore

```bash
git clone <repo-url>
cd NewLook/cp2b-workspace/NewLook
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Ask the project lead for the real Supabase credentials and API URL
npm run dev   # Starts on http://localhost:3006
```

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env
# Ask the project lead for DB credentials and SECRET_KEY
uvicorn app.main:app --reload   # Starts on http://localhost:8000
```

> **Tip:** You can test most backend endpoints through the live Swagger UI at `/docs` without running locally.

---

## 4. Project Structure — Where Things Live

```
NewLook/
├── frontend/
│   ├── src/app/[locale]/          # Pages (Home, Map, Dashboard, Analysis, Settings)
│   ├── src/components/            # React components
│   │   ├── map/                   # Map layers, controls
│   │   ├── analysis/              # Analysis panels
│   │   └── ui/                    # Buttons, modals, spinners
│   ├── src/contexts/              # Auth context (global state)
│   ├── src/hooks/                 # Custom React hooks
│   ├── src/services/              # API client functions
│   ├── src/types/                 # TypeScript types/interfaces
│   └── src/test/                  # Test setup and mocks
│
├── backend/
│   ├── app/main.py                # FastAPI entry point
│   ├── app/api/v1/endpoints/      # API route handlers (13 modules)
│   ├── app/models/                # Database models (SQLAlchemy)
│   ├── app/schemas/               # Request/response validation (Pydantic)
│   ├── app/services/              # Business logic
│   └── tests/                     # Pytest test suite
│
└── docs/                          # Documentation files
```

---

## 5. Running Existing Tests

### Frontend Tests

```bash
cd frontend

# Unit tests (Jest)
npm test                  # Watch mode
npm run test -- --watchAll=false   # Run once

# Accessibility tests
npm run test:a11y

# End-to-end tests (Playwright — requires dev server running)
npm run test:e2e

# Coverage report
npm run test:coverage
```

**Current coverage:** ~1-2% (target is 70%) — this is a major gap to address.

### Backend Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
pytest

# Verbose with coverage
pytest -v --cov=app

# Run a specific category
pytest -m unit
pytest -m api
pytest -m integration
```

**Current coverage:** ~20-30% (target is 80%) — another gap to address.

### CI/CD Pipeline

The `.github/workflows/ci.yml` runs automatically on every push:
- ESLint + Prettier (frontend linting)
- Jest unit tests
- Playwright E2E tests
- npm security audit
- Black + isort + Flake8 (Python linting)
- Pytest with coverage
- Safety (Python dependency security scan)

---

## 6. API Endpoints Reference

All endpoints are prefixed with `/api/v1/`. You can explore them interactively at `/docs`.

| Module | Path | Description |
|---|---|---|
| Auth | `/auth/` | Register, login, logout, token verify |
| Municipalities | `/municipalities/` | 645 SP municipalities data |
| Geospatial | `/geospatial/` | GeoJSON, centroids, proximity |
| Proximity | `/proximity/` | Radius-based analysis with MapBiomas |
| MapBiomas | `/mapbiomas/` | Land use data integration |
| Residues | `/residuos/` | Residue types + BMP/VS/TS parameters |
| Analysis | `/analysis/` | Biogas potential calculations |
| Statistics | `/statistics/` | Summary statistics and rankings |
| Infrastructure | `/infrastructure/` | Railways, pipelines, substations |
| Scientific | `/scientific/` | 58+ peer-reviewed references |
| Tech Routes | `/technology_routes/` | Technology route comparisons |

---

## 7. QA Testing Plan

Your job is to systematically verify the platform works correctly. Below is a structured plan organized by priority.

---

### 7.1 Functional Testing — Core Flows

Test these user flows manually and document any bugs:

#### Authentication
- [ ] Register a new user account
- [ ] Log in with valid credentials
- [ ] Log in with invalid credentials — verify proper error messages
- [ ] Session persistence (refresh the page — are you still logged in?)
- [ ] Log out — verify session is cleared

#### Interactive Map (Main Feature)
- [ ] Map loads on the home/map page
- [ ] All 645 municipalities are rendered
- [ ] Clicking a municipality shows its data
- [ ] Choropleth coloring changes when switching data layers
- [ ] Layer toggles work (infrastructure, heatmap, MapBiomas)
- [ ] Map zoom and pan work smoothly
- [ ] Map renders correctly on mobile screen sizes

#### Proximity Analysis
- [ ] Select a municipality and run a proximity analysis
- [ ] Adjust radius slider (1-100km) — results update accordingly
- [ ] Infrastructure layers (railways, pipelines, substations) appear in results
- [ ] Results show correct biogas potential values
- [ ] Analysis runs within ~3 seconds (performance target)
- [ ] Running the same analysis twice hits the cache (second request should be instant)

#### Scientific Database
- [ ] Browse residue types (50+ types expected)
- [ ] BMP, VS, TS parameters display correctly for each residue
- [ ] Scientific references (58+) are browseable
- [ ] Technology routes comparison tool works

#### Dashboard & Statistics
- [ ] Charts and graphs render without errors
- [ ] Statistics panel shows correct aggregate values
- [ ] Rankings display and sort correctly

#### Internationalization (i18n)
- [ ] Language switching works (check all supported languages)
- [ ] All text translates — no untranslated keys showing as `{key}`
- [ ] Locale-based URLs work (`/en/`, `/pt/`, etc.)

---

### 7.2 API Testing

Use the Swagger UI at `/docs` or tools like `curl`, Postman, or HTTPie.

#### Key Tests to Perform

```bash
# Health check
curl https://newlook-production.up.railway.app/health

# Get municipalities list
curl https://newlook-production.up.railway.app/api/v1/municipalities/

# Get GeoJSON for the map
curl https://newlook-production.up.railway.app/api/v1/geospatial/geojson

# Test proximity analysis (replace {id} with a real municipality ID)
curl -X POST https://newlook-production.up.railway.app/api/v1/proximity/analyze \
  -H "Content-Type: application/json" \
  -d '{"municipality_id": 1, "radius_km": 50}'

# Get statistics
curl https://newlook-production.up.railway.app/api/v1/statistics/
```

#### What to Verify in API Responses
- HTTP status codes are correct (200, 201, 400, 401, 404, 422, 500)
- Error messages are informative, not exposing stack traces
- Response times are within targets (analysis <3s, others <500ms)
- Pagination works where expected
- Rate limiting triggers after 10 analysis requests per minute

---

### 7.3 Automated Test Coverage

This is a major deliverable. The goal is to identify gaps and write tests.

#### Step 1 — Measure Current Coverage

```bash
# Frontend
cd frontend
npm run test:coverage
# Open coverage/lcov-report/index.html in a browser

# Backend
cd backend
pytest --cov=app --cov-report=html
# Open htmlcov/index.html in a browser
```

#### Step 2 — Identify Untested Areas

Look for files with low or zero coverage. Prioritize:
1. API endpoint handlers (`backend/app/api/v1/endpoints/`)
2. Business logic services (`backend/app/services/`)
3. Input validation (schema validation in `backend/app/schemas/`)
4. Frontend components that render user-facing data
5. Authentication flows

#### Step 3 — Write Missing Tests

**Backend test example (Pytest):**

```python
# tests/test_municipalities.py
def test_get_municipalities_returns_list(client):
    response = client.get("/api/v1/municipalities/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 645  # All SP municipalities

def test_get_municipality_not_found(client):
    response = client.get("/api/v1/municipalities/99999")
    assert response.status_code == 404
```

**Frontend test example (Jest + React Testing Library):**

```tsx
// src/components/map/__tests__/MapLayer.test.tsx
import { render, screen } from '@testing-library/react'
import MapLayer from '../MapLayer'

test('renders municipality count', async () => {
  render(<MapLayer />)
  const count = await screen.findByText(/645 municipalities/i)
  expect(count).toBeInTheDocument()
})
```

---

### 7.4 Security Testing

Basic security checks (no penetration testing required, just common-sense verification):

- [ ] API endpoints that require authentication return 401 without a token
- [ ] You cannot access another user's data by guessing IDs
- [ ] SQL injection attempt: try `' OR 1=1 --` in search/filter inputs
- [ ] XSS attempt: try `<script>alert('xss')</script>` in text inputs — it should be escaped
- [ ] Rate limiting is enforced (send 11+ analysis requests rapidly)
- [ ] The `/docs` Swagger endpoint is accessible (expected) — but verify sensitive data is not exposed there
- [ ] Running `npm audit` in `frontend/` reports no high/critical vulnerabilities

---

### 7.5 Performance Testing

Verify the platform meets its performance targets:

| Metric | Target | How to Test |
|---|---|---|
| Page load time | < 2s | Browser DevTools → Network tab |
| Map tile load | < 200ms | Network tab, filter by tile requests |
| Proximity API | < 3s | Stopwatch or DevTools |
| Cached response | ~0ms | Second identical request |
| Frontend bundle | < 500KB gzipped | `npm run build` → check output |
| Lighthouse score | > 90 | Chrome DevTools → Lighthouse tab |

```bash
# Generate bundle analysis
cd frontend
npm run build
# Look at the build output for chunk sizes
```

---

### 7.6 Accessibility Testing

The project targets **WCAG 2.1 Level AA**. Test:

- [ ] Run automated accessibility tests: `npm run test:a11y`
- [ ] Navigate the entire app using only the keyboard (Tab, Enter, Esc, arrow keys)
- [ ] Verify all images have alt text
- [ ] Check color contrast using Chrome DevTools → Accessibility panel
- [ ] Test with screen reader simulation (NVDA on Windows, VoiceOver on macOS, or the Chrome accessibility inspector)
- [ ] Verify focus indicators are visible on all interactive elements

---

### 7.7 Responsiveness Testing

Test on multiple screen sizes using Chrome DevTools device emulation:

- [ ] Desktop (1920×1080, 1440×900)
- [ ] Tablet (iPad: 768×1024)
- [ ] Mobile (iPhone 14: 390×844)
- [ ] Check: does the map resize correctly?
- [ ] Check: is the navigation usable on mobile?
- [ ] Check: do charts reflow properly?

---

### 7.8 Cross-Browser Testing

The Playwright config already covers three browsers. Verify:

```bash
cd frontend
npm run test:e2e  # Tests Chromium, Firefox, WebKit automatically
```

Also manually check in Chrome, Firefox, and Safari if available.

---

## 8. Reporting Bugs

For each bug found, document:

```
## Bug Report

**Title:** [Short description]
**Severity:** Critical / High / Medium / Low
**Environment:** Production / Local | Browser | OS
**Steps to Reproduce:**
1.
2.
3.
**Expected Result:**
**Actual Result:**
**Screenshot/Video:** (attach if applicable)
**Console Errors:** (paste from DevTools)
```

**Severity Guide:**
- **Critical:** App crashes, data loss, security vulnerability, auth bypass
- **High:** Core feature broken (map doesn't load, analysis fails)
- **Medium:** Feature works but incorrectly (wrong data, UI broken)
- **Low:** Minor UI issue, typo, cosmetic problem

---

## 9. Deliverables Expected from You

By the end of your QA assignment, produce:

1. **Bug Report Document** — all bugs found, classified by severity
2. **Test Coverage Report** — screenshots of coverage reports before and after
3. **New Test Files** — at least 10 new test cases (mix of unit + integration)
4. **Performance Report** — Lighthouse results + API response times
5. **Accessibility Report** — results of automated + manual a11y checks
6. **QA Summary** — one-page summary of overall platform quality

---

## 10. Useful Tools

| Tool | Purpose | Install |
|---|---|---|
| Postman | API testing UI | https://postman.com |
| HTTPie | CLI API testing | `pip install httpie` |
| Chrome DevTools | Performance, accessibility, network | Built into Chrome |
| Lighthouse | Web quality audit | Built into Chrome DevTools |
| axe DevTools | Accessibility browser extension | Chrome/Firefox extension |
| pytest-cov | Python test coverage | Already in requirements.txt |

---

## 11. Key Contacts & Resources

| Resource | Location |
|---|---|
| Main README | `README.md` |
| Testing Strategy | `TESTING.md` |
| API Documentation | `docs/API_DOCUMENTATION.md` |
| Deployment Guide | `DEPLOYMENT_GUIDE.md` |
| Swagger API Docs | `/docs` on the backend URL |
| Coverage Status | `COVERAGE_STATUS.md` |
| Security Notes | `SECURITY.md` |
| Accessibility Notes | `ACCESSIBILITY.md` |
| Improvement Roadmap | `docs/IMPROVEMENT_ROADMAP.md` |

---

## 12. Quick Reference — Most Important Commands

```bash
# Start frontend dev server
cd frontend && npm run dev

# Start backend dev server
cd backend && source venv/bin/activate && uvicorn app.main:app --reload

# Run all frontend tests with coverage
cd frontend && npm run test:coverage

# Run all backend tests with coverage
cd backend && pytest -v --cov=app --cov-report=html

# Run E2E tests
cd frontend && npm run test:e2e

# Lint frontend
cd frontend && npm run lint

# Lint backend
cd backend && black . --check && isort . --check-only && flake8
```

---

Good luck! The project is well-structured, so you will be able to navigate it quickly. Focus first on running existing tests and understanding what they cover, then systematically go through the functional test checklist above. When in doubt, the Swagger UI at `/docs` is your best friend for exploring the API.
