/**
 * Enhanced Map Component Example
 * Complete example showing integration of all professional enhancements
 *
 * This file demonstrates how to use all the new components together.
 * Use this as a reference for integrating features into your MapComponent.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import dynamic from 'next/dynamic';
import type { ResidueType } from './FloatingControlPanel';
import {
  Clock,
  Download,
  BarChart3,
  Layers,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { useGeospatialData } from '@/hooks/useGeospatialData';
import type { MunicipalityCollection, MunicipalityFeature } from '@/types/geospatial';
import MapLoadingSkeleton from './MapLoadingSkeleton';

// Dynamically import heavy components
const TimelineControl = dynamic(() => import('./TimelineControl'), {
  ssr: false,
});

const MunicipalityProfilePanel = dynamic(() => import('./MunicipalityProfilePanel'), {
  ssr: false,
});

const ComparisonPanel = dynamic(() => import('./ComparisonPanel'), {
  ssr: false,
});

const ExportControl = dynamic(() => import('./ExportControl'), {
  ssr: false,
});

const BubbleChartLayer = dynamic(() => import('./BubbleChartLayer'), {
  ssr: false,
});

const MunicipalityLayer = dynamic(() => import('./MunicipalityLayer'), {
  ssr: false,
});

const HeatmapLayer = dynamic(() => import('./HeatmapLayer'), {
  ssr: false,
});

const LeftFilterPanel = dynamic(() => import('./LeftFilterPanel'), {
  ssr: false,
});

// DesktopLeftPanel replaces the old RightLayerPanel - see MapComponent.tsx for integration

// São Paulo state center coordinates
const SAO_PAULO_CENTER: [number, number] = [-22.0, -48.5];
const DEFAULT_ZOOM = 7;

type VisualizationMode = 'choropleth' | 'heatmap' | 'bubble';

export default function EnhancedMapExample() {
  const { data, loading, error } = useGeospatialData();
  const [isMounted, setIsMounted] = useState(false);

  // Timeline state
  const [selectedYear, setSelectedYear] = useState(2024);
  const [showTimeline, setShowTimeline] = useState(false);

  // Municipality selection state
  const [selectedMunicipality, setSelectedMunicipality] = useState<MunicipalityFeature | null>(null);

  // Comparison state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonMunicipalities, setComparisonMunicipalities] = useState<MunicipalityFeature[]>([]);

  // Export state
  const [showExport, setShowExport] = useState(false);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResidues, setSelectedResidues] = useState<ResidueType[]>([]);
  const [biogasRange, setBiogasRange] = useState<[number, number]>([0, 10000000]);

  // Visualization state
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('choropleth');
  const [biomassType, setBiomassType] = useState<'total' | 'agricultural' | 'livestock' | 'urban'>('total');
  const [opacity, setOpacity] = useState(0.7);

  // Layer state
  const [layers, setLayers] = useState([
    { id: 'municipalities', name: 'Municípios SP', visible: true, icon: '📍' },
    { id: 'mapbiomas', name: 'MapBiomas 2024', visible: false, icon: '🌳' },
    { id: 'biogas-plants', name: 'Plantas de Biomassa', visible: false, icon: '🏭' },
  ]);

  // Initialize mounted state
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter data based on current filters
  const filteredData = useMemo(() => {
    if (!data) return data;

    const filtered = data.features.filter((feature) => {
      const props = feature.properties;

      // Search filter
      if (searchQuery) {
        const queryLower = searchQuery.toLowerCase();
        const nameMatch = props.name.toLowerCase().includes(queryLower);
        const ibgeMatch = String(props.ibge_code).includes(queryLower);
        if (!nameMatch && !ibgeMatch) return false;
      }

      // Biogas range filter
      const biogas = props.total_biogas_m3_year || 0;
      if (biogas < biogasRange[0] || biogas > biogasRange[1]) {
        return false;
      }

      // Residue filter
      if (selectedResidues.length > 0) {
        const hasResidue = selectedResidues.some((residue) => {
          const value = (props as any)[`${residue}_biogas_m3_year`] || 0;
          return value > 0;
        });
        if (!hasResidue) return false;
      }

      return true;
    });

    return {
      ...data,
      features: filtered,
    } as MunicipalityCollection;
  }, [data, searchQuery, biogasRange, selectedResidues]);

  // Handle layer toggle
  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setLayers((prevLayers) =>
      prevLayers.map((layer) =>
        layer.id === layerId ? { ...layer, visible } : layer
      )
    );
  };

  // Handle municipality click
  const handleMunicipalityClick = (municipality: MunicipalityFeature) => {
    setSelectedMunicipality(municipality);
  };

  // Don't render on server
  if (!isMounted) {
    return <MapLoadingSkeleton />;
  }

  // Loading state
  if (loading) {
    return <MapLoadingSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-slate-900 flex items-center justify-center p-8">
        <div className="glass-panel p-8 max-w-2xl text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
            Erro ao Carregar Mapa
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!data || data.features.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 dark:bg-slate-900 flex items-center justify-center p-8">
        <div className="glass-panel p-8 max-w-2xl text-center">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Nenhum Dado Disponível
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            O mapa não possui dados de municípios para exibir.
          </p>
        </div>
      </div>
    );
  }

  const displayData = filteredData || data;
  const visibleLayerIds = layers.filter((layer) => layer.visible).map((layer) => layer.id);

  return (
    <div className="relative w-full h-full">
      {/* Map Container */}
      <MapContainer
        center={SAO_PAULO_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        {/* Base Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Municipality Layers - Different visualization modes */}
        {visibleLayerIds.includes('municipalities') && displayData && (
          <>
            {visualizationMode === 'choropleth' && (
              <MunicipalityLayer
                data={displayData}
                opacity={opacity}
                biomassType={biomassType}
                selectedResidues={selectedResidues}
              />
            )}
            {visualizationMode === 'heatmap' && (
              <HeatmapLayer
                data={displayData}
                selectedResidues={selectedResidues}
                opacity={opacity}
              />
            )}
            {visualizationMode === 'bubble' && (
              <BubbleChartLayer
                data={displayData}
                opacity={opacity}
                attribute={`${biomassType}_biogas_m3_year`}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Left Filter Panel */}
      {isMounted && (
        <LeftFilterPanel
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedResidues={selectedResidues as any}
          onResiduesChange={setSelectedResidues as any}
          biomassType={biomassType}
          onBiomassTypeChange={setBiomassType}
          visualizationMode={visualizationMode}
          onVisualizationModeChange={(mode) => setVisualizationMode(mode)}
        />
      )}

      {/* Desktop Left Panel (replaces old RightLayerPanel + DesktopBottomDrawer) */}
      {/* Note: DesktopLeftPanel requires additional props - see MapComponent.tsx for full integration */}

      {/* Floating Action Buttons - Bottom Right */}
      <div className="absolute bottom-8 right-8 z-[900] flex flex-col space-y-3 animate-slide-in-right">
        {/* Timeline Toggle */}
        <button
          onClick={() => setShowTimeline(!showTimeline)}
          className={`glass-panel p-3 hover-lift transition-all ${
            showTimeline ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300'
          }`}
          title="Timeline de Dados"
        >
          <Clock className="w-6 h-6" />
        </button>

        {/* Comparison Toggle */}
        <button
          onClick={() => setShowComparison(!showComparison)}
          className={`glass-panel p-3 hover-lift transition-all relative ${
            showComparison ? 'bg-purple-600 text-white' : 'text-gray-700 dark:text-gray-300'
          }`}
          title="Comparar Municípios"
        >
          <BarChart3 className="w-6 h-6" />
          {comparisonMunicipalities.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {comparisonMunicipalities.length}
            </span>
          )}
        </button>

        {/* Export Toggle */}
        <button
          onClick={() => setShowExport(true)}
          className="glass-panel p-3 hover-lift text-gray-700 dark:text-gray-300"
          title="Exportar Dados"
        >
          <Download className="w-6 h-6" />
        </button>
      </div>

      {/* Info Badge - Top Right */}
      <div className="absolute top-20 right-4 z-[900] glass-panel-light px-4 py-2 animate-slide-in-left">
        <div className="flex items-center space-x-2 text-sm">
          <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {displayData.features.length}
          </span>
          <span className="text-gray-600 dark:text-gray-400">municípios</span>
        </div>
      </div>

      {/* Timeline Control */}
      {showTimeline && (
        <TimelineControl
          startYear={2010}
          endYear={2024}
          currentYear={selectedYear}
          onYearChange={setSelectedYear}
          visible={showTimeline}
        />
      )}

      {/* Municipality Profile Panel */}
      <MunicipalityProfilePanel
        municipality={selectedMunicipality}
        onClose={() => setSelectedMunicipality(null)}
        visible={selectedMunicipality !== null}
      />

      {/* Comparison Panel */}
      {isMounted && (
        <ComparisonPanel
          municipalities={data.features}
          selectedMunicipalities={comparisonMunicipalities}
          onMunicipalityAdd={(mun) =>
            setComparisonMunicipalities([...comparisonMunicipalities, mun])
          }
          onMunicipalityRemove={(id) =>
            setComparisonMunicipalities(
              comparisonMunicipalities.filter((m) => m.properties.ibge_code !== id)
            )
          }
          onClose={() => setShowComparison(false)}
          visible={showComparison}
        />
      )}

      {/* Export Control */}
      <ExportControl
        data={displayData}
        visible={showExport}
        onClose={() => setShowExport(false)}
      />

      {/* Stats Footer - Bottom Left */}
      <div className="absolute bottom-8 left-4 z-[900] glass-panel-light px-4 py-3 max-w-xs animate-slide-in-bottom">
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-xs">
            <TrendingUp className="w-3 h-3 text-green-600" />
            <span className="text-gray-600 dark:text-gray-400">Visualização:</span>
            <span className="font-semibold text-gray-900 dark:text-white capitalize">
              {visualizationMode === 'choropleth'
                ? 'Coroplético'
                : visualizationMode === 'heatmap'
                ? 'Mapa de Calor'
                : 'Gráfico de Bolhas'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <Layers className="w-3 h-3 text-blue-600" />
            <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {biomassType === 'total'
                ? 'Total'
                : biomassType === 'agricultural'
                ? 'Agrícola'
                : biomassType === 'livestock'
                ? 'Pecuária'
                : 'Urbano'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
