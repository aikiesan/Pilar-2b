'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { Instagram, Linkedin, Youtube, ArrowUp, Mail, CheckCircle2, AlertCircle } from 'lucide-react'

// WhatsApp icon — not available in lucide-react
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

export default function Footer() {
  const t = useTranslations('landing')
  const tNav = useTranslations('common.nav')

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error')
      return
    }
    setStatus('loading')
    // TODO: wire to actual newsletter API
    await new Promise((r) => setTimeout(r, 1200))
    setStatus('success')
    setEmail('')
    setTimeout(() => setStatus('idle'), 5000)
  }

  const socials = [
    {
      href: 'https://www.instagram.com/centro_biogas_cp2b/',
      label: t('footer.instagram_label'),
      Icon: Instagram,
      hover: 'hover:text-pink-400 hover:border-pink-400/40',
    },
    {
      href: 'https://br.linkedin.com/company/centro-paulista-de-estudos-em-biog%C3%A1s-e-bioprodutos-cp2b',
      label: t('footer.linkedin_label'),
      Icon: Linkedin,
      hover: 'hover:text-blue-400 hover:border-blue-400/40',
    },
    {
      href: 'https://www.youtube.com/channel/UChp2J3n-9napYyHUEHf3Fhg',
      label: t('footer.youtube_label'),
      Icon: Youtube,
      hover: 'hover:text-red-400 hover:border-red-400/40',
    },
    {
      href: 'https://wa.me/message/KVJUNJN7SIAZP1',
      label: t('footer.whatsapp_label'),
      Icon: WhatsAppIcon,
      hover: 'hover:text-emerald-400 hover:border-emerald-400/40',
    },
  ] as const

  const quickLinks = [
    { href: '/', label: tNav('home') },
    { href: '/map', label: tNav('map') },
    { href: '/dashboard', label: tNav('dashboard') },
    { href: '/about', label: tNav('about') },
    { href: '/login', label: t('footer.about') === 'About' ? 'Login' : 'Entrar' },
  ]

  return (
    <footer className="bg-[#0f1a0f] text-white" role="contentinfo">

      {/* ── Section 1: Newsletter ─────────────────────────────────── */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="lg:max-w-sm">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-cp2b-lime" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-widest text-cp2b-lime">
                  {t('footer.newsletter_heading')}
                </p>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                {t('footer.newsletter_desc')}
              </p>
            </div>

            <form
              onSubmit={handleSubscribe}
              className="flex flex-col sm:flex-row gap-3 lg:w-auto w-full"
              aria-label={t('footer.newsletter_heading')}
              noValidate
            >
              <div className="flex-1 min-w-0">
                <label htmlFor="footer-email" className="sr-only">
                  {t('footer.newsletter_email_placeholder')}
                </label>
                <input
                  id="footer-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
                  placeholder={t('footer.newsletter_email_placeholder')}
                  className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/15 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cp2b-lime focus:border-transparent transition-colors"
                  disabled={status === 'loading' || status === 'success'}
                  aria-describedby="footer-newsletter-status"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading' || status === 'success'}
                className="px-5 py-2.5 text-sm font-semibold bg-cp2b-green hover:bg-cp2b-dark-green disabled:opacity-60 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cp2b-lime whitespace-nowrap"
              >
                {status === 'loading' ? '...' : t('footer.newsletter_submit')}
              </button>
            </form>
          </div>

          {/* Status feedback */}
          <div id="footer-newsletter-status" aria-live="polite" className="mt-3 min-h-[1.25rem]">
            {status === 'success' && (
              <p className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {t('footer.newsletter_success')}
              </p>
            )}
            {status === 'error' && (
              <p className="flex items-center gap-2 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {t('footer.newsletter_error')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Three columns ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-16">

          {/* Col A — Branding */}
          <div className="space-y-4">
            <Image
              src="/images/logotipo-full-black.png"
              alt="PILAR-2b"
              width={130}
              height={44}
              className="brightness-200"
              style={{ height: 'auto' }}
            />

            <div className="space-y-2.5">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-cp2b-lime">
                  PILAR
                </p>
                <p className="text-xs text-gray-400 leading-snug">
                  {t('footer.platform_acronym')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-cp2b-lime">
                  2b
                </p>
                <p className="text-xs text-gray-400 leading-snug">
                  {t('footer.platform_2b')}
                </p>
              </div>
            </div>

            <div className="pt-1 space-y-0.5 border-t border-white/10">
              <p className="text-xs text-gray-500">{t('footer.institution')}</p>
              <p className="text-xs text-gray-500">{t('footer.fapesp_project')}</p>
            </div>
          </div>

          {/* Col B — Quick Links */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              {t('footer.quick_links')}
            </p>
            <nav aria-label="Footer quick links">
              <ul className="space-y-2.5 list-none">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Col C — Connect */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">
              {t('footer.connect')}
            </p>
            <div className="flex flex-wrap gap-3">
              {socials.map(({ href, label, Icon, hover }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-lg
                    text-gray-400 border border-white/10 bg-white/5
                    transition-all duration-150
                    focus:outline-none focus:ring-2 focus:ring-white/40
                    ${hover}
                  `}
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>

            <div className="mt-6 space-y-1">
              <p className="text-xs text-gray-500">São Paulo, Brasil</p>
              <a
                href="https://nipe.unicamp.br/cp2b/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded"
              >
                nipe.unicamp.br/cp2b ↗
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Bottom bar ─────────────────────────────────── */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">

            {/* Legal links */}
            <nav aria-label="Legal links">
              <ul className="flex items-center gap-1 list-none">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-1"
                  >
                    {t('footer.privacy')}
                  </Link>
                </li>
                <li aria-hidden="true" className="text-gray-600">|</li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-1"
                  >
                    {t('footer.terms')}
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Copyright + back to top */}
            <div className="flex items-center gap-4">
              <span>{t('footer.copyright')}</span>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                aria-label={t('footer.back_to_top')}
                className="flex items-center gap-1 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-1"
              >
                <ArrowUp className="w-3 h-3" aria-hidden="true" />
                {t('footer.back_to_top')}
              </button>
            </div>

          </div>
        </div>
      </div>

    </footer>
  )
}
