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
- [Commit Message Guidelines](#commit-message-guidelines)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.10+ (for backend)
- **Git** for version control
- **PostgreSQL** 15+ with PostGIS (or Supabase account)

### Quick Start

1. **Fork the repository**
   ```bash
   # Fork via GitHub UI, then clone your fork
   git clone https://github.com/YOUR_USERNAME/NewLook.git
   cd NewLook
   ```

2. **Set up development environment**
   ```bash
   # See README.md for detailed setup instructions
   cd cp2b-workspace/NewLook
   ```

3. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
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
# Add: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SUPABASE_URL, etc.

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
# Add: DATABASE_URL, SUPABASE_URL, SECRET_KEY, etc.

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

Use descriptive branch names following this pattern:

```
<type>/<short-description>

Examples:
- feature/add-municipality-filter
- fix/api-timeout-error
- docs/update-readme
- refactor/optimize-queries
- chore/update-dependencies
```

**Types**:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `chore/` - Maintenance tasks
- `test/` - Adding tests

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

Follow our [commit message guidelines](#commit-message-guidelines).

```bash
git add .
git commit -m "feat(frontend): add municipality filter to dashboard"
```

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
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

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Describe how you tested your changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have added tests
- [ ] All tests pass
- [ ] Documentation updated
```

### Review Process

1. **CI Pipeline**: Automated checks must pass
2. **Code Review**: At least one approval required
3. **Testing**: Verify changes work as expected
4. **Merge**: Squash and merge to main

---

## 📝 Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body (optional)>

<footer (optional)>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

### Scopes

- `frontend`: Frontend changes
- `backend`: Backend changes
- `ci`: CI/CD changes
- `docs`: Documentation
- `deps`: Dependencies

### Examples

```bash
# Good commit messages
feat(frontend): add municipality filter to dashboard
fix(backend): resolve API timeout on proximity analysis
docs(readme): update installation instructions
chore(deps): upgrade Next.js to 15.5.7

# Bad commit messages
update
fix bug
changes
WIP
```

---

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
- [Architecture Documentation](./STRUCTURE.md)
- [API Documentation](https://newlook-production.up.railway.app/docs)
- [Deployment Guide](./docs/deployment/DEPLOYMENT_GUIDE.md)
- [Improvement Roadmap](./docs/planning/IMPROVEMENT_ROADMAP.md)

---

## 🙏 Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

**Questions?** Feel free to open an issue or start a discussion.

---

**Last Updated**: December 7, 2025
