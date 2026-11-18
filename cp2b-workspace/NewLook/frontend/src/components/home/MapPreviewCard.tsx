/**
 * The hero's map preview: a picture of the choropleth that opens the map.
 *
 * A static SVG (public/images/map-preview-sp.svg, built by
 * scripts/map-preview/), not a map: the landing loads no Leaflet and no
 * GeoJSON. It shows what /map opens on — biomass by municipality in the
 * default YlGnBu ramp over a Positron-like basemap of sea and neighbouring
 * states — and the legend swatches are that same ramp. Like the map's own
 * panels, the drawn chrome stays light in the dark theme (.surface-light).
 *
 * One link for the whole card, named by its visible "Explorar o mapa" (WCAG
 * 2.5.3) and described by the caption and the image's alt. The caption comes
 * first in the DOM too (the card is flex-col-reverse), so reading order matches.
 * The zoom buttons and the legend are drawing, hidden from assistive technology.
 * The ids are fixed: the card appears once, on the landing.
 */
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ArrowRight, Minus, Plus } from 'lucide-react';
import { Link } from '@/navigation';
import { withBasePath } from '@/lib/basePath';
import { RAMP_DEFAULT } from '@/lib/mapMetrics';

const CTA_ID = 'home-map-preview-cta';
const CAPTION_ID = 'home-map-preview-caption';
const IMAGE_ID = 'home-map-preview-image';

export default function MapPreviewCard({ className = '' }: { className?: string }) {
  const t = useTranslations('home.preview');

  return (
    <Link
      href="/map"
      aria-labelledby={CTA_ID}
      aria-describedby={`${CAPTION_ID} ${IMAGE_ID}`}
      className={`group flex flex-col-reverse overflow-hidden rounded border border-line bg-paper-raised shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-terra-600/60 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper dark:hover:border-terra-400/60 dark:focus-visible:ring-terra-400 ${className}`}
    >
      <span className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 sm:px-5">
        <span className="min-w-0">
          <span id={CTA_ID} className="flex items-center gap-2 font-medium text-ink group-hover:text-terra-600 dark:group-hover:text-terra-400">
            {t('cta')}
            <ArrowRight
              className="h-4 w-4 shrink-0 transition-transform duration-200 motion-safe:group-hover:translate-x-1"
              aria-hidden="true"
            />
          </span>
          <span id={CAPTION_ID} className="mt-0.5 block text-xs text-ink-muted">{t('caption')}</span>
        </span>
      </span>

      <span className="relative block overflow-hidden">
        <Image
          id={IMAGE_ID}
          src={withBasePath('/images/map-preview-sp.svg')}
          alt={t('alt')}
          width={600}
          height={431}
          unoptimized
          className="block h-auto w-full transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.03]"
        />

        {/* Map chrome, drawn: zoom buttons top left, legend bottom left. */}
        <span aria-hidden="true" className="surface-light absolute left-3 top-3 flex flex-col overflow-hidden rounded-sm border border-line bg-paper-raised text-ink-muted shadow-sm">
          <span className="flex h-6 w-6 items-center justify-center"><Plus className="h-3.5 w-3.5" /></span>
          <span className="flex h-6 w-6 items-center justify-center border-t border-line"><Minus className="h-3.5 w-3.5" /></span>
        </span>
        <span aria-hidden="true" className="surface-light absolute bottom-3 left-3 flex items-center gap-1.5 rounded-sm bg-paper-raised/90 px-2 py-1 text-[10px] text-ink-muted shadow-sm">
          {t('legend_low')}
          <span className="flex">
            {RAMP_DEFAULT.map((color) => (
              <span key={color} className="h-2 w-3" style={{ backgroundColor: color }} />
            ))}
          </span>
          {t('legend_high')}
        </span>
      </span>
    </Link>
  );
}
