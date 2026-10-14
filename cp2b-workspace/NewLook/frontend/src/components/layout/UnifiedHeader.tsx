'use client'

/**
 * PILAR-2b — header, the same on every page.
 *
 * Paper bar with a hairline rule (earth identity). Four mega-menus, from the
 * redesign's navigation (siteNav.ts):
 *   Plataforma ▾ · Dados ▾ · Método ▾ · Sobre ▾      Guia · search · PT/EN · theme · Entrar · [Abrir mapa]
 * each opening a full-width panel with a short introduction and its pages,
 * one line of description each. From 1280 px the full bar shows; below it the
 * menu button opens the same groups as hairline lists, and phones get a
 * bottom bar (Mapa · Municípios · Dados · Mais) whose "Mais" opens that menu.
 *
 * WCAG 2.1 AA: menus follow the disclosure pattern (NavDropdown), the phone
 * menu toggles with aria-expanded / aria-controls, every target is at least
 * 44 px tall on phones.
 */

import React, { useCallback, useState } from 'react'
import { Link, usePathname } from '@/navigation'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronDown, LogOut, Menu, Settings, User, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealSession } from '@/lib/betaAccess'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import GlobalSearch from '@/components/ui/GlobalSearch'
import NavDropdown from '@/components/layout/NavDropdown'
import MobileTabBar from '@/components/layout/MobileTabBar'
import { GUIDE_LINK, NAV_GROUPS, currentNavHref, type NavGroup, type NavGroupId, type NavLeaf } from '@/components/layout/siteNav'
import { isFullViewport } from '@/components/layout/fullViewport'
import { logger } from '@/lib/logger'

// The account UI keys off a REAL session, not `isAuthenticated`: in open mode
// (NEXT_PUBLIC_DISABLE_AUTH=true) every visitor is the synthetic TEST_USER, so
// `isAuthenticated` is true for anonymous traffic and would show a name and a
// logout button to the whole internet. Keyed this way, an anonymous visitor
// sees a plain "sign in" button, and only a genuinely signed-in account gets
// the menu. Navigation is the same for everyone.

