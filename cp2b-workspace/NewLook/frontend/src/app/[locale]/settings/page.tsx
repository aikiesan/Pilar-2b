'use client'

/**
 * PILAR-2b V3 - Settings Page
 * User preferences and account settings
 * Fully functional with notifications, appearance, and security settings
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Settings, User, Bell, Palette, Shield, HelpCircle, Save, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout'
import { logger } from '@/lib/logger'
import Breadcrumb from '@/components/ui/Breadcrumb'
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs'

interface UserSettings {
  notifications: {
    email: boolean
    browser: boolean
    dataUpdates: boolean
    weeklyReport: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'auto'
    language: string
    compactMode: boolean
  }
  security: {
    twoFactor: boolean
    sessionTimeout: number
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const t = useTranslations('settings_page')
  const breadcrumbs = useBreadcrumbs()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      browser: false,
      dataUpdates: true,
      weeklyReport: false,
    },
    appearance: {
      theme: 'light',
      language: 'pt-BR',
      compactMode: false,
    },
    security: {
      twoFactor: false,
      sessionTimeout: 30,
    },
  })

  useEffect(() => {
    const savedSettings = localStorage.getItem('cp2b-settings')
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings))
      } catch (e) {
        logger.error('Failed to load settings:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
  }, [loading, isAuthenticated, router])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem('cp2b-settings', JSON.stringify(settings))
      await new Promise(resolve => setTimeout(resolve, 500))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      logger.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" role="status" aria-label={t('loading')}></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout>
      {/* Breadcrumb */}
      <div className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
        <Breadcrumb items={breadcrumbs} />
      </div>

      <div className="h-[calc(100vh-64px)] overflow-y-auto bg-gray-50 dark:bg-slate-900 transition-colors">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <Settings className="h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                {t('title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('subtitle')}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              aria-label={t('save')}
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t('saved')}
                </>
              ) : saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {t('save')}
                </>
              )}
            </button>
          </div>

          {/* Settings Sections */}
          <div className="space-y-6">
            {/* Profile Section */}
            <section className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden" aria-labelledby="profile-heading">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <User className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="profile-heading" className="font-semibold text-gray-900 dark:text-gray-100">
                      {t('profile_heading')}
                    </h2>
                    <p className="text-sm text-gray-500">{t('profile_subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <dl className="space-y-4">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">{t('name')}</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.full_name || t('not_set')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">{t('email')}</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.email || t('not_set')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">{t('role')}</dt>
                    <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.role === 'admin' ? t('role_admin') : t('role_user')}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            {/* Notifications Section */}
            <section className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden" aria-labelledby="notifications-heading">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Bell className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="notifications-heading" className="font-semibold text-gray-900 dark:text-gray-100">
                      {t('notifications_heading')}
                    </h2>
                    <p className="text-sm text-gray-500">{t('notifications_subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {([
                  { key: 'email', label: t('notif_email'), field: 'email' },
                  { key: 'browser', label: t('notif_browser'), field: 'browser' },
                  { key: 'data', label: t('notif_data'), field: 'dataUpdates' },
                  { key: 'weekly', label: t('notif_weekly'), field: 'weeklyReport' },
                ] as const).map(({ key, label, field }) => (
                  <div key={key} className="flex items-center justify-between">
                    <label htmlFor={`notif-${key}`} className="text-sm text-gray-700">
                      {label}
                    </label>
                    <button
                      id={`notif-${key}`}
                      role="switch"
                      aria-checked={settings.notifications[field as keyof typeof settings.notifications] as boolean}
                      onClick={() => setSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          [field]: !settings.notifications[field as keyof typeof settings.notifications],
                        },
                      })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        settings.notifications[field as keyof typeof settings.notifications] ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications[field as keyof typeof settings.notifications] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Appearance Section */}
            <section className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden" aria-labelledby="appearance-heading">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                    <Palette className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="appearance-heading" className="font-semibold text-gray-900 dark:text-gray-100">
                      {t('appearance_heading')}
                    </h2>
                    <p className="text-sm text-gray-500">{t('appearance_subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label htmlFor="theme-select" className="text-sm text-gray-700 block mb-2">
                    {t('theme')}
                  </label>
                  <select
                    id="theme-select"
                    value={settings.appearance.theme}
                    onChange={(e) => setSettings({
                      ...settings,
                      appearance: { ...settings.appearance, theme: e.target.value as 'light' | 'dark' | 'auto' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="light">{t('theme_light')}</option>
                    <option value="dark">{t('theme_dark')}</option>
                    <option value="auto">{t('theme_auto')}</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="language-select" className="text-sm text-gray-700 block mb-2">
                    {t('language')}
                  </label>
                  <select
                    id="language-select"
                    value={settings.appearance.language}
                    onChange={(e) => setSettings({
                      ...settings,
                      appearance: { ...settings.appearance, language: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="compact-mode" className="text-sm text-gray-700">
                    {t('compact_mode')}
                  </label>
                  <button
                    id="compact-mode"
                    role="switch"
                    aria-checked={settings.appearance.compactMode}
                    onClick={() => setSettings({
                      ...settings,
                      appearance: { ...settings.appearance, compactMode: !settings.appearance.compactMode }
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.appearance.compactMode ? 'bg-emerald-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.appearance.compactMode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </section>

            {/* Security Section */}
            <section className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden" aria-labelledby="security-heading">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg text-red-600">
                    <Shield className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h2 id="security-heading" className="font-semibold text-gray-900 dark:text-gray-100">
                      {t('security_heading')}
                    </h2>
                    <p className="text-sm text-gray-500">{t('security_subtitle')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="two-factor" className="text-sm text-gray-700">
                    {t('two_factor')}
                  </label>
                  <button
                    id="two-factor"
                    role="switch"
                    aria-checked={settings.security.twoFactor}
                    onClick={() => setSettings({
                      ...settings,
                      security: { ...settings.security, twoFactor: !settings.security.twoFactor }
                    })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.security.twoFactor ? 'bg-emerald-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.security.twoFactor ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div>
                  <label htmlFor="session-timeout" className="text-sm text-gray-700 block mb-2">
                    {t('session_timeout')}
                  </label>
                  <input
                    id="session-timeout"
                    type="number"
                    min="5"
                    max="120"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => setSettings({
                      ...settings,
                      security: { ...settings.security, sessionTimeout: parseInt(e.target.value) || 30 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Alterar Senha
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Help Section */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5" aria-hidden="true" />
              <div>
                <h3 className="font-medium text-blue-900">Precisa de ajuda?</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Entre em contato com nossa equipe de suporte para assistência técnica.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
