/**
 * The infrastructure popup ends with the layer's source, read when the popup
 * opens: a popup bound before the registry arrived still cites it.
 */
import React from 'react';
import { render } from '@testing-library/react';
import InfrastructureLayer from './InfrastructureLayer';
import { sourceCatalog } from '@/test/fixtures/sourceCatalog';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/hooks/useDataSources', () => ({ useDataSources: () => mockCatalog }));
jest.mock('@/hooks/useGeospatialData', () => ({
  useInfrastructureLayer: () => ({
    data: {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [-47, -22] }, properties: { name: 'Usina <A>' } },
      ],
    },
    loading: false,
    error: null,
    isFetching: false,
  }),
}));
const bindPopup = jest.fn();
jest.mock('react-leaflet', () => ({
  GeoJSON: ({ data, onEachFeature }: any) => {
    onEachFeature(data.features[0], { bindPopup, on: jest.fn() });
    return null;
  },
}));
jest.mock('leaflet', () => ({
  Path: class Path {},
  marker: jest.fn(() => ({})),
  divIcon: jest.fn((options) => options),
}));

let mockCatalog: typeof sourceCatalog | null = sourceCatalog;
const popupHtml = () => (bindPopup.mock.calls.at(-1)![0] as () => string)();

describe('InfrastructureLayer popup source', () => {
  beforeEach(() => bindPopup.mockClear());

  it('names the source and says what is still to check', () => {
    render(<InfrastructureLayer layerType="biogas_plant" />);
    expect(popupHtml()).toContain('Fonte: MapBiomas 10.1 (a conferir)</p></div>');
  });

  it('adds no source line when the registry could not be read', () => {
    mockCatalog = null;
    render(<InfrastructureLayer layerType="biogas_plant" />);
    expect(popupHtml()).not.toContain('Fonte');
    expect(popupHtml()).toMatch(/<\/div>$/);
    mockCatalog = sourceCatalog;
  });
});
