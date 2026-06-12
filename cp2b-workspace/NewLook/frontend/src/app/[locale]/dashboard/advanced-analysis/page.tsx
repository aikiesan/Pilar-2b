'use client'

/**
 * Dashboard Advanced Analysis Page for PILAR-2b V3
 * Enhanced with DBFZ-inspired features: correction factors, cascade, Sankey, scenarios
 * Based on FDE (Fator de Disponibilidade Efetiva) methodology
 */
import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from '@/navigation'
import { useTranslations } from 'next-intl'
import Breadcrumb from '@/components/ui/Breadcrumb'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Table2,
  ChevronDown,
  Info,
  MapPin,
  GitBranch,
  Layers,
  BookOpen,
  FileText,
  Wheat,
  Beef,
  Building2,
  Factory
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'

// Core components (eagerly loaded)
import SimpleResidueSelector, { ResidueCategory } from '@/components/analysis/SimpleResidueSelector'
import TopMunicipalitiesMiniCard from '@/components/analysis/TopMunicipalitiesMiniCard'

// Lazy load heavy chart components (reduce initial bundle size)
const TopMunicipalitiesChart = dynamic(() => import('@/components/analysis/charts/TopMunicipalitiesChart'), { ssr: false })
const DistributionHistogram = dynamic(() => import('@/components/analysis/charts/DistributionHistogram'), { ssr: false })
const RegionalPieChart = dynamic(() => import('@/components/analysis/charts/RegionalPieChart'), { ssr: false })
const CategoryComparisonChart = dynamic(() => import('@/components/analysis/charts/CategoryComparisonChart'), { ssr: false })
const PotentialCascadeChart = dynamic(() => import('@/components/analysis/charts/PotentialCascadeChart'), { ssr: false })
const BiomassFlowSankey = dynamic(() => import('@/components/analysis/charts/BiomassFlowSankey'), { ssr: false })

// Lazy load analysis panels (shown conditionally)
const FactorRangeSliders = dynamic(() => import('@/components/analysis/FactorRangeSliders'), { ssr: false })
const ScenarioComparator = dynamic(() => import('@/components/analysis/ScenarioComparator'), { ssr: false })
const MethodologyPanel = dynamic(() => import('@/components/analysis/MethodologyPanel'), { ssr: false })
const PerResidueFactorEditor = dynamic(() => import('@/components/analysis/PerResidueFactorEditor'), { ssr: false })
const ScenarioSelector = dynamic(() => import('@/components/analysis/ScenarioSelector'), { ssr: false })
const ReferencesModal = dynamic(() => import('@/components/analysis/ReferencesModal'), { ssr: false })

// API
import {
  getAnalysisByResidue,
  getStatisticsByCategory,
  getStatisticsByRegion,
  getStatisticsByStream,
  getDistribution,
  Municipality,
  StatisticsByCategoryResponse,
  RegionData,
  HistogramBin,
  DistributionStatistics,
  ApiCategory
} from '@/services/analysisApi'

// Types
import {
  CorrectionFactors,
  DEFAULT_FACTORS,
  calculateFDE,
  Scenario,
  AnalysisViewMode,
  ScenarioType,
  ResidueFactorOverrides,
  RESIDUE_SCENARIOS,
  applyScenarioMultiplier,
  calculateWeightedFDE
} from '@/types/analysis'

// Data
import { getResidueByCode, DETAILED_RESIDUES } from '@/data/residueFactors'
import { logger } from '@/lib/logger'
import type { ResidueStream } from '@/components/analysis/charts/BiomassFlowSankey'

const RESIDUE_PALETTE = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
  '#F97316', '#06B6D4', '#A78BFA', '#FB923C',
]

// Client-side mirror of the backend FRONTEND_CODE_TO_STREAM mapping
const CODE_TO_STREAM: Record<string, string | null> = {
  AG_CANA_BAGACO: 'sugarcane', AG_CANA_PALHA: 'sugarcane',
  AG_CANA_TORTA_FILTRO: 'sugarcane', AG_CANA_VINHACA: 'sugarcane',
  AG_MILHO_PALHA: 'corn', AG_SOJA_PALHA: 'soybean',
  AG_CITROS_BAGACO: 'citrus', AG_CITROS_CASCAS: 'citrus', AG_CITROS_POLPA: 'citrus',
  AG_CAFE_POLPA: 'coffee', AG_CAFE_CASCA: 'coffee', AG_CAFE_MUCILAGEM: 'coffee',
  PEC_DEJETOS_LIQUIDOS_SUINO: 'swine', PEC_ESTERCO_BOVINO: 'cattle', PEC_CAMA_AVIARIO: 'poultry',
  URB_LODO_PRIMARIO: 'rsu_organic', URB_LODO_SECUNDARIO: 'rsu_organic', URB_FORSU_SEPARADA: 'rsu_organic',
  IND_CASCA_EUCALIPTO: 'forestry',
  IND_BAGACO_MALTE: null, IND_TRUB_CERVEJA: null, IND_SORO_LATICINIOS: null,
  IND_RESIDUO_ABATEDOURO: null, IND_VISCERAS_NAO_COMESTIVEIS: null,
  IND_RESIDUO_PROCESSAMENTO_VEGETAL: null,
}

