import { centroidOf, geometryCentroid, haversineKm, midpoint } from './mapGeometry';

const square = (x0: number, y0: number, size: number) => [
  [x0, y0],
  [x0 + size, y0],
  [x0 + size, y0 + size],
  [x0, y0 + size],
  [x0, y0],
];

describe('geometryCentroid', () => {
  it('finds the middle of a square, whatever the winding', () => {
    expect(geometryCentroid({ type: 'Polygon', coordinates: [square(0, 0, 2)] })).toEqual({ lng: 1, lat: 1 });
    const clockwise = [...square(0, 0, 2)].reverse();
    expect(geometryCentroid({ type: 'Polygon', coordinates: [clockwise] })).toEqual({ lng: 1, lat: 1 });
  });

  it('weights the parts of a MultiPolygon by area', () => {
    // A 2×2 square at x 0–2 and a 1×1 at x 10–11: weights 4 and 1.
    const c = geometryCentroid({
      type: 'MultiPolygon',
      coordinates: [[square(0, 0, 2)], [square(10, 0, 1)]],
    })!;
    expect(c.lng).toBeCloseTo((1 * 4 + 10.5 * 1) / 5, 10);
    expect(c.lat).toBeCloseTo((1 * 4 + 0.5 * 1) / 5, 10);
  });

  it('subtracts holes', () => {
    // 4×4 square with a 2×2 hole in its left half: the centroid moves right.
    const c = geometryCentroid({ type: 'Polygon', coordinates: [square(0, 0, 4), square(0, 1, 2)] })!;
    expect(c.lng).toBeCloseTo((2 * 16 - 1 * 4) / 12, 10);
    expect(c.lat).toBeCloseTo(2, 10);
  });

  it('returns null for points, empty or flat shapes', () => {
    expect(geometryCentroid({ type: 'Point', coordinates: [1, 2] })).toBeNull();
    expect(geometryCentroid(null)).toBeNull();
    expect(geometryCentroid({ type: 'Polygon', coordinates: [[[0, 0], [1, 1], [2, 2], [0, 0]]] })).toBeNull();
  });
});

describe('centroidOf', () => {
  it('computes once per geometry object', () => {
    const geometry = { type: 'Polygon', coordinates: [square(0, 0, 2)] };
    const first = centroidOf({ geometry });
    expect(centroidOf({ geometry })).toBe(first);
  });
});

describe('haversineKm', () => {
  it('measures São Paulo to Ribeirão Preto in the right range', () => {
    // City centres; the mock-up's municipality centroids gave 297 km.
    const sp = { lat: -23.5505, lng: -46.6333 };
    const rp = { lat: -21.1775, lng: -47.8103 };
    expect(haversineKm(sp, rp)).toBeGreaterThan(285);
    expect(haversineKm(sp, rp)).toBeLessThan(300);
  });

  it('is zero for one point and symmetric', () => {
    const a = { lat: -22, lng: -47 };
    const b = { lat: -21, lng: -48 };
    expect(haversineKm(a, a)).toBe(0);
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});

it('midpoint halves both coordinates', () => {
  expect(midpoint({ lat: 0, lng: 0 }, { lat: 2, lng: -4 })).toEqual({ lat: 1, lng: -2 });
});
