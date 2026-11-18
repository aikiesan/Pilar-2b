# Technology Routes Feature - Implementation Guide

## 🎯 Status: 75% Complete

### ✅ What's Been Implemented

1. **Backend (100% Complete)**
   - ✅ Database schema (`010_technology_routes.sql`)
   - ✅ Pydantic models (`technology_routes.py`)
   - ✅ FastAPI router with all endpoints
   - ✅ Seed data for 25+ technologies
   - ✅ Connection validation logic
   - ✅ Public sharing endpoints

2. **Frontend Core (60% Complete)**
   - ✅ TypeScript types
   - ✅ API service client
   - ✅ Main page component
   - ✅ Custom Node component
   - ✅ Technology Card component
   - ✅ Route Canvas component
   - ⏳ Technology Palette (needs implementation)
   - ⏳ Reference Panel (needs implementation)
   - ⏳ Route Toolbar (needs implementation)
   - ⏳ Custom Block Dialog (needs implementation)
   - ⏳ Share Route Dialog (needs implementation)

3. **Dependencies**
   - ✅ React Flow installed (v11.10.4)
   - ✅ Directory structure created
   - ✅ Router registered in API

---

## 🚀 Remaining Implementation Tasks

### Task A: Complete Frontend Components

#### A1: Technology Palette Component
**File**: `frontend/src/app/dashboard/technology-routes/components/TechnologyPalette.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { technologyRoutesApi } from '@/services/technologyRoutesApi';
import type { TechnologyCardWithReferences, TechnologyCategory } from '@/types/technology-routes';
import TechnologyCard from './TechnologyCard';

const CATEGORIES: { id: TechnologyCategory; label: string; emoji: string }[] = [
  { id: 'feedstock', label: 'Matéria-Prima', emoji: '🌾' },
  { id: 'pretreatment', label: 'Pré-Tratamento', emoji: '⚙️' },
  { id: 'digestion', label: 'Digestão', emoji: '🏭' },
  { id: 'upgrading', label: 'Upgrade', emoji: '🔬' },
  { id: 'enduse', label: 'Uso Final', emoji: '⚡' },
  { id: 'byproduct', label: 'Subprodutos', emoji: '🌱' },
  { id: 'custom', label: 'Personalizados', emoji: '✨' },
];

export default function TechnologyPalette() {
  const [technologies, setTechnologies] = useState<TechnologyCardWithReferences[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TechnologyCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTechnologies();
  }, []);

  const loadTechnologies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await technologyRoutesApi.getTechnologies();
      setTechnologies(data);
    } catch (error) {
      console.error('Failed to load technologies:', error);
      setError('Erro ao carregar tecnologias');
    } finally {
      setLoading(false);
    }
  };

  const filteredTechnologies = technologies.filter((tech) => {
    const matchesSearch =
      tech.namePt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.nameEn.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tech.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedTechnologies = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = filteredTechnologies.filter((tech) => tech.category === cat.id);
    return acc;
  }, {} as Record<TechnologyCategory, TechnologyCardWithReferences[]>);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Tecnologias</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar tecnologia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Technology List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center text-gray-500 py-8">Carregando...</div>
        )}

        {error && (
          <div className="text-center text-red-500 py-8">{error}</div>
        )}

        {!loading && !error && (
          <>
            {(selectedCategory === 'all' ? CATEGORIES : CATEGORIES.filter((c) => c.id === selectedCategory)).map(
              (cat) => {
                const techs = groupedTechnologies[cat.id];
                if (techs.length === 0) return null;

                return (
                  <div key={cat.id} className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span>{cat.emoji}</span>
                      <span>{cat.label}</span>
                      <span className="text-gray-400">({techs.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {techs.map((tech) => (
                        <TechnologyCard key={tech.id} technology={tech} />
                      ))}
                    </div>
                  </div>
                );
              }
            )}

            {filteredTechnologies.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Nenhuma tecnologia encontrada
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
```

