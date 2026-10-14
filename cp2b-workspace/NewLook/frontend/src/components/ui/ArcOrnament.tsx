/**
 * Decorative hairline arcs with a few translucent earth-tone shapes, after the
 * Itaú Cultural "Próximo Ato" pages the visual identity takes its cue from.
 *
 * Purely decorative (aria-hidden), drawn in currentColor for the lines so it
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
      {/* Translucent shapes: terracotta, ochre, slate-blue. */}
      <path d="M600 40 C 470 60 360 150 330 300 L 600 260 Z" className="fill-terra-600/15 dark:fill-terra-400/10" />
      <path d="M600 330 C 520 330 430 380 390 470 C 470 450 540 470 600 520 Z" className="fill-ochre-500/20 dark:fill-ochre-400/10" />
      <path d="M260 600 C 300 500 380 430 480 410 L 520 600 Z" className="fill-dusk-500/15 dark:fill-dusk-400/10" />
      {/* Hairline arcs. */}
      <g stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" className="opacity-30">
        <path d="M120 600 A 480 480 0 0 1 600 120" />
        <path d="M40 520 C 180 300 380 200 600 190" />
        <circle cx="520" cy="300" r="210" />
        <path d="M300 0 C 360 160 470 250 600 280" />
      </g>
    </svg>
  )
}
