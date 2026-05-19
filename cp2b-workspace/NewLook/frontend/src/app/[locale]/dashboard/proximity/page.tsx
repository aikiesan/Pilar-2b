'use client'

/**
 * Dashboard Proximity Analysis Page for PILAR-2b V3
 * Spatial analysis with capture radius and land use integration (MapBiomas)
 * Fully functional implementation using backend API
 */
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
  exportAnalysisToCSV,
  generateShareURL,
  parseShareURL
} from '@/services/proximityApi'
import { logger } from '@/lib/logger'

// Dynamically import map to avoid SSR issues
const ProximityMap = dynamic(() => import('@/components/map/ProximityMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin mx-auto mb-2" />
        <p className="text-gray-600 dark:text-gray-400">Carregando mapa...</p>
      </div>
    </div>
  )
})

interface AnalysisResult {
  analysis_id: string
  request: {
    latitude: number
    longitude: number
    radius_km: number
  }
  results: {
    buffer_geometry: any
    municipalities: any[]
    biogas_potential?: {
      total_m3_year: number
      by_category: Record<string, number>
      energy_potential_mwh_year: number
      co2_reduction_tons_year: number
      homes_powered_equivalent: number
    }
    land_use?: {
      total_area_km2: number
      by_class: Record<string, any>
      dominant_class: string
      agricultural_percent: number
    }
    infrastructure?: any[]
  }
  summary: {
    total_area_km2: number
    total_municipalities: number
    total_population: number
    total_biogas_m3_year: number
    energy_potential_mwh_year: number
    radius_recommendation: string
  }
  metadata: {
    analysis_timestamp: string
    processing_time_ms: number
  }
}

