import Image from 'next/image'
import { withBasePath } from '@/lib/basePath'

/**
 * Metaninho, the CP2b mascot: a methane molecule (CH₄) in cut paper, the
 * carbon in Azul Petróleo and the four hydrogens in lime. Ported from the CP2b
 * site (cp2b_web/src/components/Metaninho.jsx).
 *
 * Always decoration: the text next to him says what matters, so he stays out
 * of the accessibility tree (alt="", aria-hidden). He arrives with one small
 * hop; with reduced motion he just appears.
 */

// Width × height of each file in public/images/metaninho/ (all 360 px tall),
// so the image reserves its space before it loads.
export const METANINHO_POSES = {
  neutro: [262, 360],
  feliz: [273, 360],
  curioso: [308, 360],
  'em-pe': [258, 360],
  tranquilo: [290, 360],
  surpreso: [268, 360],
} as const

export type MetaninhoPose = keyof typeof METANINHO_POSES

export default function Metaninho({
  pose = 'neutro',
  size = 120,
  className = '',
}: {
  pose?: MetaninhoPose
  size?: number
  className?: string
}) {
  const name: MetaninhoPose = pose in METANINHO_POSES ? pose : 'neutro'
  const [w, h] = METANINHO_POSES[name]
  return (
    <Image
      src={withBasePath(`/images/metaninho/metaninho-${name}.webp`)}
      alt=""
      aria-hidden="true"
      width={Math.round((w / h) * size)}
      height={size}
      unoptimized
      loading="lazy"
      draggable={false}
      data-pose={name}
      className={`inline-block h-auto max-w-full select-none motion-safe:animate-metaninho-in ${className}`}
    />
  )
}
