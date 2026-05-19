/**
 * PILAR-2b V3 - Client-Only Map Wrapper
 * Ensures Map Component only renders on client side to avoid SSR/hydration issues
 */

'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import MapComponent with SSR disabled
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#1E5128] mx-auto"></div>
        <p className="mt-6 text-gray-600 font-medium text-lg">Carregando mapa interativo...</p>
        <p className="mt-2 text-gray-500 text-sm">645 municípios de São Paulo</p>
      </div>
    </div>
  ),
});

/**
 * ClientOnlyMap - Robust wrapper for client-side only map rendering
 *
 * This component provides an additional layer of protection against SSR issues by:
 * 1. Using useState to track client-side mounting
 * 2. Using dynamic import with ssr: false
 * 3. Showing a loading state until the map is ready
 *
 * This prevents hydration mismatches and ensures Leaflet (which requires window/document)
 * only runs in the browser.
 */
export default function ClientOnlyMap() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Ensure we're on the client side
    setIsMounted(true);
  }, []);

  // Don't render anything until we're certain we're on the client
  if (!isMounted) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#1E5128] mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium text-lg">Preparando mapa...</p>
        </div>
      </div>
    );
  }

  // Render the map component only on client side
  return <MapComponent />;
}
