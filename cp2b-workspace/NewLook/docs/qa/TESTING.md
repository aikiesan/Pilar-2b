# Testing Strategy & Guidelines

## Current Test Coverage Status

### Frontend
- **Current Coverage**: ~1-2% (2 out of 137 source files)
- **Target Coverage**: 70%
- **Framework**: Jest 29.7.0 with React Testing Library
- **Existing Tests**:
  - `AuthContext.test.tsx` - Authentication context and hooks
  - `errors.test.ts` - Error utilities

### Backend
- **Current Coverage**: ~20-30% (5 test files, focused on config/validation)
- **Target Coverage**: 70%
- **Framework**: Pytest 7.4.3 with pytest-cov
- **Existing Tests**:
  - Configuration validation
  - Database operations & pooling
  - Transaction/thread safety
  - Input validation & security

---

## Testing Priorities

### Phase 1: Critical Infrastructure (HIGH PRIORITY)

#### Backend
1. **API Endpoints** - Most exposed business logic
   - [ ] `analysis.py` - Data analysis endpoints
   - [ ] `economic_simulation.py` - Economic simulation endpoints
   - [ ] `geospatial.py` - Geospatial operations
   - [ ] `municipalities.py` - Municipality data
   - [ ] `residuos.py` - Residue data management
   - [ ] `proximity.py` - Proximity analysis

2. **Critical Services**
   - [ ] `auth_service.py` - Authentication logic
   - [ ] `leontief_calculator.py` - Economic calculations
   - [ ] `economic_simulation_orchestrator.py` - Simulation orchestration
   - [ ] `proximity_service.py` - Proximity calculations
   - [ ] `cache_service.py` - Caching logic
   - [ ] `supabase_client.py` - External API integration

#### Frontend
1. **API Clients** - Data layer integrity
   - [ ] `apiClient.ts` - Core API communication
   - [ ] `apiCache.ts` - Client-side caching
   - [ ] `apiQueue.ts` - Request queuing
   - [ ] Supabase clients (`client.ts`, `server.ts`, `supabaseGeospatial.ts`)

2. **Core Utilities**
   - [ ] `mapUtils.ts` - Map helper functions
   - [ ] `logger.ts` - Logging utilities
   - [ ] `performance.ts` - Performance monitoring

### Phase 2: Components & Business Logic (MEDIUM PRIORITY)

#### Backend
1. **Data Services**
   - [ ] `economic_data_service.py` - Economic data processing
   - [ ] `spatial_spillover_service.py` - Spatial analysis
   - [ ] `mapbiomas_service.py` - MapBiomas integration

2. **Models & Schemas**
   - [ ] Technology route schemas
   - [ ] Economic simulation schemas
   - [ ] Auth models

#### Frontend
1. **Core Components**
   - [ ] Map components (MapComponent, ProximityMap, EconomicSimulationMap)
   - [ ] Map layers (municipalities, residues, overlays)
   - [ ] Chart components (data visualization)
   - [ ] Dashboard components

2. **Contexts & Hooks**
   - [ ] Additional custom hooks
   - [ ] State management contexts

### Phase 3: UI & Integration (LOWER PRIORITY)

#### Frontend
1. **UI Components**
   - [ ] Buttons, inputs, modals
   - [ ] Layout components
   - [ ] Navigation components

2. **Pages**
   - [ ] Dashboard routes
   - [ ] Map page
   - [ ] Analysis pages

---

## Testing Best Practices

### General Principles

1. **Test Pyramid**
   - 70% Unit tests (fast, isolated)
   - 20% Integration tests (API endpoints, database)
   - 10% E2E tests (critical user flows)

2. **Coverage Goals**
   - Minimum: 70% for all metrics (lines, branches, functions, statements)
   - Focus on business-critical paths first
   - Don't chase 100% coverage - focus on meaningful tests

3. **Test Quality Over Quantity**
   - Test behavior, not implementation
   - Avoid brittle tests that break on refactoring
   - Use meaningful assertions

### Backend Testing (Pytest)

