'use client'

/**
 * Dashboard Proximity Analysis Page for PILAR-2b V3
 * Spatial analysis with capture radius and land use integration (MapBiomas)
 * Fully functional implementation using backend API
 */
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import { useRouter } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import Breadcrumb from '@/components/ui/Breadcrumb'
import dynamic from 'next/dynamic'
import {
  MapPin,
  Circle,
  Layers,
  Download,
  Share2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Building,
  Leaf,
  Zap
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  analyzeProximity,
  dominantLandUseClass,
  exportAnalysisToCSV,
  generateShareURL,
  parseShareURL,
  ProximityError,
  type LandUseClass,
  type ProximityAnalysisResult,
} from '@/services/proximityApi'
import { defaultLocale, isLocale } from '@/config/i18n'
import { useFormat } from '@/hooks/useFormat'
import { logger } from '@/lib/logger'
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags'
import type { Messages } from '@/types/i18n'

function MapLoading() {
  const t = useTranslations('pages.proximity')
  return (
    <div className="w-full h-[500px] bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-2" aria-hidden="true" />
        <p className="text-gray-600 dark:text-gray-400">{t('map.loading')}</p>
      </div>
    </div>
  )
}

// Dynamically import map to avoid SSR issues
const ProximityMap = dynamic(() => import('@/components/map/ProximityMap'), {
  ssr: false,
  loading: () => <MapLoading />,
})

type ClassKey = keyof Messages['Map']['mapbiomasLegend']['classes']
type CategoryKey = keyof Messages['pages']['proximity']['categories']

/** Radius limits the backend accepts (ValidationService.validate_radius). */
const RADIUS_MIN_KM = 1
const RADIUS_MAX_KM = 100

/** Suitability band for agricultural biogas, by the share of farmed land. */
const suitability = (agriculturalPercent: number): 'high' | 'medium' | 'low' =>
  agriculturalPercent >= 50 ? 'high' : agriculturalPercent >= 20 ? 'medium' : 'low'

