/**
 * The view the search flies to leaves the municipality clear of what sits
 * over the map: the top controls, the profile panel (desktop) and the bottom
 * sheet (phone).
 */
import { fitPadding } from './MunicipalityHighlight';

const mapOfSize = (x: number, y: number) => ({ getSize: () => ({ x, y }) }) as never;

describe('fitPadding', () => {
  it('desktop: clears the top row even when it wraps, and the profile panel on the right', () => {
    const { paddingTopLeft, paddingBottomRight } = fitPadding(mapOfSize(1000, 700));
    expect((paddingTopLeft as [number, number])[1]).toBeGreaterThanOrEqual(110);
    expect((paddingBottomRight as [number, number])[0]).toBeGreaterThanOrEqual(384);
  });

  it('phone: clears the ribbon plus the search row on top and the bottom sheet below', () => {
    const { paddingTopLeft, paddingBottomRight } = fitPadding(mapOfSize(375, 667));
    expect((paddingTopLeft as [number, number])[1]).toBeGreaterThanOrEqual(160);
    expect((paddingBottomRight as [number, number])[1]).toBe(Math.round(667 * 0.6));
  });
});
