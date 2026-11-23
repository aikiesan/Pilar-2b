/**
 * The shell every map tool window shares (Land around, Compare, Cross data,
 * Gather, Find similar, Truck reach): one place for where it sits and how big
 * it may grow.
 *
 * Portrait (phones): a bottom sheet at most 55% of the map tall, standing on
 * the Filters and Layers bar instead of under it. The bar's height is
 * `--map-bottom-bar`, which MobileBottomSheet keeps up to date.
 *
 * Landscape (every desktop): a window on the right, under the map's control
 * row. That row wraps to two lines on narrower desktops, so its bottom edge is
 * measured, not assumed: MapComponent keeps `--map-top-clear` (the row's
 * bottom plus a gap) on the map's container. 4rem is the one-line row.
 *
 * Kept in components/map so Tailwind's content scan sees the class names.
 */
import { useCallback, useRef } from 'react';

const SHELL =
  'surface-light absolute z-[1101] map-window flex flex-col overflow-y-auto border-line bg-paper text-ink shadow-xl ' +
  'inset-x-0 bottom-[var(--map-bottom-bar,0px)] max-h-[55%] rounded-t-2xl border-t ' +
  'landscape:inset-x-auto landscape:bottom-auto landscape:right-3 landscape:top-[var(--map-top-clear,4rem)] landscape:z-[999] ' +
  'landscape:max-h-[calc(100%-var(--map-top-clear,4rem)-1rem)] landscape:rounded-none landscape:border';

/** The tool window shell, 340 px wide on desktops. */
export const MAP_WINDOW_CLASS = `${SHELL} landscape:w-[340px]`;

/** The same shell, 380 px wide, for Compare's two columns. */
export const MAP_WINDOW_WIDE_CLASS = `${SHELL} landscape:w-[380px]`;

/** Space between the control row and a window under it. */
const TOP_GAP_PX = 8;

/**
 * Watches an element's size for as long as it is on the page, and undoes
 * `cleanup` when it leaves. A callback ref, so it works for elements that
 * appear after the first render.
 */
function useMeasuredRef(measure: (el: HTMLElement) => void, cleanup: (el: HTMLElement) => void) {
  const stop = useRef<(() => void) | null>(null);
  return useCallback(
    (el: HTMLElement | null) => {
      stop.current?.();
      stop.current = null;
      if (!el) return;
      measure(el);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => measure(el));
      observer.observe(el);
      stop.current = () => {
        observer.disconnect();
        cleanup(el);
      };
    },
    // measure and cleanup are module-level functions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}

const setTopClear = (row: HTMLElement) =>
  row.parentElement?.style.setProperty('--map-top-clear', `${row.offsetTop + row.offsetHeight + TOP_GAP_PX}px`);
const clearTopClear = (row: HTMLElement) => row.parentElement?.style.removeProperty('--map-top-clear');

/**
 * A ref for the control row: keeps `--map-top-clear` on its container, the
 * row's bottom edge plus a gap, as the row wraps, unwraps or gains a line of
 * layer alerts.
 */
export function useTopRowClearance() {
  return useMeasuredRef(setTopClear, clearTopClear);
}

const setBottomBar = (bar: HTMLElement) =>
  document.documentElement.style.setProperty('--map-bottom-bar', `${bar.offsetHeight}px`);
const clearBottomBar = () => document.documentElement.style.removeProperty('--map-bottom-bar');

/**
 * A ref for the phones' Filters and Layers bar: keeps `--map-bottom-bar` on
 * the page, the bar's height (0 where it is hidden), so the tool sheets and
 * the profile stand on it.
 */
export function useBottomBarHeight() {
  return useMeasuredRef(setBottomBar, clearBottomBar);
}
