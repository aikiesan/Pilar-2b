'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

// Citations are rendered as published in every locale: ABNT is a Brazilian norm
// written in Portuguese, and the registered title is the Portuguese name.
const CITATIONS = {
  abnt:
    'CEREJO, L. N.; LAMPARELLI, R. A. C.; MORAES, B. de S.; AGUIAR, A. B. S. ' + // i18n-exempt: citation
    'PILAR-2b: Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogás e Bioprodutos. ' + // i18n-exempt: citation
    'Versão 3.0.3. Campinas: NIPE-UNICAMP, 2026. Software registrado no INPI sob nº BR512026003115-0. ' + // i18n-exempt: citation
    'Disponível em: https://cp2b.unicamp.br/pilar2b. Acesso em: [data de acesso].', // i18n-exempt: citation
  apa:
    'Cerejo, L. N., Lamparelli, R. A. C., Moraes, B. de S., & Aguiar, A. B. S. (2026). ' + // i18n-exempt: citation
    'PILAR-2b: Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogás e Bioprodutos ' + // i18n-exempt: citation
    '(Version 3.0.3) [Computer software]. NIPE-UNICAMP. https://cp2b.unicamp.br/pilar2b',
  bibtex:
    `@software{pilar2b_2026,
  author    = {Cerejo, Lucas Nakamura and Lamparelli, Rubens Augusto Camargo and Moraes, Bruna de Souza and Aguiar, Ana Beatriz Soares},
  title     = {PILAR-2b: Plataforma Inteligente de Localiza\\c{c}\\~ao e Aproveitamento de Res\\'iduos para Biog\\'as e Bioprodutos},
  version   = {3.0.3},
  year      = {2026},
  publisher = {NIPE-UNICAMP},
  url       = {https://github.com/aikiesan/Pilar-2b},
  note      = {Registered software, INPI BR512026003115-0}
}`,
};

function CiteBlock({ label, text, copyLabel, copiedLabel }: { label: string; text: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
        >
          {copied ? copiedLabel : copyLabel}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-gray-800">{text}</pre>
    </div>
  );
}

export default function CitePage() {
  const locale = useLocale();
  const t = useTranslations('pages.cite');

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{t('title')}</h1>
      <p className="mb-8 text-sm text-gray-600">{t('subtitle')}</p>

      <div className="space-y-4">
        <CiteBlock label="ABNT" text={CITATIONS.abnt} copyLabel={t('copy')} copiedLabel={t('copied')} />
        <CiteBlock label="APA (7th)" text={CITATIONS.apa} copyLabel={t('copy')} copiedLabel={t('copied')} />
        <CiteBlock label="BibTeX" text={CITATIONS.bibtex} copyLabel={t('copy')} copiedLabel={t('copied')} />
      </div>

      <section className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="mb-2 text-base font-semibold text-amber-900">{t('copyright_title')}</h2>
        <p className="text-sm text-amber-900">
          {t.rich('copyright_body', { strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="mb-2 text-base font-semibold text-blue-900">{t('license_title')}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-blue-900">
          <li>
            {t('license_source_label')} <strong>GNU GPL-3.0</strong> —{' '}
            <a className="underline" href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">
              gnu.org/licenses/gpl-3.0
            </a>
          </li>
          <li>
            {t('license_data_label')} <strong>Creative Commons CC BY 4.0</strong> {t('license_data_note')} —{' '}
            <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              creativecommons.org/licenses/by/4.0
            </a>
          </li>
          <li>
            {t('license_repo_label')}{' '}
            <a className="underline" href="https://github.com/aikiesan/Pilar-2b" target="_blank" rel="noopener noreferrer">
              github.com/aikiesan/Pilar-2b
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-1 text-base font-semibold text-gray-800">{t('why_title')}</h2>
        <p className="text-sm text-gray-700">{t('why')}</p>
      </section>

      <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="mb-1 text-base font-semibold text-emerald-900">{t('refs_title')}</h2>
        <p className="mb-2 text-sm text-emerald-900">{t('refs')}</p>
        <a className="text-sm font-medium text-emerald-700 underline" href={`/${locale}/dashboard/scientific-database`}>
          📚 {t('refs_link')}
        </a>
      </section>
    </div>
  );
}
