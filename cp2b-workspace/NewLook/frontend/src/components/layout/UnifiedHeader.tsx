'use client'

/**
 * PILAR-2b V3 - Unified Header Component
 * Single header component with public/authenticated variants
 * WCAG 2.1 AA compliant with i18n support
 */

import React, { useState } from 'react'
import { Link, usePathname } from '@/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { Messages } from '@/types/i18n'
import {
  Map,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Info,
  Columns3,
  FlaskConical,
  BarChart3,
  BookOpen,
  Target,
  TrendingUp,
  Workflow,
  Quote,
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealSession } from '@/lib/betaAccess'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import GlobalSearch from '@/components/ui/GlobalSearch'
import { logger } from '@/lib/logger'

// The account UI keys off a REAL session, not `isAuthenticated`: in open mode
// (NEXT_PUBLIC_DISABLE_AUTH=true) every visitor is the synthetic TEST_USER, so
// `isAuthenticated` is true for anonymous traffic and would show a name and a
// logout button to the whole internet. Keyed this way, an anonymous visitor
// sees a plain "sign in" button — which is what the QR-page mode wanted — and
// only a genuinely signed-in account gets the menu.

interface NavItemConfig {
  href: string
  labelKey: keyof Messages['common']['nav']
  icon: React.ReactNode
  descriptionKey?: keyof Messages['common']['nav_descriptions']
  tourClass?: string
  /**
   * Renders as a small, near-square outlined chip on desktop instead of a full
   * nav link: no icon, 11px, 2px radius. For secondary entries that
   * should be reachable without competing with the primary navigation.
   *
   * Desktop only -- the mobile menu keeps the full-size row, because an 11px
   * target would fall below the touch size the rest of the header holds to.
   */
  compact?: boolean
}

interface UnifiedHeaderProps {
  variant?: 'auto' | 'public' | 'authenticated'
}

// One navigation for every visitor. It used to come in two variants picked by
// `isAuthenticated` -- but open mode (NEXT_PUBLIC_DISABLE_AUTH=true, what the
// public site runs) signs every visitor in as the synthetic TEST_USER, so the
// public list, the only one with "Sobre", never rendered on the live site.
// Signing in changes the account menu, not what the platform offers.
// The Hub (/dashboard) left the bar: it only repeats these links, and stays
// reachable from the footer.
const navConfig: NavItemConfig[] = [
  { href: '/guide', labelKey: 'guide', icon: <BookOpen className="h-4 w-4" />, descriptionKey: 'guide' },
  { href: '/map', labelKey: 'map', icon: <Map className="h-4 w-4" />, descriptionKey: 'map', tourClass: 'tour-map' },
  { href: '/dashboard/advanced-analysis', labelKey: 'advanced', icon: <BarChart3 className="h-4 w-4" />, descriptionKey: 'advanced', tourClass: 'tour-analysis' },
  { href: '/dashboard/compare', labelKey: 'compare', icon: <Columns3 className="h-4 w-4" />, descriptionKey: 'compare' },
  { href: '/dashboard/scientific-database', labelKey: 'scientific_database', icon: <FlaskConical className="h-4 w-4" />, descriptionKey: 'scientific_database', tourClass: 'tour-science' },
  { href: '/dashboard/technology-routes', labelKey: 'technology_routes', icon: <Workflow className="h-4 w-4" />, descriptionKey: 'technology_routes', tourClass: 'tour-calculator' },
  { href: '/dashboard/proximity', labelKey: 'proximity', icon: <Target className="h-4 w-4" />, descriptionKey: 'proximity', tourClass: 'tour-proximity' },
  { href: '/about', labelKey: 'about', icon: <Info className="h-4 w-4" />, descriptionKey: 'about' },
  { href: '/cite', labelKey: 'cite', icon: <Quote className="h-4 w-4" />, descriptionKey: 'cite' },
  { href: '/patch-notes', labelKey: 'patch_notes', icon: <Sparkles className="h-4 w-4" />, compact: true },
]

