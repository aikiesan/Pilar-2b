/**
 * PILAR-2b V3 - Map Search Box Component
 * Search and zoom to municipalities
 * Note: This component must be used inside MapContainer (needs useMap hook)
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { MunicipalityCollection } from '@/types/geospatial';
import { Search, X } from 'lucide-react';
import L from 'leaflet';

interface MapSearchBoxProps {
  data: MunicipalityCollection;
}

export default function MapSearchBox({ data }: MapSearchBoxProps) {
  const map = useMap();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // Filter municipalities based on search term
  const filteredMunicipalities = searchTerm.length >= 2
    ? data.features
        .filter(feature =>
          feature.properties.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          feature.properties.ibge_code.toString().includes(searchTerm)
        )
        .slice(0, 10) // Limit to 10 results
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle municipality selection
  const handleSelectMunicipality = (feature: typeof data.features[0]) => {
    const geom = feature.geometry;

    if (geom.type === 'Point') {
      const coords = geom.coordinates as number[];
      map.flyTo([coords[1], coords[0]], 12, { duration: 1.5 });
    } else if ((geom.type as string) === 'Polygon' || geom.type === 'MultiPolygon') {
      // Create a GeoJSON layer temporarily to get bounds
      const geoLayer = L.geoJSON(geom as any);
      const bounds = geoLayer.getBounds();
      if (bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [40, 40], duration: 1.5 });
      }
    }

    // Find the layer and open its popup
    map.eachLayer((layer: any) => {
      if (layer.feature && layer.feature.properties.id === feature.properties.id) {
        layer.openPopup();
      }
    });

    setSearchTerm(feature.properties.name);
    setIsOpen(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredMunicipalities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredMunicipalities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredMunicipalities.length) {
          handleSelectMunicipality(filteredMunicipalities[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // Clear search
  const handleClear = () => {
    setSearchTerm('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Create a custom Leaflet control that contains our search box
  useEffect(() => {
    if (!map) return;

    const SearchControl = L.Control.extend({
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        container.style.background = 'transparent';
        container.style.border = 'none';
        container.style.boxShadow = 'none';
        return container;
      },
    });

    const searchControl = new SearchControl({ position: 'topright' });
    map.addControl(searchControl);

    return () => {
      map.removeControl(searchControl);
    };
  }, [map]);

  return (
    <div ref={searchRef} className="hidden md:block" style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, pointerEvents: 'auto' }}>
      <div style={{ width: '300px' }}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          role="combobox"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar município..."
          className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent text-sm"
          aria-label="Buscar município"
          aria-autocomplete="list"
          aria-controls="search-results"
          aria-expanded={isOpen && filteredMunicipalities.length > 0}
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && searchTerm.length >= 2 && (
        <div
          id="search-results"
          className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-[1000]"
          role="listbox"
        >
          {filteredMunicipalities.length > 0 ? (
            <ul className="py-1">
              {filteredMunicipalities.map((feature, index) => (
                <li
                  key={feature.properties.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-green-50 text-green-900'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleSelectMunicipality(feature)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {feature.properties.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        IBGE: {feature.properties.ibge_code} • {feature.properties.immediate_region}
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-green-700">
                      {(feature.properties.total_biogas_m3_year / 1000000).toFixed(1)}M m³/ano
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Nenhum município encontrado
            </div>
          )}
        </div>
      )}

      {/* Search hint */}
      {searchTerm.length === 1 && (
        <div className="absolute top-full mt-2 w-full bg-blue-50 border border-blue-200 rounded-lg shadow-md px-3 py-2 text-xs text-blue-700 z-[1000]">
          Digite pelo menos 2 caracteres para buscar
        </div>
      )}
      </div>
    </div>
  );
}
