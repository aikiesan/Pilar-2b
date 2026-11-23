import type { Polygon } from 'geojson';
import { dotCounts, dotValueFor, geometryContains, niceStep, placeDots, seededRandom } from '@/lib/dotDensity';
import { buildDots, buildSymbols } from '@/lib/magnitudeViews';
import { isAmountMetric, sectorAmounts, type SplitContext } from '@/lib/sectorSplit';
import { legendAmounts, niceFloor, ringSegments, symbolRadius, SYMBOL_MAX_RADIUS, SYMBOL_MIN_RADIUS } from '@/lib/sectorSymbols';
import type { MunicipalityFeature, MunicipalityProperties } from '@/types/geospatial';

const square = (lng: number, lat: number, size = 0.2): Polygon => ({
  type: 'Polygon',
  coordinates: [[[lng, lat], [lng + size, lat], [lng + size, lat + size], [lng, lat + size], [lng, lat]]],
});

const feature = (code: string, props: Record<string, unknown>, geometry: Polygon = square(-47, -22)): MunicipalityFeature =>
  ({ type: 'Feature', geometry, properties: { ibge_code: code, name: code, ...props } }) as unknown as MunicipalityFeature;

const TONS: SplitContext = { biomassType: 'total', selectedResidues: [], scenario: 'real' };

// Real scenario (CP2b N4): the total and one share per residue, CH₄ m³/yr.
const servedProps = {
  ch4_cp2b_n4_m3_year: 1_000_000,
  ch4_cp2b_n4_sugarcane_m3_year: 600_000,
  ch4_cp2b_n4_cattle_m3_year: 100_000,
  ch4_cp2b_n4_rsu_m3_year: 300_000,
};

describe('sectorAmounts', () => {
  it('splits tonnage by the served sector totals', () => {
    const props = {
      total_biomass_tons_year: 1000,
      agricultural_biomass_tons_year: 700,
      livestock_biomass_tons_year: 200,
      urban_biomass_tons_year: 100,
    } as unknown as MunicipalityProperties;
    expect(sectorAmounts(props, 'biomass_tons', TONS)).toEqual({
      total: 1000,
      parts: { agricultural: 700, livestock: 200, urban: 100 },
    });
  });

  it('splits a served energy metric by the residues of each sector, in the display unit', () => {
    const amounts = sectorAmounts(servedProps as unknown as MunicipalityProperties, 'methane_m3', TONS)!;
    // Methane shows per day.
    expect(amounts.total).toBeCloseTo(1_000_000 / 365, 0);
    expect(amounts.parts!.agricultural / amounts.total).toBeCloseTo(0.6);
    expect(amounts.parts!.livestock / amounts.total).toBeCloseTo(0.1);
    expect(amounts.parts!.urban / amounts.total).toBeCloseTo(0.3);
  });

  it('gives no split when the parts do not add up to the total, rather than invent one', () => {
    const props = {
      total_biomass_tons_year: 1000,
      agricultural_biomass_tons_year: 300,
      livestock_biomass_tons_year: null,
      urban_biomass_tons_year: null,
    } as unknown as MunicipalityProperties;
    expect(sectorAmounts(props, 'biomass_tons', TONS)).toEqual({ total: 1000, parts: null });
  });

  it('keeps a picked sector or residues only', () => {
    const amounts = sectorAmounts(servedProps as unknown as MunicipalityProperties, 'methane_m3', {
      ...TONS,
      selectedResidues: ['rsu'],
    })!;
    expect(amounts.parts!.agricultural).toBe(0);
    expect(amounts.parts!.urban).toBeCloseTo(amounts.total);
  });

  it('has nothing for a municipality without the figure or with zero', () => {
    expect(sectorAmounts({} as MunicipalityProperties, 'methane_m3', TONS)).toBeNull();
    expect(sectorAmounts({ total_biomass_tons_year: 0 } as unknown as MunicipalityProperties, 'biomass_tons', TONS)).toBeNull();
  });

  it('counts only amounts: a rate per inhabitant is not one', () => {
    expect(isAmountMetric('biomethane_m3')).toBe(true);
    expect(isAmountMetric('ch4_per_capita')).toBe(false);
  });
});

