'use client';

/**
 * Proximity Map Component with click handler for point selection
 * Shows analysis point marker, radius circle, and municipalities
 */
import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface ProximityMapComponentProps {
  analysisPoint: { lat: number; lng: number } | null;
  radiusKm: number;
  onPointSelect: (lat: number, lng: number) => void;
  municipalities?: Array<{
    name: string;
    center: [number, number];
    distance: number;
  }>;
  isAnalyzing?: boolean;
}

export default function ProximityMapComponent({
  analysisPoint,
  radiusKm,
  onPointSelect,
  municipalities = [],
  isAnalyzing = false
}: ProximityMapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const municipalityMarkersRef = useRef<L.CircleMarker[]>([]);
  const [mounted, setMounted] = useState(false);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return;

    // Center on São Paulo state
    const map = L.map('proximity-map', {
      center: [-22.5, -48.5],
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    // Map click handler with visual feedback animation
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (!isAnalyzing) {
        // Create ripple effect on click
        const ripple = L.circle([e.latlng.lat, e.latlng.lng], {
          radius: 1000,
          color: '#9333EA',
          fillColor: '#9333EA',
          fillOpacity: 0.3,
          weight: 2,
        }).addTo(map);
        
        // Animate and remove ripple
        setTimeout(() => {
          map.removeLayer(ripple);
        }, 300);
        
        onPointSelect(e.latlng.lat, e.latlng.lng);
      }
    });

    // Change cursor to crosshair when hovering
    map.getContainer().style.cursor = isAnalyzing ? 'wait' : 'crosshair';

    mapRef.current = map;
    setMounted(true);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update cursor based on analyzing state
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.getContainer().style.cursor = isAnalyzing ? 'wait' : 'crosshair';
    }
  }, [isAnalyzing]);

  // Update analysis point marker
  useEffect(() => {
    if (!mapRef.current || !mounted) return;

    // Remove old marker
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }

    if (analysisPoint) {
      // Create purple marker for analysis point
      const purpleIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: #9333EA;
            width: 24px;
            height: 24px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 3px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 24],
      });

      const marker = L.marker([analysisPoint.lat, analysisPoint.lng], {
        icon: purpleIcon,
        draggable: true,
      }).addTo(mapRef.current);

      marker.bindPopup(`
        <div style="text-align: center; padding: 4px;">
          <strong>Ponto de Análise</strong><br/>
          Lat: ${analysisPoint.lat.toFixed(4)}<br/>
          Lng: ${analysisPoint.lng.toFixed(4)}
        </div>
      `);

      // Handle marker drag
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPointSelect(pos.lat, pos.lng);
      });

      markerRef.current = marker;

      // Center map on point
      mapRef.current.setView([analysisPoint.lat, analysisPoint.lng], 10);
    }
  }, [analysisPoint, mounted, onPointSelect]);

  // Update radius circle
  useEffect(() => {
    if (!mapRef.current || !mounted) return;

    // Remove old circle
    if (circleRef.current) {
      mapRef.current.removeLayer(circleRef.current);
      circleRef.current = null;
    }

    if (analysisPoint && radiusKm > 0) {
      // Determine circle color based on radius recommendations
      let circleColor = '#9333EA'; // Purple default
      if (radiusKm <= 20) {
        circleColor = '#22C55E'; // Green (optimal)
      } else if (radiusKm <= 30) {
        circleColor = '#EAB308'; // Yellow (acceptable)
      } else {
        circleColor = '#EF4444'; // Red (cautionary)
      }

      const circle = L.circle([analysisPoint.lat, analysisPoint.lng], {
        radius: radiusKm * 1000, // Convert km to meters
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.15,
        weight: 2,
        opacity: 0.6,
      }).addTo(mapRef.current);

      circle.bindPopup(`
        <div style="text-align: center; padding: 4px;">
          <strong>Raio de Captação</strong><br/>
          ${radiusKm} km
        </div>
      `);

      circleRef.current = circle;

      // Fit bounds to circle
      mapRef.current.fitBounds(circle.getBounds(), { padding: [50, 50] });
    }
  }, [analysisPoint, radiusKm, mounted]);

  // Update municipality markers
  useEffect(() => {
    if (!mapRef.current || !mounted) return;

    // Remove old markers
    municipalityMarkersRef.current.forEach(marker => {
      mapRef.current?.removeLayer(marker);
    });
    municipalityMarkersRef.current = [];

    // Add new markers
    municipalities.forEach(mun => {
      const marker = L.circleMarker(mun.center, {
        radius: 6,
        fillColor: '#3B82F6',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8,
      }).addTo(mapRef.current!);

      marker.bindPopup(`
        <div style="padding: 4px;">
          <strong>${mun.name}</strong><br/>
          Distância: ${mun.distance.toFixed(2)} km
        </div>
      `);

      municipalityMarkersRef.current.push(marker);
    });
  }, [municipalities, mounted]);

  return (
    <div className="relative">
      <div
        id="proximity-map"
        className="w-full h-[600px] rounded-lg shadow-md border border-gray-200"
      />
      
      {/* Instruction overlay when no point selected */}
      {!analysisPoint && !isAnalyzing && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg z-[1000] pointer-events-none">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            <span className="font-medium">Clique no mapa para selecionar o ponto de análise</span>
          </div>
        </div>
      )}

      {/* Analyzing overlay */}
      {isAnalyzing && (
        <div className="absolute inset-0 bg-black/10 rounded-lg flex items-center justify-center z-[1000] pointer-events-none">
          <div className="bg-white px-6 py-4 rounded-lg shadow-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              <span className="text-gray-700 font-medium">Analisando...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

