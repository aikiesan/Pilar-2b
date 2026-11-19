/**
 * /explore — the way in is a purpose (docs/planning/EXPLORE_MAPA_PARA_FERRAMENTA.md, §5).
 *
 * Four doors, ordered for the biogas sector: three open the one bivariate map
 * on a curated pair (/explore/map?pair=…), and one finds a municipality with
 * the site's own search and opens the profile that already exists. Downloads
 * live under the Dados menu, not here.
 *
 * Rendered on the server with no map code, so it paints at once and needs no
 * API: the only client code is the search box.
 */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Building2, Combine, MapPinned, ScanSearch, type LucideIcon } from 'lucide-react'
import { Link } from '@/navigation'
import { HeaderLeaves } from '@/components/ui/ArcOrnament'
import MunicipalitySearch from '@/components/home/MunicipalitySearch'
import { titledMetadata } from '@/lib/pageMetadata'

/** The curated pairs a door opens, by id (public/bivar/v1/pairs.json). */
type ExplorePair = 'siting' | 'lacuna' | 'codigestao'

type Door = { key: ExplorePair; icon: LucideIcon; pair: ExplorePair } | { key: 'municipality'; icon: LucideIcon }

const DOORS: Door[] = [
  { key: 'siting', icon: MapPinned, pair: 'siting' },
  { key: 'lacuna', icon: ScanSearch, pair: 'lacuna' },
  { key: 'municipality', icon: Building2 },
  { key: 'codigestao', icon: Combine, pair: 'codigestao' },
]

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('explore')
  return titledMetadata(t('title'), t('lede'))
}

function DoorFrame({ index, icon: Icon, children }: { index: number; icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex h-full gap-4">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <span className="font-display text-sm text-ink-muted" aria-hidden="true">
          {index}
        </span>
        <Icon className="h-6 w-6 text-terra-600 dark:text-terra-400" aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

export default async function ExplorePage() {
  const t = await getTranslations('explore')

  return (
    <div className="bg-paper">
      <header className="relative overflow-hidden border-b border-line">
        <HeaderLeaves />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">{t('title')}</h1>
          <p className="mt-4 max-w-2xl text-ink-muted">{t('lede')}</p>
        </div>
      </header>

      <section aria-labelledby="explore-doors" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <h2 id="explore-doors" className="sr-only">
          {t('doors_heading')}
        </h2>
        <ol className="grid gap-4 md:grid-cols-2" data-testid="explore-doors">
          {DOORS.map((door, i) => {
            const question = t(`purpose.${door.key}.question`)
            const answer = t(`purpose.${door.key}.answer`)
            const index = i + 1

            if (door.key === 'municipality') {
              return (
                <li key={door.key} className="card" data-testid={`explore-door-${door.key}`}>
                  <DoorFrame index={index} icon={door.icon}>
                    <h3 className="text-xl text-ink">{question}</h3>
                    <p className="mt-2 text-sm text-ink-muted">{answer}</p>
                    <div className="mt-4">
                      <MunicipalitySearch />
                    </div>
                  </DoorFrame>
                </li>
              )
            }

            return (
              <li key={door.key} data-testid={`explore-door-${door.key}`}>
                <Link
                  href={{ pathname: '/explore/map', query: { pair: door.pair } }}
                  className="card group focus-ring block h-full"
                >
                  <DoorFrame index={index} icon={door.icon}>
                    <h3 className="text-xl text-ink">{question}</h3>
                    <p className="mt-2 text-sm text-ink-muted">{answer}</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-terra-600 group-hover:underline dark:text-terra-400">
                      {t('open_map')}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </DoorFrame>
                </Link>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
