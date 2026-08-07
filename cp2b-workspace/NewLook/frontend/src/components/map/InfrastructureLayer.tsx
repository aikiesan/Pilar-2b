/**
 * PILAR-2b V3 - Infrastructure Layer Component (Optimized)
 * Renders infrastructure GeoJSON layers with React Query caching
 */

'use client';

import React, { useEffect } from 'react';
import { GeoJSON, Marker, Popup } from 'react-leaflet';
import type { GeoJsonObject, Feature } from 'geojson';
import L from 'leaflet';
import { logger } from '@/lib/logger';
import { useInfrastructureLayer } from '@/hooks/useGeospatialData';
import { PLANT_LAYERS, BIOMETHANE_PLANT, type PlantTypeInfo } from '@/lib/plantLayers';

export type InfrastructureLayerStatus = {
  layerType: string;
  state: 'loading' | 'empty' | 'error' | 'ready';
  message?: string;
  featureCount?: number;
};

// Hyphenated ids are the legacy São Paulo shapefile layers; snake_case ids are
// the national PostGIS layers (migration 023 / MapBiomas 10.1 INFRAESTRUTURA).
// The id shape is what useInfrastructureLayer routes on, so keep them distinct.
type LegacySpLayer =
  | 'railways' | 'pipelines' | 'substations' | 'biogas-plants'
  | 'transmission-lines' | 'etes'
  | 'admin-regions' | 'intermediate-regions' | 'immediate-regions';

export type NationalLayer =
  | 'biogas_plant' | 'biodiesel_plant' | 'ethanol_plant' | 'slaughterhouse'
  | 'biomass_thermal_plant' | 'substation' | 'transmission_line'
  | 'gas_pipeline_transport' | 'gas_pipeline_distribution'
  // Rota de escoamento: onde o biometano entra na malha
  | 'gas_delivery_point' | 'compression_station' | 'gas_processing_unit'
  | 'gas_pipeline_outflow'
  // Restrição de sítio: mobilizável não é o mesmo que licenciável
  | 'protected_area_state' | 'indigenous_territory' | 'settlement'
  // Logística
  | 'highway_state' | 'highway_federal';

interface InfrastructureLayerProps {
  layerType: LegacySpLayer | NationalLayer;
  onStatus?: (status: InfrastructureLayerStatus) => void;
  /** Server-side UF filter; national layers only. */
  uf?: string;
  /** Server-side bbox filter, for layers whose uf is NULL by design (lines and
   *  polygons that cross state borders). 'min_lng,min_lat,max_lng,max_lat'. */
  bbox?: string;
  /**
   * Leaflet pane to draw into. Infrastructure must sit ABOVE the municipality
   * choropleth: that choropleth renders on a canvas in the default overlayPane
   * (z 400), and infra lines/polygons are SVG in the same pane — so without a
   * dedicated higher pane the pipelines/highways/protected areas would be buried
   * under the fill. MapComponent creates an 'infrastructure' pane at z 450.
   */
  pane?: string;
}

