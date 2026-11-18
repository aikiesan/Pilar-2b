/**
 * PILAR-2b V3 - Leaflet Configuration for Next.js
 * Fixes default marker icon paths in Next.js
 */

import L from 'leaflet';
import { withBasePath } from '@/lib/basePath';

// Next.js does not resolve Leaflet's default icon paths, so they are set here.
// The images are copies of leaflet/dist/images served from public/: they used
// to come from the unpkg CDN, a third party that then received the IP address
// of everyone who opened a map.
export function fixLeafletIcons() {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: withBasePath('/images/leaflet/marker-icon-2x.png'),
    iconUrl: withBasePath('/images/leaflet/marker-icon.png'),
    shadowUrl: withBasePath('/images/leaflet/marker-shadow.png'),
  });
}

// Call this before using Leaflet
if (typeof window !== 'undefined') {
  fixLeafletIcons();
}