// Inner component that uses useSearchParams
function ProximityAnalysisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pages')
  const tp = useTranslations('pages.proximity')
  const tClasses = useTranslations('Map.mapbiomasLegend.classes')
  const tCommon = useTranslations('common')
  const format = useFormat()
  const current = useLocale()
  const locale = isLocale(current) ? current : defaultLocale
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  // Analysis state
  const [selectedPoint, setSelectedPoint] = useState<{lat: number, lng: number} | null>(null)
  const [radius, setRadius] = useState(20)
  const [analysisResult, setAnalysisResult] = useState<ProximityAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ProximityError | null>(null)
  const [showShareToast, setShowShareToast] = useState(false)

  // Parse URL parameters for shared analysis
  useEffect(() => {
    const params = parseShareURL()
    if (params.latitude && params.longitude) {
      setSelectedPoint({ lat: params.latitude, lng: params.longitude })
      if (params.radiusKm) {
        setRadius(params.radiusKm)
      }
    }
  }, [searchParams])

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // Monotonically increasing id so an in-flight analysis abandoned by a new
  // map click can't display the old point's results under the new selection
  const analysisIdRef = useRef(0)

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    analysisIdRef.current++ // invalidate any in-flight analysis
    setSelectedPoint({ lat, lng })
    setAnalysisResult(null)
    setError(null)
    setLoading(false)
  }, [])

  // Perform analysis
  const handleAnalyze = async () => {
    if (!selectedPoint) return

    const analysisId = ++analysisIdRef.current
    setLoading(true)
    setError(null)
    setAnalysisResult(null) // Clear previous results

    try {
      const result = await analyzeProximity({
        latitude: selectedPoint.lat,
        longitude: selectedPoint.lng,
        radius_km: radius
      })

      if (analysisId !== analysisIdRef.current) return // superseded by a new click
      setAnalysisResult(result)
    } catch (err: unknown) {
      if (analysisId !== analysisIdRef.current) return
      logger.error('Analysis error:', err);
      setError(err instanceof ProximityError ? err : new ProximityError('server'))
    } finally {
      if (analysisId === analysisIdRef.current) {
        setLoading(false)
      }
    }
  }

  // A land-use class by its MapBiomas id; the served (Portuguese) name is the fallback.
  const landUseClassName = (entry: Pick<LandUseClass, 'class_id' | 'name'>): string => {
    const key = String(entry.class_id) as ClassKey
    return tClasses.has(key) ? tClasses(key) : entry.name || tp('class_fallback', { id: entry.class_id })
  }
  const categoryName = (category: string): string => {
    const key = category as CategoryKey
    return tp.has(`categories.${key}`) ? tp(`categories.${key}`) : tp('categories.unknown')
  }
  const errorMessage = (e: ProximityError): string => {
    switch (e.code) {
      case 'rate_limited': return tp('errors.rate_limited', { seconds: e.retryAfter ?? 60 })
      case 'invalid_radius': return tp('errors.invalid_radius', { min: RADIUS_MIN_KM, max: RADIUS_MAX_KM })
      default: return tp(`errors.${e.code}`)
    }
  }

  const dominantName = (result: ProximityAnalysisResult): string => {
    const landUse = result.results.land_use
    if (!landUse) return ''
    const id = landUse.dominant_class_id ?? dominantLandUseClass(landUse.by_class)?.class_id
    return id === undefined ? landUse.dominant_class : landUseClassName({ class_id: id, name: landUse.dominant_class })
  }

  // Export results
  const handleExport = () => {
    if (!analysisResult) return
    exportAnalysisToCSV(analysisResult, {
      municipalities: [tp('csv.municipality'), tp('csv.ibge_code'), tp('csv.distance_km'), tp('csv.biogas_m3_year'), tp('csv.population')],
      landUse: [tp('csv.land_use_class'), tp('csv.percent'), tp('csv.area_km2')],
      infrastructure: [tp('csv.type'), tp('csv.name'), tp('csv.distance_km'), tp('csv.latitude'), tp('csv.longitude')],
      summary: {
        metric: tp('csv.metric'),
        value: tp('csv.value'),
        latitude: tp('csv.point_latitude'),
        longitude: tp('csv.point_longitude'),
        radius: tp('csv.radius_km'),
        municipalities: tp('csv.total_municipalities'),
        population: tp('csv.total_population'),
        avgDistance: tp('csv.avg_distance_km'),
        totalBiogas: tp('csv.total_biogas'),
        agricultural: tp('csv.agricultural_biogas'),
        livestock: tp('csv.livestock_biogas'),
        urban: tp('csv.urban_biogas'),
        agriculturalLand: tp('csv.agricultural_land'),
        processingTime: tp('csv.processing_time_s'),
      },
      landUseClass: landUseClassName,
    })
  }

  // Share analysis
  const handleShare = () => {
    if (!selectedPoint) return

    const url = generateShareURL(selectedPoint.lat, selectedPoint.lng, radius, locale)
    navigator.clipboard.writeText(url)
    setShowShareToast(true)
    setTimeout(() => setShowShareToast(false), 3000)
  }

  // Get radius color based on recommendation
  const getRadiusColor = (km: number) => {
    if (km <= 20) return 'text-green-600'
    if (km <= 30) return 'text-yellow-600'
    if (km <= 50) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRadiusLabel = (km: number) => {
    if (km <= 20) return tp('radius_optimal')
    if (km <= 30) return tp('radius_acceptable')
    if (km <= 50) return tp('radius_limit')
    return tp('radius_excessive')
  }

  const getRadiusBadge = (km: number) => {
    if (km <= 20) return { color: 'bg-green-100 text-green-700', icon: '✓', text: tp('badge.optimal') }
    if (km <= 30) return { color: 'bg-yellow-100 text-yellow-700', icon: '⚠', text: tp('badge.moderate') }
    if (km <= 50) return { color: 'bg-orange-100 text-orange-700', icon: '⚠', text: tp('badge.high') }
    return { color: 'bg-red-100 text-red-700', icon: '✗', text: tp('badge.unviable') }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp2b-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">{tCommon('states.loading')}</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Breadcrumb items={[
        { label: t('back_to_dashboard'), href: '/dashboard' },
        { label: t('proximity.title') },
      ]} />
      {/* Page Title */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold mb-1">🎯 {t('proximity.title')}</h1>
          <p className="text-emerald-100">{t('proximity.subtitle')}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-4">
            {/* Instructions */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center">
                <Info className="h-5 w-5 mr-2 text-emerald-600" aria-hidden="true" />
                {tp('how_to_use')}
              </h3>
              <ol className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">1</span>
                  {tp('step1')}
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">2</span>
                  {tp('step2')}
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">3</span>
                  {tp('step3')}
                </li>
              </ol>
            </div>

            {/* Point Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-emerald-600" aria-hidden="true" />
                {tp('selected_point')}
              </h3>
              {selectedPoint ? (
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400 w-20">{tp('latitude')}</span>
                    <span className="font-mono text-gray-900 dark:text-slate-100">{format.number(selectedPoint.lat, { decimals: 6, minDecimals: 6 })}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400 w-20">{tp('longitude')}</span>
                    <span className="font-mono text-gray-900 dark:text-slate-100">{format.number(selectedPoint.lng, { decimals: 6, minDecimals: 6 })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                  {tp('click_to_select')}
                </p>
              )}
            </div>

            {/* Radius Control */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center">
                <Circle className="h-5 w-5 mr-2 text-emerald-600" aria-hidden="true" />
                <label htmlFor="proximity-radius">{tp('capture_radius')}</label>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{radius} km</span>
                  <span className={`text-sm font-medium ${getRadiusColor(radius)}`}>
                    {getRadiusLabel(radius)}
                  </span>
                </div>
                <input
                  id="proximity-radius"
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={radius}
                  aria-valuetext={`${radius} km — ${getRadiusLabel(radius)}`}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      #22c55e 0%, #22c55e 10%,
                      #eab308 20%, #eab308 30%,
                      #f97316 40%, #f97316 50%,
                      #ef4444 60%, #ef4444 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400">
                  <span>10 km</span>
                  <span className="text-green-600 font-medium">20 km</span>
                  <span>50 km</span>
                  <span>100 km</span>
                </div>
                {/* Recommendation Badge */}
                <div className="mt-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getRadiusBadge(radius).color}`}>
                    <span aria-hidden="true">{getRadiusBadge(radius).icon}</span>
                    {getRadiusBadge(radius).text}
                  </span>
                </div>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={!selectedPoint || loading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center ${
                selectedPoint && !loading
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden="true" />
                  {tp('analyzing')}
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" aria-hidden="true" />
                  {tp('analyze')}
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-red-700">{errorMessage(error)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Center Panel - Map */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden">
              <ProximityMap
                selectedPoint={selectedPoint}
                radius={radius}
                onMapClick={handleMapClick}
                bufferGeometry={analysisResult?.results.buffer_geometry}
                municipalities={analysisResult?.results.municipalities}
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        {analysisResult && (
          <div className="mt-6 space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">{tp('land_use_title')}</h2>
                <span className="ml-3 text-sm text-gray-500 dark:text-slate-400">
                  {tp('municipalities_count', { count: analysisResult.summary?.total_municipalities || 0 })} •{' '}
                  {tp('processed_in', { ms: format.number(analysisResult.metadata.processing_time_ms) })}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  {tp('share')}
                </button>
                {DATA_EXPORT_ENABLED && (
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                    {tp('export')}
                  </button>
                )}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6">

              {/* Land Use - Primary Focus - Expanded Vertical Layout */}
              {analysisResult.results.land_use && (
                <div className="space-y-6">
                  {/* Hero Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <Layers className="h-8 w-8 opacity-80" />
                        <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                          {tp('mapbiomas_badge')}
                        </div>
                      </div>
                      <p className="text-sm opacity-90 mb-2">{tp('total_area')}</p>
                      <p className="text-4xl font-bold mb-1">
                        {format.number(analysisResult.results.land_use.total_area_km2, { decimals: 1, minDecimals: 1 })}
                      </p>
                      <p className="text-sm opacity-80">{tp('km2')}</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <Leaf className="h-8 w-8 opacity-80" />
                        <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                          {tp('agricultural_use')}
                        </div>
                      </div>
                      <p className="text-sm opacity-90 mb-2">{tp('farmable_area')}</p>
                      <p className="text-4xl font-bold mb-1">
                        {format.percent(analysisResult.results.land_use.agricultural_percent)}
                      </p>
                      <p className="text-sm opacity-80">
                        {format.number(analysisResult.results.land_use.total_area_km2 * analysisResult.results.land_use.agricultural_percent / 100, { decimals: 1, minDecimals: 1 })} {tCommon('units.km2')}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <Circle className="h-8 w-8 opacity-80" />
                        <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                          {tp('dominant_badge')}
                        </div>
                      </div>
                      <p className="text-sm opacity-90 mb-2">{tp('main_class')}</p>
                      <p className="text-2xl font-bold mb-1">
                        {dominantName(analysisResult)}
                      </p>
                      <p className="text-sm opacity-80">{tp('predominant_use')}</p>
                    </div>
                  </div>

                  {/* Land Use Breakdown - Card Style */}
                  {analysisResult.results.land_use.by_class && Object.keys(analysisResult.results.land_use.by_class).length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center">
                        <Layers className="h-6 w-6 mr-3 text-blue-600" aria-hidden="true" />
                        {tp('detailed_distribution')}
                      </h3>

                      {/* Large Visual Bar */}
                      <div className="mb-8">
                        <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">{tp('visual_proportion')}</p>
                        <div className="w-full h-16 flex rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 dark:border-slate-700">
                          {Object.entries(analysisResult.results.land_use.by_class)
                            .sort(([, a], [, b]) => (b.percent || 0) - (a.percent || 0))
                            .map(([classId, classData]) => (
                              <div
                                key={classId}
                                style={{
                                  width: `${classData.percent || 0}%`,
                                  backgroundColor: classData.color || '#888888'
                                }}
                                className="relative group hover:opacity-90 transition-opacity cursor-pointer"
                                title={`${landUseClassName(classData)}: ${format.percent(classData.percent || 0)}`}
                              >
                                {(classData.percent || 0) > 8 && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs drop-shadow-lg">
                                      {format.percent(classData.percent || 0, { decimals: 0 })}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Cards Grid for Land Classes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(analysisResult.results.land_use.by_class)
                          .sort(([, a], [, b]) => (b.percent || 0) - (a.percent || 0))
                          .map(([classId, classData]) => (
                            <div
                              key={classId}
                              className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl p-5 border-2 hover:border-gray-300 dark:hover:border-slate-600 transition-all hover:shadow-lg cursor-pointer group"
                              style={{ borderColor: `${classData.color}40` }}
                            >
                              <div className="flex items-start gap-4">
                                {/* Large Color Indicator */}
                                <div
                                  className="w-16 h-16 rounded-xl shadow-md flex-shrink-0 group-hover:scale-110 transition-transform"
                                  style={{ backgroundColor: classData.color || '#888888' }}
                                />
                                
                                <div className="flex-1 min-w-0">
                                  {/* Class Name */}
                                  <h4 className="font-bold text-gray-900 dark:text-slate-100 mb-1 text-base leading-tight">
                                    {landUseClassName(classData)}
                                  </h4>
                                  
                                  {/* Category Badge */}
                                  <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded text-xs mb-3">
                                    {categoryName(classData.category)}
                                  </span>
                                  
                                  {/* Stats */}
                                  <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                                        {format.percent(classData.percent || 0)}
                                      </span>
                                      <span className="text-sm text-gray-500 dark:text-slate-400">{tp('of_area')}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                                      {format.number(classData.area_km2 || 0, { decimals: 2, minDecimals: 2 })} {tCommon('units.km2')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Agricultural Suitability - Prominent Card */}
                  {analysisResult.results.land_use.agricultural_percent > 0 && (
                    <div className={`rounded-2xl shadow-xl p-8 ${
                      analysisResult.results.land_use.agricultural_percent >= 50
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-300'
                        : analysisResult.results.land_use.agricultural_percent >= 20
                        ? 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300'
                        : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300'
                    }`}>
                      <div className="flex items-start gap-4">
                        {analysisResult.results.land_use.agricultural_percent >= 50 ? (
                          <CheckCircle2 className="h-12 w-12 text-green-600 flex-shrink-0" />
                        ) : analysisResult.results.land_use.agricultural_percent >= 20 ? (
                          <Info className="h-12 w-12 text-blue-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-12 w-12 text-yellow-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <h4 className={`text-xl font-bold mb-2 ${
                            analysisResult.results.land_use.agricultural_percent >= 50
                              ? 'text-green-900'
                              : analysisResult.results.land_use.agricultural_percent >= 20
                              ? 'text-blue-900'
                              : 'text-yellow-900'
                          }`}>
                            {tp(`suitability.${suitability(analysisResult.results.land_use.agricultural_percent)}.title`)}
                          </h4>
                          <p className={`text-base leading-relaxed ${
                            analysisResult.results.land_use.agricultural_percent >= 50
                              ? 'text-green-800'
                              : analysisResult.results.land_use.agricultural_percent >= 20
                              ? 'text-blue-800'
                              : 'text-yellow-800'
                          }`}>
                            {tp(`suitability.${suitability(analysisResult.results.land_use.agricultural_percent)}.body`, {
                              percent: format.percent(analysisResult.results.land_use.agricultural_percent),
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Toast */}
      {showShareToast && (
        <div role="status" className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2 text-green-400" aria-hidden="true" />
          {tp('link_copied')}
        </div>
      )}
    </div>
  )
}

function PageLoading() {
  const tCommon = useTranslations('common')
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-slate-400">{tCommon('states.loading')}</p>
      </div>
    </div>
  )
}

// Default export with Suspense boundary for useSearchParams
export default function ProximityAnalysisPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProximityAnalysisContent />
    </Suspense>
  )
}
