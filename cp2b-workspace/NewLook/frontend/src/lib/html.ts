const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Text made safe for markup built as a string, which Leaflet's bindPopup,
 * bindTooltip and divIcon take. Every value from data (names, codes, amounts)
 * goes through it. The source is PostGIS and shapefiles, not users, but an
 * unescaped template is a stored-XSS vector the moment a field becomes
 * writable, and a stray `<` or `&` in a name breaks the markup today.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ENTITIES[char])
}
