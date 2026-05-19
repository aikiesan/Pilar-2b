'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { MapPin, Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

// Dynamically import map component to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

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

interface MapViewProps {
  center?: [number, number]
  zoom?: number
  municipalities?: Municipality[]
}

export default function MapPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLayer, setSelectedLayer] = useState('osm')
  const [mapRef, setMapRef] = useState<any>(null)

  // São Paulo state center coordinates
  const DEFAULT_CENTER: [number, number] = [-23.5505, -46.6333]
  const DEFAULT_ZOOM = 8

  useEffect(() => {
    fetchMunicipalities()
  }, [])

  const fetchMunicipalities = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/municipalities/')

      if (!response.ok) {
        throw new Error('Failed to fetch municipalities')
      }

      const data = await response.json()
      setMunicipalities(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleLayerChange = (layer: string) => {
    setSelectedLayer(layer)
  }

  const handleZoomIn = () => {
    if (mapRef) {
      mapRef.setZoom(mapRef.getZoom() + 1)
    }
  }

  const handleZoomOut = () => {
    if (mapRef) {
      mapRef.setZoom(mapRef.getZoom() - 1)
    }
  }

  const handleResetView = () => {
    if (mapRef) {
      mapRef.setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    }
  }

  const getTileLayerUrl = (layer: string) => {
    switch (layer) {
      case 'osm':
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      case 'terrain':
        return 'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg'
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    }
  }

  const getTileLayerAttribution = (layer: string) => {
    switch (layer) {
      case 'osm':
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      case 'satellite':
        return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      case 'terrain':
        return 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      default:
        return ''
    }
  }

  const getBiogasColorScale = (potential: number) => {
    if (potential >= 80) return '#2d5016' // Dark green
    if (potential >= 60) return '#52791f' // Medium green
    if (potential >= 40) return '#7da32c' // Light green
    if (potential >= 20) return '#a8cd39' // Very light green
    return '#d4f746' // Yellow green
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cp2b-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando mapa...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 shadow-lg max-w-md w-full">
          <MapPin className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Erro ao Carregar Mapa
          </h2>
          <p className="text-gray-600 text-center mb-4">{error}</p>
          <button
            onClick={fetchMunicipalities}
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
              <MapPin className="h-8 w-8 text-cp2b-primary" />
              <h1 className="text-2xl font-bold text-gray-900">
                Mapa de Potencial Biogás - São Paulo
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {municipalities.length} municípios
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-1000 bg-white rounded-lg shadow-lg p-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Camadas do Mapa</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="layer"
                    value="osm"
                    checked={selectedLayer === 'osm'}
                    onChange={(e) => handleLayerChange(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">OpenStreetMap</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="layer"
                    value="satellite"
                    checked={selectedLayer === 'satellite'}
                    onChange={(e) => handleLayerChange(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Satélite</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="layer"
                    value="terrain"
                    checked={selectedLayer === 'terrain'}
                    onChange={(e) => handleLayerChange(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-sm">Terreno</span>
                </label>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Controles</h3>
              <div className="flex space-x-2">
                <button
                  onClick={handleZoomIn}
                  className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                  title="Aumentar Zoom"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                  title="Diminuir Zoom"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                  title="Resetar Vista"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-1000 bg-white rounded-lg shadow-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Potencial Biogás (m³/ano)
          </h3>
          <div className="space-y-1">
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: getBiogasColorScale(90) }}
              ></div>
              <span className="text-xs">80+ (Alto)</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: getBiogasColorScale(70) }}
              ></div>
              <span className="text-xs">60-79 (Médio-Alto)</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: getBiogasColorScale(50) }}
              ></div>
              <span className="text-xs">40-59 (Médio)</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: getBiogasColorScale(30) }}
              ></div>
              <span className="text-xs">20-39 (Baixo)</span>
            </div>
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: getBiogasColorScale(10) }}
              ></div>
              <span className="text-xs">&lt;20 (Muito Baixo)</span>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ height: 'calc(100vh - 64px)', width: '100%' }}>
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            ref={setMapRef}
          >
            <TileLayer
              url={getTileLayerUrl(selectedLayer)}
              attribution={getTileLayerAttribution(selectedLayer)}
            />

            {municipalities.map((municipality) => (
              <Marker
                key={municipality.id}
                position={[municipality.coordinates.lat, municipality.coordinates.lng]}
              >
                <Popup>
                  <div className="p-2">
                    <h4 className="font-bold text-lg mb-2">{municipality.name}</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Código IBGE:</strong> {municipality.code}</p>
                      <p><strong>População:</strong> {municipality.population.toLocaleString()}</p>
                      <p><strong>Área:</strong> {municipality.area_km2.toLocaleString()} km²</p>
                      <p>
                        <strong>Potencial Biogás:</strong>{' '}
                        <span
                          className="px-2 py-1 rounded text-white text-xs"
                          style={{ backgroundColor: getBiogasColorScale(municipality.biogas_potential) }}
                        >
                          {municipality.biogas_potential.toFixed(1)} m³/ano
                        </span>
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </main>
    </div>
  )
}