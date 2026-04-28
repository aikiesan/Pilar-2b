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
import {
  Map,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  ChevronDown,
  Home,
  Info,
  BarChart3,
  BookOpen,
  Target,
  TrendingUp,
  Workflow
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import GlobalSearch from '@/components/ui/GlobalSearch'
import { logger } from '@/lib/logger'

interface NavItemConfig {
  href: string
  labelKey: string
  icon: React.ReactNode
  descriptionKey?: string
}

interface UnifiedHeaderProps {
  variant?: 'auto' | 'public' | 'authenticated'
}

// Navigation item configurations (label keys map to i18n)
const publicNavConfig: NavItemConfig[] = [
  { href: '/', labelKey: 'home', icon: <Home className="h-4 w-4" /> },
  { href: '/map', labelKey: 'map', icon: <Map className="h-4 w-4" /> },
  { href: '/dashboard', labelKey: 'dashboard', icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/about', labelKey: 'about', icon: <Info className="h-4 w-4" /> },
]

const authenticatedNavConfig: NavItemConfig[] = [
  { href: '/dashboard', labelKey: 'hub', icon: <Home className="h-4 w-4" />, descriptionKey: 'hub' },
  { href: '/map', labelKey: 'map', icon: <Map className="h-4 w-4" />, descriptionKey: 'map' },
  { href: '/dashboard/advanced-analysis', labelKey: 'advanced', icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/dashboard/scientific-database', labelKey: 'scientific_database', icon: <BookOpen className="h-4 w-4" /> },
  { href: '/dashboard/technology-routes', labelKey: 'technology_routes', icon: <Workflow className="h-4 w-4" /> },
  { href: '/dashboard/proximity', labelKey: 'proximity', icon: <Target className="h-4 w-4" /> },
]

export default function UnifiedHeader({ variant = 'auto' }: UnifiedHeaderProps) {
  const pathname = usePathname()
  const { user, logout, isAuthenticated } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // i18n translations
  const t = useTranslations('common')

  // Determine variant based on auth state if auto
  const effectiveVariant = variant === 'auto'
    ? (isAuthenticated ? 'authenticated' : 'public')
    : variant

  const isPublic = effectiveVariant === 'public'
  const navConfig = isPublic ? publicNavConfig : authenticatedNavConfig

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
      header: 'bg-white/95 backdrop-blur-sm border-b border-gray-200',
      logo: '/pilar2b/images/logotipo-full-black.png',
      logoClass: '',
      navLink: 'text-cp2b-gray-600 hover:text-cp2b-green',
      navLinkActive: 'text-cp2b-green font-semibold relative after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-cp2b-green after:rounded-full',
      mobileMenu: 'bg-white border-t border-gray-200',
      toggleBg: 'bg-gray-100 hover:bg-gray-200',
      toggleText: 'text-gray-700',
    },
    authenticated: {
      header: 'bg-gradient-to-r from-[#1E5128] to-[#2C6B3A] shadow-lg',
      logo: '/pilar2b/images/logotipo-full-black.png',
      logoClass: 'brightness-0 invert',
      navLink: 'text-green-100 hover:bg-white/10 hover:text-white',
      navLinkActive: 'bg-white/20 text-white shadow-inner',
      mobileMenu: 'bg-[#1E5128] border-t border-white/20',
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
              aria-label="PILAR-2b V3 - Home"
            >
              <Image
                src={currentStyles.logo}
                alt="PILAR-2b - Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogas e Bioprodutos"
                width={140}
                height={48}
                className={`transition-transform group-hover:scale-105 ${currentStyles.logoClass}`}
                style={{ height: 'auto' }}
                priority
              />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                isPublic
                  ? 'bg-cp2b-lime-light text-cp2b-dark-green'
                  : 'bg-white/20 text-white'
              }`}>
                {t('badge.beta')}
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navConfig.map((item) => {
              const isExternal = item.href.startsWith('http')
              const label = t(`nav.${item.labelKey}`)
              const linkClass = `
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 focus:outline-none focus:ring-2
                ${isPublic
                  ? 'focus:ring-cp2b-lime'
                  : 'focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1E5128]'
                }
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
                  {item.icon}
                  <span>{label}</span>
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClass}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.icon}
                  <span>{label}</span>
                </Link>
              )
            })}
          </div>

          {/* Theme & Language Toggles + User Menu (Desktop) */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Global Search */}
            <GlobalSearch variant={isPublic ? 'light' : 'dark'} />

            {/* Language Toggle */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <div className={isPublic ? 'text-gray-700' : ''}>
              <ThemeToggle variant={isPublic ? 'light' : 'dark'} />
            </div>

            {/* User Menu / Auth Buttons */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors
                    focus:outline-none focus:ring-2
                    ${isPublic
                      ? 'text-gray-700 hover:bg-gray-100 focus:ring-cp2b-lime'
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
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200"
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.full_name || t('auth.user')}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {user.role === 'admin' ? t('auth.admin') : t('auth.authenticated')}
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      role="menuitem"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      {t('auth.settings')}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
                      ? 'text-white bg-cp2b-green hover:bg-cp2b-dark-green focus:ring-cp2b-lime'
                      : 'text-white bg-white/20 hover:bg-white/30 focus:ring-white'
                    }
                  `}
                >
                  {t('auth.login')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`
                inline-flex items-center justify-center p-2 rounded-lg
                focus:outline-none focus:ring-2
                ${isPublic
                  ? 'text-gray-600 hover:bg-gray-100 focus:ring-cp2b-lime'
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div
            className={`md:hidden relative z-50 ${currentStyles.mobileMenu}`}
            id="mobile-menu"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navConfig.map((item) => {
                const isExternal = item.href.startsWith('http')
                const label = t(`nav.${item.labelKey}`)
                const description = item.descriptionKey ? t(`nav_descriptions.${item.descriptionKey}`) : undefined
                const linkClass = `
                  flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium
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
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <div>
                      <span className="block">{label}</span>
                      {description && (
                        <span className={`text-xs ${isPublic ? 'text-gray-500' : 'text-green-200'}`}>
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
                        <span className={`text-xs ${isPublic ? 'text-gray-500' : 'text-green-200'}`}>
                          {description}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Mobile Toggles */}
            <div className={`px-4 py-3 border-t ${isPublic ? 'border-gray-200' : 'border-white/20'}`}>
              <div className="flex items-center justify-between gap-4">
                <LanguageSwitcher />
                <ThemeToggle variant={isPublic ? 'light' : 'dark'} />
              </div>
            </div>

            {/* Mobile User Section */}
            {isAuthenticated && user ? (
              <div className={`border-t ${isPublic ? 'border-gray-200' : 'border-white/20'} px-4 py-4`}>
                <div className="flex items-center gap-3 mb-3">
                  <User className={`h-8 w-8 p-1 rounded-full ${
                    isPublic ? 'text-gray-700 bg-gray-100' : 'text-white bg-white/20'
                  }`} />
                  <div>
                    <p className={`text-sm font-medium ${isPublic ? 'text-gray-900' : 'text-white'}`}>
                      {user.full_name || t('auth.user')}
                    </p>
                    <p className={`text-xs ${isPublic ? 'text-gray-500' : 'text-green-200'}`}>
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
              <div className={`border-t ${isPublic ? 'border-gray-200' : 'border-white/20'} px-4 py-4`}>
                <Link
                  href="/login"
                  className={`
                    block w-full px-4 py-2 text-center text-sm font-medium rounded-lg
                    ${isPublic
                      ? 'text-white bg-cp2b-green hover:bg-cp2b-dark-green'
                      : 'text-white bg-white/20 hover:bg-white/30'
                    }
                  `}
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
    </>
  )
}
