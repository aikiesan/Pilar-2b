/**
 * Símbolos: one circle per municipality whose AREA is its amount, its ring
 * split by origin. The arithmetic lives here, apart from Leaflet, so it can be
 * tested: the radius (a square root, so twice the amount is twice the ink,
 * not four times), the reference circles of the legend, and the ring's paths.
 */
import { SPLIT_SECTORS, type SplitSector } from '@/lib/sectorSplit';

/** The largest circle of the state, in CSS px. */
export const SYMBOL_MAX_RADIUS = 30;
/** Below this a circle would vanish; it is drawn this big, and the legend says so. */
export const SYMBOL_MIN_RADIUS = 2;
/** Under this radius the hole would be a dot: the ring becomes a full pie. */
export const SYMBOL_HOLE_FROM = 8;
/** The hole's radius, as a share of the circle's. */
export const SYMBOL_HOLE_SHARE = 0.5;

/** Radius for `value` when `maxValue` gets SYMBOL_MAX_RADIUS. Area ∝ value. */
export function symbolRadius(value: number, maxValue: number, maxRadius = SYMBOL_MAX_RADIUS): number {
  if (!(value > 0) || !(maxValue > 0)) return 0;
  return Math.max(SYMBOL_MIN_RADIUS, maxRadius * Math.sqrt(value / maxValue));
}

/** The largest 1, 2 or 5 × 10ⁿ at most `raw`. */
export function niceFloor(raw: number): number {
  if (!(raw > 0)) return 0;
  const exp = Math.floor(Math.log10(raw));
  const base = 10 ** exp;
  for (const m of [5, 2, 1]) {
    if (m * base <= raw * (1 + 1e-9)) return m * base;
  }
  return base;
}

/**
 * Three round amounts for the legend's nested circles: about the largest, a
 * tenth of it and a hundredth, so the small circles that fill most of the map
 * have a reference too. Fewer when the range is narrow.
 */
export function legendAmounts(maxValue: number): number[] {
  const top = niceFloor(maxValue);
  if (!top) return [];
  const out = [top, niceFloor(top / 10), niceFloor(top / 100)].filter((v) => v > 0);
  return Array.from(new Set(out));
}

export interface RingSegment {
  sector: SplitSector;
  /** SVG path, centred on (0, 0). */
  d: string;
}

const point = (r: number, angle: number) => {
  // Clockwise from twelve o'clock.
  const a = angle - Math.PI / 2;
  return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
};

/**
 * The ring's segments, one per sector with an amount, clockwise from the top
 * in SPLIT_SECTORS order, so a colour sits in the same place on every circle.
 * A single sector is a whole ring (two arcs: one arc cannot close a circle).
 */
export function ringSegments(
  parts: Record<SplitSector, number>,
  radius: number,
  hole = radius >= SYMBOL_HOLE_FROM ? radius * SYMBOL_HOLE_SHARE : 0,
): RingSegment[] {
  const total = SPLIT_SECTORS.reduce((acc, s) => acc + Math.max(0, parts[s]), 0);
  if (!(total > 0) || !(radius > 0)) return [];
  const present = SPLIT_SECTORS.filter((s) => parts[s] > 0);
  if (present.length === 1) {
    const outer = `M ${point(radius, 0)} A ${radius} ${radius} 0 1 1 ${point(radius, Math.PI)} A ${radius} ${radius} 0 1 1 ${point(radius, 0)} Z`;
    const inner = hole > 0
      ? ` M ${point(hole, 0)} A ${hole} ${hole} 0 1 0 ${point(hole, Math.PI)} A ${hole} ${hole} 0 1 0 ${point(hole, 0)} Z`
      : '';
    return [{ sector: present[0], d: outer + inner }];
  }
  const segments: RingSegment[] = [];
  let start = 0;
  for (const sector of present) {
    const sweep = (parts[sector] / total) * Math.PI * 2;
    const end = start + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const d = hole > 0
      ? `M ${point(radius, start)} A ${radius} ${radius} 0 ${large} 1 ${point(radius, end)} L ${point(hole, end)} A ${hole} ${hole} 0 ${large} 0 ${point(hole, start)} Z`
      : `M 0 0 L ${point(radius, start)} A ${radius} ${radius} 0 ${large} 1 ${point(radius, end)} Z`;
    segments.push({ sector, d });
    start = end;
  }
  return segments;
}
