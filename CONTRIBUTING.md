# Contributing to PILAR-2b V3

Thank you for your interest in contributing to PILAR-2b! This document provides guidelines and instructions for contributing to the project.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Commit messages and pull requests](#commit-messages-and-pull-requests)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **Git** for version control
- **PostgreSQL** 15+ with PostGIS

### Quick Start

1. **Fork the repository**
   ```bash
   # Fork via GitHub UI, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Pilar-2b.git
   cd Pilar-2b
   ```

2. **Set up development environment**
   ```bash
   # See README.md for detailed setup instructions
   cd cp2b-workspace/NewLook
   ```

3. **Create a branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## 💻 Development Setup

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your configuration
# Set NEXT_PUBLIC_API_URL (default http://localhost:8000)

# Run development server
npm run dev
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Set DATABASE_URL (a PostgreSQL database with PostGIS) and SECRET_KEY

# Run development server
uvicorn app.main:app --reload
```

---

## 🔄 Development Workflow

### 1. Create an Issue (Recommended)

Before starting work, create or comment on an issue to:
- Discuss the proposed changes
- Get feedback from maintainers
- Avoid duplicate work

### 2. Branch Naming Convention

Name branches `<type>/<short-description>`, in English, with the same types as commit messages
(see [Commit messages and pull requests](#commit-messages-and-pull-requests)):

```
feat/map-search-highlight
fix/ibge-code-strings
data/pam-2024-mg
docs/update-readme
perf/tile-simplification
chore/update-dependencies
```

### 3. Make Your Changes

- Write clean, readable code
- Follow coding standards (see below)
- Add tests for new features
- Update documentation as needed

### 4. Test Your Changes

```bash
# Frontend
cd frontend
npm run lint        # Check linting
npm test           # Run tests
npm run build      # Test production build

# Backend
cd backend
black .            # Format code
isort .            # Sort imports
# Run any tests you've added
```

### 5. Commit Your Changes

Follow [Commit messages and pull requests](#commit-messages-and-pull-requests).

```bash
git add path/to/changed/files
git commit -m "feat(dashboard): add municipality filter"
```

### 6. Push and Create Pull Request

```bash
git push origin feat/your-feature-name
```

Then create a Pull Request via GitHub UI.

---

## 📝 Coding Standards

### Frontend (TypeScript/React)

**Code Style**:
- Use TypeScript for all new code
- Use functional components with hooks
- Follow ESLint configuration
- Use Prettier for formatting

**File Organization**:
```
src/
├── components/    # Reusable components
├── app/          # Next.js pages
├── lib/          # Utilities and helpers
├── types/        # TypeScript types
├── hooks/        # Custom hooks
└── services/     # API clients
```

**Naming Conventions**:
- Components: `PascalCase` (e.g., `MunicipalityCard.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useGeospatialData.ts`)
- Utils: `camelCase` (e.g., `formatCurrency.ts`)
- Constants: `UPPER_SNAKE_CASE`

**Example**:
```typescript
// Good
interface MunicipalityProps {
  id: number;
  name: string;
}

export function MunicipalityCard({ id, name }: MunicipalityProps) {
  const [data, setData] = useState<Municipality | null>(null);

  useEffect(() => {
    // Fetch data
  }, [id]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold">{name}</h3>
    </div>
  );
}
```

### Backend (Python/FastAPI)

**Code Style**:
- Follow PEP 8
- Use type hints
- Use Black for formatting (line length: 100)
- Use isort for import sorting

**File Organization**:
```
backend/app/
├── api/          # API routes
├── core/         # Core functionality
├── models/       # Database models
├── schemas/      # Pydantic schemas
├── services/     # Business logic
└── utils/        # Utilities
```

**Naming Conventions**:
- Functions/variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private: `_leading_underscore`

**Example**:
```python
# Good
from typing import List, Optional
from pydantic import BaseModel

class Municipality(BaseModel):
    id: int
    name: str
    total_biogas_m3_year: float

async def get_municipality_by_id(
    municipality_id: int,
    db: Session = Depends(get_db)
) -> Optional[Municipality]:
    """
    Retrieve municipality by ID.

    Args:
        municipality_id: The municipality ID
        db: Database session

    Returns:
        Municipality or None if not found
    """
    return db.query(Municipality).filter(
        Municipality.id == municipality_id
    ).first()
```

---

## ✅ Testing Requirements

### Frontend Testing

**Required for new features**:
- Unit tests for components
- Unit tests for hooks
- Unit tests for utilities

**Example**:
```typescript
// MunicipalityCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MunicipalityCard } from './MunicipalityCard';

describe('MunicipalityCard', () => {
  it('renders municipality name', () => {
    render(<MunicipalityCard id={1} name="São Paulo" />);
    expect(screen.getByText('São Paulo')).toBeInTheDocument();
  });
});
```

### Backend Testing

**Required for new features**:
- API endpoint tests
- Service layer tests
- Database query tests

**Example**:
```python
# test_municipalities.py
import pytest
from fastapi.testclient import TestClient

def test_get_municipality(client: TestClient):
    response = client.get("/api/v1/municipalities/1")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "name" in data
```

---

## 🔀 Pull Request Process

### PR Checklist

Before submitting, ensure:

- [ ] Code follows our coding standards
- [ ] All tests pass (`npm test` / `pytest`)
- [ ] New code has tests
- [ ] Documentation is updated
- [ ] Commit messages follow guidelines
- [ ] PR description is clear and detailed
- [ ] No console.log or debug statements
- [ ] No sensitive data in code

### PR Template

Opening a PR on GitHub fills in [`.github/pull_request_template.md`](.github/pull_request_template.md):
Summary, Spatial impact, Data / parameters touched, Tests, Screenshots and `Fixes #`. Delete the sections
that do not apply.

### Review Process

1. **CI Pipeline**: Automated checks must pass, including the commit message check
2. **Code Review**: At least one approval required
3. **Testing**: Verify changes work as expected
4. **Merge**: Squash and merge to main

---

## 📝 Commit messages and pull requests

We follow [Conventional Commits](https://www.conventionalcommits.org/), in English and in the imperative mood
(complete the sentence "If applied, this commit will…").

### Format

```
<type>(<scope>): <description>

<body (optional): why, not how>

<footer (optional): Fixes #123, Refs #45, BREAKING CHANGE: …>
```

- Subject: at most 72 characters (50 is better), lowercase after the colon, no trailing period.
- Add `!` before the colon when a change breaks compatibility (API response, table schema, URL, CRS of a
  published layer): `feat(api)!: return municipality codes as strings`.
- No AI attribution lines (`Co-Authored-By: Claude`, "Generated with Claude Code") in commits, PRs or releases.

### Types

The same list is used in the Data_Biogas repository.

- `feat`: new feature, layer, page or analysis
- `fix`: bug fix, wrong value, broken geometry or rendering
- `data`: new or corrected data values or parameters, with no change in the method
- `docs`: documentation only
- `refactor`: restructuring with no change in behaviour or output
- `perf`: performance (queries, tiles, rendering, memory)
- `test`: tests or fixtures
- `build`: build system, Docker, dependency versions
- `ci`: GitHub Actions and other CI
- `chore`: maintenance that fits none of the above
- `revert`: reverts a previous commit

### Scopes

One scope per commit, the most specific that applies. The list lives in
[`commitlint.config.js`](commitlint.config.js); a scope outside it only warns, so add new modules there in
the same PR.

- Layers and services: `frontend`, `backend`, `api`, `db`, `migrations`, `ingest`, `analysis`
- Product areas: `map`, `explore`, `profile`, `calculator`, `comparison`, `dashboard`, `mandate`, `sources`,
  `params`, `bivariate`, `i18n`, `a11y`, `auth`
- Geospatial: `crs`, `tiles`, `topology`, `geoserver`, `ogc`
- Tests, build and operations: `e2e`, `deps`, `dependabot`, `docker`, `deploy`, `ci`, `hooks`, `release`
- Repository and docs: `repo`, `readme`, `contributing`, `changelog`, `maintenance`

### Examples

```bash
# Good
feat(map): highlight the searched municipality
feat(crs): serve municipal boundaries in EPSG:4674 and EPSG:3857
fix(topology): keep shared borders aligned after simplification
perf(tiles): drop vertices below 10 m at low zoom levels
perf(profile): batch neighbour comparison to avoid timeouts
data(params): correct methane yield for vinasse
build(deps): bump next to 16.4.6

# Bad
update
fix bug
Fixed the map.
```

### Branches

`<type>/<short-description>` in English, with the types above: `feat/map-search-highlight`,
`fix/ibge-code-strings`, `data/pam-2024-mg`.

### Pull requests

- **Title:** the same format as a commit subject. PRs are merged with "Squash and merge" only, so the title
  becomes the commit on `main`. CI checks the title and every commit in the PR.
- **Body:** link the issue (`Fixes #123`) and fill in **Spatial impact** whenever the PR touches CRS,
  geometries, tiles or map rendering:
  - CRS (unchanged, or reprojected from what to what);
  - bounding box or extent (before and after);
  - null or empty geometries (how they are handled, counts before and after);
  - rendering performance (payload size, vertex count, timings);
  - before/after screenshots for any UI or map change.

### Local hook

[`.githooks/commit-msg`](.githooks/commit-msg) applies the same subject rules and rejects AI attribution
lines before the commit exists. Enable it once per clone:

```bash
git config core.hooksPath .githooks
```

## 🤝 Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help others learn and grow

### Getting Help

- **Documentation**: Check README.md and docs/
- **Issues**: Search existing issues first
- **Discussions**: Use GitHub Discussions for questions

---

## 📚 Additional Resources

- [Project README](./README.md)
- [Documentation index](./cp2b-workspace/NewLook/docs/DOCUMENTATION_INDEX.md)
- [API reference](./cp2b-workspace/NewLook/docs/api/API_DOCUMENTATION.md) (OpenAPI docs at `/docs` on a running backend)
- [Local Docker setup](./cp2b-workspace/NewLook/docs/LOCAL_DOCKER_SETUP.md)
- [Production deployment on the UNICAMP VM](./cp2b-workspace/NewLook/docs/VM_UPDATE_GUIDE.md)

---

## 🙏 Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

**Questions?** Feel free to open an issue or start a discussion.

---

**Last Updated**: December 7, 2025