/**
 * Computes RPR-adjusted theoretical biogas for a set of residue codes.
 * - Codes WITH rpr: mass-based formula → crop_tons * rpr * bmp * 1000 (m³/yr)
 * - Codes WITHOUT rpr (e.g. livestock): use DB biogas total directly from streamBiogas,
 *   because residue_tons_yr has inconsistent units for those streams.
 */
function computeRPRAdjustedBiogas(
  codes: string[],
  streamTons: Record<string, number>,
  streamBiogas: Record<string, number>
): number {
  const byStream = new Map<string, string[]>()
  for (const code of codes) {
    const stream = CODE_TO_STREAM[code]
    if (!stream) continue
    if (!byStream.has(stream)) byStream.set(stream, [])
    byStream.get(stream)!.push(code)
  }

  let total = 0
  byStream.forEach((codesInStream, stream) => {
    for (const code of codesInStream) {
      const residue = getResidueByCode(code)
      if (!residue) continue
      if (residue.rpr !== undefined) {
        // Crop sub-residue: mass-based RPR formula
        const cropTons = streamTons[stream] ?? 0
        total += cropTons * residue.rpr * residue.bmp * 1000
      } else {
        // Livestock / unique-stream: residue_tons_yr has inconsistent units, use DB biogas directly
        total += streamBiogas[stream] ?? 0
      }
    }
  })
  return total
}

