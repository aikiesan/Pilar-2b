/**
 * The view the search flies to leaves the municipality clear of what sits
 * over the map: the top controls, the profile panel (desktop, phone in
 * landscape) and the bottom sheet (phone in portrait).
 */
import { fitPadding, PHONE_SHEET_SHARE } from './MunicipalityHighlight';

const mapOfSize = (x: number, y: number) => ({ getSize: () => ({ x, y }) }) as never;
type Pair = [number, number];

describe('fitPadding', () => {
  it('desktop: clears the top row even when it wraps, and the profile panel on the right', () => {
    const { paddingTopLeft, paddingBottomRight } = fitPadding(mapOfSize(1000, 700));
    expect((paddingTopLeft as Pair)[1]).toBeGreaterThanOrEqual(110);
    expect((paddingBottomRight as Pair)[0]).toBeGreaterThanOrEqual(384);
  });

  it('phone: clears the ribbon plus the search row on top and the whole bottom sheet below', () => {
    const { paddingTopLeft, paddingBottomRight } = fitPadding(mapOfSize(375, 748));
    expect((paddingTopLeft as Pair)[1]).toBeGreaterThanOrEqual(160);
    // The sheet is at most PHONE_SHEET_SHARE of the map tall; the fit must not reach under it.
    expect((paddingBottomRight as Pair)[1]).toBeGreaterThan(748 * PHONE_SHEET_SHARE);
    // And still leaves a usable strip of map between the controls and the sheet.
    const strip = 748 - (paddingTopLeft as Pair)[1] - (paddingBottomRight as Pair)[1];
    expect(strip).toBeGreaterThanOrEqual(150);
  });

  it('phone in landscape: the panel is a drawer on the right, so the fit clears the right side', () => {
    const { paddingBottomRight } = fitPadding(mapOfSize(667, 375));
    expect((paddingBottomRight as Pair)[0]).toBeGreaterThanOrEqual(360);
    expect((paddingBottomRight as Pair)[1]).toBeLessThan(100);
  });
});
