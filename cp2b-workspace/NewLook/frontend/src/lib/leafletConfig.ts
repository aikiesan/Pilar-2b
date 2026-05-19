/**
 * PILAR-2b V3 - Leaflet Configuration for Next.js
 * Fixes default marker icon paths in Next.js
 */

import L from 'leaflet';

// Fix for default marker icons in Next.js
// Next.js doesn't handle Leaflet's default icon paths correctly
// Using unpkg CDN for reliable icon delivery in production
export function fixLeafletIcons() {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

// Call this before using Leaflet
if (typeof window !== 'undefined') {
  fixLeafletIcons();
}
