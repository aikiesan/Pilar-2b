'use client';

/**
 * Dashboard About Page - Redirects to NIPE Unicamp
 * Auto-redirects users to the official PILAR-2b website
 */
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';

export default function AboutPage() {
  const t = useTranslations('pages');
  const breadcrumbs = useBreadcrumbs();

  useEffect(() => {
    window.location.href = 'https://nipe.unicamp.br/cp2b/';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="bg-white border-b">
        <Breadcrumb items={breadcrumbs} />
      </div>
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 120px)' }}>
        <div className="text-center max-w-md px-4">
          <div className="mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 dark:border-emerald-400 mx-auto"></div>
          </div>
          <p className="text-lg text-gray-900 dark:text-gray-100 mb-4">
            {t('dashboard_about.redirecting')}
          </p>
          <a
            href="https://nipe.unicamp.br/cp2b/"
            className="text-green-600 dark:text-emerald-400 hover:underline text-sm"
          >
            {t('dashboard_about.click_here')}
          </a>
        </div>
      </div>
    </div>
  );
}