// Layer styling configurations
const layerStyles: Record<string, any> = {
  railways: {
    color: '#8B4513',
    weight: 2,
    opacity: 0.7
  },
  pipelines: {
    color: '#FF6B35',
    weight: 3,
    opacity: 0.8
  },
  'transmission-lines': {
    color: '#FFD700',
    weight: 2,
    opacity: 0.7,
    dashArray: '5, 5'
  },
  'admin-regions': {
    color: '#4169E1',
    weight: 2,
    opacity: 0.6,
    fillColor: '#4169E1',
    fillOpacity: 0.1
  },
  'intermediate-regions': {
    color: '#9370DB',
    weight: 2,
    opacity: 0.6,
    fillColor: '#9370DB',
    fillOpacity: 0.1
  },
  'immediate-regions': {
    color: '#8A2BE2',
    weight: 1.5,
    opacity: 0.6,
    fillColor: '#8A2BE2',
    fillOpacity: 0.1
  },
  substations: {
    // Point features use markers instead of styles
  },
  'biogas-plants': {
    // Point features use markers instead of styles
  },
  etes: {
    // Point features use markers instead of styles
  },

  // ── National layers (migration 023) ──────────────────────────────────────
  // Line layers need a style; the point layers below fall through to markers.
  transmission_line: {
    color: '#FFD700',
    weight: 2,
    opacity: 0.7,
    dashArray: '5, 5'
  },
  gas_pipeline_transport: {
    color: '#FF6B35',
    weight: 3,
    opacity: 0.8
  },
  gas_pipeline_distribution: {
    color: '#FFA07A',
    weight: 2,
    opacity: 0.8,
    dashArray: '4, 4'
  },
  // Escoamento: mesma família cromática dos outros gasodutos, tom distinto.
  gas_pipeline_outflow: {
    color: '#FF8C42',
    weight: 1.8,
    opacity: 0.75,
    dashArray: '2, 3'
  },
  // Restrição de sítio — contorno visível, preenchimento discreto. São camadas
  // de contexto: precisam ser lidas como limite, não competir com o coroplético.
  protected_area_state: {
    color: '#166534',
    weight: 1,
    opacity: 0.7,
    fillColor: '#22C55E',
    fillOpacity: 0.18
  },
  indigenous_territory: {
    color: '#92400E',
    weight: 1,
    opacity: 0.7,
    fillColor: '#F59E0B',
    fillOpacity: 0.18
  },
  settlement: {
    color: '#7C2D12',
    weight: 0.8,
    opacity: 0.6,
    fillColor: '#FB923C',
    fillOpacity: 0.15
  },
  // Rodovias: finas e neutras. São referência de leitura para o resto do mapa,
  // nunca o dado em inspeção.
  highway_state: {
    color: '#64748B',
    weight: 0.8,
    opacity: 0.55
  },
  highway_federal: {
    color: '#334155',
    weight: 1.2,
    opacity: 0.65
  },
  biogas_plant: {},
  biodiesel_plant: {},
  ethanol_plant: {},
  slaughterhouse: {},
  biomass_thermal_plant: {},
  substation: {}
};

