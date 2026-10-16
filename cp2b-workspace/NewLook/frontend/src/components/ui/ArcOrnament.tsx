/**
 * Decorative leaves after the CP2b brand illustration (manual 1.16): the
 * outline of the large leaf in Azul Petróleo and a small solid leaf in Verde
 * Limão, the two shapes of the logo's icon.
 *
 * Purely decorative (aria-hidden), the outline drawn in currentColor so it
 * follows the theme, and kept faint: it sits behind hero text. Use it in hero
 * areas only; one per page is plenty.
 */
export default function ArcOrnament({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`pointer-events-none select-none ${className}`}
    >
      {/* Small solid leaf: Verde Limão. */}
      <path
        d="M560 250 C 500 236 440 262 416 318 C 398 360 412 396 430 424 C 444 446 436 470 408 492 C 470 476 520 450 548 400 C 566 368 566 330 562 296 Z"
        className="fill-cp2b-lima/40 dark:fill-cp2b-lima/20"
      />
      {/* Large leaf outline: Azul Petróleo. */}
      <path
        d="M236 40 C 380 30 500 140 500 290 C 500 360 470 410 440 452 C 418 482 418 520 450 560 L 380 532 C 260 484 180 400 172 286 C 168 220 176 150 182 96 L 184 44 Z"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        className="opacity-25"
      />
    </svg>
  )
}
