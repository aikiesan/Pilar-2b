'use client'

/**
 * Protected Dashboard Landing Page for PILAR-2b V3
 * User hub with feature overview, guides, and quick access to tools
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
  Zap
} from 'lucide-react'

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

  const quickStats = [
    { label: t('stats_municipalities'), value: '645', icon: Map },
    { label: t('stats_residues'), value: '50+', icon: Database },
    { label: t('stats_routes'), value: '6', icon: TrendingUp },
  ]

  const guideSteps = [
    {
      title: t('guide_step1_title'),
      items: t.raw('guide_step1_items') as string[],
      color: 'green',
    },
    {
      title: t('guide_step2_title'),
      items: t.raw('guide_step2_items') as string[],
      color: 'blue',
    },
    {
      title: t('guide_step3_title'),
      items: t.raw('guide_step3_items') as string[],
      color: 'orange',
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 transition-colors">
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t('welcome_title')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {t('welcome_subtitle')}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {quickStats.map((stat, index) => (
              <div key={index} className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="w-10 h-10 text-green-600 dark:text-green-500" />
                </div>
              </div>
            ))}
          </div>

          {/* Getting Started Guide */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 mb-8 border border-green-200 dark:border-green-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" aria-hidden="true" />
              {t('guide_title')}
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-300">
              {guideSteps.map((step, i) => (
                <div key={i} className="space-y-2">
                  <h3 className={`font-bold text-${step.color}-700 dark:text-${step.color}-400 flex items-center gap-2`}>
                    <span className={`flex-shrink-0 w-6 h-6 bg-${step.color}-600 text-white rounded-full flex items-center justify-center text-xs`}>
                      {i + 1}
                    </span>
                    {step.title}
                  </h3>
                  <ul className="list-disc pl-8 space-y-1">
                    {step.items.map((item, j) => (
                      <li key={j} dangerouslySetInnerHTML={{ __html: item }} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400" aria-hidden="true">💡</span>
                {t('guide_tip')}
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {t('features_heading')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const colorClasses = {
                  green: 'from-green-500 to-emerald-600',
                  blue: 'from-blue-500 to-cyan-600',
                  purple: 'from-purple-500 to-pink-600',
                  orange: 'from-orange-500 to-amber-600',
                  indigo: 'from-indigo-500 to-purple-600',
                  teal: 'from-teal-500 to-cyan-600',
                  red: 'from-red-500 to-rose-600',
                  gray: 'from-gray-500 to-slate-600',
                }

                return (
                  <Link
                    key={index}
                    href={feature.href}
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
                )
              })}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