// Custom icons for point features
// Slaughterhouses are a national layer (frigorificos, 207 sites): they mark
// concentrated livestock-residue supply, so they matter for co-location.
const createSlaughterhouseIcon = () => {
  return L.divIcon({
    className: 'custom-slaughterhouse-icon',
    html: `
      <div style="
        background-color: #B22222;
        border: 2px solid #7F1414;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="color: #fff; font-size: 10px; font-weight: bold;">🥩</span>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

// Nós da malha de gás: entrega (city gate), compressão e processamento.
const GAS_NODE_COLORS: Record<string, [string, string]> = {
  gas_delivery_point: ['#0EA5E9', '#075985'],
  compression_station: ['#8B5CF6', '#5B21B6'],
  gas_processing_unit: ['#14B8A6', '#0F766E'],
};

const createGasNodeIcon = (layerType: string) => {
  const [fill, stroke] = GAS_NODE_COLORS[layerType] ?? ['#0EA5E9', '#075985'];
  return L.divIcon({
    className: 'custom-gas-node-icon',
    html: `
      <div style="
        background-color: ${fill};
        border: 2px solid ${stroke};
        width: 12px;
        height: 12px;
        transform: rotate(45deg);
      "></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
};

const createSubstationIcon = () => {
  return L.divIcon({
    className: 'custom-substation-icon',
    html: `
      <div style="
        background-color: #FFD700;
        border: 2px solid #FFA500;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="color: #000; font-size: 10px; font-weight: bold;">⚡</span>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

/**
 * Marker for one plant type, built from the shared catalogue.
 *
 * These four icons used to be four near-identical literals here, with the
 * legend keeping its own copy of the same colours — so a plant type could be
 * drawn in one colour and explained in another. Both sides read
 * lib/plantLayers now.
 */
const createPlantIcon = (type: PlantTypeInfo, className: string) => {
  return L.divIcon({
    className,
    html: `
      <div style="
        background-color: ${type.color};
        border: 2px solid ${type.borderColor};
        border-radius: 50%;
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="color: white; font-size: 12px; font-weight: bold;">${type.icon}</span>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
};

const createEthanolPlantIcon = () =>
  createPlantIcon(PLANT_LAYERS.ethanol_plant, 'custom-ethanol-plant-icon');
const createBiogasPlantIcon = () =>
  createPlantIcon(PLANT_LAYERS.biogas_plant, 'custom-biogas-plant-icon');
const createBiomassUTEIcon = () =>
  createPlantIcon(PLANT_LAYERS.biomass_thermal_plant, 'custom-biomass-ute-icon');
const createBiodieselPlantIcon = () =>
  createPlantIcon(PLANT_LAYERS.biodiesel_plant, 'custom-biodiesel-plant-icon');
// Biometano is a SUBTIPO of the legacy SP layer, not a layer of its own.
const createBiomethaneIcon = () =>
  createPlantIcon(BIOMETHANE_PLANT, 'custom-biomethane-plant-icon');

const createETEIcon = () => {
  return L.divIcon({
    className: 'custom-ete-icon',
    html: `
      <div style="
        background-color: #4682B4;
        border: 2px solid #1E3A8A;
        border-radius: 50%;
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="color: white; font-size: 10px; font-weight: bold;">💧</span>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

export default function InfrastructureLayer({ layerType, onStatus, uf, bbox, pane }: InfrastructureLayerProps) {
  // Use React Query hook for automatic caching and background refetching
  const { data, loading, error, isFetching } = useInfrastructureLayer(layerType, true, uf, bbox);
  const featureCount = Array.isArray(data?.features) ? data.features.length : 0;

  useEffect(() => {
    if (!onStatus) return;

    if (loading || (isFetching && !data)) {
      onStatus({ layerType, state: 'loading' });
      return;
    }

    if (error) {
      onStatus({
        layerType,
        state: 'error',
        message: error.message || `Falha ao carregar a camada ${layerType}`,
      });
      return;
    }

    if (data && featureCount === 0) {
      onStatus({
        layerType,
        state: 'empty',
        featureCount,
        message: data.metadata?.error || data.metadata?.note || 'Camada sem feições disponíveis no servidor',
      });
      return;
    }

    if (data) {
      onStatus({ layerType, state: 'ready', featureCount });
    }
  }, [data, error, featureCount, isFetching, layerType, loading, onStatus]);

  // Show subtle loading indicator when refetching in background
  if (isFetching && !data) {
    logger.info(`Loading ${layerType} layer...`);
  }

  // Don't render geometry while loading or if there's an error. The parent map
  // receives the status above and can surface it to users instead of failing silently.
  if (loading || error || !data || featureCount === 0) {
    if (error) {
      logger.error(`Error loading ${layerType} layer:`, error);
    }
    return null;
  }

  logger.info(`Rendering ${layerType} layer (cached: ${!isFetching})`);

  // Style function for line features (roads, pipelines)
  const style = (feature?: Feature) => {
    return layerStyles[layerType] || {
      color: '#666',
      weight: 2,
      opacity: 0.7
    };
  };

  // Point to layer function for point features (substations, biogas plants, ETEs)
  const pointToLayer = (feature: any, latlng: L.LatLng) => {
    let icon: L.DivIcon;

    if (layerType === 'substations' || layerType === 'substation') {
      icon = createSubstationIcon();
    } else if (layerType === 'biogas_plant') {
      // National layer: one icon per layer, since the layer itself is the type.
      icon = createBiogasPlantIcon();
    } else if (layerType === 'ethanol_plant') {
      icon = createEthanolPlantIcon();
    } else if (layerType === 'biomass_thermal_plant') {
      icon = createBiomassUTEIcon();
    } else if (layerType === 'biodiesel_plant') {
      icon = createBiodieselPlantIcon();
    } else if (layerType === 'slaughterhouse') {
      icon = createSlaughterhouseIcon();
    } else if (layerType === 'biogas-plants') {
      // Differentiate biomass plants by type
      const props = feature.properties;
      const subtype = props.SUBTIPO?.toLowerCase() || '';
      const plantType = props.TIPO_PLANT?.toLowerCase() || '';

      // Determine icon based on plant subtype or type
      if (subtype.includes('etanol') || plantType.includes('etanol')) {
        icon = createEthanolPlantIcon();
      } else if (subtype.includes('biometano') || plantType.includes('biometano')) {
        icon = createBiomethaneIcon();
      } else if (subtype.includes('ute') || plantType.includes('ute') || subtype.includes('termelétrica') || subtype.includes('termeletrica')) {
        icon = createBiomassUTEIcon();
      } else if (subtype.includes('biogás') || subtype.includes('biogas') || plantType.includes('biogás') || plantType.includes('biogas')) {
        icon = createBiogasPlantIcon();
      } else {
        // Default to biogas icon for unknown types
        icon = createBiogasPlantIcon();
      }
    } else if (layerType === 'etes') {
      icon = createETEIcon();
    } else if (
      layerType === 'gas_delivery_point' ||
      layerType === 'compression_station' ||
      layerType === 'gas_processing_unit'
    ) {
      // A rota do gás em um só registro visual: losango, para não se confundir
      // com os círculos das usinas. A cor separa os três papéis — entrega,
      // compressão, processamento — que é a leitura que interessa a quem
      // pergunta "onde eu injeto o biometano que este município produz?".
      icon = createGasNodeIcon(layerType);
    } else {
      // Default marker
      icon = L.divIcon({
        className: 'custom-default-icon',
        html: '<div style="background-color: #999; width: 12px; height: 12px; border-radius: 50%;"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
    }

    // Same pane as the paths so every infrastructure feature sits above the
    // municipality choropleth (markers default to markerPane, which is already
    // above it, but keeping them together makes the layering explicit).
    return L.marker(latlng, pane ? { icon, pane } : { icon });
  };

  // Event handlers for each feature
  const onEachFeature = (feature: any, layer: L.Layer) => {
    const props = feature.properties;

    // Create popup content based on layer type
    let popupContent = `<div style="font-family: sans-serif; max-width: 280px;">`;

    // Add specific properties based on layer type with actual shapefile field mappings
    if (layerType === 'railways') {
      const name = props.nome || props.name || props.NOME || 'Rodovia';
      popupContent += `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>`;
      popupContent += `
        <p style="margin: 4px 0; font-size: 12px;"><strong>Tipo:</strong> ${props.tipo || props.type || 'Rodovia'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Operador:</strong> ${props.operador || props.operator || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${props.status || props.STATUS || 'N/A'}</p>
      `;
    } else if (layerType === 'pipelines') {
      // Actual fields: Nome_Dut_1, Label, name, Transporta, Diam_Pol_x, P_Max_Op, situaDuo, COMPRIM_KM
      const name = props.Nome_Dut_1 || props.Label || props.name || 'Gasoduto';
      popupContent += `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>`;
      popupContent += `
        <p style="margin: 4px 0; font-size: 12px;"><strong>Tipo:</strong> ${props.name || 'Gasoduto'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Operador:</strong> ${props.Transporta || props.operator || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Diâmetro:</strong> ${props.Diam_Pol_x ? props.Diam_Pol_x + ' pol' : 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Pressão Máx:</strong> ${props.P_Max_Op ? props.P_Max_Op + ' bar' : 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Extensão:</strong> ${props.COMPRIM_KM ? props.COMPRIM_KM.toFixed(1) + ' km' : 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${props.situaDuo || 'N/A'}</p>
        ${props.MUNIC_ORIG && props.MUNIC_DEST ? `<p style="margin: 4px 0; font-size: 12px;"><strong>Trecho:</strong> ${props.MUNIC_ORIG} → ${props.MUNIC_DEST}</p>` : ''}
      `;
    } else if (layerType === 'transmission-lines') {
      // Actual fields: Nome, label, Concession, Tensao, Extensao, Ano_Opera
      const name = props.Nome || props.label || props.name || 'Linha de Transmissão';
      popupContent += `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>`;
      popupContent += `
        <p style="margin: 4px 0; font-size: 12px;"><strong>Concessionária:</strong> ${props.Concession || props.concession || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Tensão:</strong> ${props.Tensao || props.tensao || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Extensão:</strong> ${props.Extensao || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Ano Operação:</strong> ${props.Ano_Opera || 'N/A'}</p>
      `;
    } else if (layerType === 'substations') {
      // Actual fields: nome, potencia, combust, propriet, ceg, ini_oper
      const name = props.nome || props.name || 'Subestação';
      popupContent += `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>`;
      popupContent += `
        <p style="margin: 4px 0; font-size: 12px;"><strong>Potência:</strong> ${props.potencia ? props.potencia.toLocaleString() + ' kW' : 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Combustível:</strong> ${props.combust || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Proprietário:</strong> ${props.propriet || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>CEG:</strong> ${props.ceg || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Início Operação:</strong> ${props.ini_oper || 'N/A'}</p>
      `;
    } else if (layerType === 'biogas-plants') {
      // Actual fields: TIPO_PLANT, SUBTIPO, STATUS, FONTE_DADO
      const name = props.TIPO_PLANT ? `Planta de ${props.TIPO_PLANT}` : 'Planta de Biogás';
      popupContent += `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>`;
      popupContent += `
        <p style="margin: 4px 0; font-size: 12px;"><strong>Tipo:</strong> ${props.TIPO_PLANT || 'Biogás'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Subtipo:</strong> ${props.SUBTIPO || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${props.STATUS || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Fonte:</strong> ${props.FONTE_DADO || 'N/A'}</p>
      `;
    } else if (layerType === 'etes') {
      // Actual fields: ETE_NM, ETE_DS_STA, ETE_DS_TIP, ETE_QT_POP, ETE_PC_REM, ETE_DS_TI
      const name = props.ETE_NM || props.name || 'ETE';
      popupContent += `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>`;
      popupContent += `
        <p style="margin: 4px 0; font-size: 12px;"><strong>Status:</strong> ${props.ETE_DS_STA || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Tipo Tratamento:</strong> ${props.ETE_DS_TIP || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Sistema:</strong> ${props.ETE_DS_TI || 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>População Atendida:</strong> ${props.ETE_QT_POP ? props.ETE_QT_POP.toLocaleString() : 'N/A'}</p>
        <p style="margin: 4px 0; font-size: 12px;"><strong>Eficiência Remoção:</strong> ${props.ETE_PC_REM ? props.ETE_PC_REM + '%' : 'N/A'}</p>
      `;
    } else {
      // Default popup for other layers (admin regions, etc.)
      const name = props.name || props.nome || props.NM_MUN || 'Sem nome';
      popupContent += `<h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${name}</h3>`;
    }

    popupContent += `</div>`;

    layer.bindPopup(popupContent, {
      maxWidth: 300,
      className: 'infrastructure-popup'
    });

    // Hover effect for line features
    if (layer instanceof L.Path && (layerType === 'railways' || layerType === 'pipelines' || layerType === 'transmission-lines')) {
      layer.on({
        mouseover: (e) => {
          const target = e.target;
          target.setStyle({
            weight: 5,
            opacity: 1
          });
          target.bringToFront();
        },
        mouseout: (e) => {
          const target = e.target;
          target.setStyle(layerStyles[layerType]);
        }
      });
    }
  };

  return (
    <GeoJSON
      data={data}
      style={style}
      pointToLayer={pointToLayer}
      onEachFeature={onEachFeature}
      pane={pane}
    />
  );
}
