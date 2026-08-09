'use client'

/**
 * Protected Dashboard Landing Page for PILAR-2b V3
 * Minimal, action-first hub — the QR-code landing for the ABIOGAS event.
 *
 * Design: no stat wall, no long usage guide. Instead a compact breadcrumb-style
 * "Como usar" path (numbered, linked steps with tooltips) points people where to
 * start, and the tools below are self-describing objects (title + one-line desc +
 * tooltip) that make the next tap obvious. Desktop keeps the full card grid; the
 * phone gets condensed rows, a hero CTA and a sticky bottom CTA (md: breakpoints).
 *
 * Protected by authentication - shows feature explanations and navigation
 */
import { useEffect } from 'react'
import { useRouter, Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import { SkeletonDashboard } from '@/components/ui/Skeleton'
import {
  Map,
  Gauge,
  BookOpen,
  TrendingUp,
  Database,
  FileText,
  Zap,
  Leaf,
  ChevronRight,
} from 'lucide-react'

// Gradient per feature colour. Full literal class strings so Tailwind keeps them.
const colorClasses = {
  green: 'from-green-500 to-emerald-600',
  blue: 'from-blue-500 to-cyan-600',
  purple: 'from-purple-500 to-pink-600',
  orange: 'from-orange-500 to-amber-600',
  indigo: 'from-indigo-500 to-purple-600',
  teal: 'from-teal-500 to-cyan-600',
  red: 'from-red-500 to-rose-600',
  gray: 'from-gray-500 to-slate-600',
} as const

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const t = useTranslations('dashboard_hub')

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  // Show loading state while checking authentication
  if (loading) {
    return <SkeletonDashboard />
  }

  // If not loading but no user, redirect (handled by useEffect above)
  if (!user) {
    return null
  }

  const features = [
    {
      title: t('feat_map_title'),
      description: t('feat_map_desc'),
      icon: Map,
      href: '/map',
      color: 'green',
      badge: t('badge_popular'),
    },
    {
      title: t('feat_proximity_title'),
      description: t('feat_proximity_desc'),
      icon: Gauge,
      href: '/dashboard/proximity',
      color: 'blue',
      badge: t('badge_new'),
    },
    {
      title: t('feat_routes_title'),
      description: t('feat_routes_desc'),
      icon: TrendingUp,
      href: '/dashboard/technology-routes',
      color: 'orange',
    },
    {
      title: t('feat_scientific_title'),
      description: t('feat_scientific_desc'),
      icon: Database,
      href: '/dashboard/scientific-database',
      color: 'indigo',
    },
    {
      title: t('feat_compare_title'),
      description: t('feat_compare_desc'),
      icon: FileText,
      href: '/dashboard/compare',
      color: 'teal',
    },
    {
      title: t('feat_advanced_title'),
      description: t('feat_advanced_desc'),
      icon: Zap,
      href: '/dashboard/advanced-analysis',
      color: 'red',
    },
    {
      title: t('feat_references_title'),
      description: t('feat_references_desc'),
      icon: BookOpen,
      href: '/dashboard/references',
      color: 'gray',
    },
  ]

  // Recommended path — a compact, breadcrumb-style guide that replaces the old
  // verbose usage guide. Each step links straight to its tool; the tooltip (title)
  // explains why, so the next move is always inferable.
  const usagePath = [
    { label: t('path_map'), hint: t('feat_map_desc'), href: '/map' },
    { label: t('path_proximity'), hint: t('feat_proximity_desc'), href: '/dashboard/proximity' },
    { label: t('path_science'), hint: t('feat_scientific_desc'), href: '/dashboard/scientific-database' },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* pb-24 on mobile leaves room for the sticky CTA bar; desktop reverts. */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto">

          {/* Hero — value statement + a 1-tap path to the map on the first screen */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-green-100 dark:bg-green-900/30 px-3 py-1 text-xs font-semibold text-cp2b-dark-green dark:text-emerald-300">
                  <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
                  {t('hero_institution')}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {t('welcome_title')}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                  {t('welcome_subtitle')}
                </p>
              </div>

              {/* Primary CTA: full-width on mobile, inline on desktop */}
              <Link
                href="/map"
                aria-label={t('open_map_aria')}
                className="inline-flex w-full md:w-auto flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-cp2b-green px-6 py-3 text-base font-semibold text-white shadow-lg shadow-green-600/20 transition-colors hover:bg-cp2b-dark-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime dark:bg-emerald-600 dark:hover:bg-emerald-700"
              >
                <Map className="w-5 h-5" aria-hidden="true" />
                {t('cta_open_map')}
              </Link>
            </div>
          </div>

          {/* Recommended path — compact breadcrumb-style guide (mobile + desktop) */}
          <nav aria-label={t('path_label')} className="mb-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {t('path_label')}
            </p>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
              {usagePath.map((step, i) => (
                <li key={step.href} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-300 dark:text-slate-600" aria-hidden="true" />
                  )}
                  <Link
                    href={step.href}
                    title={step.hint}
                    className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-green-400 hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-cp2b-lime dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-600 text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    {step.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>

          {/* Features */}
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6">
              {t('features_heading')}
            </h2>

            {/* DESKTOP — full gradient cards (tooltip = description) */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Link
                  key={index}
                  href={feature.href}
                  title={feature.description}
                  className="group relative bg-white dark:bg-slate-800 rounded-lg shadow hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {feature.badge && (
                    <div className="absolute top-3 right-3 z-10">
                      <span className="px-2 py-1 text-xs font-semibold bg-yellow-400 text-gray-900 rounded">
                        {feature.badge}
                      </span>
                    </div>
                  )}

                  <div className={`h-2 bg-gradient-to-r ${colorClasses[feature.color as keyof typeof colorClasses]}`} />

                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* MOBILE — condensed tap rows (icon + title + one-line desc + chevron) */}
            <div className="md:hidden space-y-2">
              {features.map((feature, index) => (
                <Link
                  key={index}
                  href={feature.href}
                  title={feature.description}
                  className="flex items-center gap-3 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 p-3 active:bg-gray-50 dark:active:bg-slate-700 transition-colors"
                >
                  <div className={`flex-shrink-0 p-2.5 rounded-lg bg-gradient-to-r ${colorClasses[feature.color as keyof typeof colorClasses]}`}>
                    <feature.icon className="w-5 h-5 text-white" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {feature.title}
                      </h3>
                      {feature.badge && (
                        <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold bg-yellow-400 text-gray-900 rounded">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {feature.description}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Sticky bottom CTA — mobile only, always one tap from the map */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-3"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <Link
          href="/map"
          aria-label={t('open_map_aria')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-cp2b-green px-6 py-3 text-base font-semibold text-white shadow-lg transition-colors hover:bg-cp2b-dark-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime dark:bg-emerald-600 dark:hover:bg-emerald-700"
        >
          <Map className="w-5 h-5" aria-hidden="true" />
          {t('cta_open_map')}
        </Link>
      </div>
    </div>
  )
}
