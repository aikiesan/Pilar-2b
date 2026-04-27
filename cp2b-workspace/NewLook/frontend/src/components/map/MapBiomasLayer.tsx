/**
 * PILAR-2b V3 - MapBiomas Layer Component
 * Renders MapBiomas agricultural land use tiles on the map
 */

'use client';

import React, { useEffect, useState } from 'react';
import { TileLayer, useMap } from 'react-leaflet';
import { logger } from '@/lib/logger';

interface MapBiomasLayerProps {
  /** Layer opacity (0-1) */
  opacity?: number;
  /** Minimum zoom level to display layer */
  minZoom?: number;
  /** Maximum zoom level to display layer */
  maxZoom?: number;
}

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * MapBiomas tile layer component
 *
 * Displays MapBiomas agricultural land use classification as colored tiles.
 * Connects to the backend tile serving API.
 */
export default function MapBiomasLayer({
  opacity = 0.7,
  minZoom = 7,
  maxZoom = 14
}: MapBiomasLayerProps) {
  const map = useMap();
  const [isVisible, setIsVisible] = useState(true);

  // Monitor zoom level to control visibility
  useEffect(() => {
    const handleZoom = () => {
      const currentZoom = map.getZoom();
      setIsVisible(currentZoom >= minZoom);
    };

    // Initial check
    handleZoom();

    // Listen to zoom changes
    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, minZoom]);

  // Don't render if zoom is too low
  if (!isVisible) {
    return null;
  }

  // Tile URL template for MapBiomas tiles from backend API
  const tileUrl = `${API_BASE_URL}/api/v1/mapbiomas/tiles/{z}/{x}/{y}.png`;

  return (
    <TileLayer
      url={tileUrl}
      opacity={opacity}
      minZoom={minZoom}
      maxZoom={maxZoom}
      tileSize={256}
      zIndex={100}
      attribution="MapBiomas - Agropecuaria SP 2024"
      // Error handling for tiles
      eventHandlers={{
        tileerror: (error) => {
          logger.warn('MapBiomas tile error:', error);
        }
      }}
    />
  );
}
