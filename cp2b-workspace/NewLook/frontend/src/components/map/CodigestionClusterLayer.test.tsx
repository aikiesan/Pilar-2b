/**
 * The cluster tooltip is HTML built as a string, so every value in it is
 * escaped — the cluster id included: clusterNumber() hands back an id that
 * is not "cluster_N" unchanged, straight from the API.
 */
import React from 'react';
import { render } from '@testing-library/react';
import CodigestionClusterLayer from './CodigestionClusterLayer';
import type { CodigestionCluster, CodigestionResidue } from '@/types/geospatial';

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'));

const mockTooltips: string[] = [];
jest.mock('react-leaflet', () => ({
  GeoJSON: ({ data, onEachFeature }: { data: GeoJSON.FeatureCollection; onEachFeature: (f: GeoJSON.Feature, l: unknown) => void }) => {
    data.features.forEach((feature) =>
      onEachFeature(feature, { bindTooltip: (html: string) => mockTooltips.push(html), on: () => {} })
    );
    return null;
  },
}));

const residue = (key: string, label: string): CodigestionResidue => ({
  key,
  label,
  sector: 'agricultural',
  cn_ratio: 20,
  cn_role: 'balanced',
  biomass_tons_year: 1000,
});

const cluster = (overrides: Partial<CodigestionCluster>): CodigestionCluster => ({
  cluster_id: 'cluster_07',
  municipality_count: 3,
  municipalities: [],
  convex_hull: { type: 'Polygon', coordinates: [[[-47, -22], [-47.1, -22], [-47.1, -22.1], [-47, -22]]] },
  centroid: { lat: -22.05, lng: -47.05 },
  top_pair: {
    residue_a: residue('sugarcane', 'Cana'),
    residue_b: residue('soybean', 'Soja'),
    cn_combined: 25.4,
    cn_combined_in_range: true,
    improvement_score: 0.5,
    blend_ratio_A_to_B: '1:1',
  },
  all_qualifying_pairs: [],
  all_present_residues: [],
  cluster_score: 70,
  total_biomass_tons_year: 12000,
  ...overrides,
});

beforeEach(() => {
  mockTooltips.length = 0;
});

describe('CodigestionClusterLayer tooltip', () => {
  it('numbers a cluster by its id', () => {
    render(<CodigestionClusterLayer clusters={[cluster({})]} selectedClusterId={null} onClusterClick={() => {}} />);
    expect(mockTooltips[0]).toContain('Cluster 7');
    expect(mockTooltips[0]).toContain('3 municípios');
  });

  it('escapes an id it cannot number', () => {
    render(
      <CodigestionClusterLayer
        clusters={[cluster({ cluster_id: '<img src=x onerror=alert(1)>' })]}
        selectedClusterId={null}
        onClusterClick={() => {}}
      />
    );
    expect(mockTooltips[0]).not.toContain('<img');
    expect(mockTooltips[0]).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
