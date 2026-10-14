'use client';

/**
 * Patch notes — one entry per deploy, newest first.
 *
 * The prose lives in src/data/patch-notes.json, not in messages/*.json, and
 * each entry carries both locales itself. Rationale is in that file's header;
 * the short version is that the catalogs are CI-gated and threading a release
 * note through them per deploy is friction that kills the habit.
 *
 * Everything that is NOT a note -- headings, the kind labels, the empty state --
 * is chrome, is fixed vocabulary, and does live in the catalogs.
 */

import { useLocale, useTranslations } from 'next-intl';
import { Plus, Wrench, RefreshCw, ShieldCheck, Database } from 'lucide-react';
import patchNotes from '@/data/patch-notes.json';

type Locale = 'pt-BR' | 'en';
type Kind = 'added' | 'changed' | 'fixed' | 'security' | 'data';

interface Localized {
  'pt-BR': string;
  en: string;
}

interface Change {
  kind: Kind;
  text: Localized;
}

interface Entry {
  version: string;
  date: string;
  title: Localized;
  changes: Change[];
}


// Icon and colour per change kind. The visible label comes from the catalog.
const KIND_META: Record<Kind, { icon: typeof Plus; className: string }> = {
  added: { icon: Plus, className: 'text-terra-700 dark:text-terra-300' },
  changed: { icon: RefreshCw, className: 'text-dusk-700 dark:text-dusk-300' },
  fixed: { icon: Wrench, className: 'text-ochre-700 dark:text-ochre-300' },
  security: { icon: ShieldCheck, className: 'text-terra-900 dark:text-terra-200' },
  data: { icon: Database, className: 'text-ink' },
};

/**
 * Falls back to pt-BR when a locale is missing rather than rendering nothing.
 * check-patch-notes.mjs makes that unreachable in CI, but a blank release note
 * is a worse failure in the browser than a Portuguese one.
 */
function pick(value: Localized, locale: Locale): string {
  return value[locale] ?? value['pt-BR'];
}

export default function PatchNotesPage() {
  const t = useTranslations('patchNotes');
  const locale = (useLocale() === 'en' ? 'en' : 'pt-BR') as Locale;
  const entries = (patchNotes.entries as Entry[]);

  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-12 max-w-2xl">
        <span className="text-terra-600 dark:text-terra-300 font-semibold text-sm tracking-wide uppercase mb-2 block">
          {t('eyebrow')}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
          {t('heading')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">{t('lead')}</p>
      </header>

      {entries.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">{t('empty')}</p>
      ) : (
        <ol className="relative border-l border-line ml-3">
          {entries.map((entry) => (
            <li key={entry.version} className="mb-12 ml-8">
              <span
                className="absolute -left-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-terra-600 ring-4 ring-paper"
                aria-hidden="true"
              />

              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {t('version_prefix', { version: entry.version })}
              </h2>

              <time
                dateTime={entry.date}
                className="block mb-4 text-sm font-normal text-gray-500 dark:text-gray-400"
              >
                {dateFormat.format(new Date(entry.date))}
              </time>

              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
                {pick(entry.title, locale)}
              </h3>

              <ul className="space-y-3">
                {entry.changes.map((change, index) => {
                  const meta = KIND_META[change.kind] ?? KIND_META.changed;
                  const Icon = meta.icon;
                  return (
                    <li key={index} className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex w-24 shrink-0 items-center gap-1.5 border border-current px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${meta.className}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {t(`kind.${change.kind}`)}
                      </span>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {pick(change.text, locale)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
