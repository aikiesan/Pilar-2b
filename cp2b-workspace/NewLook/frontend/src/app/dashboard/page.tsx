'use client'

import { useState, useEffect } from 'react'
import { BarChart3, Map, Users, TrendingUp, AlertCircle, Download } from 'lucide-react'
import { DATA_EXPORT_ENABLED } from '@/lib/featureFlags';

interface Municipality {
  id: number
  name: string
  code: string
  population: number
  area_km2: number
  biogas_potential: number
  coordinates: {
    lat: number
    lng: number
  }
}

interface MunicipalityStats {
  total_municipalities: number
  total_population: number
  total_area_km2: number
  total_biogas_potential: number
  average_biogas_potential: number
  timestamp: string
}

export default function DashboardPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [stats, setStats] = useState<MunicipalityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch municipalities
      const municipalitiesResponse = await fetch('/api/v1/municipalities/')
      if (!municipalitiesResponse.ok) {
        throw new Error('Failed to fetch municipalities')
      }
      const municipalitiesData = await municipalitiesResponse.json()

      // Fetch statistics
      const statsResponse = await fetch('/api/v1/municipalities/stats/summary')
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch statistics')
      }
      const statsData = await statsResponse.json()

      setMunicipalities(municipalitiesData.data)
      setStats(statsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const filteredMunicipalities = municipalities.filter(municipality =>
    municipality.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleExportData = () => {
    if (!DATA_EXPORT_ENABLED) return;  // beta: see lib/featureFlags
    if (municipalities.length === 0) return

    const csvContent = [
      'Municipality,IBGE Code,Population,Area (km²),Biogas Potential',
      ...municipalities.map(m =>
        `${m.name},${m.code},${m.population},${m.area_km2},${m.biogas_potential}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'municipalities-biogas-data.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cp2b-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dados dos municípios...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Erro ao Carregar Dados
          </h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="w-full bg-cp2b-primary text-white px-4 py-2 rounded-lg hover:bg-cp2b-secondary transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-8 w-8 text-cp2b-primary" />
              <h1 className="text-2xl font-bold text-gray-900">
                Dashboard PILAR-2b V3
              </h1>
            </div>
            <button
              onClick={handleExportData}
              hidden={!DATA_EXPORT_ENABLED}
              className="flex items-center gap-2 bg-cp2b-primary text-white px-4 py-2 rounded-lg hover:bg-cp2b-secondary transition-colors"
            >
              <Download className="h-4 w-4" />
              Exportar Dados
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Municípios</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_municipalities.toLocaleString()}
                  </p>
                </div>
                <Map className="h-8 w-8 text-cp2b-primary" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">População Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_population.toLocaleString()}
                  </p>
                </div>
                <Users className="h-8 w-8 text-cp2b-primary" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Área Total (km²)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_area_km2.toLocaleString()}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-cp2b-primary" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Potencial Médio de Biogás</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.average_biogas_potential.toFixed(1)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-cp2b-primary" />
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Municípios de São Paulo
            </h2>
            <p className="text-sm text-gray-600">
              {filteredMunicipalities.length} de {municipalities.length} municípios
            </p>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar município..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cp2b-primary focus:border-transparent"
            />
          </div>

          {/* Municipalities Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Município
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código IBGE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    População
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área (km²)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Potencial Biogás
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMunicipalities.map((municipality) => (
                  <tr key={municipality.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {municipality.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {municipality.code}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {municipality.population.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {municipality.area_km2.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {municipality.biogas_potential.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMunicipalities.length === 0 && searchTerm && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Nenhum município encontrado para &quot;{searchTerm}&quot;
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}