/**
 * The 1200×630 image a shared municipality link shows (Open Graph, X/Twitter):
 * the name, the state and CP2b N4 methane, labelled as methane. Outside the
 * CP2b scope it says "sem dado CP2b" and gives no number.
 *
 * Kept for an hour like the page. When the API is down it throws, so no image
 * without figures is cached in place of a good one.
 */
import { ImageResponse } from 'next/og'
import { notFound } from 'next/navigation'
import { getFormatter, getTranslations } from 'next-intl/server'
import { getState, ufOf } from '@/data/brazilStates'
import { isLocale } from '@/config/i18n'
import { isPublicMapMunicipality } from '@/lib/mapScope'
import { findMunicipality } from '@/lib/municipalityDirectory'
import { loadMunicipalityProfile } from '@/lib/municipalityProfile'
import { isIbgeCode } from '@/lib/municipalitySlug'

export const revalidate = 3600
export const dynamicParams = true
export function generateStaticParams() {
  return []
}

const SIZE = { width: 1200, height: 630 }
// The site's paper, ink and brand greens (src/styles/palette.js, globals.css):
// white, Azul Petróleo, Verde Escuro.
const PAPER = '#FFFFFF'
const INK = '#1E3E4C'
const MUTED = '#54666E'
const TERRA = '#00573A'
const TERRA_DARK = '#1E3E4C'

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()

  const entry = await findMunicipality(slug)
  if (entry === null) notFound()
  if (entry === undefined) {
    if (!isIbgeCode(slug)) throw new Error('municipality list unavailable')
    if (!isPublicMapMunicipality(slug)) notFound()
  }
  const ibge = entry?.ibge ?? slug
  const profile = await loadMunicipalityProfile(ibge, entry?.name)
  if (!profile) throw new Error(`municipality ${ibge} unavailable`)

  const t = await getTranslations({ locale, namespace: 'municipality_profile.og' })
  const format = await getFormatter({ locale })
  const state = getState(ufOf(profile.ibge))
  const name = profile.name
  const nameSize = name.length > 24 ? 60 : 76

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: PAPER,
          color: INK,
        }}
      >
        <div style={{ width: 16, height: '100%', background: TERRA, display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '56px 72px 48px 64px' }}>
          <div style={{ display: 'flex', fontSize: 26, letterSpacing: 4, color: TERRA, fontWeight: 700 }}>PILAR-2b</div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: nameSize, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
          <div style={{ display: 'flex', marginTop: 10, fontSize: 30, color: MUTED }}>
            {state ? `${state.nome} (${state.sigla})` : profile.ibge}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto' }}>
            {profile.n4 === null ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: TERRA_DARK }}>{t('no_data')}</div>
                <div style={{ display: 'flex', marginTop: 8, fontSize: 28, color: MUTED }}>{t('no_data_body')}</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', fontSize: 30, color: MUTED }}>{t('label')}</div>
                <div style={{ display: 'flex', fontSize: 112, fontWeight: 700, color: TERRA_DARK, lineHeight: 1.1 }}>
                  {format.number(profile.n4, { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 1 })}
                </div>
                <div style={{ display: 'flex', fontSize: 28, color: INK }}>{t('unit')}</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 22, color: MUTED }}>cp2b.unicamp.br/pilar2b</div>
        </div>
      </div>
    ),
    SIZE,
  )
}
