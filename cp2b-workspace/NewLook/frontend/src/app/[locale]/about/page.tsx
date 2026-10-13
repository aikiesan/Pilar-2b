'use client'

/**
 * About — PILAR-2b
 *
 * The single "who we are" page. It replaces three: this /about, /sobre (the old
 * marketing home) and /dashboard/about (a bounce to nipe.unicamp.br); the other
 * two now 301 here (next.config.js). One page with anchors, as MapBiomas does:
 * O projeto · Equipe · Parceiros e CP2b · FAQ · Contato.
 *
 * Coverage is stated per scope (SP canonical, MG beta, national expansion) and
 * no municipality count is typed into the copy: counts belong to the data.
 */
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import AnimatedCounter from '@/components/ui/AnimatedCounter'
import Timeline, { TimelineEvent } from '@/components/ui/Timeline'
import { withBasePath } from '@/lib/basePath'
import { SOCIAL_LINKS, type SocialChannel } from '@/config/contact'
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CheckCircle2,
  Database,
  Download,
  Eye,
  Factory,
  FileJson,
  FlaskConical,
  Globe,
  GraduationCap,
  Heart,
  Layers,
  Lightbulb,
  Map,
  Megaphone,
  MessageCircle,
  Rocket,
  Scale,
  Settings,
  Sheet,
  Target,
  TrendingUp,
} from 'lucide-react'

// Anchor ids are part of the public URL (/about#parceiros), so they stay
// Portuguese and stable across locales; only their labels are translated.
const SECTIONS = [
  { id: 'projeto', labelKey: 'project' },
  { id: 'equipe', labelKey: 'team' },
  { id: 'parceiros', labelKey: 'partners' },
  { id: 'faq', labelKey: 'faq' },
  { id: 'contato', labelKey: 'contact' },
] as const

// Clears the sticky header (h-16) plus the section bar when jumping to an anchor.
const SECTION_OFFSET = 'scroll-mt-32'

const SCREENSHOTS = [
  { key: 'interactive_map', src: '/screenshots/interactive-map.png' },
  { key: 'data_analysis', src: '/screenshots/data-analysis.png' },
  { key: 'proximity_analysis', src: '/screenshots/proximity-analysis.png' },
  { key: 'scientific_basis', src: '/screenshots/scientific-basis.png' },
] as const

// Authors as registered (CITATION.cff and the INPI record); names are proper nouns.
const AUTHORS = [
  { name: 'Lucas Nakamura Cerejo', affiliationKey: 'nipe' }, // i18n-exempt: person's name
  { name: 'Rubens Augusto Camargo Lamparelli', affiliationKey: 'nipe' }, // i18n-exempt: person's name
  { name: 'Bruna de Souza Moraes', affiliationKey: 'unicamp' }, // i18n-exempt: person's name
  { name: 'Ana Beatriz Soares Aguiar', affiliationKey: 'unicamp' }, // i18n-exempt: person's name
] as const

const CHANNELS: SocialChannel[] = ['instagram', 'linkedin', 'youtube', 'whatsapp']

// Order of the FAQ; each id is a key under pages.about.faq.
const FAQ = ['what', 'coverage', 'potential', 'reuse', 'accessibility', 'report'] as const