// Inner component that uses useSearchParams
function ProximityAnalysisContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('pages')
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  // Analysis state
  const [selectedPoint, setSelectedPoint] = useState<{lat: number, lng: number} | null>(null)
  const [radius, setRadius] = useState(20)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setSelectedPoint({ lat, lng })
    setAnalysisResult(null)
    setError(null)
  }, [])

  // Perform analysis
  const handleAnalyze = async () => {
    if (!selectedPoint) return

    setLoading(true)
    setError(null)
    setAnalysisResult(null) // Clear previous results

    try {
      const result = await analyzeProximity({
        latitude: selectedPoint.lat,
        longitude: selectedPoint.lng,
        radius_km: radius
      })

      setAnalysisResult(result as unknown as AnalysisResult)
    } catch (err: any) {
      logger.error('Analysis error:', err);
      setError(err.message || 'Erro ao realizar análise')
    } finally {
      setLoading(false)
    }
  }

  // Export results
  const handleExport = () => {
    if (!analysisResult) return

    // Convert to format expected by export function
    const exportData = {
      analysis_point: {
        latitude: analysisResult.request.latitude,
        longitude: analysisResult.request.longitude
      },
      radius_km: analysisResult.request.radius_km,
      land_use: {
        agricultural_percentage: analysisResult.results.land_use?.agricultural_percent || 0,
        total_area_km2: analysisResult.results.land_use?.total_area_km2 || 0,
        breakdown: Object.entries(analysisResult.results.land_use?.by_class || {}).map(([key, value]: [string, any]) => ({
          class_name: value.name || key,
          percentage: value.percent || 0,
          area_km2: value.area_km2 || 0,
          color: value.color || '#888'
        }))
      },
      municipalities: analysisResult.results.municipalities.map((m: any) => ({
        name: m.name,
        ibge_code: m.ibge_code || '',
        distance_km: m.distance_km || 0,
        biogas_m3_year: m.biogas_m3_year || 0,
        population: m.population || 0
      })),
      biogas_potential: {
        agricultural: analysisResult.results.biogas_potential?.by_category?.agricultural || 0,
        livestock: analysisResult.results.biogas_potential?.by_category?.livestock || 0,
        urban: analysisResult.results.biogas_potential?.by_category?.urban || 0,
        total: analysisResult.results.biogas_potential?.total_m3_year || 0
      },
      infrastructure: (analysisResult.results.infrastructure || []).map((inf: any) => ({
        type: inf.type,
        name: inf.name || '',
        distance_km: inf.distance_km || 0,
        coordinates: inf.coordinates || { latitude: 0, longitude: 0 }
      })),
      summary: {
        total_municipalities: analysisResult.summary.total_municipalities,
        total_population: analysisResult.summary.total_population,
        avg_distance_km: 0,
        total_biogas_m3_year: analysisResult.summary.total_biogas_m3_year
      },
      processing_time_seconds: analysisResult.metadata.processing_time_ms / 1000
    }

    exportAnalysisToCSV(exportData as any)
  }

  // Share analysis
  const handleShare = () => {
    if (!selectedPoint) return

    const url = generateShareURL(selectedPoint.lat, selectedPoint.lng, radius)
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
    if (km <= 20) return 'Ótimo'
    if (km <= 30) return 'Aceitável'
    if (km <= 50) return 'Limite'
    return 'Excessivo'
  }

  const getRadiusBadge = (km: number) => {
    if (km <= 20) {
      return {
        color: 'bg-green-100 text-green-700',
        icon: '✓',
        text: 'Logística ideal',
      }
    }
    if (km <= 30) {
      return {
        color: 'bg-yellow-100 text-yellow-700',
        icon: '⚠',
        text: 'Custos moderados',
      }
    }
    if (km <= 50) {
      return {
        color: 'bg-orange-100 text-orange-700',
        icon: '⚠',
        text: 'Custos elevados',
      }
    }
    return {
      color: 'bg-red-100 text-red-700',
      icon: '✗',
      text: 'Inviável economicamente',
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cp2b-primary mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Carregando...</p>
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
                <Info className="h-5 w-5 mr-2 text-emerald-600" />
                Como usar
              </h3>
              <ol className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">1</span>
                  Clique no mapa para selecionar um ponto
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">2</span>
                  Ajuste o raio de captação
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs flex items-center justify-center mr-2 mt-0.5">3</span>
                  Clique em &quot;Analisar&quot; para ver os resultados
                </li>
              </ol>
            </div>

            {/* Point Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-emerald-600" />
                Ponto Selecionado
              </h3>
              {selectedPoint ? (
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400 w-20">Latitude:</span>
                    <span className="font-mono text-gray-900 dark:text-slate-100">{selectedPoint.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 dark:text-slate-400 w-20">Longitude:</span>
                    <span className="font-mono text-gray-900 dark:text-slate-100">{selectedPoint.lng.toFixed(6)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-slate-400 italic">
                  Clique no mapa para selecionar um ponto
                </p>
              )}
            </div>

            {/* Radius Control */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3 flex items-center">
                <Circle className="h-5 w-5 mr-2 text-emerald-600" />
                Raio de Captação
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{radius} km</span>
                  <span className={`text-sm font-medium ${getRadiusColor(radius)}`}>
                    {getRadiusLabel(radius)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={radius}
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
                    <span>{getRadiusBadge(radius).icon}</span>
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
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Analisar
                </>
              )}
            </button>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
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
                <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Análise de Uso do Solo</h2>
                <span className="ml-3 text-sm text-gray-500 dark:text-slate-400">
                  {analysisResult.summary?.total_municipalities || 0} municípios • Processado em {analysisResult.metadata.processing_time_ms}ms
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </button>
                <button
                  onClick={handleExport}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Dados
                </button>
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
                          MapBiomas 2023
                        </div>
                      </div>
                      <p className="text-sm opacity-90 mb-2">Área Total Analisada</p>
                      <p className="text-4xl font-bold mb-1">
                        {analysisResult.results.land_use.total_area_km2.toFixed(1)}
                      </p>
                      <p className="text-sm opacity-80">quilômetros quadrados</p>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <Leaf className="h-8 w-8 opacity-80" />
                        <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                          Uso Agrícola
                        </div>
                      </div>
                      <p className="text-sm opacity-90 mb-2">Área Agricultável</p>
                      <p className="text-4xl font-bold mb-1">
                        {analysisResult.results.land_use.agricultural_percent.toFixed(1)}%
                      </p>
                      <p className="text-sm opacity-80">
                        {(analysisResult.results.land_use.total_area_km2 * analysisResult.results.land_use.agricultural_percent / 100).toFixed(1)} km²
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <Circle className="h-8 w-8 opacity-80" />
                        <div className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                          Dominante
                        </div>
                      </div>
                      <p className="text-sm opacity-90 mb-2">Classe Principal</p>
                      <p className="text-2xl font-bold mb-1 capitalize">
                        {analysisResult.results.land_use.dominant_class}
                      </p>
                      <p className="text-sm opacity-80">uso predominante na área</p>
                    </div>
                  </div>

                  {/* Land Use Breakdown - Card Style */}
                  {analysisResult.results.land_use.by_class && Object.keys(analysisResult.results.land_use.by_class).length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center">
                        <Layers className="h-6 w-6 mr-3 text-blue-600" />
                        Distribuição Detalhada do Uso do Solo
                      </h3>

                      {/* Large Visual Bar */}
                      <div className="mb-8">
                        <p className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-3">Proporção Visual</p>
                        <div className="w-full h-16 flex rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 dark:border-slate-700">
                          {Object.entries(analysisResult.results.land_use.by_class)
                            .sort(([, a]: [string, any], [, b]: [string, any]) => (b.percent || 0) - (a.percent || 0))
                            .map(([classId, classData]: [string, any]) => (
                              <div
                                key={classId}
                                style={{
                                  width: `${classData.percent || 0}%`,
                                  backgroundColor: classData.color || '#888888'
                                }}
                                className="relative group hover:opacity-90 transition-opacity cursor-pointer"
                                title={`${classData.name}: ${(classData.percent || 0).toFixed(1)}%`}
                              >
                                {(classData.percent || 0) > 8 && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-white font-bold text-xs drop-shadow-lg">
                                      {(classData.percent || 0).toFixed(0)}%
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
                          .sort(([, a]: [string, any], [, b]: [string, any]) => (b.percent || 0) - (a.percent || 0))
                          .map(([classId, classData]: [string, any]) => (
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
                                    {classData.name || `Classe ${classId}`}
                                  </h4>
                                  
                                  {/* Category Badge */}
                                  <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400 rounded text-xs mb-3">
                                    {classData.category || 'Outros'}
                                  </span>
                                  
                                  {/* Stats */}
                                  <div className="space-y-1">
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                                        {(classData.percent || 0).toFixed(1)}%
                                      </span>
                                      <span className="text-sm text-gray-500 dark:text-slate-400">da área</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                                      {(classData.area_km2 || 0).toFixed(2)} km²
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
                            {analysisResult.results.land_use.agricultural_percent >= 50
                              ? '✓ Alta Aptidão para Produção de Biogás Agrícola'
                              : analysisResult.results.land_use.agricultural_percent >= 20
                              ? 'Aptidão Moderada para Biogás Agrícola'
                              : 'Baixo Uso Agrícola na Área'}
                          </h4>
                          <p className={`text-base leading-relaxed ${
                            analysisResult.results.land_use.agricultural_percent >= 50
                              ? 'text-green-800'
                              : analysisResult.results.land_use.agricultural_percent >= 20
                              ? 'text-blue-800'
                              : 'text-yellow-800'
                          }`}>
                            {analysisResult.results.land_use.agricultural_percent >= 50
                              ? `A área possui predominância de uso agrícola (${analysisResult.results.land_use.agricultural_percent.toFixed(1)}%), ideal para coleta de resíduos agrícolas e produção de biogás. Esta região apresenta excelente potencial para instalação de biodigestores.`
                              : analysisResult.results.land_use.agricultural_percent >= 20
                              ? `A área possui ${analysisResult.results.land_use.agricultural_percent.toFixed(1)}% de uso agrícola. Há potencial razoável para produção de biogás de fontes agrícolas, podendo ser complementado com outras fontes de biomassa.`
                              : `Apenas ${analysisResult.results.land_use.agricultural_percent.toFixed(1)}% de uso agrícola. Considere fontes urbanas (RSU) ou pecuárias para viabilizar a produção de biogás nesta região.`}
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
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2 text-green-400" />
          Link copiado para a área de transferência!
        </div>
      )}
    </div>
  )
}

// Default export with Suspense boundary for useSearchParams
export default function ProximityAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-slate-400">Carregando...</p>
        </div>
      </div>
    }>
      <ProximityAnalysisContent />
    </Suspense>
  )
}