#### Unit Tests
```python
# File: tests/unit/services/test_leontief_calculator.py
import pytest
from app.services.leontief_calculator import LeontiefCalculator

class TestLeontiefCalculator:
    """Test Leontief economic calculations."""

    def test_calculate_multiplier_simple_case(self):
        """Test multiplier calculation with simple 2x2 matrix."""
        calculator = LeontiefCalculator()
        result = calculator.calculate_multiplier(
            technical_coefficients=[[0.2, 0.3], [0.4, 0.1]],
            final_demand=[100, 200]
        )
        assert result.total_output > 0
        assert len(result.sector_outputs) == 2

    def test_calculate_multiplier_invalid_matrix(self):
        """Test error handling for invalid input matrices."""
        calculator = LeontiefCalculator()
        with pytest.raises(ValueError, match="Matrix must be square"):
            calculator.calculate_multiplier(
                technical_coefficients=[[0.2, 0.3]],  # Not square
                final_demand=[100]
            )
```

#### Integration Tests
```python
# File: tests/integration/endpoints/test_economic_simulation.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_economic_simulation(auth_headers):
    """Test creating an economic simulation via API."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/economic-simulation",
            headers=auth_headers,
            json={
                "municipality_ids": [1, 2, 3],
                "scenario": "optimistic",
                "technology_routes": ["biogas", "compost"]
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert "simulation_id" in data
        assert data["status"] == "created"
```

#### Fixtures (conftest.py)
```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(scope="session")
def test_db():
    """Create test database."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)

@pytest.fixture
def db_session(test_db):
    """Create database session for tests."""
    SessionLocal = sessionmaker(bind=test_db)
    session = SessionLocal()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def auth_headers():
    """Generate auth headers for authenticated requests."""
    return {"Authorization": "Bearer test-token"}
```

### Frontend Testing (Jest + React Testing Library)

#### Component Tests
```typescript
// File: src/components/MapComponent/MapComponent.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapComponent } from './MapComponent';

describe('MapComponent', () => {
  it('renders map container', () => {
    render(<MapComponent />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('loads municipalities on mount', async () => {
    render(<MapComponent />);
    await waitFor(() => {
      expect(screen.getByText(/municipalities loaded/i)).toBeInTheDocument();
    });
  });

  it('handles map click events', async () => {
    const onMapClick = jest.fn();
    render(<MapComponent onMapClick={onMapClick} />);

    const map = screen.getByTestId('map-container');
    await userEvent.click(map);

    expect(onMapClick).toHaveBeenCalled();
  });
});
```

#### Hook Tests
```typescript
// File: src/hooks/useMapData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';

describe('useMapData', () => {
  it('fetches map data on mount', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
    // Mock API failure
    global.fetch = jest.fn().mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

#### API Client Tests
```typescript
// File: src/lib/apiClient.test.ts
import { apiClient } from './apiClient';
import { server } from '../mocks/server';
import { rest } from 'msw';

