'use client'

/**
 * Scientific database: the residues' chemical characterization, their
 * degradation kinetics (DBFZ three-fraction model) and the literature behind
 * them, all read from the backend (services/scientificApi).
 *
 * `?view=<tab>` opens a tab directly: the advanced analysis links to
 * `?view=references`.
 */
import { Suspense, useEffect, useState, type ComponentType } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AlertCircle, Beaker, BookOpen, FlaskConical, GitCompare, RefreshCw, TestTube2 } from 'lucide-react'
import { useRouter } from '@/navigation'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { useAuth } from '@/contexts/AuthContext'
import { useFormat } from '@/hooks/useFormat'
import { useScientificDatabase } from '@/hooks/useScientificDatabase'
import ResidueListView from '@/components/scientific/ResidueListView'
import KineticsView from '@/components/scientific/KineticsView'
import ChemicalView from '@/components/scientific/ChemicalView'
import ReferencesView from '@/components/scientific/ReferencesView'
import ComparisonView from '@/components/scientific/ComparisonView'
import { MISSING_VALUE } from '@/lib/format'
import { hasCompleteFde, isScientificView, type ResidueRecord, type ScientificViewMode } from '@/types/scientific'

const TABS: Array<{ id: ScientificViewMode; icon: ComponentType<{ className?: string }> }> = [
  { id: 'residues', icon: FlaskConical },
  { id: 'kinetics', icon: TestTube2 },
  { id: 'chemical', icon: Beaker },
  { id: 'references', icon: BookOpen },
  { id: 'comparison', icon: GitCompare },
]

const DEFAULT_VIEW: ScientificViewMode = 'kinetics'

function Spinner({ label }: { label: string }) {
  return (
    <div className="py-16 flex flex-col items-center justify-center text-gray-600" role="status">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp2b-primary" aria-hidden="true" />
      <p className="mt-4">{label}</p>
    </div>
  )
}

function ScientificDatabase() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pages')
  const ts = useTranslations('pages.scientific_database')
  const tCommon = useTranslations('common')
  const format = useFormat()
  const { user, loading: authLoading, isAuthenticated } = useAuth()
  const db = useScientificDatabase(isAuthenticated)

  const requested = searchParams.get('view')
  const [view, setView] = useState<ScientificViewMode>(isScientificView(requested) ? requested : DEFAULT_VIEW)
  // Cross-tab links: a residue picked in the list, the residue whose references to show.
  const [focusId, setFocusId] = useState<number | null>(null)
  const [referenceResidue, setReferenceResidue] = useState('')

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login')
  }, [authLoading, isAuthenticated, router])

  const open = (next: ScientificViewMode) => {
    setView(next)
    // Keep the address shareable without a navigation.
    const url = new URL(window.location.href)
    url.searchParams.set('view', next)
    window.history.replaceState(null, '', url)
  }
  const openResidue = (residue: ResidueRecord) => {
    setFocusId(residue.id)
    open('chemical')
  }
  const openReferences = (residue: ResidueRecord) => {
    setReferenceResidue(residue.nome)
    open('references')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (authLoading) return <Spinner label={tCommon('states.loading')} />
  if (!user) return null

  const withFde = db.residues.filter(hasCompleteFde).length
  const kpis = [
    { label: ts('kpi.references'), value: format.number(db.references.length), hint: ts('kpi.references_hint'), icon: BookOpen, tone: 'bg-blue-100 text-blue-600' },
    { label: ts('kpi.residues'), value: format.number(db.residues.length), hint: ts('kpi.residues_hint'), icon: FlaskConical, tone: 'bg-green-100 text-green-600' },
    { label: ts('kpi.kinetics'), value: format.number(db.kinetics.length), hint: ts('kpi.kinetics_hint'), icon: TestTube2, tone: 'bg-amber-100 text-amber-600' },
    {
      label: ts('kpi.fde'),
      value: db.residues.length ? format.percent((withFde / db.residues.length) * 100, { decimals: 0 }) : MISSING_VALUE,
      hint: ts('kpi.fde_hint'),
      icon: Beaker,
      tone: 'bg-orange-100 text-orange-600',
    },
  ]
  const empty = db.residues.length === 0 && db.references.length === 0 && db.kinetics.length === 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Breadcrumb items={[{ label: t('back_to_dashboard'), href: '/dashboard' }, { label: ts('title') }]} />

      <div className="bg-gradient-to-r from-cp2b-primary via-cp2b-secondary to-green-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">{ts('title')}</h1>
              <p className="text-lg text-white/90 max-w-2xl">{ts('subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={db.reload}
              disabled={db.loading}
              className="self-start lg:self-auto flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
            >
              <RefreshCw className={`h-4 w-4 ${db.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              {ts('refresh')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {db.failed && !db.loading && (
          <div role="alert" className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <h2 className="font-semibold mb-1">{ts('error.title')}</h2>
              <p className="text-sm">{empty ? ts('error.body_empty') : ts('error.body_partial')}</p>
            </div>
            <button
              type="button"
              onClick={db.reload}
              className="px-3 py-1.5 text-sm font-medium bg-white border border-red-300 rounded-lg hover:bg-red-100"
            >
              {tCommon('actions.retry')}
            </button>
          </div>
        )}

        {!empty && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(({ label, value, hint, icon: Icon, tone }) => (
              <div key={label} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md p-5 border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-gray-600">{label}</div>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{hint}</div>
              </div>
            ))}
          </div>
        )}

        <nav aria-label={ts('tabs.label')} className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <div className="flex flex-wrap gap-2">
            {TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={view === id}
                onClick={() => open(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  view === id ? 'bg-green-700 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {/* Icon-only on phones, but never without a name. */}
                <span className="sr-only sm:not-sr-only">{ts(`tabs.${id}`)}</span>
              </button>
            ))}
          </div>
        </nav>

        <section className="space-y-6" aria-label={ts(`tabs.${view}`)}>
          {db.loading && empty ? (
            <Spinner label={ts('loading')} />
          ) : view === 'residues' ? (
            <ResidueListView residues={db.residues} sectors={db.sectors} onSelect={openResidue} />
          ) : view === 'kinetics' ? (
            <KineticsView kinetics={db.kinetics} />
          ) : view === 'chemical' ? (
            <ChemicalView residues={db.residues} focusId={focusId} onShowReferences={openReferences} />
          ) : view === 'references' ? (
            <ReferencesView
              references={db.references}
              residues={db.residues}
              residue={referenceResidue}
              onResidueChange={setReferenceResidue}
            />
          ) : (
            <ComparisonView residues={db.residues} />
          )}
        </section>
      </div>
    </div>
  )
}

export default function ScientificDatabasePage() {
  return (
    <Suspense fallback={null}>
      <ScientificDatabase />
    </Suspense>
  )
}
