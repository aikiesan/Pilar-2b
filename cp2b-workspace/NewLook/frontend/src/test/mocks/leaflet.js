/**
 * Manual mock for leaflet (the default `L` import).
 *
 * leaflet touches browser/canvas APIs jsdom doesn't implement. Map components
 * import it for `L.DomUtil`, `L.Path`, marker/icon helpers, etc. This provides
 * just enough surface for those components to render and for tests to run.
 * Mapped via moduleNameMapper so every importer shares this instance.
 */
class Path {}
class Layer {}
class Class {}

const chainable = () => {
  const obj = {}
  const methods = [
    'addTo', 'remove', 'setStyle', 'bindPopup', 'bindTooltip', 'openPopup',
    'closePopup', 'on', 'off', 'setLatLng', 'setRadius', 'bringToFront',
    'addLayer', 'removeLayer', 'clearLayers', 'eachLayer',
  ]
  for (const m of methods) obj[m] = jest.fn(() => obj)
  return obj
}

const L = {
  Path,
  Layer,
  Class,
  DomUtil: {
    create: jest.fn(() => document.createElement('div')),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    setPosition: jest.fn(),
  },
  DomEvent: {
    on: jest.fn(),
    off: jest.fn(),
    stopPropagation: jest.fn(),
    disableClickPropagation: jest.fn(),
    disableScrollPropagation: jest.fn(),
  },
  marker: jest.fn(() => chainable()),
  circleMarker: jest.fn(() => chainable()),
  geoJSON: jest.fn(() => chainable()),
  layerGroup: jest.fn(() => chainable()),
  featureGroup: jest.fn(() => chainable()),
  divIcon: jest.fn(() => ({})),
  icon: jest.fn(() => ({})),
  point: jest.fn((x, y) => ({ x, y })),
  latLng: jest.fn((lat, lng) => ({ lat, lng })),
  latLngBounds: jest.fn(() => ({ extend: jest.fn(), isValid: jest.fn(() => true) })),
  Icon: Object.assign(jest.fn(() => ({})), { Default: { mergeOptions: jest.fn(), prototype: {} } }),
}

module.exports = L
module.exports.default = L
module.exports.__esModule = true
