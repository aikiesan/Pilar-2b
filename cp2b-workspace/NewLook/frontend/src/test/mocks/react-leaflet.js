/**
 * Manual mock for react-leaflet.
 *
 * react-leaflet is ESM-only and pulls in `leaflet`, which touches browser APIs
 * jsdom doesn't implement. Inline `jest.mock('react-leaflet', ...)` factories in
 * individual test files did not reliably replace the copy imported *inside* the
 * components under test (component and test resolved different module
 * instances), so the real GeoJSON rendered nothing. A project-level manual mock
 * is applied at resolution time for every importer, fixing all map-layer suites
 * from one place.
 *
 * The rendered output mirrors what the previous per-file mocks produced so the
 * existing assertions (data-testid, data-feature-count, onEachFeature/
 * pointToLayer callbacks) keep working.
 */
const React = require('react')

const mockLayer = () => ({
  bindPopup: jest.fn(),
  bindTooltip: jest.fn(),
  on: jest.fn(),
  setStyle: jest.fn(),
  bringToFront: jest.fn(),
  openPopup: jest.fn(),
  closePopup: jest.fn(),
  remove: jest.fn(),
})

const MapContainer = ({ children, ...props }) =>
  React.createElement('div', { 'data-testid': 'map-container', ...sanitize(props) }, children)

const TileLayer = (props) =>
  React.createElement('div', { 'data-testid': 'tile-layer', ...sanitize(props) })

const GeoJSON = ({ data, onEachFeature, pointToLayer, ...props }) => {
  const features = (data && data.features) || []
  const firstStyle = features.length > 0 && typeof props.style === 'function'
    ? props.style(features[0])
    : null
  // Exercise the feature callbacks the way real Leaflet would, so tests that
  // assert bindPopup/onEachFeature behaviour still run.
  if (features.length > 0) {
    if (pointToLayer && features[0].geometry && features[0].geometry.type === 'Point') {
      pointToLayer(features[0], { lat: 0, lng: 0 })
    }
    if (onEachFeature) {
      onEachFeature(features[0], mockLayer())
    }
  }
  return React.createElement('div', {
    'data-testid': 'geojson-layer',
    'data-feature-count': features.length,
    'data-style-color': firstStyle && firstStyle.color,
    'data-style-fill-color': firstStyle && firstStyle.fillColor,
    'data-style-weight': firstStyle && firstStyle.weight,
    ...sanitize(props),
  })
}

const passthrough = (testid) => {
  const Component = ({ children, ...props }) =>
    React.createElement('div', { 'data-testid': testid, ...sanitize(props) }, children)
  Component.displayName = `Passthrough(${testid})`
  return Component
}

// Strip non-DOM props (functions / objects) so React doesn't warn on the div.
function sanitize(props) {
  const out = {}
  for (const key of Object.keys(props || {})) {
    const v = props[key]
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[key] = v
    }
  }
  return out
}

const noopHookMap = {
  flyTo: jest.fn(),
  setView: jest.fn(),
  getZoom: jest.fn(() => 10),
  getCenter: jest.fn(() => ({ lat: 0, lng: 0 })),
  getBounds: jest.fn(() => ({ getNorthEast: jest.fn(), getSouthWest: jest.fn() })),
  on: jest.fn(),
  off: jest.fn(),
  addLayer: jest.fn(),
  removeLayer: jest.fn(),
  eachLayer: jest.fn(),
  fitBounds: jest.fn(),
}

module.exports = {
  __esModule: true,
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker: passthrough('marker'),
  Popup: passthrough('popup'),
  Tooltip: passthrough('tooltip'),
  Circle: passthrough('circle'),
  CircleMarker: passthrough('circle-marker'),
  ZoomControl: passthrough('zoom-control'),
  ScaleControl: passthrough('scale-control'),
  useMap: () => noopHookMap,
  useMapEvents: () => noopHookMap,
}
