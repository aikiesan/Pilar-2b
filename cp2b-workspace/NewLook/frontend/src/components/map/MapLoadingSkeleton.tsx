/**
 * PILAR-2b - Map loading screen
 *
 * One loader for both waits: the map code downloading (next/dynamic in
 * app/[locale]/map/page.tsx) and the municipalities GeoJSON arriving
 * (MapComponent). Using the same component for both keeps the screen still
 * between the two steps instead of swapping a spinner for a card.
 *
 * The drawing is a small digester in the manual's flat cut-paper style:
 * methane molecules (Metaninho's CH₄, carbon in Azul Petróleo, hydrogens in
 * lime) rise from the substrate, travel up the gas pipe and keep a flame lit.
 * No floating card and no placeholder panels: on a phone those stacked on top
 * of each other. The screen fades in after a short delay so a fast load does
 * not flash it. With reduced motion the drawing simply stands still (the
 * global rule in globals.css), and the text carries the meaning.
 */

'use client';

import { useTranslations } from 'next-intl';
import { MG_MUNICIPALITY_COUNT, SP_MUNICIPALITY_COUNT } from '@/lib/mapScope';

const PETROLEO = '#1E3E4C';
const LIMA = '#B6E03B';

/** Metaninho's methane molecule, drawn small: carbon plus four hydrogens. */
function Molecule({ className }: { className: string }) {
  return (
    <g className={className}>
      <g stroke={PETROLEO} strokeWidth={1.2} strokeLinecap="round">
        <line x1={0} y1={0} x2={-4.2} y2={-4.2} />
        <line x1={0} y1={0} x2={4.2} y2={-4.2} />
        <line x1={0} y1={0} x2={-4.2} y2={4.2} />
        <line x1={0} y1={0} x2={4.2} y2={4.2} />
      </g>
      <circle r={3.4} fill={PETROLEO} />
      <circle cx={-4.6} cy={-4.6} r={1.9} fill={LIMA} stroke={PETROLEO} strokeWidth={0.8} />
      <circle cx={4.6} cy={-4.6} r={1.9} fill={LIMA} stroke={PETROLEO} strokeWidth={0.8} />
      <circle cx={-4.6} cy={4.6} r={1.9} fill={LIMA} stroke={PETROLEO} strokeWidth={0.8} />
      <circle cx={4.6} cy={4.6} r={1.9} fill={LIMA} stroke={PETROLEO} strokeWidth={0.8} />
    </g>
  );
}

function DigesterDrawing() {
  return (
    <svg
      viewBox="0 0 200 140"
      width={200}
      height={140}
      className="biogas-loader w-[220px] sm:w-[260px] h-auto"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="biogas-loader-dome">
          <path d="M36 92 V70 A44 40 0 0 1 124 70 V92 Z" />
        </clipPath>
      </defs>

      {/* Ground */}
      <line x1={14} y1={118} x2={186} y2={118} stroke="#C9D3D8" strokeWidth={2} strokeLinecap="round" />

      {/* Tank body, half buried */}
      <rect x={32} y={88} width={96} height={30} rx={3} fill="#DCE8EC" stroke={PETROLEO} strokeWidth={2.5} />
      {/* Substrate inside the tank, with a slow surface */}
      <path
        className="biogas-loader-slurry"
        d="M34 98 q12 -4 24 0 t24 0 t24 0 t24 0 V116 H34 Z"
        fill="#AD5F00"
        opacity={0.22}
      />

      {/* Gas dome */}
      <path d="M36 90 V70 A44 40 0 0 1 124 70 V90" fill="#FFFFFF" stroke={PETROLEO} strokeWidth={2.5} strokeLinejoin="round" />

      {/* Molecules rising inside the dome */}
      <g clipPath="url(#biogas-loader-dome)">
        <g transform="translate(58 84) scale(1.5)"><Molecule className="biogas-loader-rise biogas-loader-rise-1" /></g>
        <g transform="translate(82 84) scale(1.5)"><Molecule className="biogas-loader-rise biogas-loader-rise-2" /></g>
        <g transform="translate(104 84) scale(1.5)"><Molecule className="biogas-loader-rise biogas-loader-rise-3" /></g>
      </g>

      {/* Gas pipe from the dome top to the burner */}
      <path d="M80 31 V20 H142 V81 H156" fill="none" stroke={PETROLEO} strokeWidth={5} strokeLinejoin="round" />
      <path
        className="biogas-loader-flow"
        d="M80 31 V20 H142 V81 H156"
        fill="none"
        stroke={LIMA}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="4 10"
      />

      {/* Burner on its stand, and the flame */}
      <line x1={165} y1={84} x2={165} y2={118} stroke={PETROLEO} strokeWidth={3} />
      <rect x={155} y={77} width={20} height={7} rx={1.5} fill={PETROLEO} />
      <g className="biogas-loader-flame">
        <path d="M165 44 C157 57 155 65 158 71 C160 76 170 76 172 71 C175 65 173 57 165 44 Z" fill="#E6922B" />
        <path d="M165 57 C161 64 161 68 162.5 71 C163.5 73.5 166.5 73.5 167.5 71 C169 68 169 64 165 57 Z" fill={LIMA} />
      </g>
    </svg>
  );
}

export default function MapLoadingSkeleton() {
  const t = useTranslations('Map.loading');

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full h-full bg-gray-50 flex items-center justify-center px-4"
    >
      <div className="biogas-loader-enter flex flex-col items-center text-center max-w-sm">
        <DigesterDrawing />
        <p className="mt-5 text-base font-semibold text-ink">{t('title')}</p>
        <p className="mt-1 text-sm text-ink-muted text-balance">
          {t('subtitle', { count: SP_MUNICIPALITY_COUNT + MG_MUNICIPALITY_COUNT })}
        </p>
      </div>
    </div>
  );
}