export default function AdvancedAnalysisPage() {
  const router = useRouter()
  const t = useTranslations('pages')
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  const toApiCategory = (category: ResidueCategory): ApiCategory | undefined => {
    return category as ApiCategory;
  }

  // State for filters
  const [selectedCategory, setSelectedCategory] = useState<ResidueCategory>('agricultural')
  const [selectedResidueCodes, setSelectedResidueCodes] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'biogas' | 'population'>('biogas')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // View mode - enhanced with new tabs
  const [viewMode, setViewMode] = useState<AnalysisViewMode>('cascade')

  // Scenario system state
  const [currentScenario, setCurrentScenario] = useState<ScenarioType>('baseline')
  const [residueFactorOverrides, setResidueFactorOverrides] = useState<ResidueFactorOverrides>({})

  // Legacy correction factors state (for backward compatibility)
  const [factors, setFactors] = useState<CorrectionFactors>(DEFAULT_FACTORS)

  // Methodology and References panel state
  const [showMethodology, setShowMethodology] = useState(false)
  const [showReferences, setShowReferences] = useState(false)

  // State for data
  const [topMunicipalities, setTopMunicipalities] = useState<Municipality[]>([])
  const [streamTotal, setStreamTotal] = useState<number | null>(null)
  const [streamTons, setStreamTons] = useState<Record<string, number>>({})
  const [streamBiogas, setStreamBiogas] = useState<Record<string, number>>({})
  const [categoryStats, setCategoryStats] = useState<StatisticsByCategoryResponse | null>(null)
  const [regionData, setRegionData] = useState<RegionData[]>([])
  const [histogramData, setHistogramData] = useState<HistogramBin[]>([])
  const [distributionStats, setDistributionStats] = useState<DistributionStatistics | null>(null)

  // Loading states
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingRegion, setLoadingRegion] = useState(true)
  const [loadingDistribution, setLoadingDistribution] = useState(true)

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Calculate TOTAL theoretical potential (all residues in category)
  const totalTheoreticalPotential = useMemo(() => {
    if (!categoryStats) return 0
    // Handle industrial category (not in API yet)
    const apiCategory = toApiCategory(selectedCategory)
    if (!apiCategory) return 0
    return categoryStats.categories[apiCategory]?.total || 0
  }, [categoryStats, selectedCategory])

  // Calculate FILTERED theoretical potential (only selected residues)
  // Use RPR-adjusted calculation when stream_tons is available (avoids double-counting shared streams).
  // Falls back to raw streamTotal or municipality sum when crop tonnage data is unavailable.
  const filteredTheoreticalPotential = useMemo(() => {
    if (selectedResidueCodes.length > 0 && (Object.keys(streamTons).length > 0 || Object.keys(streamBiogas).length > 0)) {
      const rprTotal = computeRPRAdjustedBiogas(selectedResidueCodes, streamTons, streamBiogas)
      if (rprTotal > 0) return rprTotal
    }
    // Fallback: raw stream biogas total (pre-RPR, for livestock / single-code streams)
    if (streamTotal !== null) return streamTotal
    if (!topMunicipalities || topMunicipalities.length === 0) return 0
    return topMunicipalities.reduce((sum, mun) => sum + (mun.biogas_m3_year || 0), 0)
  }, [selectedResidueCodes, streamTons, streamBiogas, streamTotal, topMunicipalities])

  // Use filtered if residues selected, otherwise total
  const theoreticalPotential = useMemo(() => {
    return selectedResidueCodes.length > 0 ? filteredTheoreticalPotential : totalTheoreticalPotential
  }, [selectedResidueCodes.length, filteredTheoreticalPotential, totalTheoreticalPotential])

  // Get effective factors based on scenario and per-residue overrides
  const effectiveFactors = useMemo((): CorrectionFactors => {
    // If no residues selected or only one residue, use scenario-based factors
    if (selectedResidueCodes.length === 0) {
      // No selection - use scenario default
      const scenarioConfig = RESIDUE_SCENARIOS[currentScenario]
      if (currentScenario === 'custom') {
        return factors // Use manually adjusted factors
      }
      return applyScenarioMultiplier(DEFAULT_FACTORS, scenarioConfig.multiplier || 1)
    }

    if (selectedResidueCodes.length === 1) {
      // Single residue - use its specific factors (with override if exists)
      const residueCode = selectedResidueCodes[0]
      if (residueFactorOverrides[residueCode]) {
        return residueFactorOverrides[residueCode]!
      }
      const residue = getResidueByCode(residueCode)
      if (residue) {
        const baseFactors = { fc: residue.fc, fcp: residue.fcp, fs: residue.fs, fl: residue.fl }
        // Apply scenario multiplier
        const scenarioConfig = RESIDUE_SCENARIOS[currentScenario]
        return applyScenarioMultiplier(baseFactors, scenarioConfig.multiplier || 1)
      }
      return DEFAULT_FACTORS
    }

    // Multiple residues - calculate weighted average
    const defaultFactorsMap = new Map<string, CorrectionFactors>()
    selectedResidueCodes.forEach(code => {
      const residue = getResidueByCode(code)
      if (residue) {
        const baseFactors = { fc: residue.fc, fcp: residue.fcp, fs: residue.fs, fl: residue.fl }
        const scenarioConfig = RESIDUE_SCENARIOS[currentScenario]
        defaultFactorsMap.set(code, applyScenarioMultiplier(baseFactors, scenarioConfig.multiplier || 1))
      }
    })

    const residuePotentials = selectedResidueCodes.map(code => {
      const residue = getResidueByCode(code)
      // Simplified: equal distribution (in real scenario, would use actual municipal data per residue)
      const theoretical = theoreticalPotential / selectedResidueCodes.length
      return {
        code,
        name: residue?.name || code,
        theoretical
      }
    })

    const weightedResult = calculateWeightedFDE(residuePotentials, residueFactorOverrides, defaultFactorsMap)

    // Return average factors (approximation for display)
    // In reality, FDE is weighted, but for display we show representative factors
    const avgFDE = weightedResult.overallFDE
    return {
      fc: Math.sqrt(avgFDE), // Approximation
      fcp: 0.3,
      fs: Math.sqrt(avgFDE),
      fl: Math.sqrt(avgFDE)
    }
  }, [selectedResidueCodes, currentScenario, residueFactorOverrides, factors, theoreticalPotential])

  // Calculate FDE-adjusted potential
  const fdeAdjustedPotential = useMemo(() => {
    return theoreticalPotential * calculateFDE(effectiveFactors)
  }, [theoreticalPotential, effectiveFactors])

  // Per-residue streams for multi-residue Sankey (only when ≥2 residues selected)
  const residueStreams = useMemo((): ResidueStream[] | undefined => {
    if (selectedResidueCodes.length < 2) return undefined

    const streams = selectedResidueCodes
      .map((code, idx) => {
        const residue = getResidueByCode(code)
        if (!residue) return null

        const theoretical = computeRPRAdjustedBiogas([code], streamTons, streamBiogas)
        if (theoretical <= 0) return null

        const baseFactors: CorrectionFactors = {
          fc: residue.fc, fcp: residue.fcp, fs: residue.fs, fl: residue.fl,
        }
        const scenarioConfig = RESIDUE_SCENARIOS[currentScenario]
        const adjustedFactors =
          currentScenario === 'custom' && residueFactorOverrides[code]
            ? residueFactorOverrides[code]!
            : applyScenarioMultiplier(baseFactors, scenarioConfig.multiplier || 1)

        return {
          name: residue.name,
          code,
          theoretical,
          factors: adjustedFactors,
          color: RESIDUE_PALETTE[idx % RESIDUE_PALETTE.length],
        } satisfies ResidueStream
      })
      .filter((s): s is ResidueStream => s !== null)

    return streams.length >= 2 ? streams : undefined
  }, [selectedResidueCodes, streamTons, streamBiogas, currentScenario, residueFactorOverrides])

  // Handle scenario change
  const handleScenarioChange = (scenario: ScenarioType) => {
    setCurrentScenario(scenario)
    if (scenario !== 'custom') {
      // Clear custom overrides when switching away from custom
      setResidueFactorOverrides({})
    }
  }

  // Handle factor overrides change - auto-switch to custom scenario
  const handleFactorOverridesChange = (overrides: ResidueFactorOverrides) => {
    setResidueFactorOverrides(overrides)
    if (Object.keys(overrides).length > 0) {
      setCurrentScenario('custom')
    }
  }

  // Check if there are custom factors
  const hasCustomFactors = Object.keys(residueFactorOverrides).length > 0

  // Fetch all data — all independent requests fire in parallel via Promise.allSettled
  const fetchAllData = useCallback(async () => {
    setError(null)
    setLoadingMunicipalities(true)
    setLoadingStats(true)
    setLoadingRegion(true)
    setLoadingDistribution(true)

    const residueCodes = selectedResidueCodes
    const apiCategory = toApiCategory(selectedCategory)

    const [munResult, statsResult, regionResult, distResult, streamResult] =
      await Promise.allSettled([
        apiCategory
          ? getAnalysisByResidue(apiCategory, {
              residueTypes: residueCodes.length > 0 ? residueCodes : undefined,
              limit: 20,
            })
          : Promise.resolve(null),
        getStatisticsByCategory(),
        getStatisticsByRegion(apiCategory),
        getDistribution(apiCategory, 15),
        residueCodes.length > 0 ? getStatisticsByStream(residueCodes) : Promise.resolve(null),
      ])

    // Municipalities
    if (munResult.status === 'fulfilled' && munResult.value) {
      setTopMunicipalities(munResult.value.data)
    } else if (munResult.status === 'rejected') {
      logger.error('Error fetching municipalities:', munResult.reason)
      setError(t('advanced_analysis.error_load_municipalities') || 'Erro ao carregar dados dos municipios')
    }
    setLoadingMunicipalities(false)

    // Category stats
    if (statsResult.status === 'fulfilled') {
      setCategoryStats(statsResult.value)
    } else {
      logger.error('Error fetching category stats:', statsResult.reason)
    }
    setLoadingStats(false)

    // Regional data
    if (regionResult.status === 'fulfilled' && regionResult.value) {
      setRegionData(regionResult.value.regions)
    } else if (regionResult.status === 'rejected') {
      logger.error('Error fetching regional data:', regionResult.reason)
    }
    setLoadingRegion(false)

    // Distribution
    if (distResult.status === 'fulfilled' && distResult.value) {
      setHistogramData(distResult.value.histogram)
      setDistributionStats(distResult.value.statistics)
    } else if (distResult.status === 'rejected') {
      logger.error('Error fetching distribution:', distResult.reason)
    }
    setLoadingDistribution(false)

    // Stream totals (RPR source)
    if (streamResult.status === 'fulfilled' && streamResult.value) {
      setStreamTotal(streamResult.value.total > 0 ? streamResult.value.total : null)
      setStreamTons(streamResult.value.stream_tons ?? {})
      setStreamBiogas(streamResult.value.streams ?? {})
    } else {
      if (streamResult.status === 'rejected') {
        logger.warn('Stream stats fetch failed, falling back to municipality sum:', streamResult.reason)
      }
      setStreamTotal(null)
      setStreamTons({})
      setStreamBiogas({})
    }
  }, [selectedCategory, selectedResidueCodes])

  // Debounced refetch when residue selection or category changes
  useEffect(() => {
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      fetchAllData();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedResidueCodes, selectedCategory, fetchAllData, isAuthenticated]);

  // Handle apply filter
  const handleApplyFilter = () => {
    fetchAllData()
  }

  // Handle scenario selection
  const handleSelectScenario = (scenario: Scenario) => {
    setFactors(scenario.factors)
  }

  // Filtered and sorted municipalities
  const filteredMunicipalities = useMemo(() => {
    let filtered = [...topMunicipalities]

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(m =>
        m.municipality_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.administrative_region?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.municipality_name.localeCompare(b.municipality_name)
          break
        case 'biogas':
          comparison = a.biogas_m3_year - b.biogas_m3_year
          break
        case 'population':
          comparison = (a.population || 0) - (b.population || 0)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [topMunicipalities, searchQuery, sortBy, sortOrder])

  // Export to CSV
  const handleExportCSV = useCallback(() => {
    const headers = ['Posicao', 'Municipio', 'Regiao', 'Biogas (m3/ano)', 'Populacao', 'FDE (%)', 'Cenario']
    const fdePercent = (calculateFDE(effectiveFactors) * 100).toFixed(1)
    const scenarioName = RESIDUE_SCENARIOS[currentScenario].name
    const rows = filteredMunicipalities.map((m, idx) => [
      idx + 1,
      m.municipality_name,
      m.administrative_region || 'N/A',
      m.biogas_m3_year.toFixed(2),
      m.population || 'N/A',
      fdePercent,
      scenarioName
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `analise_${selectedCategory}_${currentScenario}_fde${fdePercent}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }, [filteredMunicipalities, selectedCategory, effectiveFactors, currentScenario])

  // Initial data fetch - only run once when authenticated
  const hasInitiallyFetched = useRef(false)

  useEffect(() => {
    if (isAuthenticated && !hasInitiallyFetched.current) {
      hasInitiallyFetched.current = true
      fetchAllData()
    }
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

  // Category labels
  const categoryLabels: Record<ResidueCategory, string> = {
    agricultural: t('advanced_analysis.category_agricultural'),
    livestock: t('advanced_analysis.category_livestock'),
    urban: t('advanced_analysis.category_urban'),
    industrial: t('advanced_analysis.category_industrial'),
  }

  // Format large numbers
  const formatValue = (value: number): string => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}k`
    return value.toFixed(0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Breadcrumb items={[
        { label: t('back_to_dashboard'), href: '/dashboard' },
        { label: t('advanced_analysis.title') },
      ]} />
      {/* Page Title */}
      <div className="bg-gradient-to-r from-cp2b-primary via-cp2b-secondary to-green-600 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">{t('advanced_analysis.title')}</h1>
              <p className="text-lg text-white/90 max-w-2xl">{t('advanced_analysis.subtitle')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowMethodology(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
              >
                <BookOpen className="h-4 w-4" />
                {t('advanced_analysis.methodology')}
              </button>
              <button
                onClick={() => setShowReferences(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
              >
                <FileText className="h-4 w-4" />
                {t('advanced_analysis.references')}
              </button>
              <button
                onClick={fetchAllData}
                disabled={loadingMunicipalities || loadingStats}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
              >
                <RefreshCw className={`h-4 w-4 ${(loadingMunicipalities || loadingStats) ? 'animate-spin' : ''}`} />
                {t('scientific_database.refresh')}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={filteredMunicipalities.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-all backdrop-blur-sm border border-white/20"
              >
                <Download className="h-4 w-4" />
                {t('advanced_analysis.download')}
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
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">{t('advanced_analysis.error_loading')}</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Info Banner - Industrial Category - Select Specific Residues */}
        {selectedCategory === 'industrial' && selectedResidueCodes.length === 0 && (
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 px-6 py-4 rounded-lg mb-6 shadow-sm flex items-start gap-3">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5 text-blue-600" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1 text-blue-900">{t('advanced_analysis.industrial_selection_title')}</h3>
              <p className="text-sm text-blue-800">
                Para visualizar dados precisos da categoria Industrial, selecione um ou mais resíduos industriais específicos
                (Torta de Filtro, Vinhaça, Bagaço de Malte, etc.) no painel lateral.
                Os cálculos serão baseados nos dados municipais reais para os resíduos selecionados com seus fatores FDE individuais.
              </p>
            </div>
          </div>
        )}

        {/* Info Banner - Scientific References */}
        <div className="bg-indigo-50 border-l-4 border-indigo-500 text-indigo-700 px-6 py-4 rounded-lg mb-6 shadow-sm flex items-start gap-3">
          <BookOpen className="h-5 w-5 flex-shrink-0 mt-0.5 text-indigo-600" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1 text-indigo-900">Referências Científicas Disponíveis</h3>
            <p className="text-sm text-indigo-800">
              Cada resíduo possui análises e referências científicas diferentes que podem ser consultadas na{' '}
              <a href="/dashboard/references" className="font-semibold underline hover:text-indigo-900">
                página de Referências
              </a>
              {' '}ou clicando no botão <strong>Referências</strong> acima.
            </p>
          </div>
        </div>

        {/* Stats Summary with FDE - Sector Specific */}
        {categoryStats && !loadingStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs sm:text-sm font-medium text-gray-600">{t('advanced_analysis.kpi_total_municipalities')}</div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                {categoryStats.total_municipalities}
              </div>
              <div className="text-xs text-gray-500 mt-1">{t('advanced_analysis.kpi_municipalities_registered')}</div>
            </div>

            <div className={`bg-gradient-to-br rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border-l-4 ${
              selectedCategory === 'agricultural' ? 'from-green-50 to-white border-green-500' :
              selectedCategory === 'livestock' ? 'from-orange-50 to-white border-orange-500' :
              selectedCategory === 'urban' ? 'from-blue-50 to-white border-blue-500' :
              'from-purple-50 to-white border-purple-500'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs sm:text-sm font-medium text-gray-600">{t('advanced_analysis.kpi_category')}</div>
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                  selectedCategory === 'agricultural' ? 'bg-green-100' :
                  selectedCategory === 'livestock' ? 'bg-orange-100' :
                  selectedCategory === 'urban' ? 'bg-blue-100' :
                  'bg-purple-100'
                }`}>
                  {selectedCategory === 'agricultural' && <Wheat className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />}
                  {selectedCategory === 'livestock' && <Beef className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />}
                  {selectedCategory === 'urban' && <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />}
                  {selectedCategory === 'industrial' && <Factory className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />}
                </div>
              </div>
              <div className={`text-xl sm:text-2xl font-bold ${
                selectedCategory === 'agricultural' ? 'text-green-700' :
                selectedCategory === 'livestock' ? 'text-orange-700' :
                selectedCategory === 'urban' ? 'text-blue-700' :
                'text-purple-700'
              }`}>
                {categoryLabels[selectedCategory]}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {selectedResidueCodes.length > 0
                  ? t('advanced_analysis.residues_selected', { count: selectedResidueCodes.length })
                  : t('advanced_analysis.label_all_residues')}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs sm:text-sm font-medium text-gray-600">{t('advanced_analysis.kpi_theoretical')}</div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-gray-900">
                {formatValue(theoreticalPotential)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{t('advanced_analysis.unit_m3_year')}</div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6 border-l-4 border-emerald-600">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs sm:text-sm font-medium text-gray-600">{t('advanced_analysis.kpi_fde')}</div>
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-700">
                {formatValue(fdeAdjustedPotential)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {t('advanced_analysis.unit_m3_year_pct', { pct: (calculateFDE(effectiveFactors) * 100).toFixed(1) })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Graphs Front and Center */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Compact Residue & Category Selector */}
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {/* Simple Residue Selector */}
              <SimpleResidueSelector
                selectedCategory={selectedCategory}
                selectedResidueCodes={selectedResidueCodes}
                onCategoryChange={setSelectedCategory}
                onResidueCodesChange={setSelectedResidueCodes}
                onApply={handleApplyFilter}
              />

              {/* Search Filter */}
              <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Search className="h-3.5 w-3.5" />
                  {t('advanced_analysis.search_label')}
                </h4>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nome..."
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Factor Adjustment Panel (in sidebar) - Tied to Cascade Visualization */}
              {(selectedResidueCodes.length > 0 || currentScenario === 'custom') && (
                <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-md border-l-4 border-blue-500 p-4 relative">
                  {/* Connection Indicator */}
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <GitBranch className="w-3 h-3 text-white rotate-90" />
                    </div>
                  </div>

                  {/* Header with connection note */}
                  <div className="mb-3 pb-3 border-b border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="h-4 w-4 text-blue-600" />
                      <h4 className="text-xs font-semibold text-blue-900">Ajuste Integrado</h4>
                    </div>
                    <p className="text-[10px] text-blue-700">
                      Os ajustes aqui refletem em tempo real na visualização
                    </p>
                  </div>

                  {selectedResidueCodes.length > 0 ? (
                    <PerResidueFactorEditor
                      selectedResidueCodes={selectedResidueCodes}
                      factorOverrides={residueFactorOverrides}
                      onChange={handleFactorOverridesChange}
                      showAggregatedFDE={true}
                    />
                  ) : (
                    <FactorRangeSliders
                      factors={factors}
                      onChange={setFactors}
                      showFDEPreview={true}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Center - Main Visualization Area (9/12 width = 75%) */}
          <div className="lg:col-span-9 space-y-4">
            {/* Scenario Selector - Integrated with View Controls */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Scenario Selector */}
                <div className="flex-1">
                  <ScenarioSelector
                    currentScenario={currentScenario}
                    onScenarioChange={handleScenarioChange}
                    hasCustomFactors={hasCustomFactors}
                  />
                  {currentScenario === 'frontier' && (
                    <p className="mt-2 text-xs text-emerald-700">
                      {t('advanced_analysis.frontier_note')}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/scientific-database')}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                  >
                    📚 {t('advanced_analysis.literature_base_link')}
                  </button>
                </div>

                {/* View Mode Toggles */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-600 mr-2">{t('advanced_analysis.visualization_label')}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setViewMode('cascade')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        viewMode === 'cascade'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <TrendingDown className="h-3.5 w-3.5" />
                      <span>{t('advanced_analysis.tab_cascade')}</span>
                    </button>
                    <button
                      onClick={() => setViewMode('flow')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        viewMode === 'flow'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>{t('advanced_analysis.tab_flow')}</span>
                    </button>
                    <button
                      onClick={() => setViewMode('scenarios')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        viewMode === 'scenarios'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>{t('advanced_analysis.tab_scenarios')}</span>
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        viewMode === 'table'
                          ? 'bg-green-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <Table2 className="h-3.5 w-3.5" />
                      <span>{t('advanced_analysis.tab_table')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cascade View */}
            {viewMode === 'cascade' && (
              <>
                {/* Scenario and Selection Info */}
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-700">
                        {t('advanced_analysis.current_analysis')}
                      </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      currentScenario === 'baseline' ? 'bg-blue-100 text-blue-700' :
                      currentScenario === 'conservative' ? 'bg-orange-100 text-orange-700' :
                      currentScenario === 'optimistic' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {RESIDUE_SCENARIOS[currentScenario].name}
                    </span>
                  </div>

                  {/* Info text */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">{t('advanced_analysis.label_category')}</span> {categoryLabels[selectedCategory]}
                    </p>
                    {selectedResidueCodes.length > 0 ? (
                      <p>
                        <span className="font-medium">{t('advanced_analysis.label_residues')}</span> {selectedResidueCodes.length}
                        <br />
                        <span className="text-xs">({(filteredTheoreticalPotential / 1e9).toFixed(2)}B m³/ano)</span>
                      </p>
                    ) : (
                      <p>
                        <span className="font-medium">{t('advanced_analysis.label_all_residues')}</span>
                        <br />
                        <span className="text-xs">({(totalTheoreticalPotential / 1e9).toFixed(2)}B m³/ano)</span>
                      </p>
                    )}
                    <p>
                      <span className="font-medium">{t('advanced_analysis.label_fde')}</span> {(calculateFDE(effectiveFactors) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Potential Cascade Chart - Connected to Factor Adjustment */}
                <div className="relative">
                  {/* Connection Indicator */}
                  {(selectedResidueCodes.length > 0 || currentScenario === 'custom') && (
                    <div className="absolute -left-3 top-8 z-10">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                        <GitBranch className="w-3 h-3 text-white rotate-90" />
                      </div>
                    </div>
                  )}

                  {/* Cascade Chart with Visual Connection Styling */}
                  <div className={`${(selectedResidueCodes.length > 0 || currentScenario === 'custom') ? 'ring-2 ring-blue-200 ring-offset-2' : ''} rounded-xl`}>
                    <PotentialCascadeChart
                      theoreticalPotential={theoreticalPotential}
                      factors={effectiveFactors}
                      title={`${t('advanced_analysis.tab_cascade')} - ${RESIDUE_SCENARIOS[currentScenario].name}${selectedResidueCodes.length > 0 ? ` (${selectedResidueCodes.length})` : ''}`}
                      loading={loadingStats}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Flow View */}
            {viewMode === 'flow' && (
              <>
                {/* Scenario and Selection Info */}
                <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-700">
                        {t('advanced_analysis.flow_analysis')}
                      </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      currentScenario === 'baseline' ? 'bg-blue-100 text-blue-700' :
                      currentScenario === 'conservative' ? 'bg-orange-100 text-orange-700' :
                      currentScenario === 'optimistic' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {RESIDUE_SCENARIOS[currentScenario].name}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">{t('advanced_analysis.label_potential')}</span>{' '}
                      {selectedResidueCodes.length > 0
                        ? `${selectedResidueCodes.length} (${(filteredTheoreticalPotential / 1e9).toFixed(2)}B m³/ano)`
                        : `${t('advanced_analysis.label_all_residues')} (${(totalTheoreticalPotential / 1e9).toFixed(2)}B m³/ano)`}
                    </p>
                    <p>
                      <span className="font-medium">{t('advanced_analysis.label_fde')}</span> {(calculateFDE(effectiveFactors) * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>

                {/* Sankey Diagram */}
                <BiomassFlowSankey
                  theoreticalPotential={theoreticalPotential}
                  factors={effectiveFactors}
                  residues={residueStreams}
                  title={`${t('advanced_analysis.tab_flow')} - ${RESIDUE_SCENARIOS[currentScenario].name}`}
                  loading={loadingStats}
                />

                {/* Two Column Charts */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <DistributionHistogram
                    histogram={histogramData}
                    statistics={distributionStats || { count: 0, min: 0, max: 0, mean: 0, median: 0, std: 0 }}
                    title={`${t('advanced_analysis.chart_distribution')} - ${categoryLabels[selectedCategory]}`}
                    loading={loadingDistribution}
                  />
                  <TopMunicipalitiesMiniCard
                    data={filteredMunicipalities}
                    loading={loadingMunicipalities}
                    maxItems={5}
                    title={`${t('advanced_analysis.chart_top5')} - ${categoryLabels[selectedCategory]}`}
                    onViewAll={() => setViewMode('table')}
                  />
                </div>
              </>
            )}

            {/* Scenarios View */}
            {viewMode === 'scenarios' && (
              <>
                <ScenarioComparator
                  theoreticalPotential={theoreticalPotential}
                  onSelectScenario={handleSelectScenario}
                  currentFactors={factors}
                  title={t('advanced_analysis.chart_scenario_comparison')}
                  loading={loadingStats}
                />

                {/* Distribution after scenario selection */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <DistributionHistogram
                    histogram={histogramData}
                    statistics={distributionStats || { count: 0, min: 0, max: 0, mean: 0, median: 0, std: 0 }}
                    title={`${t('advanced_analysis.chart_distribution')} - ${categoryLabels[selectedCategory]}`}
                    loading={loadingDistribution}
                  />
                  <RegionalPieChart
                    data={regionData}
                    title={`${t('advanced_analysis.chart_regional')} - ${categoryLabels[selectedCategory]}`}
                    loading={loadingRegion}
                    maxRegions={8}
                  />
                </div>
              </>
            )}

            {/* Table View */}
            {viewMode === 'table' && filteredMunicipalities.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 border border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-5">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Table2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      {t('advanced_analysis.table_ranking')}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {filteredMunicipalities.length} municipio(s) | FDE: {(calculateFDE(effectiveFactors) * 100).toFixed(1)}% | {RESIDUE_SCENARIOS[currentScenario].name}
                    </p>
                  </div>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors w-full sm:w-auto"
                  >
                    <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    {t('advanced_analysis.export_csv')}
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-4 px-4 font-semibold text-gray-700 w-16">#</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Municipio</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Regiao</th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700 min-w-[140px]">
                          Biogas (m3/ano)
                        </th>
                        <th className="text-right py-4 px-4 font-semibold text-gray-700 min-w-[120px]">
                          Populacao
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredMunicipalities.slice(0, 50).map((municipality, index) => (
                        <tr
                          key={municipality.id}
                          className="hover:bg-green-50/50 transition-colors"
                        >
                          <td className="py-4 px-4 text-gray-500 font-medium">{index + 1}</td>
                          <td className="py-4 px-4">
                            <div className="font-semibold text-gray-900 hover:text-green-600 transition-colors">
                              {municipality.municipality_name}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {municipality.administrative_region || 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-mono font-semibold text-gray-900">
                                {municipality.biogas_m3_year >= 1000000
                                  ? `${(municipality.biogas_m3_year / 1000000).toFixed(2)}M`
                                  : municipality.biogas_m3_year >= 1000
                                  ? `${(municipality.biogas_m3_year / 1000).toFixed(2)}k`
                                  : municipality.biogas_m3_year.toFixed(2)
                                }
                              </span>
                              <span className="text-xs text-gray-500">m3/ano</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right text-gray-700 font-medium">
                            {municipality.population?.toLocaleString('pt-BR') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredMunicipalities.length > 50 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Mostrando 50 de {filteredMunicipalities.length} municipios
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'table' && filteredMunicipalities.length === 0 && (
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="text-center py-12 text-gray-500">
                  <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium mb-1">Nenhum municipio encontrado</p>
                  <p className="text-sm">Tente ajustar os filtros de busca</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Methodology Panel */}
      <MethodologyPanel
        factors={effectiveFactors}
        isOpen={showMethodology}
        onClose={() => setShowMethodology(false)}
      />

      {/* References Modal */}
      <ReferencesModal
        isOpen={showReferences}
        onClose={() => setShowReferences(false)}
      />
    </div>
  )
}
