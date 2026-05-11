import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, defaultLocale, type Locale } from './src/config/i18n';

export default getRequestConfig(async ({ requestLocale }) => {
  // next-intl v4: requestLocale is always a Promise (never undefined itself).
  // Without middleware the awaited value is undefined — fall back to default.
  const locale = (await requestLocale) ?? defaultLocale;

  // Reject genuinely unknown locales (dynamicParams=false already blocks them,
  // but guard here too for safety).
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  try {
    return {
      locale,
      messages: (await import(`./messages/${locale}.json`)).default,
      timeZone: 'America/Sao_Paulo',
    };
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error);
    notFound();
  }
});