describe('apiClient', () => {
  it('makes GET requests with auth headers', async () => {
    const data = await apiClient.get('/municipalities');

    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  it('handles 401 errors by refreshing token', async () => {
    server.use(
      rest.get('/api/data', (req, res, ctx) => {
        return res(ctx.status(401));
      })
    );

    await expect(apiClient.get('/data')).rejects.toThrow('Unauthorized');
  });

  it('retries failed requests with exponential backoff', async () => {
    let attempts = 0;
    server.use(
      rest.get('/api/flaky', (req, res, ctx) => {
        attempts++;
        if (attempts < 3) {
          return res(ctx.status(500));
        }
        return res(ctx.json({ success: true }));
      })
    );

    const data = await apiClient.get('/flaky');
    expect(attempts).toBe(3);
    expect(data.success).toBe(true);
  });
});
```

---

## Test Organization

### Backend Structure
```
backend/
└── tests/
    ├── conftest.py              # Shared fixtures
    ├── unit/                    # Unit tests
    │   ├── services/
    │   │   ├── test_auth_service.py
    │   │   ├── test_leontief_calculator.py
    │   │   └── test_cache_service.py
    │   └── utils/
    │       └── test_validation.py
    ├── integration/             # Integration tests
    │   ├── endpoints/
    │   │   ├── test_municipalities.py
    │   │   ├── test_economic_simulation.py
    │   │   └── test_geospatial.py
    │   └── database/
    │       └── test_transactions.py
    └── fixtures/               # Test data
        ├── sample_geometries.geojson
        └── sample_economic_data.json
```

### Frontend Structure
```
frontend/
└── src/
    ├── components/
    │   └── MapComponent/
    │       ├── MapComponent.tsx
    │       └── MapComponent.test.tsx    # Co-located with component
    ├── hooks/
    │   ├── useMapData.ts
    │   └── useMapData.test.ts
    ├── lib/
    │   ├── apiClient.ts
    │   └── apiClient.test.ts
    └── __tests__/                       # Integration tests
        ├── pages/
        └── workflows/
```

---

## Running Tests

### Backend

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html --cov-report=term-missing

# Run specific test file
pytest tests/unit/services/test_leontief_calculator.py

# Run tests matching pattern
pytest -k "economic"

# Run with markers
pytest -m "unit"          # Only unit tests
pytest -m "integration"   # Only integration tests
pytest -m "not slow"      # Exclude slow tests

# Verbose output
pytest -v

# Stop on first failure
pytest -x

# Run in parallel (requires pytest-xdist)
pytest -n auto
```

### Frontend

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# CI mode
npm run test:ci

# Run specific test file
npm test -- MapComponent.test.tsx

# Update snapshots
npm test -- -u

# Run tests matching pattern
npm test -- --testNamePattern="renders"
```

---

## Continuous Integration

### CI Pipeline Jobs
1. **Frontend Lint & Build** - ESLint, build check, bundle size
2. **Frontend Tests** - Jest with coverage
3. **Frontend Security** - npm audit
4. **Backend Lint** - Black, isort, Flake8
5. **Backend Tests** - Pytest with coverage ✨ **NEW**
6. **Backend Security** - Safety check

### Coverage Requirements
- Both frontend and backend must maintain **≥70% coverage**
- CI will fail if coverage drops below threshold
- Coverage reports uploaded to Codecov

---

## Mocking Guidelines

### Backend Mocking
```python
# Mock external services
@pytest.fixture
def mock_supabase(mocker):
    """Mock Supabase client."""
    mock = mocker.patch('app.services.supabase_client.get_client')
    mock.return_value.table().select().execute.return_value.data = []
    return mock

# Mock database
@pytest.fixture
def mock_db_session(mocker):
    """Mock database session."""
    return mocker.MagicMock()
```

### Frontend Mocking
```typescript
// Mock API calls (MSW - Mock Service Worker)
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.get('/api/municipalities', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Test City' }]));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock Next.js router (already in jest.setup.js)
// Mock Leaflet (already in jest.setup.js)
// Mock Supabase (already in jest.setup.js)
```

---

## Common Pitfalls to Avoid

1. **Testing Implementation Details**
   - ❌ Testing internal state
   - ✅ Testing public API and behavior

2. **Overmocking**
   - ❌ Mocking everything
   - ✅ Mock only external dependencies

3. **Brittle Tests**
   - ❌ Tests that break on UI changes
   - ✅ Tests using semantic queries (getByRole, getByLabelText)

4. **Slow Tests**
   - ❌ Making real network calls
   - ✅ Using mocks and fixtures

5. **Ignoring Test Failures**
   - ❌ Skipping or commenting out failing tests
   - ✅ Fix or remove broken tests immediately

---

## Resources

### Backend
- [Pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [Python Testing Best Practices](https://docs.python-guide.org/writing/tests/)

### Frontend
- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [MSW (Mock Service Worker)](https://mswjs.io/)

---

## Next Steps

1. ✅ Add backend tests to CI pipeline
2. [ ] Implement Phase 1 tests (API endpoints & critical services)
3. [ ] Implement Phase 2 tests (components & business logic)
4. [ ] Set up E2E testing framework (Playwright/Cypress)
5. [ ] Integrate visual regression testing for UI components
6. [ ] Set up mutation testing for critical paths

---

**Last Updated**: 2025-12-22
**Maintainers**: Development Team
**Status**: In Progress - Phase 1
