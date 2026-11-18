import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { ComparisonProvider } from '@/contexts/ComparisonContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { QueryProvider } from '@/contexts/QueryProvider'
import ComparisonBar from '@/components/comparison/ComparisonBar'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import UnifiedHeader from '@/components/layout/UnifiedHeader'
import ConditionalFooter from '@/components/layout/ConditionalFooter'
import { ToastProvider } from '@/contexts/ToastContext'
import ToastContainer from '@/components/ui/ToastContainer'
import { isLocale, locales } from '@/config/i18n'
import { HtmlLang } from '@/components/HtmlLang'
import CookieConsent from '@/components/ui/CookieConsent'
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker'

// Generate dynamic metadata based on locale
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    authors: [{ name: 'NIPE-UNICAMP / PILAR-2b' }],
    openGraph: {
      title: t('title'),
      description: t('description'),
      locale: locale === 'pt-BR' ? 'pt_BR' : 'en_US',
      type: 'website',
    },
  };
}

// Generate static paths for all locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// No `dynamicParams = false` here: Next applies it to every route below this
// layout (a route renders on demand only if no segment sets it false), and
// municipalities/[slug] builds no page ahead, so each of them answered 404 in a
// production build. Unknown locales still 404, from the isLocale check below.

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Unknown locales 404. Everything else that fails here must surface as the
  // error it is — the previous try/catch turned any runtime error into a 404.
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  // Without it next-intl reads the locale from the request headers, which a
  // statically rendered page below (municipalities/[slug]) may not touch.
  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const tLayout = await getTranslations({ locale, namespace: 'landing' });

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone="America/Sao_Paulo"
    >
      <HtmlLang locale={locale} />
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ComparisonProvider>
                <ErrorBoundary>
                  <div className="flex flex-col min-h-screen bg-paper transition-colors">
                    <a
                      href="#main-content"
                      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-[200] px-4 py-2 bg-terra-600 text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-terra-600"
                    >
                      {tLayout('skip_to_content')}
                    </a>
                    <UnifiedHeader />
                    <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
                      {children}
                    </main>
                    <ComparisonBar />
                    <ConditionalFooter />
                    <ToastContainer />
                    <CookieConsent />
                    <AnalyticsTracker />
                  </div>
                </ErrorBoundary>
              </ComparisonProvider>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