export default function UnifiedHeader() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const hasRealSession = useRealSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  // The open mega-menu, "on" the route it was opened on: navigating anywhere
  // (a link chosen, back/forward) closes it without an effect.
  const [openMenu, setOpenMenu] = useState<{ id: NavGroupId; on: string } | null>(null)
  const t = useTranslations('common')
  const hasTabBar = !isFullViewport(pathname)

  const setGroupOpen = useCallback(
    (id: NavGroupId, open: boolean) =>
      setOpenMenu((current) => (open ? { id, on: pathname } : current?.id === id ? null : current)),
    [pathname]
  )

  const handleLogout = async () => {
    try {
      await logout()
      setUserMenuOpen(false)
    } catch (error) {
      logger.error('Logout error:', error)
    }
  }

  const current = currentNavHref(pathname)
  const isActive = (href: string) => href === current

  const toItems = (group: NavGroup) =>
    group.items.map(({ href, labelKey, descriptionKey, icon: Icon }) => ({
      href,
      label: t(`nav.${labelKey}`),
      description: descriptionKey ? t(`nav_descriptions.${descriptionKey}`) : undefined,
      icon: <Icon className="h-4 w-4" />,
      active: isActive(href),
    }))

  const plainLink = (active: boolean) =>
    `relative flex items-center px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 dark:focus-visible:ring-terra-400 ${
      active
        ? 'text-terra-600 dark:text-terra-400 after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:bg-current'
        : 'text-ink-muted hover:text-ink'
    }`

  const mobileRow = (active: boolean) =>
    `flex min-h-[48px] items-center gap-3 border-l-2 px-4 py-3 text-base ${
      active
        ? 'border-terra-600 dark:border-terra-400 bg-paper-sunken text-terra-700 dark:text-terra-300'
        : 'border-transparent text-ink hover:bg-paper-sunken'
    }`

  const mobileLeaf = (item: NavLeaf) => (
    <Link
      href={item.href}
      className={mobileRow(isActive(item.href))}
      aria-current={isActive(item.href) ? 'page' : undefined}
      onClick={() => setMobileMenuOpen(false)}
    >
      <span className="shrink-0 text-ink-muted" aria-hidden="true"><item.icon className="h-4 w-4" /></span>
      <span className="min-w-0">
        <span className="block font-medium">{t(`nav.${item.labelKey}`)}</span>
        {item.descriptionKey && (
          <span className="block text-xs text-ink-muted">{t(`nav_descriptions.${item.descriptionKey}`)}</span>
        )}
      </span>
    </Link>
  )

  return (
    <>
      {/* Click-outside overlay for the phone menu and the account menu. */}
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

      <header className="sticky top-0 z-50 border-b border-line bg-paper-raised/95 backdrop-blur-sm">
        <nav className="max-w-full mx-auto px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center gap-3 group">
                <Image
                  src="/images/logotipo-full-black.png"
                  alt={t('logo_alt')}
                  width={140}
                  height={48}
                  className="transition-transform group-hover:scale-105 dark:brightness-0 dark:invert"
                  style={{ height: 'auto' }}
                  priority
                />
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm border border-ochre-700/50 text-ochre-700 dark:border-ochre-400/50 dark:text-ochre-300 text-[10px] font-medium uppercase tracking-[0.12em]">
                  {t('badge.beta')}
                </span>
              </Link>
            </div>

            {/* Desktop navigation (xl and up) */}
            <div className="hidden xl:flex flex-1 items-center gap-1">
              {NAV_GROUPS.map((group) => (
                <NavDropdown
                  key={group.id}
                  label={t(`nav.${group.labelKey}`)}
                  intro={{
                    lede: t(`nav_intro.${group.id}.lede`),
                    cta: group.introCtaKey ? t(`nav.${group.introCtaKey}`) : t(`nav_intro.${group.id}.cta`),
                    href: group.introHref,
                  }}
                  items={toItems(group)}
                  open={openMenu?.id === group.id && openMenu.on === pathname}
                  onOpenChange={(open) => setGroupOpen(group.id, open)}
                  triggerClassName={group.tourClass}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 xl:gap-3">
              <Link
                href={GUIDE_LINK.href}
                className={`hidden xl:flex ${plainLink(isActive(GUIDE_LINK.href))}`}
                aria-current={isActive(GUIDE_LINK.href) ? 'page' : undefined}
              >
                {t(`nav.${GUIDE_LINK.labelKey}`)}
              </Link>

              {/* Global Search: in the bar at every width, phones included. One
                  instance only, since it listens for "/" on the whole window. */}
              <div>
                <GlobalSearch variant="light" />
              </div>

              <div className="hidden xl:flex items-center gap-3">
                <LanguageSwitcher variant="light" />
                <div className="text-ink-muted">
                  <ThemeToggle variant="light" />
                </div>

                {hasRealSession && user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded text-ink hover:bg-paper-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
                      aria-expanded={userMenuOpen}
                      aria-haspopup="true"
                    >
                      <User className="h-5 w-5" aria-hidden="true" />
                      <span className="max-w-[120px] truncate">{user.full_name || user.email?.split('@')[0]}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-paper-raised rounded shadow-xl py-1 z-50 border border-line" role="menu" aria-orientation="vertical">
                        <div className="px-4 py-2 border-b border-line">
                          <p className="text-sm font-medium text-ink truncate">{user.full_name || t('auth.user')}</p>
                          <p className="text-xs text-ink-muted truncate">{user.email}</p>
                          <p className="text-xs text-terra-600 dark:text-terra-400 mt-1">
                            {user.role === 'admin' ? t('auth.admin') : t('auth.authenticated')}
                          </p>
                        </div>
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-paper-sunken"
                          role="menuitem"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="h-4 w-4" aria-hidden="true" />
                          {t('auth.settings')}
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          role="menuitem"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          {t('auth.logout')}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="px-4 py-2 text-sm font-medium rounded border border-ink/70 text-ink hover:bg-ink hover:text-paper transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                  >
                    {t('auth.login')}
                  </Link>
                )}

                <Link href="/map" className="tour-map btn-primary py-2 text-sm">
                  {t('nav.open_map')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {/* Menu button (below xl). Phones reach the menu through the
                  bottom bar's "Mais" instead, except on the full-viewport tools. */}
              <div className={hasTabBar ? 'hidden md:block xl:hidden' : 'xl:hidden'}>
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded text-ink hover:bg-paper-sunken focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="mobile-menu"
                  aria-label={mobileMenuOpen ? t('menu.close') : t('menu.open')}
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </div>

          {/* Phone / tablet menu: the same groups as hairline lists. */}
          {mobileMenuOpen && (
            <div
              id="mobile-menu"
              className={`xl:hidden relative z-50 -mx-4 sm:-mx-6 lg:-mx-8 overflow-y-auto border-t border-line bg-paper-raised ${
                hasTabBar ? 'max-h-[calc(100dvh-7.5rem)] md:max-h-[calc(100dvh-4rem)]' : 'max-h-[calc(100dvh-4rem)]'
              }`}
            >
              <div className="px-4 py-3">
                <Link href="/map" className="btn-primary w-full min-h-[44px]" onClick={() => setMobileMenuOpen(false)}>
                  {t('nav.open_map')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              {NAV_GROUPS.map((group) => (
                <section key={group.labelKey} aria-labelledby={`mobile-nav-${group.labelKey}`}>
                  <h2 id={`mobile-nav-${group.labelKey}`} className="font-sans eyebrow px-4 pt-4 pb-2">
                    {t(`nav.${group.labelKey}`)}
                  </h2>
                  <ul className="divide-y divide-line border-y border-line">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        {mobileLeaf(item)}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <div className="mt-4 px-4 py-3 border-t border-line flex items-center justify-between gap-4">
                <LanguageSwitcher variant="light" />
                <ThemeToggle variant="light" />
              </div>

              {hasRealSession && user ? (
                <div className="border-t border-line px-4 py-4">
                  <p className="text-sm font-medium text-ink">{user.full_name || t('auth.user')}</p>
                  <p className="text-xs text-ink-muted mb-3">{user.email}</p>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white bg-red-700 hover:bg-red-800 rounded"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t('auth.logout_account')}
                  </button>
                </div>
              ) : (
                <div className="border-t border-line px-4 py-4">
                  <Link
                    href="/login"
                    className="block w-full min-h-[44px] px-4 py-2.5 text-center text-sm font-medium rounded border border-ink/70 text-ink hover:bg-ink hover:text-paper"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t('auth.login')}
                  </Link>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>

      {/* Outside the header: its backdrop blur would trap a fixed child. */}
      {hasTabBar && (
        <MobileTabBar
          current={current}
          menuOpen={mobileMenuOpen}
          onToggleMenu={() => {
            setUserMenuOpen(false)
            setMobileMenuOpen((open) => !open)
          }}
        />
      )}
    </>
  )
}
