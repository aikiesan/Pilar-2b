/**
 * PILAR-2b V3 - Proximity Analysis Map Component
 * Interactive map for selecting points and visualizing analysis results
 * Enhanced: Better error handling, zoom controls, and municipality visualization
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, GeoJSON, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/lib/leafletConfig';

// São Paulo state center coordinates
const SAO_PAULO_CENTER: [number, number] = [-22.5, -48.5];
const DEFAULT_ZOOM = 7;

// Tile layer options with error handling
const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: 'OpenStreetMap',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    name: 'Satélite',
  },
};

// Custom marker icon for selected point
const selectedPointIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `
    <div style="
      width: 24px;
      height: 24px;
      background: #059669;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface ProximityMapProps {
  selectedPoint: { lat: number; lng: number } | null;
  radius: number;
  onMapClick: (lat: number, lng: number) => void;
  bufferGeometry?: any;
  municipalities?: any[];
}

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to auto-fit map bounds to selected point and radius
function MapBoundsHandler({
  selectedPoint,
  radius
}: {
  selectedPoint: { lat: number; lng: number } | null;
  radius: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPoint) {
      // Calculate bounds for the radius circle
      // Approximate conversion: 1 degree latitude ≈ 111 km
      const latDelta = (radius / 111) * 1.2; // Add 20% padding
      const lngDelta = (radius / (111 * Math.cos(selectedPoint.lat * Math.PI / 180))) * 1.2;

      const bounds = L.latLngBounds(
        [selectedPoint.lat - latDelta, selectedPoint.lng - lngDelta],
        [selectedPoint.lat + latDelta, selectedPoint.lng + lngDelta]
      );

      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [selectedPoint, radius, map]);

  return null;
}

export default function ProximityMap({
  selectedPoint,
  radius,
  onMapClick,
  bufferGeometry,
  municipalities
}: ProximityMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-[500px] bg-gray-100 flex items-center justify-center">
        <p className="text-gray-600">Carregando mapa...</p>
      </div>
    );
  }

  // Style for buffer geometry from analysis results
  const bufferStyle = {
    fillColor: '#059669',
    fillOpacity: 0.1,
    color: '#059669',
    weight: 2,
    dashArray: '5, 5'
  };

  // Style for municipality highlights
  const municipalityStyle = (feature: any) => {
    const biogas = feature?.properties?.biogas_m3_year || 0;
    const maxBiogas = 50000000; // 50 million m³/year as reference
    const opacity = Math.min(0.3 + (biogas / maxBiogas) * 0.5, 0.8);

    return {
      fillColor: '#3b82f6',
      fillOpacity: opacity,
      color: '#1d4ed8',
      weight: 1
    };
  };

  return (
    <div className="relative w-full h-[600px]">
      <MapContainer
        center={SAO_PAULO_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
        className="z-0 cursor-crosshair"
      >
        {/* Custom zoom control position */}
        <ZoomControl position="topright" />

        {/* Base Map Tile Layer with error handling */}
        <TileLayer
          attribution={TILE_LAYERS.osm.attribution}
          url={TILE_LAYERS.osm.url}
          maxZoom={19}
          errorTileUrl="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />

        {/* Click handler */}
        <MapClickHandler onMapClick={onMapClick} />

        {/* Auto-fit bounds when point/radius changes */}
        <MapBoundsHandler selectedPoint={selectedPoint} radius={radius} />

        {/* Display buffer geometry from analysis */}
        {bufferGeometry && (
          <GeoJSON
            key={`buffer-${JSON.stringify(bufferGeometry).slice(0, 100)}`}
            data={bufferGeometry}
            style={bufferStyle}
          />
        )}

        {/* Selected point marker with radius preview */}
        {selectedPoint && (
          <>
            {/* Radius circle preview */}
            <Circle
              center={[selectedPoint.lat, selectedPoint.lng]}
              radius={radius * 1000} // Convert km to meters
              pathOptions={{
                color: '#059669',
                fillColor: '#059669',
                fillOpacity: 0.15,
                weight: 2,
              }}
            />

            {/* Selected point marker */}
            <Marker
              position={[selectedPoint.lat, selectedPoint.lng]}
              icon={selectedPointIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold mb-1">Ponto Selecionado</p>
                  <p className="text-gray-600">
                    Lat: {selectedPoint.lat.toFixed(6)}<br />
                    Lng: {selectedPoint.lng.toFixed(6)}
                  </p>
                  <p className="text-emerald-600 mt-1">
                    Raio: {radius} km
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Municipality markers from analysis results */}
        {municipalities && municipalities.map((mun: any, index: number) => {
          // Get centroid coordinates - handle different formats
          let coords: [number, number] | null = null;

          if (mun.centroid) {
            // Format: [lng, lat]
            coords = [mun.centroid[1], mun.centroid[0]];
          } else if (mun.latitude && mun.longitude) {
            // Format: {latitude, longitude}
            coords = [mun.latitude, mun.longitude];
          } else if (mun.geom_centroid) {
            // Format: geometry object
            const geom = typeof mun.geom_centroid === 'string'
              ? JSON.parse(mun.geom_centroid)
              : mun.geom_centroid;
            if (geom && geom.coordinates) {
              coords = [geom.coordinates[1], geom.coordinates[0]];
            }
          }

          if (!coords) return null;

          // Calculate marker size based on biogas potential
          const biogas = mun.biogas_m3_year || 0;
          const markerSize = Math.min(8 + Math.log10(biogas + 1) * 2, 16);

          return (
            <Marker
              key={`mun-${mun.id || index}`}
              position={coords}
              icon={new L.DivIcon({
                className: 'municipality-marker',
                html: `
                  <div style="
                    width: ${markerSize}px;
                    height: ${markerSize}px;
                    background: ${biogas > 10000000 ? '#22c55e' : biogas > 1000000 ? '#3b82f6' : '#94a3b8'};
                    border: 2px solid white;
                    border-radius: 50%;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
                  "></div>
                `,
                iconSize: [markerSize, markerSize],
                iconAnchor: [markerSize / 2, markerSize / 2],
              })}
            >
              <Popup>
                <div className="text-sm min-w-[180px]">
                  <p className="font-semibold text-gray-900 mb-1">{mun.name}</p>
                  <div className="space-y-0.5 text-gray-600">
                    <p>Distância: <span className="font-medium">{mun.distance_km?.toFixed(1) || '0'} km</span></p>
                    <p>População: <span className="font-medium">{(mun.population || 0).toLocaleString('pt-BR')}</span></p>
                  </div>
                  <p className="mt-1 text-emerald-600 font-medium">
                    Biogás: {((biogas) / 1000000).toFixed(2)} mi m³/ano
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Instructions overlay */}
      {!selectedPoint && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-lg shadow-md">
          <p className="text-sm text-gray-600">
            👆 Clique no mapa para selecionar um ponto de análise
          </p>
        </div>
      )}

      {/* Coordinates display */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white px-3 py-2 rounded-lg shadow-md">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">São Paulo</span> - Estado
        </p>
        {selectedPoint && (
          <p className="text-xs text-emerald-600 mt-1">
            {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
          </p>
        )}
      </div>
    </div>
  );
}
