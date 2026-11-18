# Test Structure Documentation

## Overview

This document describes the comprehensive test structure for the PILAR-2b V3 project, covering both backend (Python/Pytest) and frontend (TypeScript/Jest) testing.

## Test Coverage Goals

- **Minimum Coverage**: 70% for all metrics (lines, branches, functions, statements)
- **Current Status**: Phase 1 & Phase 2 complete (~10,650 lines of tests)
- **Focus**: Business-critical paths, data integrity, API validation

## Backend Tests (`backend/tests/`)

### Structure

```
backend/tests/
├── __init__.py                           # Package marker
├── conftest.py                           # Pytest fixtures & configuration
│
├── integration/                          # Integration tests (API endpoints)
│   ├── __init__.py
│   └── endpoints/
│       ├── __init__.py
│       ├── test_municipalities.py        # Municipalities API tests
│       ├── test_economic_simulation.py   # Economic simulation API tests
│       ├── test_analysis.py              # Analysis API tests
│       └── test_geospatial.py            # Geospatial API tests
│
├── unit/                                 # Unit tests (isolated components)
│   ├── __init__.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── test_auth.py                  # Auth model validation
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── test_economic_simulation.py   # Pydantic schema validation
│   └── services/
│       ├── __init__.py
│       ├── test_auth_service.py          # Authentication service
│       ├── test_cache_service.py         # LRU cache service
│       ├── test_economic_data_service.py # Economic data access
│       ├── test_economic_simulation_orchestrator.py # Orchestration
│       ├── test_leontief_calculator.py   # Economic calculations
│       ├── test_mapbiomas_service.py     # Raster land use analysis
│       ├── test_proximity_service.py     # Geospatial proximity
│       └── test_spatial_spillover_service.py # Gravity model
│
└── [root level tests]                    # Legacy/infrastructure tests
    ├── test_config.py                    # Configuration validation
    ├── test_database.py                  # Database operations
    ├── test_transactions_threads.py      # Thread safety & transactions
    └── test_validation.py                # Input validation

```

### Backend Test Organization Principles

1. **Unit Tests** (`unit/`): Test individual components in isolation
   - **Models**: Pydantic model validation
   - **Schemas**: Request/response schema validation
   - **Services**: Business logic services

2. **Integration Tests** (`integration/`): Test API endpoints with mocked dependencies
   - **Endpoints**: FastAPI route testing with TestClient

3. **Root Level Tests**: Infrastructure and configuration tests
   - Database connectivity, transactions, thread safety
   - Configuration validation
   - Input sanitization

### Running Backend Tests

```bash
# All tests
cd backend
pytest

# Specific test file
pytest tests/unit/services/test_leontief_calculator.py

# With coverage
pytest --cov=app --cov-report=term-missing

# Specific test class or method
pytest tests/unit/services/test_cache_service.py::TestCacheService::test_set_and_get

# Integration tests only
pytest tests/integration/

# Unit tests only
pytest tests/unit/
```

## Frontend Tests (`frontend/src/`)

### Structure

```
frontend/src/
├── contexts/__tests__/
│   └── AuthContext.test.tsx             # Auth context & hooks
│
├── lib/
│   ├── apiCache.test.ts                 # Client-side caching
│   ├── apiClient.test.ts                # API client & auth
│   ├── logger.test.ts                   # Production-safe logging
│   ├── mapUtils.test.ts                 # Map formatting utilities
│   └── performance.test.ts              # Performance monitoring
│
└── types/__tests__/
    └── errors.test.ts                   # Error utilities

```

### Frontend Test Organization Principles

1. **Co-located Tests**: Test files alongside source code (`.test.ts`, `.test.tsx`)
2. **__tests__ Directories**: For components/contexts with multiple tests
3. **Jest + React Testing Library**: Testing framework

### Running Frontend Tests

```bash
# All tests
cd frontend
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific test file
npm test -- apiCache.test.ts

# Update snapshots
npm test -- -u
```

## Test File Naming Conventions

### Backend (Python)
- **Pattern**: `test_<module_name>.py`
- **Classes**: `Test<ClassName>`
- **Methods**: `test_<functionality>`
- **Examples**:
  - `test_cache_service.py` → `TestCacheService` → `test_set_and_get`
  - `test_economic_simulation.py` → `TestShockSimulation` → `test_valid_shock_request`

### Frontend (TypeScript)
- **Pattern**: `<module_name>.test.ts` or `<component_name>.test.tsx`
- **Describe blocks**: `describe('<ModuleName>', () => {})`
- **Test blocks**: `it('should <behavior>', () => {})`
- **Examples**:
  - `apiCache.test.ts` → `describe('apiCache')` → `it('should cache data')`
  - `AuthContext.test.tsx` → `describe('AuthContext')` → `it('should provide auth state')`