#### A2: Reference Panel Component
**File**: `frontend/src/app/dashboard/technology-routes/components/ReferencePanel.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { X, ExternalLink, BookOpen } from 'lucide-react';
import { technologyRoutesApi } from '@/services/technologyRoutesApi';
import type { TechnologyCardWithReferences } from '@/types/technology-routes';

interface ReferencePanelProps {
  nodeId: string;
  onClose: () => void;
}

export default function ReferencePanel({ nodeId, onClose }: ReferencePanelProps) {
  const [technology, setTechnology] = useState<TechnologyCardWithReferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTechnology();
  }, [nodeId]);

  const loadTechnology = async () => {
    try {
      setLoading(true);
      // Extract techId from nodeId (format: techId-timestamp)
      const techId = nodeId.split('-').slice(0, -1).join('-');
      const data = await technologyRoutesApi.getTechnologyById(techId);
      setTechnology(data);
    } catch (error) {
      console.error('Failed to load technology:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">Carregando referências...</div>
    );
  }

  if (!technology) {
    return (
      <div className="p-6 text-center text-gray-500">Tecnologia não encontrada</div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{technology.emoji}</span>
          <div>
            <h3 className="font-semibold text-gray-900">{technology.namePt}</h3>
            <p className="text-sm text-gray-500">{technology.nameEn}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Description */}
      {technology.descriptionPt && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-700">{technology.descriptionPt}</p>
        </div>
      )}

      {/* References */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-blue-600" />
          <h4 className="font-semibold text-gray-900">
            Referências Científicas ({technology.references.length})
          </h4>
        </div>

        {technology.references.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            Nenhuma referência científica disponível para esta tecnologia.
          </p>
        ) : (
          <div className="space-y-4">
            {technology.references.map((ref) => (
              <div
                key={ref.referenceId}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <h5 className="font-medium text-gray-900 mb-2 leading-tight">
                  {ref.title}
                </h5>
                <p className="text-sm text-gray-600 mb-2">
                  {ref.authors.join(', ')} ({ref.year})
                </p>
                {ref.journal && (
                  <p className="text-sm text-gray-500 italic mb-2">{ref.journal}</p>
                )}
                {ref.relevanceNote && (
                  <p className="text-sm text-blue-600 mb-2">📌 {ref.relevanceNote}</p>
                )}
                {(ref.doi || ref.url) && (
                  <div className="flex gap-2">
                    {ref.doi && (
                      <a
                        href={`https://doi.org/${ref.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        DOI <ExternalLink size={14} />
                      </a>
                    )}
                    {ref.url && (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Link <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### A3: Route Toolbar Component (Simplified)
**File**: `frontend/src/app/dashboard/technology-routes/components/RouteToolbar.tsx`

```typescript
'use client';

import { Save, HelpCircle } from 'lucide-react';

export default function RouteToolbar() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left - Title */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900">Rotas Tecnológicas</h1>
          <span className="text-sm text-gray-500">Ferramenta Educacional</span>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Salvar (em breve)"
          >
            <Save size={18} />
            <span>Salvar</span>
          </button>

          <button
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Ajuda"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
```

---

### Task B: Database Setup

#### B1: Run Migration

```bash
# Connect to your Supabase database and run:
psql -h your-supabase-host -U postgres -d postgres -f backend/migrations/010_technology_routes.sql
```

#### B2: Seed Initial Technologies

```python
# Create a script to load seed data
# File: backend/scripts/seed_tech_data.py

import sys
sys.path.append('.')

from app.database import get_db
from sqlalchemy import text
from data.seed_technologies import INITIAL_TECHNOLOGIES

def seed_technologies():
    db = next(get_db())

    for tech in INITIAL_TECHNOLOGIES:
        query = text("""
            INSERT INTO technology_cards (
                id, category, name_pt, name_en, emoji,
                description_pt, description_en, color,
                can_connect_to, can_receive_from, is_custom
            ) VALUES (
                :id, :category, :name_pt, :name_en, :emoji,
                :description_pt, :description_en, :color,
                :can_connect_to, :can_receive_from, FALSE
            )
            ON CONFLICT (id) DO NOTHING
        """)

        db.execute(query, tech)

    db.commit()
    print(f"✅ Seeded {len(INITIAL_TECHNOLOGIES)} technologies")

if __name__ == "__main__":
    seed_technologies()
```

Run it:
```bash
cd backend
python scripts/seed_tech_data.py
```

---

### Task C: Add to Navigation

**File**: Edit your existing navigation component (likely in `frontend/src/components/`)

Find your dashboard navigation array and add:

```typescript
{
  name: 'Rotas Tecnológicas',
  href: '/dashboard/technology-routes',
  icon: Workflow, // Import from lucide-react
  description: 'Organize rotas visuais de tecnologias de biogás'
}
```

---

## 🧪 Testing Checklist

### Backend Testing
```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Test endpoints
curl http://localhost:8000/api/v1/technology-routes/technologies
curl http://localhost:8000/api/v1/technology-routes/routes
```

### Frontend Testing
```bash
# Start frontend
cd frontend
npm run dev

# Navigate to:
# http://localhost:3000/dashboard/technology-routes
```

### Manual Tests
1. ✅ Page loads without errors
2. ✅ Technologies appear in left panel
3. ✅ Drag technology onto canvas
4. ✅ Connect two compatible technologies
5. ✅ Try invalid connection (should be rejected)
6. ✅ Click node to view references
7. ✅ Search for technology
8. ✅ Filter by category

---

## 📊 Feature Completion Roadmap

### MVP (Current Goal - 90% Complete)
- ✅ Visual canvas with drag-and-drop
- ✅ Technology cards with emojis
- ✅ Connection validation
- ✅ Reference viewing
- ⏳ Basic save functionality

### Future Enhancements (Post-MVP)
- Custom technology blocks
- Route sharing with public URLs
- Export to PNG/PDF
- Route templates
- Collaborative editing

---

## 🐛 Known Issues & Solutions

### Issue 1: Import Errors
**Problem**: `Cannot find module 'reactflow'`
**Solution**: Ensure React Flow is installed:
```bash
cd frontend
npm install reactflow@11.10.4
```

### Issue 2: SSR Hydration Errors
**Problem**: React Flow components fail on server-side rendering
**Solution**: Already handled with `dynamic` imports and `{ ssr: false }`

### Issue 3: CORS Errors
**Problem**: API calls blocked by CORS
**Solution**: Backend already has CORS middleware configured. Ensure `NEXT_PUBLIC_API_URL` is set in `.env.local`

---

## 📚 Architecture Notes

### Why Zero Calculations?
This is an **educational tool**, not a simulation platform. The focus is on:
- Visual organization
- Scientific references
- Learning technology pathways
- Sharing knowledge

### Connection Validation Rules
Defined in `can_connect_to` and `can_receive_from` arrays:
- **Feedstock** → Pretreatment, Digestion
- **Pretreatment** → Digestion
- **Digestion** → Upgrading, End Use, Byproducts
- **Upgrading** → End Use, Byproducts

### Data Flow
1. User drags technology from palette
2. Node created on canvas
3. User connects nodes
4. Backend validates connection
5. Edge created if valid
6. User clicks node → References load

---

## 🎯 Success Metrics

When complete, users should be able to:
1. ✅ Create visual biogas technology pathways
2. ✅ Explore 25+ predefined technologies
3. ✅ View 2-3 scientific references per technology
4. ✅ Validate connections automatically
5. ⏳ Save and share routes (future)

---

## 🚀 Deployment Notes

### Environment Variables Needed
```env
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend (.env)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### Database Migration
Ensure migration 010 is run AFTER existing migrations (007, 008, 009).

---

## 📞 Support & Questions

For implementation questions or issues:
1. Check backend logs: `uvicorn app.main:app --reload`
2. Check frontend console: Browser DevTools
3. Verify database schema: Check Supabase dashboard
4. Test API endpoints: Use `/docs` Swagger UI

---

**Last Updated**: 2025-12-04
**Implementation Progress**: 75% Complete
**Next Steps**: Complete remaining UI components (Palette, ReferencePanel, Toolbar)