export default function UnifiedHeader({ variant = 'auto' }: UnifiedHeaderProps) {
  const pathname = usePathname()
  // The account UI needs a real session (see the note at the top); nothing in
  // the header reads `isAuthenticated` any more.
  const { user, logout } = useAuth()
  const hasRealSession = useRealSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // i18n translations
  const t = useTranslations('common')

  // `variant` is styling only. 'auto' is the light paper bar of the earth
  // identity; 'authenticated' keeps a dark terracotta bar for pages that ask.
  const effectiveVariant = variant === 'authenticated' ? 'authenticated' : 'public'
  const isPublic = effectiveVariant === 'public'

  const handleLogout = async () => {
    try {
      await logout()
      setUserMenuOpen(false)
    } catch (error) {
      logger.error('Logout error:', error)
    }
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === ''
    }
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
    }
    return pathname.startsWith(href)
  }

  // Style configurations based on variant
  const styles = {
    public: {
      // Paper bar with a hairline rule; the active link is terracotta with a
      // 1px underline, after the editorial references.
      header: 'bg-paper-raised/95 backdrop-blur-sm border-b border-line',
      logo: '/images/logotipo-full-black.png',
      logoClass: 'dark:brightness-0 dark:invert',
      navLink: 'text-ink-muted hover:text-ink',
      navLinkActive: 'text-terra-600 dark:text-terra-400 relative after:absolute after:bottom-1 after:left-2 after:right-2 after:h-px after:bg-current',
      mobileMenu: 'bg-paper-raised border-t border-line',
      toggleBg: 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700',
      toggleText: 'text-gray-700 dark:text-slate-300',
    },
    authenticated: {
      header: 'bg-gradient-to-r from-terra-800 to-terra-700 shadow-lg',
      logo: '/images/logotipo-full-black.png',
      logoClass: 'brightness-0 invert',
      navLink: 'text-terra-100 hover:bg-white/10 hover:text-white',
      navLinkActive: 'bg-white/20 text-white shadow-inner',
      mobileMenu: 'bg-terra-800 border-t border-white/20',
      toggleBg: 'bg-white/10 hover:bg-white/20',
      toggleText: 'text-white',
    }
  }

  const currentStyles = styles[effectiveVariant]

  return (
    <>
      {/* Click outside overlay - rendered outside header */}
      {(userMenuOpen || mobileMenuOpen) && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => {
            setUserMenuOpen(false)
            setMobileMenuOpen(false)
          }}
          aria-hidden="true"
        />
      )}

      <header className={`sticky top-0 z-50 ${currentStyles.header}`}>
        <nav
          className="max-w-full mx-auto px-4 sm:px-6 lg:px-8"
          aria-label="Main navigation"
        >
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className="flex items-center gap-3 group"
            >
              <Image
                src={currentStyles.logo}
                alt={t('logo_alt')}
                width={140}
                height={48}
                className={`transition-transform group-hover:scale-105 ${currentStyles.logoClass}`}
                style={{ height: 'auto' }}
                priority
              />
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm border text-[10px] font-medium uppercase tracking-[0.12em] ${
                isPublic
                  ? 'border-ochre-700/50 text-ochre-700 dark:border-ochre-400/50 dark:text-ochre-300'
                  : 'border-white/40 text-white'
              }`}>
                {t('badge.beta')}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden min-[1360px]:flex items-center space-x-0.5 min-[1760px]:space-x-1">
            {navConfig.map((item) => {
              const isExternal = item.href.startsWith('http')
              const label = t(`nav.${item.labelKey}`)
              const focusRing = isPublic
                ? 'focus:ring-terra-600'
                : 'focus:ring-white focus:ring-offset-2 focus:ring-offset-terra-800'

              // Compact entries carry their own colours rather than reusing
              // currentStyles.navLink: that token has no border, and the active
              // public underline (an ::after bar) reads as noise at this size.
              const compactClass = isPublic
                ? (isActive(item.href)
                    ? 'border-terra-600 text-terra-600 dark:border-terra-400 dark:text-terra-400'
                    : 'border-gray-300 text-gray-600 hover:border-terra-600 hover:text-terra-600 dark:border-slate-600 dark:text-slate-300 dark:hover:border-terra-400 dark:hover:text-terra-400')
                : (isActive(item.href)
                    ? 'border-white/60 bg-white/15 text-white'
                    : 'border-white/30 text-terra-100 hover:border-white/60 hover:text-white')

              const linkClass = item.compact
                ? `
                ${item.tourClass || ''}
                inline-flex items-center rounded-[2px] border px-2 py-[3px]
                text-[11px] font-medium leading-none whitespace-nowrap
                transition-colors duration-200 focus:outline-none focus:ring-2
                ${focusRing}
                ${compactClass}
              `
                : `
                ${item.tourClass || ''}
                flex items-center gap-2 px-1.5 min-[1440px]:px-2 min-[1760px]:px-4 py-2 rounded-lg text-[13px] min-[1760px]:text-sm font-medium whitespace-nowrap
                transition-all duration-200 focus:outline-none focus:ring-2
                ${focusRing}
                ${isActive(item.href)
                  ? currentStyles.navLinkActive
                  : currentStyles.navLink
                }
              `

              return isExternal ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {item.compact ? null : <span className="hidden min-[1760px]:inline-flex">{item.icon}</span>}
                  <span>{label}</span>
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.compact ? null : <span className="hidden min-[1760px]:inline-flex">{item.icon}</span>}
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search: in the bar at every width, phones included, so
                the menu button below 1360px does not take it away. One instance
                only, since it listens for "/" on the whole window. */}
            <div>
              <GlobalSearch variant={isPublic ? 'light' : 'dark'} />
            </div>

            {/* Theme & Language Toggles + User Menu (Desktop) */}
            <div className="hidden min-[1360px]:flex items-center space-x-3">
              {/* Language Toggle */}
              <LanguageSwitcher variant={isPublic ? 'light' : 'dark'} />

              {/* Theme Toggle */}
              <div className={isPublic ? 'text-gray-700' : ''}>
                <ThemeToggle variant={isPublic ? 'light' : 'dark'} />
              </div>

              {/* User Menu / Auth Buttons — hidden in offline/event mode (no real account) */}
              {(hasRealSession && user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={`
                      flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                      focus:outline-none focus:ring-2
                      ${isPublic
                        ? 'text-gray-700 hover:bg-gray-100 focus:ring-terra-600'
                        : 'text-white hover:bg-white/10 focus:ring-white'
                      }
                    `}
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
                  >
                    <User className="h-5 w-5" aria-hidden="true" />
                    <span className="max-w-[120px] truncate">
                      {user.full_name || user.email?.split('@')[0]}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {userMenuOpen && (
                    <div
                      className="absolute right-0 mt-2 w-48 bg-paper-raised rounded shadow-xl py-1 z-50 border border-line"
                      role="menu"
                      aria-orientation="vertical"
                    >
                      <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
                          {user.full_name || t('auth.user')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-terra-600 dark:text-terra-400 mt-1">
                          {user.role === 'admin' ? t('auth.admin') : t('auth.authenticated')}
                        </p>
                      </div>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                        role="menuitem"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        {t('auth.settings')}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        {t('auth.logout')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className={`
                      px-4 py-2 text-sm font-medium rounded-lg transition-colors
                      focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${isPublic
                        ? 'text-ink border border-ink/70 hover:bg-ink hover:text-paper focus:ring-terra-600 focus:ring-offset-paper'
                        : 'text-white bg-white/20 hover:bg-white/30 focus:ring-white'
                      }
                    `}
                  >
                    {t('auth.login')}
                  </Link>
                </div>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="min-[1360px]:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`
                  inline-flex h-11 w-11 items-center justify-center rounded-lg
                  focus:outline-none focus:ring-2
                  ${isPublic
                    ? 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-terra-600'
                    : 'text-white hover:bg-white/10 focus:ring-white'
                  }
                `}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={mobileMenuOpen ? t('menu.close') : t('menu.open')}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className={`min-[1360px]:hidden relative z-50 ${currentStyles.mobileMenu}`}
            id="mobile-menu"
          >
            {/* A plain list with hairline rules, full width on phones. */}
            <div className={`py-1 ${isPublic ? 'divide-y divide-line' : 'space-y-1 px-2'}`}>
              {navConfig.map((item) => {
                const isExternal = item.href.startsWith('http')
                const label = t(`nav.${item.labelKey}`)
                const description = item.descriptionKey ? t(`nav_descriptions.${item.descriptionKey}`) : undefined
                const linkClass = isPublic
                  ? `flex items-center gap-3 px-4 py-3 text-base font-medium border-l-2 ${
                      isActive(item.href)
                        ? 'border-terra-600 dark:border-terra-400 bg-paper-sunken text-terra-600 dark:text-terra-400'
                        : 'border-transparent text-ink hover:bg-paper-sunken'
                    }`
                  : `flex items-center gap-3 px-3 py-3 rounded text-base font-medium ${
                      isActive(item.href) ? currentStyles.navLinkActive : currentStyles.navLink
                    }`

                return isExternal ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClass}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <div>
                      <span className="block">{label}</span>
                      {description && (
                        <span className={`text-xs ${isPublic ? 'text-ink-muted' : 'text-terra-200'}`}>
                          {description}
                        </span>
                      )}
                    </div>
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={linkClass}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    {item.icon}
                    <div>
                      <span className="block">{label}</span>
                      {description && (
                        <span className={`text-xs ${isPublic ? 'text-ink-muted' : 'text-terra-200'}`}>
                          {description}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Mobile Toggles */}
            <div className={`px-4 py-3 border-t ${isPublic ? 'border-line' : 'border-white/20'}`}>
              <div className="flex items-center justify-between gap-4">
                <LanguageSwitcher variant={isPublic ? 'light' : 'dark'} />
                <ThemeToggle variant={isPublic ? 'light' : 'dark'} />
              </div>
            </div>

            {/* Mobile User Section — hidden in offline/event mode (no real account) */}
            {(hasRealSession && user ? (
              <div className={`border-t ${isPublic ? 'border-line' : 'border-white/20'} px-4 py-4`}>
                <div className="flex items-center gap-3 mb-3">
                  <User className={`h-8 w-8 p-1 rounded-full ${
                    isPublic ? 'text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700' : 'text-white bg-white/20'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${isPublic ? 'text-gray-900 dark:text-slate-100' : 'text-white'}`}>
                      {user.full_name || t('auth.user')}
                    </p>
                    <p className={`text-xs ${isPublic ? 'text-gray-500 dark:text-slate-400' : 'text-terra-200'}`}>
                      {user.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white bg-red-500/80 hover:bg-red-500 rounded-lg"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t('auth.logout_account')}
                </button>
              </div>
            ) : (
              <div className={`border-t ${isPublic ? 'border-line' : 'border-white/20'} px-4 py-4`}>
                <Link
                  href="/login"
                  className={`
                    block w-full px-4 py-2 text-center text-sm font-medium rounded-lg
                    ${isPublic
                      ? 'text-ink border border-ink/70 hover:bg-ink hover:text-paper'
                      : 'text-white bg-white/20 hover:bg-white/30'
                    }
                  `}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t('auth.login')}
                </Link>
              </div>
            ))}
          </div>
        )}
      </nav>
    </header>
    </>
  )
}
