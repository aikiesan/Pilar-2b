'use client'

/**
 * Scientific References & Biokinetics Database Page
 * PILAR-2b V3 - DBFZ-inspired scientific knowledge platform
 * Features: Kinetic curves, chemical data, references, comparison, co-digestion
 *
 * Protected by Vercel Edge Middleware that checks for Supabase auth cookies.
 * Client-side fetching uses useEffect to load fresh data on each visit.
 */
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import Breadcrumb from '@/components/ui/Breadcrumb'
import {
  RefreshCw,
  Download,
  Search,
  Filter,
  BookOpen,
  FlaskConical,
  TestTube2,
  GitCompare,
  Beaker,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertCircle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar
} from 'recharts'

// Types
import {
  KineticData,
  ChemicalData,
  ScientificReference,
  ScientificViewMode,
  SectorType,
  KineticClassification,
  ParameterType,
  generateKineticCurve,
  getCNStatus,
  calculateMixRatio,
  KINETIC_COLORS,
  SECTOR_LABELS,
  PARAMETER_LABELS,
  formatBMPError
} from '@/types/scientific'

import ParameterWithReference from '@/components/scientific/ParameterWithReference';

// API
import {
  getKineticsData,
  getChemicalData,
  getReferences,
  getResidueList,
  getScientificSummary,
  getRealResiduos,
  getRealSectorSummary,
  getRealResiduoWithReferences,
  getRealConversionFactors,
  getAllReferences
} from '@/services/scientificApi'

import type { SectorCode } from '@/services/residuosApi'
import { logger } from '@/lib/logger'

// ── Citation export helpers ───────────────────────────────────────────────────

function toAPA(ref: ScientificReference): string {
  const authors = ref.authors || 'Autor desconhecido'
  const year = ref.year || 'n.d.'
  const title = ref.title || 'Sem título'
  const journal = ref.journal ? `*${ref.journal}*` : ''
  const doi = ref.doi ? ` https://doi.org/${ref.doi}` : ''
  return `${authors} (${year}). ${title}. ${journal}${doi}`.trim()
}

function toBibTeX(ref: ScientificReference): string {
  const key = `${(ref.authors || 'unknown').split(',')[0].trim().replace(/\s+/g, '').toLowerCase()}${ref.year}`
  const lines = [
    `@article{${key},`,
    `  author  = {${ref.authors || ''}},`,
    `  title   = {${ref.title || ''}},`,
    `  year    = {${ref.year || ''}},`,
  ]
  if (ref.journal) lines.push(`  journal = {${ref.journal}},`)
  if (ref.doi) lines.push(`  doi     = {${ref.doi}},`)
  lines.push('}')
  return lines.join('\n')
}

// ── Sector label helper ───────────────────────────────────────────────────────

// Helper function to get sector label from either old SectorType or new SectorCode
function getSectorLabel(sector: SectorType | SectorCode | string): string {
  const sectorMap: Record<string, string> = {
    // Old SectorType format
    'agricultural': 'Agrícola',
    'livestock': 'Pecuária',
    'industrial': 'Industrial',
    'urban': 'Urbano',
    // New SectorCode format (from backend)
    'AG_AGRICULTURA': 'Agrícola',
    'PC_PECUARIA': 'Pecuária',
    'IN_INDUSTRIAL': 'Industrial',
    'UR_URBANO': 'Urbano'
  }
  return sectorMap[sector] || sector
}

