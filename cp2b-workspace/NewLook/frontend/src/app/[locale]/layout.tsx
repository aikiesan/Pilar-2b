import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
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
import { locales, type Locale } from '@/config/i18n'
import { logger } from '@/lib/logger'
import { HtmlLang } from '@/components/HtmlLang'
import CookieConsent from '@/components/ui/CookieConsent'

// Generate dynamic metadata based on locale
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
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

// Prevent unknown locales from being generated
export const dynamicParams = false;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  try {
    // AWAIT the params (Next.js 16 requirement)
    const { locale } = await params;
    
    // Validate locale with proper type checking
    if (!locales.includes(locale as Locale)) {
      notFound();
    }
    
    // Load messages for the locale
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
                    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
                      <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 z-[200] px-4 py-2 bg-cp2b-green text-white rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cp2b-lime"
                      >
                        {tLayout('skip_to_content')}
                      </a>
                      <UnifiedHeader variant="auto" />
                      <main id="main-content" className="flex-1">
                        {children}
                      </main>
                      <ComparisonBar />
                      <ConditionalFooter />
                      <ToastContainer />
                      <CookieConsent />
                    </div>
                  </ErrorBoundary>
                </ComparisonProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </NextIntlClientProvider>
    );
  } catch (error) {
    console.error('Layout error:', error);
    notFound();
  }
}