describe('dot density', () => {
  it('rounds a dot to 1, 2 or 5 × 10ⁿ', () => {
    expect(niceStep(0.7)).toBe(1);
    expect(niceStep(130)).toBe(200);
    expect(niceStep(4200)).toBe(5000);
    expect(niceStep(5000)).toBe(5000);
    expect(dotValueFor(24_000_000, 24_000)).toBe(1000);
  });

  it('is the same on every draw for the same seed', () => {
    const a = seededRandom(3550308);
    const b = seededRandom(3550308);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('counts whole dots per origin and settles the remainder by draw', () => {
    const counts = dotCounts({ total: 1000, parts: { agricultural: 700, livestock: 200, urban: 100 } }, 100, () => 0.99);
    expect(counts).toEqual([7, 2, 1, 0]);
    expect(dotCounts({ total: 250, parts: null }, 100, () => 0)).toEqual([0, 0, 0, 3]);
    expect(dotCounts({ total: 250, parts: null }, 100, () => 0.9)).toEqual([0, 0, 0, 2]);
  });

  it('puts every dot inside the municipality, never in its hole', () => {
    const withHole: Polygon = {
      type: 'Polygon',
      coordinates: [
        [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]],
        [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75], [0.25, 0.25]],
      ],
    };
    const dots = placeDots(withHole, [50, 30, 20, 0], 42);
    expect(dots).toHaveLength(100);
    for (const d of dots) expect(geometryContains(withHole, d.lng, d.lat)).toBe(true);
    expect(dots.filter((d) => d.kind === 0)).toHaveLength(50);
    expect(dots.filter((d) => d.kind === 2)).toHaveLength(20);
    expect(placeDots(withHole, [50, 30, 20, 0], 42)).toEqual(dots);
  });
});

describe('sector symbols', () => {
  it('sizes the area by the amount, not the radius', () => {
    expect(symbolRadius(100, 100)).toBe(SYMBOL_MAX_RADIUS);
    expect(symbolRadius(25, 100)).toBeCloseTo(SYMBOL_MAX_RADIUS / 2);
    expect(symbolRadius(0.0001, 100)).toBe(SYMBOL_MIN_RADIUS);
    expect(symbolRadius(0, 100)).toBe(0);
  });

  it('gives the legend round amounts down to a hundredth of the largest', () => {
    expect(niceFloor(3_700)).toBe(2_000);
    expect(legendAmounts(53_000)).toEqual([50_000, 5_000, 500]);
  });

  it('draws one segment per origin with an amount, a whole ring for a single one', () => {
    expect(ringSegments({ agricultural: 1, livestock: 1, urban: 0 }, 20).map((s) => s.sector)).toEqual(['agricultural', 'livestock']);
    const whole = ringSegments({ agricultural: 0, livestock: 0, urban: 5 }, 20);
    expect(whole).toHaveLength(1);
    expect(whole[0].d.match(/ A /g)).toHaveLength(4);
    // A small circle is a pie: its segments start at the centre.
    expect(ringSegments({ agricultural: 1, livestock: 1, urban: 1 }, 5)[0].d.startsWith('M 0 0')).toBe(true);
  });
});

describe('the views from the features', () => {
  const features = [
    feature('3550308', { total_biomass_tons_year: 4000, agricultural_biomass_tons_year: 0, livestock_biomass_tons_year: 0, urban_biomass_tons_year: 4000 }, square(-46.7, -23.6)),
    feature('3543402', { total_biomass_tons_year: 1000, agricultural_biomass_tons_year: 900, livestock_biomass_tons_year: 100, urban_biomass_tons_year: 0 }, square(-47.8, -21.2)),
    feature('3500105', { total_biomass_tons_year: null }),
  ];

  it('orders the circles largest first and says which origins show', () => {
    const view = buildSymbols(features, 'biomass_tons', TONS);
    expect(view.items.map((i) => i.code)).toEqual(['3550308', '3543402']);
    expect(view.maxValue).toBe(4000);
    expect(view.sectors).toEqual(['agricultural', 'livestock', 'urban']);
    expect(view.count).toBe(2);
    expect(view.unsplit).toBe(0);
  });

  it('spends at most the target number of dots, the same ones on every build', () => {
    const view = buildDots(features, 'biomass_tons', TONS);
    // The dot rounds up to 1, 2 or 5 × 10ⁿ, so the count lands between 40% of the target and the target.
    expect(view.dotValue).toBe(niceStep(5000 / 24_000));
    expect(view.dots.length).toBe(Math.round(5000 / view.dotValue));
    expect(view.dots.length).toBeGreaterThanOrEqual(24_000 * 0.4);
    expect(view.dots.length).toBeLessThanOrEqual(24_000);
    expect(buildDots(features, 'biomass_tons', TONS).dots.slice(0, 5)).toEqual(view.dots.slice(0, 5));
  });
});
