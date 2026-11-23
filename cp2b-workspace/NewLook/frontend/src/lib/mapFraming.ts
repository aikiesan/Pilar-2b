/**
 * Framing a tool's result clear of its window, shared by every click tool.
 *
 * - Arriving from a link, the map moves to the result whatever the view: the
 *   reader has not seen it yet.
 * - After a click, the view stays, unless the pick itself lies outside the
 *   map's clear area (a search pick off screen, or one under the window).
 *
 * The clear area is the map less the control row over it, and less the tool
 * window: a 340 or 380 px card on the right in landscape, a sheet over the
 * lower 55% (standing on the phones' bottom bar) in portrait. The row's bottom
 * edge and the bar's height are the CSS variables the window shell keeps
 * (components/map/mapWindowShell.ts).
 */

export interface Size {
  x: number;
  y: number;
}

export interface FramePadding {
  paddingTopLeft: [number, number];
  paddingBottomRight: [number, number];
}

/** The map's own opening fly to the state (ScopeViewController, 0.6 s), with a margin. */
export const OPENING_MOVE_MS = 900;
/** Share of the map's height a tool sheet may take in portrait (max-h-[55%]). */
export const TOOL_SHEET_SHARE = 0.55;
/** The one-line control row's bottom plus its gap, when it hasn't been measured. */
export const DEFAULT_TOP_CLEAR = 64;
/** The tool window's distance from the map's right edge (right-3). */
const WINDOW_RIGHT = 12;
/** Room left between the framed result and every edge. */
const EDGE = 24;

/** The padding that keeps a framed result off the control row and the tool window. */
export function toolWindowPadding(
  size: Size,
  {
    topClear = DEFAULT_TOP_CLEAR,
    windowWidth = 340,
    bottomBar = 0,
    landscape = size.x > size.y,
  }: { topClear?: number; windowWidth?: number; bottomBar?: number; landscape?: boolean } = {},
): FramePadding {
  const top = Math.round(topClear) + EDGE / 2;
  if (landscape) {
    return { paddingTopLeft: [EDGE, top], paddingBottomRight: [windowWidth + WINDOW_RIGHT + EDGE, EDGE] };
  }
  return { paddingTopLeft: [EDGE, top], paddingBottomRight: [EDGE, Math.round(size.y * TOOL_SHEET_SHARE + bottomBar) + EDGE / 2] };
}

/** Whether a point on the map's container lies in the clear area the padding leaves. */
export function inClearArea(point: Size, size: Size, padding: FramePadding): boolean {
  const [left, top] = padding.paddingTopLeft;
  const [right, bottom] = padding.paddingBottomRight;
  return point.x >= left && point.x <= size.x - right && point.y >= top && point.y <= size.y - bottom;
}

/**
 * Whether the map should move to a result: always on arrival from a link,
 * otherwise only when a picked place is outside the clear area.
 */
export function shouldFrame(fromLink: boolean, pickPoints: readonly Size[], size: Size, padding: FramePadding): boolean {
  if (fromLink) return true;
  return pickPoints.some((p) => !inClearArea(p, size, padding));
}

/** A CSS length in px read from a variable ("183px"), or null. */
export function readPx(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}