## Test Coverage by Phase

### Phase 1 (High Priority) - ✅ Complete
- **Backend API Endpoints**: municipalities, economic_simulation, analysis, geospatial
- **Critical Services**: Leontief calculator, proximity, orchestrator, cache, auth
- **Frontend Utilities**: mapUtils, logger, performance, apiClient, apiCache
- **Infrastructure**: CI integration, testing documentation

### Phase 2 (Medium Priority) - ✅ Backend Complete
- **Backend Data Services**: economic_data, spatial_spillover, mapbiomas
- **Backend Models/Schemas**: auth models, economic simulation schemas
- **Frontend Components**: Map components, charts, hooks (TODO)

### Phase 3 (Lower Priority) - TODO
- **Frontend UI Components**: Buttons, inputs, modals, layouts
- **Frontend Pages**: Dashboard, map pages, analysis pages
- **E2E Tests**: Critical user flows

## Coverage Metrics

### Backend Coverage
```bash
# Generate coverage report
cd backend
pytest --cov=app --cov-report=html

# View report
open htmlcov/index.html
```

### Frontend Coverage
```bash
# Generate coverage report
cd frontend
npm test -- --coverage

# View report
open coverage/lcov-report/index.html
```

## Continuous Integration

Tests run automatically via GitHub Actions (`.github/workflows/ci.yml`):

1. **Backend Tests**:
   - Python 3.10
   - Install dependencies from `requirements.txt`
   - Run pytest with coverage
   - Upload coverage reports

2. **Frontend Tests**:
   - Node.js 18
   - Install dependencies via npm
   - Run Jest with coverage
   - Build verification

## Test Data & Fixtures

### Backend (`conftest.py`)
- **Database fixtures**: Mock database connections
- **Service fixtures**: Pre-configured service instances
- **Mock data**: Sample regions, municipalities, economic data

### Frontend (`setupTests.ts`, `jest.setup.js`)
- **Mock localStorage**: Browser API mocks
- **Mock fetch**: API call mocking
- **Test utilities**: Rendering helpers from React Testing Library

## Best Practices

### General
1. **Test Pyramid**: 70% unit, 20% integration, 10% E2E
2. **Test Behavior, Not Implementation**: Focus on what, not how
3. **Meaningful Assertions**: Test business requirements
4. **Avoid Brittle Tests**: Don't couple to internal structure

### Backend Specific
1. **Mock External Services**: Supabase, PostGIS functions
2. **Test Edge Cases**: NULL values, empty lists, extreme numbers
3. **Verify Error Handling**: Test failure scenarios
4. **Use Type Hints**: Enable better IDE support

### Frontend Specific
1. **Test User Interactions**: Click, type, submit
2. **Test Accessibility**: Screen reader compatibility
3. **Mock API Calls**: Don't hit real endpoints
4. **Test Loading States**: Pending, success, error

## Common Issues & Solutions

### Backend

**Issue**: Import errors in tests
```bash
# Solution: Ensure __init__.py exists in all test directories
find tests -type d -exec touch {}/__init__.py \;
```

**Issue**: Database connection errors
```python
# Solution: Mock database in conftest.py
@pytest.fixture
def mock_db():
    with patch("app.core.database.get_db") as mock:
        yield mock
```

### Frontend

**Issue**: "Cannot find module" errors
```typescript
// Solution: Configure Jest moduleNameMapper in jest.config.js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

**Issue**: localStorage not defined
```typescript
// Solution: Mock in jest.setup.js
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
```

## Test Maintenance

### Regular Tasks
1. **Update tests** when adding features
2. **Remove obsolete tests** when removing features
3. **Refactor tests** when refactoring code
4. **Monitor coverage** to identify gaps
5. **Fix flaky tests** immediately

### Quarterly Review
1. Review test execution time
2. Identify slow tests for optimization
3. Update mock data to match production
4. Review coverage gaps
5. Update testing documentation

## Related Documentation

- **[TESTING.md](./TESTING.md)**: Detailed testing strategy and guidelines
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Contribution guidelines
- **[README.md](./README.md)**: Project overview
- **CI Configuration**: `.github/workflows/ci.yml`

## Statistics

- **Total Test Files**: 20 backend + 7 frontend = 27 files
- **Total Test Lines**: ~10,650 lines
- **Backend Coverage**: Services (100%), Endpoints (100%), Models/Schemas (100%)
- **Frontend Coverage**: Utilities (100%), Contexts (partial)
- **Test Execution Time**: Backend ~3-5s, Frontend ~2-3s

---

Last Updated: 2025-12-23
Maintained by: CP2B Development Team
