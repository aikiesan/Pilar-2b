/**
 * The map's snapshot fades: what was on screen gives way to what replaced it,
 * at the cost of one copy, not of a restyle per municipality per frame.
 *
 * - `crossFadePaneCanvas`: before a pane's canvas is repainted (a new metric,
 *   scenario, colour mode, palette or analysis), a copy of it is laid over
 *   it and fades out while the new colours draw underneath.
 * - `fadePaneIn` / `fadePaneOut`: a layer with a pane of its own (each
 *   infrastructure layer) fades in when it draws, and on leaving leaves a copy
 *   of the pane that fades out after it.
 *
 * Every copy sits in the pane it copies or next to it, so it pans with the
 * map; a zoom would scale the map under it, so a zoom ends the fade at once.
 * Copies never catch the pointer (`.map-fade-snapshot`). A change during a fade
 * starts from what is on screen and replaces the running copy: there is never
 * more than one per pane. With reduced motion nothing is copied.
 */
import type L from 'leaflet';
import { motionEasing, motionMs, prefersReducedMotion } from './mapMotion';

interface Fade {
  el: HTMLElement;
  stop: () => void;
}

/** The copy fading out for a pane, by the pane it stands for. */
const fading = new WeakMap<HTMLElement, Fade>();

const SNAPSHOT = 'map-fade-snapshot';

const canAnimate = (el: Element): boolean => typeof (el as HTMLElement).animate === 'function';

function opacityNow(el: HTMLElement): number {
  const value = parseFloat(getComputedStyle(el).opacity);
  return Number.isFinite(value) ? value : 1;
}

/** Leaflet's own record of where it placed an element (L.DomUtil.setPosition). */
function placed(el: HTMLElement): { x: number; y: number } {
  return (el as HTMLElement & { _leaflet_pos?: { x: number; y: number } })._leaflet_pos ?? { x: 0, y: 0 };
}

function fadeOut(map: L.Map, owner: HTMLElement, el: HTMLElement, from: number, ms: number, easing: string): void {
  const animation = el.animate([{ opacity: from }, { opacity: 0 }], { duration: ms, easing, fill: 'forwards' });
  const stop = () => {
    animation.onfinish = null;
    animation.cancel();
    el.remove();
    map.off('zoomstart', stop);
    if (fading.get(owner)?.el === el) fading.delete(owner);
  };
  animation.onfinish = stop;
  map.on('zoomstart', stop);
  fading.set(owner, { el, stop });
}

/** Whether a pane has a copy fading out right now (tests, and a second change). */
export function isFading(pane: HTMLElement): boolean {
  return fading.has(pane);
}

/**
 * Lays a copy of the pane's canvas over it and fades the copy out. Call it
 * before the canvas repaints: Leaflet redraws on the next frame, so a layout
 * effect, or the clean-up of the effect that swaps the layer, is in time.
 */
export function crossFadePaneCanvas(map: L.Map, pane: HTMLElement | null | undefined): void {
  if (!pane || prefersReducedMotion()) return;
  const canvas = Array.from(pane.children).find(
    (el): el is HTMLCanvasElement => el instanceof HTMLCanvasElement && !el.classList.contains(SNAPSHOT),
  );
  if (!canvas || canvas.width === 0 || canvas.height === 0 || !canAnimate(canvas)) return;

  const copy = document.createElement('canvas');
  copy.width = canvas.width;
  copy.height = canvas.height;
  const context = copy.getContext('2d');
  if (!context) return;
  context.drawImage(canvas, 0, 0);

  // A change mid-fade: the screen shows the old copy part-faded over the
  // canvas, so the new copy is that picture, not the bare canvas.
  const previous = fading.get(pane);
  if (previous) {
    const scale = canvas.width / (parseFloat(canvas.style.width) || canvas.width);
    const from = placed(previous.el);
    const to = placed(canvas);
    context.globalAlpha = opacityNow(previous.el);
    context.drawImage(previous.el as HTMLCanvasElement, (from.x - to.x) * scale, (from.y - to.y) * scale);
    previous.stop();
  }

  // Same size and place as the canvas, as Leaflet set them.
  copy.style.cssText = canvas.style.cssText;
  (copy as HTMLCanvasElement & { _leaflet_pos?: unknown })._leaflet_pos = placed(canvas);
  copy.classList.add(SNAPSHOT);
  copy.setAttribute('aria-hidden', 'true');
  canvas.after(copy);
  fadeOut(map, pane, copy, 1, motionMs('--motion-change', 260), motionEasing('--ease-change', 'ease-in-out'));
}

/**
 * Fades a layer's own pane in. If the pane's copy was still fading out (the
 * layer turned off and on again), the copy goes and the fade starts from the
 * opacity it had reached.
 */
export function fadePaneIn(pane: HTMLElement | null | undefined): void {
  if (!pane) return;
  const leaving = fading.get(pane);
  const from = leaving ? opacityNow(leaving.el) : 0;
  leaving?.stop();
  if (prefersReducedMotion() || !canAnimate(pane)) return;
  pane.animate([{ opacity: from }, { opacity: 1 }], {
    duration: motionMs('--motion-base', 220),
    easing: motionEasing('--ease-enter', 'ease-out'),
  });
}

/**
 * Leaves a copy of a layer's pane in its place, fading out, while the layer
 * itself goes. Call it before the layer's paths and markers are removed (a
 * layout effect's clean-up runs before react-leaflet's).
 */
export function fadePaneOut(map: L.Map, pane: HTMLElement | null | undefined): void {
  if (!pane || !pane.parentElement || pane.childElementCount === 0) return;
  if (prefersReducedMotion() || !canAnimate(pane)) return;
  // Turned off mid-fade-in: leave from where the fade had got to.
  const from = opacityNow(pane);
  pane.getAnimations?.().forEach((animation) => animation.cancel());
  fading.get(pane)?.stop();

  const copy = pane.cloneNode(true) as HTMLElement;
  copy.classList.add(SNAPSHOT);
  copy.setAttribute('aria-hidden', 'true');
  copy.inert = true;
  pane.after(copy);
  fadeOut(map, pane, copy, from, motionMs('--motion-exit', 160), motionEasing('--ease-exit', 'ease-in'));
}