export default function AboutPage() {
  const t = useTranslations('pages.about')
  const tLanding = useTranslations('landing')

  // Timeline copy lives in the catalog; only the icon and status — which are
  // presentation, not text — stay here, matched to the catalog by index.
  const timelineMeta: Pick<TimelineEvent, 'status' | 'icon'>[] = [
    { status: 'completed', icon: <Rocket className="w-4 h-4" /> },
    { status: 'in-progress', icon: <Database className="w-4 h-4" /> },
    { status: 'upcoming', icon: <Award className="w-4 h-4" /> },
  ]
  const timelineCopy = t.raw('timeline_events') as Array<
    Pick<TimelineEvent, 'date' | 'title' | 'description' | 'details'>
  >
  const projectTimeline: TimelineEvent[] = timelineCopy.map((event, index) => ({
    ...event,
    ...timelineMeta[index],
  }))

  // Axis titles and descriptions come from the catalog; the icon and colour are
  // presentation and stay here, matched by index.
  const axisMeta = [
    { icon: Database, color: 'bg-emerald-100 text-emerald-700' },
    { icon: FlaskConical, color: 'bg-blue-100 text-blue-700' },
    { icon: Settings, color: 'bg-amber-100 text-amber-700' },
    { icon: BarChart3, color: 'bg-teal-100 text-teal-700' },
    { icon: Lightbulb, color: 'bg-rose-100 text-rose-700' },
    { icon: GraduationCap, color: 'bg-indigo-100 text-indigo-700' },
    { icon: Megaphone, color: 'bg-orange-100 text-orange-700' },
    { icon: Scale, color: 'bg-cyan-100 text-cyan-700' },
  ]
  const axesCopy = t.raw('axes_items') as Array<{ title: string; description: string }>
  const thematicAxes = axesCopy.map((axis, index) => ({ number: index + 1, ...axis, ...axisMeta[index] }))

  // Institution names are proper nouns and stay in code. `typeKey` is the stable
  // identifier the badge colour switches on.
  const partnerships = [
    { name: 'Aalborg University', key: 'aalborg', typeKey: 'international' },
    { name: 'CIBiogás', key: 'cibiogas', typeKey: 'national' }, // i18n-exempt: organization name
    { name: 'LABIOEN/UNICAMP', key: 'labioen', typeKey: 'institutional' },
    { name: 'USP-RCGI', key: 'usp_rcgi', typeKey: 'research' },
    { name: 'UNESP', key: 'unesp', typeKey: 'academic' },
    { name: 'UNICA', key: 'unica', typeKey: 'industry' },
    { name: 'Abiogás', key: 'abiogas', typeKey: 'association' }, // i18n-exempt: organization name
    { name: 'ABREMA', key: 'abrema', typeKey: 'association' },
  ] as const
  const partnerBadge: Record<string, string> = {
    international: 'bg-blue-100 text-blue-800',
    national: 'bg-green-100 text-green-800',
    institutional: 'bg-amber-100 text-amber-800',
    association: 'bg-teal-100 text-teal-800',
  }

  const coverage = [
    { key: 'sp', tone: 'border-cp2b-green bg-green-50 text-green-900', status: 'status_canonical' },
    { key: 'mg', tone: 'border-amber-400 bg-amber-50 text-amber-900', status: 'status_beta' },
    { key: 'br', tone: 'border-slate-300 bg-slate-50 text-slate-800', status: 'status_planned' },
  ] as const

  const richLinks = {
    cite: (chunks: React.ReactNode) => (
      <Link href="/cite" className="font-medium text-cp2b-green dark:text-emerald-400 underline underline-offset-2">{chunks}</Link>
    ),
    guide: (chunks: React.ReactNode) => (
      <Link href="/guide" className="font-medium text-cp2b-green dark:text-emerald-400 underline underline-offset-2">{chunks}</Link>
    ),
    science: (chunks: React.ReactNode) => (
      <Link href="/dashboard/scientific-database" className="font-medium text-cp2b-green dark:text-emerald-400 underline underline-offset-2">{chunks}</Link>
    ),
    a11y: (chunks: React.ReactNode) => (
      <Link href="/accessibility" className="font-medium text-cp2b-green dark:text-emerald-400 underline underline-offset-2">{chunks}</Link>
    ),
    contact: (chunks: React.ReactNode) => (
      <a href="#contato" className="font-medium text-cp2b-green dark:text-emerald-400 underline underline-offset-2">{chunks}</a>
    ),
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-green-900 via-green-800 to-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid lg:grid-cols-[3fr_2fr] gap-10 lg:gap-12 items-center">
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                PILAR-2b
                <span className="mt-2 block text-lg sm:text-xl lg:text-2xl font-semibold text-green-200">
                  {t('full_name')}
                </span>
              </h1>
              <p className="mt-6 text-base sm:text-lg text-green-50 leading-relaxed max-w-2xl">
                {t('subtitle')}
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/map"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-green-900 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-900"
                >
                  <Map className="h-5 w-5" aria-hidden="true" />
                  {t('hero_cta_map')}
                </Link>
                <Link
                  href="/guide"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 border-green-300 px-6 py-3 font-semibold text-green-50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                  {t('hero_cta_guide')}
                </Link>
              </div>
            </div>

            {/* Coverage: each scope says what it is, instead of one "645". */}
            <div className="rounded-2xl bg-white/95 p-5 sm:p-6 text-gray-900 shadow-xl">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">{t('coverage_heading')}</h2>
              <ul className="mt-4 space-y-3">
                {coverage.map(({ key, tone, status }) => (
                  <li key={key} className={`rounded-lg border-l-4 px-4 py-3 ${tone}`}>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <span className="font-semibold">{t(`coverage.${key}.name`)}</span>
                      <span className="text-xs font-medium uppercase tracking-wide">{t(status)}</span>
                    </div>
                    <p className="mt-1 text-sm opacity-90">{t(`coverage.${key}.desc`)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── In-page navigation: sticky under the header; on phones it scrolls
             sideways instead of wrapping into a second row. ─────────────────── */}
      <nav
        aria-label={t('section_nav_label')}
        className="sticky top-16 z-30 border-b border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur"
      >
        <ul className="max-w-7xl mx-auto flex gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8 py-2 [scrollbar-width:none]">
          {SECTIONS.map(({ id, labelKey }) => (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-green-50 hover:text-cp2b-green dark:hover:text-emerald-400 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cp2b-lime"
              >
                {t(`sections.${labelKey}`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* ── O projeto ────────────────────────────────────────────────────── */}
      <section id="projeto" aria-labelledby="projeto-heading" className={`${SECTION_OFFSET} py-14 lg:py-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="projeto-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100">
            {t('sections.project')}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-slate-400 max-w-3xl">
            {t('about_project_subtitle')}
          </p>

          {/* Mission, vision, values: side by side, all visible — they were
              tabs, which hid two thirds of the text from search and print. */}
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-green-100 dark:border-slate-700 bg-green-50 dark:bg-slate-800 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-700 text-white"><Target className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('mission_heading')}</h3>
              </div>
              <p className="mt-4 text-gray-700 dark:text-slate-300 leading-relaxed">{t('mission_body')}</p>
              <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">
                <strong>{t('mission_model_label')}</strong> {t('mission_model_value')}
              </p>
            </article>
            <article className="rounded-2xl border border-blue-100 dark:border-slate-700 bg-blue-50 dark:bg-slate-800 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white"><Eye className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('vision_heading')}</h3>
              </div>
              <p className="mt-4 text-gray-700 dark:text-slate-300 leading-relaxed">{t('vision_body')}</p>
              <p className="mt-4 text-sm text-gray-600 dark:text-slate-400">
                <strong>{t('vision_validity_label')}</strong> {t('vision_validity_value')}
              </p>
            </article>
            <article className="rounded-2xl border border-amber-100 dark:border-slate-700 bg-amber-50 dark:bg-slate-800 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-700 text-white"><Heart className="h-5 w-5" aria-hidden="true" /></span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('values_heading')}</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {(t.raw('values_items') as string[]).map((value) => (
                  <li key={value} className="flex items-start gap-2 text-gray-700 dark:text-slate-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
                    <span>{value}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          {/* The platform: what it does, with screenshots. */}
          <div className="mt-16">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{tLanding('features.heading')}</h3>
            <p className="mt-2 text-gray-600 dark:text-slate-400 max-w-3xl">{tLanding('features.subheading')}</p>

            {/* Phones: a swipeable strip (scroll-snap). From sm up: a 2×2 grid.
                Focusable so keyboard users can scroll it too. */}
            <div
              role="region"
              aria-label={t('screenshots_label')}
              tabIndex={0}
              className="mt-6 -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cp2b-lime sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0"
            >
              {SCREENSHOTS.map(({ key, src }) => (
                <figure key={key} className="w-[85%] shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 sm:w-auto">
                  <div className="relative aspect-video bg-gray-900">
                    <Image
                      src={withBasePath(src)}
                      alt={tLanding(`screenshots.${key}.alt`)}
                      fill
                      sizes="(max-width: 640px) 85vw, (max-width: 1280px) 50vw, 640px"
                      className="object-cover"
                    />
                  </div>
                  <figcaption className="p-4">
                    <span className="block font-semibold text-gray-900 dark:text-slate-100">{tLanding(`screenshots.${key}.caption`)}</span>
                    <span className="mt-1 block text-sm text-gray-600 dark:text-slate-400">{tLanding(`screenshots.${key}.description`)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {([
                { key: 'geospatial', Icon: Map, href: '/map', links: ['/map', null, null, null] },
                { key: 'mcda', Icon: BarChart3, href: '/dashboard/advanced-analysis', links: [null, '/dashboard/advanced-analysis', '/dashboard/advanced-analysis', null] },
              ] as const).map(({ key, Icon, href, links }) => (
                <article key={key} className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
                  <Icon className="h-8 w-8 text-cp2b-green dark:text-emerald-400" aria-hidden="true" />
                  <h4 className="mt-4 text-lg font-bold text-gray-900 dark:text-slate-100">{tLanding(`features.${key}.title`)}</h4>
                  <p className="mt-2 text-gray-600 dark:text-slate-400">{tLanding(`features.${key}.description`)}</p>
                  <ul className="mt-4 space-y-2">
                    {(tLanding.raw(`features.${key}.features`) as string[]).map((text, index) => {
                      const link = links[index]
                      return (
                        <li key={text} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-cp2b-green dark:text-emerald-400 mt-0.5" aria-hidden="true" />
                          {link ? <Link href={link} className="underline-offset-2 hover:underline hover:text-cp2b-green dark:hover:text-emerald-400">{text}</Link> : <span>{text}</span>}
                        </li>
                      )
                    })}
                  </ul>
                  <Link href={href} className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-cp2b-green dark:text-emerald-400 hover:text-cp2b-dark-green dark:hover:text-emerald-300">
                    {tLanding(`features.${key}.cta`)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </article>
              ))}
            </div>
          </div>

          {/* Eight thematic axes */}
          <div className="mt-16">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{t('axes_heading')}</h3>
            <p className="mt-2 text-gray-600 dark:text-slate-400 max-w-3xl">{t('axes_subtitle')}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {thematicAxes.map(({ number, title, description, icon: AxisIcon, color }) => (
                <article key={number} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}><AxisIcon className="h-5 w-5" aria-hidden="true" /></span>
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-400">{t('axis_label', { number })}</span>
                  </div>
                  <h4 className="mt-3 font-bold text-gray-900 dark:text-slate-100">{title}</h4>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{description}</p>
                </article>
              ))}
            </div>
          </div>

          {/* São Paulo potential — labelled as the state's, since it is. */}
          <div className="mt-16 rounded-2xl bg-green-900 p-6 sm:p-10 text-white">
            <h3 className="text-xl sm:text-2xl font-bold">{t('sp_potential_heading')}</h3>
            <p className="mt-2 text-green-100 max-w-3xl">{t('sp_potential_subtitle')}</p>
            <ul className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {([
                { value: <AnimatedCounter end={4.6e9} decimals={1} compact />, unit: 'unit_m3_biogas', note: 'note_total_potential', Icon: Factory },
                { value: <AnimatedCounter end={6.4e6} decimals={1} compact />, unit: 'unit_m3_biomethane', note: 'note_natural_gas', Icon: Layers },
                { value: <AnimatedCounter end={20e3} compact />, unit: 'unit_jobs', note: 'note_jobs', Icon: TrendingUp },
                { value: <AnimatedCounter end={181} />, unit: 'unit_plants', note: 'note_plants', Icon: Building2 },
                { value: <AnimatedCounter end={5.5e6} decimals={1} compact />, unit: 'unit_hectares', note: 'note_hectares', Icon: Globe },
                { value: <AnimatedCounter end={16} suffix="%" />, unit: 'unit_ghg', note: 'note_ghg', Icon: Target },
              ] as const).map(({ value, unit, note, Icon }) => (
                <li key={unit} className="rounded-xl border border-green-700/60 bg-green-800/50 p-4 sm:p-5">
                  <Icon className="h-5 w-5 text-green-300" aria-hidden="true" />
                  <span className="mt-2 block text-2xl sm:text-3xl font-bold tabular-nums">{value}</span>
                  <span className="mt-1 block text-xs sm:text-sm uppercase tracking-wide text-green-200">{t(unit)}</span>
                  <span className="mt-1 block text-xs sm:text-sm text-green-100">{t(note)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-16">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{t('timeline_heading')}</h3>
            <p className="mt-2 mb-8 text-gray-600 dark:text-slate-400 max-w-3xl">{t('timeline_subtitle')}</p>
            <Timeline events={projectTimeline} />
          </div>
        </div>
      </section>

      {/* ── Equipe ───────────────────────────────────────────────────────── */}
      <section id="equipe" aria-labelledby="equipe-heading" className={`${SECTION_OFFSET} bg-gray-50 dark:bg-slate-950 py-14 lg:py-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="equipe-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100">
            {t('sections.team')}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-slate-400 max-w-3xl">{t('coordinator_subtitle')}</p>

          <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
            <article className="overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-sm md:flex">
              <div className="flex items-center justify-center bg-gradient-to-br from-green-700 to-emerald-800 p-6 md:w-1/3">
                <div className="text-center">
                  <div className="mx-auto h-28 w-28 overflow-hidden rounded-full border-4 border-white/30">
                    <Image
                      src={withBasePath('/images/team/bruna-moraes.jpg')}
                      alt={t('coordinator_photo_alt')}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                      sizes="112px"
                    />
                  </div>
                  <p className="mt-3 font-bold text-white">{t('coordinator_degree')}</p>
                  {/* i18n-exempt: person's name */}
                  <p className="text-green-100">Bruna de Souza Moraes</p>
                </div>
              </div>
              <div className="p-6 md:w-2/3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('coordinator_title')}</h3>
                <ul className="mt-4 space-y-2 text-gray-700 dark:text-slate-300">
                  {(t.raw('coordinator_credentials') as string[]).map((credential) => (
                    <li key={credential} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-700 mt-0.5" aria-hidden="true" />
                      {credential}
                    </li>
                  ))}
                </ul>
                <h4 className="mt-5 font-semibold text-gray-900 dark:text-slate-100">{t('formation_heading')}</h4>
                <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-slate-400">
                  {(t.raw('formation_items') as string[]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <ul className="mt-4 flex flex-wrap gap-2" aria-label={t('expertise_label')}>
                  {(t.raw('expertise_tags') as string[]).map((tag) => (
                    <li key={tag} className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">{tag}</li>
                  ))}
                </ul>
              </div>
            </article>

            <article className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('authors_heading')}</h3>
              <ul className="mt-4 space-y-3">
                {AUTHORS.map(({ name, affiliationKey }) => (
                  <li key={name}>
                    <span className="block font-medium text-gray-900 dark:text-slate-100">{name}</span>
                    <span className="block text-sm text-gray-600 dark:text-slate-400">{t(`affiliations.${affiliationKey}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-gray-600 dark:text-slate-400">{t.rich('authors_note', richLinks)}</p>
            </article>
          </div>
        </div>
      </section>

      {/* ── Parceiros e CP2b ─────────────────────────────────────────────── */}
      <section id="parceiros" aria-labelledby="parceiros-heading" className={`${SECTION_OFFSET} py-14 lg:py-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="parceiros-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100">
            {t('sections.partners')}
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <article className="rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('cp2b_heading')}</h3>
              <p className="mt-3 text-gray-700 dark:text-slate-300">{t('cp2b_body')}</p>
              <p className="mt-3 text-gray-700 dark:text-slate-300">{t('nipe_body')}</p>
              <ul className="mt-4 space-y-2">
                {(t.raw('nipe_items') as string[]).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-gray-700 dark:text-slate-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-700 mt-0.5" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <address className="mt-5 not-italic text-sm text-gray-600 dark:text-slate-400">
                <span className="font-semibold text-gray-900 dark:text-slate-100">{t('location_heading')}</span><br />
                {t('location_line1')}<br />
                {t('location_line2')}<br />
                {t('location_line3')}
              </address>
            </article>

            <article className="rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">{t('funding_heading')}</h3>
              <ul className="mt-4 space-y-4">
                {(['cp2bsd', 'expansion'] as const).map((grant) => (
                  <li key={grant} className="rounded-lg bg-gray-50 dark:bg-slate-800 p-4">
                    <span className="block font-mono text-sm font-semibold text-gray-900 dark:text-slate-100">{t(`grants.${grant}.number`)}</span>
                    <span className="mt-1 block text-sm text-gray-700 dark:text-slate-300">{t(`grants.${grant}.role`)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-gray-700 dark:text-slate-300">{t('inpi_line')}</p>
            </article>
          </div>

          <h3 className="mt-12 text-xl sm:text-2xl font-bold text-gray-900 dark:text-slate-100">{t('partnerships_heading')}</h3>
          <p className="mt-2 text-gray-600 dark:text-slate-400">{t('partnerships_subtitle')}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {partnerships.map((partner) => (
              <li key={partner.key} className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900 dark:text-slate-100">{partner.name}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${partnerBadge[partner.typeKey] ?? 'bg-gray-100 text-gray-800'}`}>
                    {t(`partnership_types.${partner.typeKey}`)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{t(`partnership_contacts.${partner.key}`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" aria-labelledby="faq-heading" className={`${SECTION_OFFSET} bg-gray-50 dark:bg-slate-950 py-14 lg:py-20`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="faq-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100">
            {t('sections.faq')}
          </h2>
          {/* Native <details>: keyboard and screen-reader support for free,
              and the answers stay in the HTML for search and no-script. */}
          <div className="mt-8 divide-y divide-gray-200 dark:divide-slate-700 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            {FAQ.map((id) => (
              <details key={id} className="group px-5 py-1">
                <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-gray-900 dark:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cp2b-lime [&::-webkit-details-marker]:hidden">
                  {t(`faq.${id}.q`)}
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true" />
                </summary>
                <p className="pb-4 text-gray-700 dark:text-slate-300 leading-relaxed">
                  {t.rich(`faq.${id}.a`, richLinks)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contato ──────────────────────────────────────────────────────── */}
      <section id="contato" aria-labelledby="contato-heading" className={`${SECTION_OFFSET} py-14 lg:py-20`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 id="contato-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-slate-100">
            {t('sections.contact')}
          </h2>
          <p className="mt-3 text-gray-600 dark:text-slate-400 max-w-3xl">{t('contact_body')}</p>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map((channel) => (
              <li key={channel}>
                <a
                  href={SOCIAL_LINKS[channel]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[48px] items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 font-medium text-gray-800 dark:text-slate-200 hover:border-cp2b-green hover:text-cp2b-green dark:hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-cp2b-lime"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                  {t(`channels.${channel}`)}
                </a>
              </li>
            ))}
          </ul>

          {/* Open data: where the downloads are, until /downloads exists. */}
          <div className="mt-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-6 sm:p-8 text-white">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="shrink-0 rounded-xl bg-white/10 p-3"><Download className="h-6 w-6 text-cp2b-lime" aria-hidden="true" /></span>
                <div>
                  <h3 className="text-xl font-bold">{tLanding('open_data.heading')}</h3>
                  <p className="mt-2 max-w-lg text-sm text-gray-300">{tLanding('open_data.description')}</p>
                </div>
              </div>
              <ul className="grid shrink-0 grid-cols-3 gap-3">
                {([
                  { label: 'CSV', Icon: Sheet }, // i18n-exempt: format name
                  { label: 'GeoJSON', Icon: Globe }, // i18n-exempt: format name
                  { label: 'JSON', Icon: FileJson }, // i18n-exempt: format name
                ] as const).map(({ label, Icon }) => (
                  <li key={label}>
                    <a
                      href="https://github.com/aikiesan/Pilar-2b"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[48px] flex-col items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-3 text-xs font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-cp2b-lime"
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-sm md:grid-cols-4">
              {(['municipalities', 'residues', 'layers', 'license'] as const).map((key) => (
                <div key={key}>
                  <dt className="font-bold text-cp2b-lime">{tLanding(`open_data.${key}.label`)}</dt>
                  <dd className="mt-0.5 text-xs text-gray-300">{tLanding(`open_data.${key}.desc`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </div>
  )
}