export default function ScientificDatabasePage() {
  const router = useRouter()
  const t = useTranslations('pages')
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  // View mode state - extended with residuosDb
  const [viewMode, setViewMode] = useState<ScientificViewMode | 'residuosDb'>('kinetics')

  // Data states
  const [kineticsData, setKineticsData] = useState<KineticData[]>([])
  const [chemicalData, setChemicalData] = useState<ChemicalData[]>([])
  const [references, setReferences] = useState<ScientificReference[]>([])
  const [residueList, setResidueList] = useState<string[]>([])
  const [summary, setSummary] = useState<{
    total_references: number
    total_residues: number
    total_parameters: number
    fde_validated_pct: number
    sector_breakdown: Record<string, number>
  } | null>(null)

  // Real residuos data from Panorama_CP2B
  const [realResiduos, setRealResiduos] = useState<any[]>([])
  const [sectorSummary, setSectorSummary] = useState<any[]>([])
  const [selectedResiduoId, setSelectedResiduoId] = useState<number | null>(null)
  const [residuoDetails, setResiduoDetails] = useState<any | null>(null)
  const [activeSector, setActiveSector] = useState<string>('AG_AGRICULTURA')
  const [conversionFactors, setConversionFactors] = useState<any[]>([])
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean>(true)

  // Selection states
  const [selectedResidues, setSelectedResidues] = useState<string[]>([])
  const [selectedKineticClass, setSelectedKineticClass] = useState<KineticClassification | ''>('')
  const [selectedSectors, setSelectedSectors] = useState<SectorType[]>([])

  // Reference filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedResidue, setSelectedResidue] = useState<string>('')
  const [yearRange, setYearRange] = useState<[number, number]>([2010, new Date().getFullYear()])
  const [peerReviewedOnly, setPeerReviewedOnly] = useState(false)

  // Loading states
  const [loading, setLoading] = useState(true)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Citation copy feedback: key = `${refId}-apa` or `${refId}-bib`
  const [copiedCitation, setCopiedCitation] = useState<string | null>(null)

  const copyCitation = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCitation(key)
      setTimeout(() => setCopiedCitation(null), 2000)
    })
  }, [])

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Use Promise.allSettled instead of Promise.all to handle failures gracefully
      const [kineticsRes, chemicalRes, refsRes, residues, summaryData] = await Promise.allSettled([
        getKineticsData(),
        getChemicalData(),
        getReferences(),
        getResidueList(),
        getScientificSummary()
      ])

      // Extract successful results or use defaults
      if (kineticsRes.status === 'fulfilled') {
        setKineticsData(kineticsRes.value.data)
      } else {
        logger.warn('Failed to load kinetics data:', kineticsRes.reason)
      }

      if (chemicalRes.status === 'fulfilled') {
        setChemicalData(chemicalRes.value.data)
      } else {
        logger.warn('Failed to load chemical data:', chemicalRes.reason)
      }

      if (refsRes.status === 'fulfilled') {
        setReferences(refsRes.value.data)
      } else {
        logger.warn('Failed to load references:', refsRes.reason)
      }

      if (residues.status === 'fulfilled') {
        setResidueList(residues.value)
      } else {
        logger.warn('Failed to load residue list:', residues.reason)
      }

      if (summaryData.status === 'fulfilled') {
        setSummary(summaryData.value)
      } else {
        logger.warn('Failed to load summary data:', summaryData.reason)
      }

      // Also fetch real residuos data from Panorama_CP2B
      // Only fetch ONCE (not twice) to avoid duplicates
      // Use Promise.allSettled here too for resilience
      const [sectorSum, factors, allResiduosRes] = await Promise.allSettled([
        getRealSectorSummary(),
        getRealConversionFactors(),
        getRealResiduos() // Fetch all residues without filter
      ])

      // Set all residues so Chemical tab has data on first load
      // Add null safety checks for API responses
      // Deduplicate by ID to prevent duplicate keys
      let uniqueResiduos: any[] = []
      let isMockData = false

      if (allResiduosRes.status === 'fulfilled') {
        uniqueResiduos = allResiduosRes.value?.residuos || []
        isMockData = !!allResiduosRes.value?._isMockData
      } else {
        logger.warn('Failed to load residuos:', allResiduosRes.reason)
      }

      const deduplicatedResiduos = uniqueResiduos.filter((residuo: any, index: number, self: any[]) =>
        index === self.findIndex((r: any) => r.id === residuo.id)
      )

      // CRITICAL FIX: Only set state ONCE after all processing is done
      setRealResiduos(deduplicatedResiduos)

      if (sectorSum.status === 'fulfilled') {
        // Deduplicate sector summary by codigo to prevent duplicate cards
        const rawSummary = sectorSum.value?.summary || []
        // Use Map for more robust deduplication
        const uniqueSectorsMap = new Map()
        rawSummary.forEach((sector: any) => {
          if (sector.codigo && !uniqueSectorsMap.has(sector.codigo)) {
            uniqueSectorsMap.set(sector.codigo, sector)
          }
        })
        const deduplicatedSummary = Array.from(uniqueSectorsMap.values())
        setSectorSummary(deduplicatedSummary)
      } else {
        logger.warn('Failed to load sector summary:', sectorSum.reason)
      }

      if (factors.status === 'fulfilled') {
        setConversionFactors(factors.value?.factors || [])
        // Log warning if conversion factors failed to load
        if (factors.value?.error) {
          logger.warn('Could not load conversion factors:', factors.value.error)
        }
      } else {
        logger.warn('Failed to load conversion factors:', factors.reason)
      }

      // Check if backend is available (not using mock data)
      setIsBackendAvailable(!isMockData)

      // Extract references from real residuos data
      // This allows the Referencias Científicas tab to show real data instead of mock data
      // Only extract if we have valid residuo data
      if (allResiduosRes.status === 'fulfilled' && allResiduosRes.value?.residuos && Array.isArray(allResiduosRes.value.residuos) && allResiduosRes.value.residuos.length > 0) {
        const extractedReferences: ScientificReference[] = []
        const seenRefIds = new Set<string>()

        allResiduosRes.value.residuos.forEach((residuo: any) => {
          if (residuo.references && Array.isArray(residuo.references)) {
            residuo.references.forEach((ref: any) => {
              const refKey = `${ref.id || ref.title}-${ref.parameter_type}`
              if (!seenRefIds.has(refKey)) {
                seenRefIds.add(refKey)
                extractedReferences.push({
                  id: ref.id || `ref-${extractedReferences.length}`,
                  authors: ref.authors || 'Autor desconhecido',
                  title: ref.title || ref.citation || 'Sem título',
                  year: ref.year || new Date().getFullYear(),
                  doi: ref.doi || undefined,
                  peer_reviewed: ref.is_primary || false,
                  sector: residuo.sector_codigo as any, // Use real backend sector code
                  residues_studied: [residuo.nome],
                  parameters_measured: [ref.parameter_type || 'unknown'],
                  reference_type: 'journal',
                  journal: ref.journal,
                  abstract: ref.abstract,
                  keywords: [],
                  key_findings: []
                })
              }
            })
          }
        })

        // Merge extracted references with mock references (prioritize real data)
        if (extractedReferences.length > 0) {
          setReferences(extractedReferences)
        }
      }

      // Update summary with real data counts
      if (sectorSum.status === 'fulfilled' && sectorSum.value?.summary && Array.isArray(sectorSum.value.summary)) {
        const totalRefs = sectorSum.value.summary.reduce((acc: number, s: any) => acc + (s.total_references || 0), 0)
        const totalResidues = sectorSum.value.summary.reduce((acc: number, s: any) => acc + (s.num_residuos || 0), 0)
        setSummary(prev => prev ? {
          ...prev,
          total_references: totalRefs || prev.total_references,
          total_residues: totalResidues || prev.total_residues
        } : prev)
      }
    } catch (err) {
      logger.error('Error fetching data:', err)
      setError('Erro ao carregar dados científicos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch residuo details when selected
  const fetchResiduoDetails = useCallback(async (residuoId: number) => {
    try {
      const result = await getRealResiduoWithReferences(residuoId)
      if (result?.residuo) {
        setResiduoDetails(result.residuo)
      }
    } catch (err) {
      logger.error('Error fetching residuo details:', err)
    }
  }, [])

  // Fetch residuos by sector - DISABLED for now to prevent duplicates
  // Users can see all residuos grouped by sector in the list below
  const fetchResiduosBySector = useCallback(async (sectorCode: string) => {
    // Just update active sector for visual feedback
    setActiveSector(sectorCode)
    // Don't fetch again - we already have all residuos loaded
  }, [])

  // Calculate co-digestion
  // Generate kinetic curve data for selected residues
  const kineticCurveData = useMemo(() => {
    // Debug: log available kinetics data
    if (kineticsData.length === 0) {
      logger.warn('No kinetics data available')
      return []
    }

    const selected = selectedResidues.length > 0
      ? kineticsData.filter(k => selectedResidues.includes(k.residue_name))
      : kineticsData.slice(0, 4)  // Default to first 4

    // Debug: check if filtering worked
    if (selectedResidues.length > 0 && selected.length === 0) {
      logger.warn('No kinetics data matched selected residues:', selectedResidues)
      logger.debug('Available kinetics residue names:', kineticsData.map(k => k.residue_name))
    }

    if (selected.length === 0) return []

    // Generate time points 0-30 days
    const timePoints = Array.from({ length: 31 }, (_, i) => i)

    return timePoints.map(t => {
      const point: any = { time: t }
      selected.forEach(kinetic => {
        try {
          const curve = generateKineticCurve(kinetic, 30)
          const yieldValue = curve[t]?.yield || 0
          point[kinetic.residue_name] = yieldValue

          // Debug: log zero yields
          if (t === 0 || t === 30) {
            logger.debug(`${kinetic.residue_name} at t=${t}: ${yieldValue.toFixed(2)}`)
          }
        } catch (error) {
          logger.error(`Error generating curve for ${kinetic.residue_name}:`, error)
          point[kinetic.residue_name] = 0
        }
      })
      return point
    })
  }, [kineticsData, selectedResidues])

  // Get real residue names for selector (use realResiduos instead of mock data)
  const realResidueNames = useMemo(() => {
    return realResiduos.map(r => r.nome).sort()
  }, [realResiduos])

  // Bar chart data for chemical comparison (updated to use realResiduos and remove FDE/pH)
  const barChartData = useMemo(() => {
    const selected = selectedResidues.length > 0
      ? realResiduos.filter(r => selectedResidues.includes(r.nome))
      : []

    if (selected.length === 0) return []

    // Map each residue to a data point with BMP, VS, C:N, CH4
    // Use null for zero/missing values so they don't display as 0 in charts
    return selected.map(residue => ({
      residue: residue.nome,
      BMP: (residue.bmp_medio && residue.bmp_medio > 0) ? residue.bmp_medio : null,
      VS: (residue.vs_medio && residue.vs_medio > 0) ? residue.vs_medio : null,
      'C:N': (residue.chemical_cn_ratio && residue.chemical_cn_ratio > 0) ? residue.chemical_cn_ratio : null,
      'CH4': (residue.chemical_ch4_content && residue.chemical_ch4_content > 0) ? residue.chemical_ch4_content : null
    }))
  }, [realResiduos, selectedResidues])

  // Filtered references
  const filteredReferences = useMemo(() => {
    let filtered = [...references]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(ref =>
        ref.title.toLowerCase().includes(query) ||
        ref.authors.toLowerCase().includes(query) ||
        ref.keywords?.some(k => k.toLowerCase().includes(query))
      )
    }

    if (selectedResidue) {
      filtered = filtered.filter(ref =>
        ref.residues_studied.some(r => r === selectedResidue)
      )
    }

    if (selectedSectors.length > 0) {
      filtered = filtered.filter(ref => selectedSectors.includes(ref.sector))
    }

    if (peerReviewedOnly) {
      filtered = filtered.filter(ref => ref.peer_reviewed)
    }

    filtered = filtered.filter(ref =>
      ref.year >= yearRange[0] && ref.year <= yearRange[1]
    )

    return filtered
  }, [references, searchQuery, selectedResidue, selectedSectors, peerReviewedOnly, yearRange])

  // Initial data fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData()
    }
  }, [isAuthenticated, fetchAllData])

  // Auto-refresh data every 30 seconds to catch database updates
  useEffect(() => {
    if (!isAuthenticated) return

    const intervalId = setInterval(() => {
      logger.debug('Auto-refreshing scientific database data...')
      fetchAllData()
    }, 30000) // 30 seconds

    return () => clearInterval(intervalId)
  }, [isAuthenticated, fetchAllData])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp2b-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Residue colors for charts
  const residueColors = [
    '#1E5128', '#4E9F3D', '#3B82F6', '#F59E0B',
    '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Breadcrumb items={[
        { label: t('back_to_dashboard'), href: '/dashboard' },
        { label: t('scientific_database.title') },
      ]} />
      {/* Page Title */}
      <div className="bg-gradient-to-r from-cp2b-primary via-cp2b-secondary to-green-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">{t('scientific_database.title')}</h1>
              <p className="text-lg text-white/90 max-w-2xl">{t('scientific_database.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={fetchAllData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('scientific_database.refresh')}
              </button>
              <button
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
              >
                <Download className="h-4 w-4" />
                {t('scientific_database.download')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg mb-6 shadow-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Erro ao carregar dados</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        {summary && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-600">Referências</div>
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.total_references}</div>
              <div className="text-xs text-gray-500 mt-1">artigos científicos</div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-600">Resíduos</div>
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FlaskConical className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.total_residues}</div>
              <div className="text-xs text-gray-500 mt-1">caracterizados</div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-600">Parâmetros</div>
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TestTube2 className="h-5 w-5 text-amber-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.total_parameters}</div>
              <div className="text-xs text-gray-500 mt-1">BMP, TS, VS, C:N, pH...</div>
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-600">Validações FDE</div>
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Beaker className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{summary.fde_validated_pct.toFixed(0)}%</div>
              <div className="text-xs text-gray-500 mt-1">fator de disponibilidade</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'residuosDb', label: 'Base de Resíduos', icon: FlaskConical },
              { id: 'kinetics', label: 'Cinética de Degradação', icon: TestTube2 },
              { id: 'chemical', label: 'Caracterização Química', icon: FlaskConical },
              { id: 'references', label: 'Referências Científicas', icon: BookOpen },
              { id: 'comparison', label: 'Comparação Interativa', icon: GitCompare }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ScientificViewMode)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  viewMode === tab.id
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Residuos Database Tab - Simple list by sector */}
          {viewMode === 'residuosDb' && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Resíduos Caracterizados
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {realResiduos.length} resíduos em {sectorSummary.length} setores econômicos
                    </p>
                  </div>
                </div>
              </div>

              {/* Residue List by Sector */}
              <div className="divide-y divide-gray-100">
                {sectorSummary.map((sector: any) => {
                  const sectorResidues = realResiduos.filter((r: any) => r.sector_codigo === sector.codigo)
                  if (sectorResidues.length === 0) return null

                  return (
                    <div key={sector.codigo} className="p-6">
                      {/* Sector Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{sector.emoji}</span>
                        <div>
                          <h4 className="font-semibold text-gray-900">{sector.nome}</h4>
                          <p className="text-xs text-gray-500">{sectorResidues.length} resíduos</p>
                        </div>
                      </div>

                      {/* Residue List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {sectorResidues.map((residue: any) => (
                          <button
                            key={residue.id}
                            onClick={() => {
                              setViewMode('chemical')
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className="text-left p-3 bg-gray-50 hover:bg-green-50 rounded-lg border border-gray-200 hover:border-green-300 transition-all group"
                          >
                            <div className="font-medium text-gray-900 group-hover:text-green-700 text-sm leading-tight">
                              {residue.icon && <span className="mr-1.5">{residue.icon}</span>}
                              {residue.nome}
                            </div>
                            {residue.bmp_medio && (
                              <div className="text-xs text-gray-500 mt-1 font-mono">
                                BMP: {residue.bmp_medio.toFixed(0)} L/kg SV
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                  Clique em um resíduo para ver a caracterização química completa
                </p>
              </div>
            </div>
          )}

          {/* Kinetics Tab */}
          {viewMode === 'kinetics' && (
            <>
              {/* Residue Selector */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Filter className="h-5 w-5 text-green-600" />
                  Selecionar Resíduos para Comparação
                </h3>
                <div className="flex flex-wrap gap-2">
                  {residueList.map((residue, idx) => (
                    <button
                      key={residue}
                      onClick={() => {
                        if (selectedResidues.includes(residue)) {
                          setSelectedResidues(selectedResidues.filter(r => r !== residue))
                        } else if (selectedResidues.length < 6) {
                          setSelectedResidues([...selectedResidues, residue])
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedResidues.includes(residue)
                          ? 'text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor: selectedResidues.includes(residue)
                          ? residueColors[selectedResidues.indexOf(residue) % residueColors.length]
                          : undefined
                      }}
                    >
                      {residue}
                    </button>
                  ))}
                </div>
                {selectedResidues.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Selecione até 6 resíduos para comparar (mostrando 4 padrão)
                  </p>
                )}
              </div>

              {/* Kinetic Curve Chart */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Curvas de Produção de Metano
                </h3>
                {kineticsData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center p-6">
                      <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-2">Dados cinéticos não disponíveis</p>
                      <p className="text-sm text-gray-500">Verifique se há dados de cinética na base de dados</p>
                    </div>
                  </div>
                ) : kineticCurveData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center p-6">
                      <Info className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-2">Selecione resíduos para ver as curvas</p>
                      <p className="text-sm text-gray-500">Use o seletor acima para escolher resíduos</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={kineticCurveData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="time"
                          label={{ value: 'Tempo (dias)', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                          label={{ value: 'Producao (L CH4/kg SV)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                          formatter={(value) => [typeof value === 'number' ? `${value.toFixed(1)} L CH4/kg SV` : value, '']}
                        />
                        <Legend />
                        {(selectedResidues.length > 0 ? selectedResidues : kineticsData.slice(0, 4).map(k => k.residue_name)).map((residue, idx) => (
                          <Line
                            key={residue}
                            type="monotone"
                            dataKey={residue}
                            stroke={residueColors[idx % residueColors.length]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Kinetic Parameters Table */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Parâmetros Cinéticos (Modelo de Três Frações)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Resíduo</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Cinética</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">f_slow</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">f_med</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">f_fast</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">FQ</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">BMP Exp</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">BMP Sim</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700">Erro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {kineticsData.map((kinetic, idx) => (
                        <tr key={`kinetic-${kinetic.residue_id}-${idx}`} className="hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">
                            {kinetic.residue_name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className="px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: KINETIC_COLORS[kinetic.classification] }}
                            >
                              {kinetic.classification}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-gray-600">
                            {kinetic.f_slow.toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-gray-600">
                            {kinetic.f_med.toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-gray-600">
                            {kinetic.f_fast.toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold text-green-600">
                            {kinetic.fq.toFixed(3)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-900">
                            {kinetic.bmp_experimental}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-900">
                            {kinetic.bmp_simulated}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-xs font-medium ${
                              Math.abs(kinetic.bmp_simulated - kinetic.bmp_experimental) / kinetic.bmp_experimental < 0.05
                                ? 'text-green-600'
                                : 'text-amber-600'
                            }`}>
                              {formatBMPError(kinetic.bmp_experimental, kinetic.bmp_simulated)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Model Info Box */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Modelo de Três Frações (DBFZ)
                  </h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li><strong>k_slow</strong> = 0.05 d⁻¹ (fração lenta)</li>
                    <li><strong>k_med</strong> = 0.5 d⁻¹ (fração média)</li>
                    <li><strong>k_fast</strong> = 5.0 d⁻¹ (fração rápida)</li>
                  </ul>
                  <p className="text-sm text-blue-700 mt-2">
                    <strong>FQ</strong> (Fermentability Quotient) = f_slow + f_med + f_fast representa a fração digerível dos Sólidos Voláteis.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Chemical Data Tab */}
          {viewMode === 'chemical' && (
            <>
              {/* Backend Connection Warning - using mock data */}
              {!isBackendAvailable && realResiduos.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">
                        Exibindo Dados de Referência
                      </h4>
                      <p className="text-sm text-blue-800">
                        Conectando ao backend... Enquanto isso, dados de referência científica estão sendo exibidos.
                        Para acessar dados completos da plataforma, verifique seu email ou contate o administrador.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chemical Data Cards */}
              {realResiduos.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {realResiduos.map((residue) => {
                  const cnStatus = getCNStatus(residue.chemical_cn_ratio);
                  return (
                    <div
                      key={residue.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-green-300 transition-all duration-200"
                    >
                      {/* Card Header with sector badge */}
                      <div className="px-5 pt-5 pb-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="text-lg font-bold text-gray-900 leading-tight flex-1">{residue.nome}</h4>
                          <span className="flex-shrink-0 px-2.5 py-1 bg-white text-gray-600 text-xs font-semibold rounded-lg border border-gray-200 shadow-sm">
                            {residue.sector_nome}
                          </span>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 space-y-4">
                        {/* BMP - Main parameter with reference */}
                        <ParameterWithReference
                          residueId={residue.id}
                          parameterType="bmp"
                          label="BMP"
                          value={residue.bmp_medio?.toFixed(1) || 'N/A'}
                          unit="L/kg SV"
                          min={residue.bmp_min}
                          max={residue.bmp_max}
                          nStudies={residue.bmp_n_studies || residue.reference_count}
                        />

                        {/* Composition Grid */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="font-bold text-blue-900 text-sm">
                              {residue.ts_medio?.toFixed(1) || 'N/A'}%
                            </div>
                            {(residue.ts_min || residue.ts_max) && (
                              <div className="text-blue-500 text-[10px]">
                                ({residue.ts_min?.toFixed(0)}-{residue.ts_max?.toFixed(0)})
                              </div>
                            )}
                            <div className="text-blue-600 font-medium mt-0.5">ST</div>
                          </div>
                          <div className="text-center p-2.5 bg-green-50 rounded-lg border border-green-100">
                            <div className="font-bold text-green-900 text-sm">
                              {residue.vs_medio?.toFixed(1) || 'N/A'}%
                            </div>
                            {(residue.vs_min || residue.vs_max) && (
                              <div className="text-green-500 text-[10px]">
                                ({residue.vs_min?.toFixed(0)}-{residue.vs_max?.toFixed(0)})
                              </div>
                            )}
                            <div className="text-green-600 font-medium mt-0.5">SV</div>
                          </div>
                          <div className="text-center p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="font-bold text-sm" style={{ color: cnStatus.color }}>
                              {residue.chemical_cn_ratio?.toFixed(1) || 'N/A'}:1
                            </div>
                            <div className="text-amber-600 font-medium mt-0.5">C:N</div>
                          </div>
                        </div>

                        {/* Additional Parameters */}
                        <div className="space-y-2">
                          {residue.ph && (
                            <ParameterWithReference
                              residueId={residue.id}
                              parameterType="ph"
                              label="pH"
                              value={residue.ph}
                            />
                          )}

                          {residue.chemical_ch4_content && (
                            <ParameterWithReference
                              residueId={residue.id}
                              parameterType="ch4_content"
                              label="CH₄"
                              value={`${residue.chemical_ch4_content}%`}
                            />
                          )}
                        </div>
                      </div>

                      {/* Card Footer - References Section */}
                      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-blue-100">
                        {/* Primary DOI Link */}
                        {residue.primary_doi && (
                          <a
                            href={`https://doi.org/${residue.primary_doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 mb-3 text-sm text-blue-700 hover:text-blue-900 font-medium group"
                          >
                            <ExternalLink className="h-4 w-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate">DOI: {residue.primary_doi}</span>
                          </a>
                        )}

                        {/* References Button */}
                        <button
                          onClick={() => {
                            setViewMode('references')
                            setSelectedResidue(residue.nome)
                            setSearchQuery('')
                            setSelectedSectors([])
                            setPeerReviewedOnly(false)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-white hover:bg-blue-50 rounded-lg transition-all text-left border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow group"
                        >
                          <div className="flex items-center gap-2.5">
                            <BookOpen className="w-4 h-4 text-blue-600 group-hover:text-blue-700" />
                            <span className="text-sm font-semibold text-gray-800 group-hover:text-blue-900">
                              {residue.reference_count > 0
                                ? `${residue.reference_count} Referência${residue.reference_count > 1 ? 's' : ''}`
                                : 'Ver Referências'
                              }
                            </span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                        </button>

                        {/* Main Reference Citation */}
                        {residue.main_reference && (
                          <p className="mt-2 text-xs text-gray-500 line-clamp-2" title={residue.main_reference}>
                            {residue.main_reference}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </>
          )}

          {/* References Tab */}
          {viewMode === 'references' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Sidebar */}
              <div className="lg:col-span-1 space-y-4">
                {/* Statistics Summary */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-5 border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Base de Conhecimento
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Total Referências</span>
                      <span className="font-bold text-green-900">{references.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Resíduos</span>
                      <span className="font-bold text-green-900">{realResiduos.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Peer-Reviewed</span>
                      <span className="font-bold text-green-900">
                        {references.filter(r => r.peer_reviewed).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100">
                  <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros
                  </h4>

                  {/* Search */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-600 block mb-1.5">Buscar</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Título, autor, keyword..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent pr-8"
                      />
                      <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Residue Filter */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Filtrar por Resíduo</label>
                    <select
                      value={selectedResidue}
                      onChange={(e) => setSelectedResidue(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    >
                      <option value="">Todos os resíduos</option>
                      {realResidueNames.map(residue => (
                        <option key={residue} value={residue}>
                          {residue}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sector Filter */}
                  <div className="mb-4">
                    <label className="text-xs font-medium text-gray-600 block mb-1.5">Setor Econômico</label>
                    <div className="space-y-2">
                      {([
                        { code: 'agricultural' as SectorType, label: '🌾 Agrícola', color: 'green' },
                        { code: 'livestock' as SectorType, label: '🐄 Pecuária', color: 'amber' },
                        { code: 'industrial' as SectorType, label: '🏭 Industrial', color: 'blue' },
                        { code: 'urban' as SectorType, label: '🏙️ Urbano', color: 'gray' }
                      ]).map(sector => {
                        const count = references.filter(r => r.sector === sector.code).length
                        return (
                          <label key={sector.code} className="flex items-center justify-between gap-2 text-sm group">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedSectors.includes(sector.code)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSectors([...selectedSectors, sector.code])
                                  } else {
                                    setSelectedSectors(selectedSectors.filter(s => s !== sector.code))
                                  }
                                }}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="group-hover:text-gray-900">{sector.label}</span>
                            </div>
                            <span className="text-xs text-gray-400">{count}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  {/* Peer Reviewed */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={peerReviewedOnly}
                        onChange={(e) => setPeerReviewedOnly(e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      Apenas peer-reviewed
                    </label>
                  </div>

                  {/* Clear Filters */}
                  {(searchQuery || selectedResidue || selectedSectors.length > 0 || peerReviewedOnly) && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedResidue('')
                        setSelectedSectors([])
                        setPeerReviewedOnly(false)
                      }}
                      className="w-full py-2 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Limpar filtros
                    </button>
                  )}

                  {/* Results count */}
                  <div className="pt-3 mt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {filteredReferences.length} resultado{filteredReferences.length !== 1 ? 's' : ''}
                      </span>
                      {filteredReferences.length < references.length && (
                        <span className="text-xs text-gray-400">
                          de {references.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* References List */}
              <div className="lg:col-span-3 space-y-4">
                {filteredReferences.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-md p-12 border border-gray-100 text-center">
                    <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Nenhuma referência encontrada
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Tente ajustar seus filtros de busca
                    </p>
                    {(searchQuery || selectedResidue || selectedSectors.length > 0 || peerReviewedOnly) && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedResidue('')
                          setSelectedSectors([])
                          setPeerReviewedOnly(false)
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </div>
                ) : (
                  filteredReferences.map((ref) => (
                    <div
                      key={`ref-${ref.id}-${ref.title.slice(0, 20).replace(/\s/g, '-')}`}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:border-green-200 transition-all duration-200"
                    >
                      <div className="p-6">
                        {/* Header with title and badges */}
                        <div className="flex items-start gap-4 mb-4">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight hover:text-green-700 transition-colors">
                              {ref.title}
                            </h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                              <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="font-medium">{ref.authors}</span>
                              <span className="text-gray-400">•</span>
                              <span className="font-semibold text-green-700">{ref.year}</span>
                            </div>
                            {ref.journal && (
                              <p className="text-sm text-gray-500 italic">
                                {ref.journal}
                              </p>
                            )}
                          </div>
                          {ref.peer_reviewed && (
                            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200 whitespace-nowrap shadow-sm">
                              ✓ Peer-Reviewed
                            </span>
                          )}
                        </div>

                        {/* Tags and badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="px-3 py-1 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 rounded-lg text-xs font-semibold border border-gray-200">
                            {getSectorLabel(ref.sector)}
                          </span>
                          {ref.residues_studied.slice(0, 3).map((residue, idx) => (
                            <span
                              key={`${ref.id}-residue-${idx}`}
                              className="px-3 py-1 bg-gradient-to-r from-green-50 to-green-100 text-green-800 rounded-lg text-xs font-medium border border-green-200"
                            >
                              {residue}
                            </span>
                          ))}
                          {ref.residues_studied.length > 3 && (
                            <span className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-medium border border-gray-200">
                              +{ref.residues_studied.length - 3} mais
                            </span>
                          )}
                          {ref.parameters_measured.slice(0, 2).map((param, idx) => (
                            <span
                              key={`${ref.id}-param-${idx}`}
                              className="px-3 py-1 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 rounded-lg text-xs font-medium border border-amber-200"
                            >
                              {PARAMETER_LABELS[param] || param}
                            </span>
                          ))}
                        </div>

                        {/* DOI and URL information */}
                        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm">
                          {ref.doi && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="font-semibold text-gray-500">DOI:</span>
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {ref.doi}
                              </span>
                            </div>
                          )}
                          {ref.url && (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 font-semibold rounded-lg transition-all shadow-sm hover:shadow-md"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Acessar o Artigo
                            </a>
                          )}
                        </div>

                        {/* Citation export buttons */}
                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide mr-1">
                            Citar:
                          </span>
                          <button
                            onClick={() => copyCitation(toAPA(ref), `${ref.id}-apa`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              copiedCitation === `${ref.id}-apa`
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {copiedCitation === `${ref.id}-apa` ? '✓ Copiado!' : 'APA'}
                          </button>
                          <button
                            onClick={() => copyCitation(toBibTeX(ref), `${ref.id}-bib`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                              copiedCitation === `${ref.id}-bib`
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {copiedCitation === `${ref.id}-bib` ? '✓ Copiado!' : 'BibTeX'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Comparison Tab */}
          {viewMode === 'comparison' && (
            <>
              {/* Residue Selector for Comparison */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Selecione resíduos para comparar (máx. 5)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {realResidueNames.map((residue, idx) => (
                    <button
                      key={residue}
                      onClick={() => {
                        if (selectedResidues.includes(residue)) {
                          setSelectedResidues(selectedResidues.filter(r => r !== residue))
                        } else if (selectedResidues.length < 5) {
                          setSelectedResidues([...selectedResidues, residue])
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedResidues.includes(residue)
                          ? 'text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      style={{
                        backgroundColor: selectedResidues.includes(residue)
                          ? residueColors[selectedResidues.indexOf(residue) % residueColors.length]
                          : undefined
                      }}
                    >
                      {residue}
                    </button>
                  ))}
                </div>
              </div>

              {selectedResidues.length >= 2 && (
                <>
                  {/* Radar Chart */}
                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Comparação Multi-Parâmetros
                    </h3>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="residue" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="BMP" fill="#1E5128" name="BMP (L/kg SV)" />
                          <Bar dataKey="VS" fill="#4E9F3D" name="VS (% ST)" />
                          <Bar dataKey="C:N" fill="#3B82F6" name="C:N" />
                          <Bar dataKey="CH4" fill="#F59E0B" name="CH4 (%)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Comparison Table */}
                  <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                      Tabela Comparativa
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Parâmetro</th>
                            {selectedResidues.map((residue, idx) => (
                              <th
                                key={residue}
                                className="text-center py-3 px-4 font-semibold"
                                style={{ color: residueColors[idx % residueColors.length] }}
                              >
                                {residue}
                              </th>
                            ))}
                            <th className="text-center py-3 px-4 font-semibold text-gray-700">Melhor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {[
                            { key: 'bmp_medio', label: 'BMP (L/kg SV)', higher: true },
                            { key: 'vs_medio', label: 'SV (% ST)', higher: true },
                            { key: 'chemical_cn_ratio', label: 'C:N', optimal: [20, 30] },
                            { key: 'chemical_ch4_content', label: 'Teor CH4 (%)', higher: true }
                          ].map(param => {
                            const values = selectedResidues.map(r => {
                              const data = realResiduos.find(res => res.nome === r)
                              const value = data ? (data as any)[param.key] : null
                              // Return null for missing or zero values (null means no data)
                              return (value !== null && value !== undefined && value !== 0) ? value : null
                            })

                            // Only find best if we have at least one valid value
                            const hasValidValues = values.some(v => v !== null)
                            let bestIdx = 0
                            if (hasValidValues) {
                              if (param.optimal) {
                                // Find closest to optimal range, ignoring null values
                                const target = (param.optimal[0] + param.optimal[1]) / 2
                                bestIdx = values.reduce((best, val, idx) => {
                                  if (val === null) return best
                                  if (values[best] === null) return idx
                                  return Math.abs(val - target) < Math.abs(values[best]! - target) ? idx : best
                                }, 0)
                              } else if (param.higher) {
                                // Find highest value, ignoring null values
                                bestIdx = values.reduce((best, val, idx) => {
                                  if (val === null) return best
                                  if (values[best] === null) return idx
                                  return val > values[best]! ? idx : best
                                }, 0)
                              }
                            }

                            return (
                              <tr key={param.key}>
                                <td className="py-3 px-4 font-medium text-gray-900">{param.label}</td>
                                {values.map((value, idx) => (
                                  <td
                                    key={idx}
                                    className={`py-3 px-4 text-center ${
                                      value !== null && hasValidValues && idx === bestIdx
                                        ? 'bg-green-50 font-semibold'
                                        : ''
                                    }`}
                                  >
                                    {value !== null ? (
                                      <>
                                        <span className="font-mono">{value.toFixed(1)}</span>
                                        {hasValidValues && idx === bestIdx && (
                                          <Trophy className="inline ml-1 h-3 w-3 text-yellow-500" />
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">Sem dados</span>
                                    )}
                                  </td>
                                ))}
                                <td className="py-3 px-4 text-center">
                                  {hasValidValues && values[bestIdx] !== null ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                      {selectedResidues[bestIdx]}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">N/A</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {selectedResidues.length < 2 && (
                <div className="bg-white rounded-xl shadow-md p-8 border border-gray-100 text-center">
                  <GitCompare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900 mb-1">Selecione pelo menos 2 resíduos</p>
                  <p className="text-sm text-gray-500">Para gerar a comparação interativa</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}