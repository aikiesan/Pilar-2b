'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';

const CITATIONS = {
  abnt:
    'CEREJO, L. N.; LAMPARELLI, R. A. C.; MORAES, B. de S.; AGUIAR, A. B. S. ' +
    'PILAR-2b: Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogás e Bioprodutos. ' +
    'Versão 3.0.3. Campinas: NIPE-UNICAMP, 2026. Software registrado no INPI sob nº BR512026003115-0. ' +
    'Disponível em: https://cp2b.unicamp.br/pilar2b. Acesso em: [data de acesso].',
  apa:
    'Cerejo, L. N., Lamparelli, R. A. C., Moraes, B. de S., & Aguiar, A. B. S. (2026). ' +
    'PILAR-2b: Plataforma Inteligente de Localização e Aproveitamento de Resíduos para Biogás e Bioprodutos ' +
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

const T = {
  'pt-BR': {
    title: 'Como Citar o PILAR-2b',
    subtitle:
      'Plataforma desenvolvida pelo CP2b / NIPE-UNICAMP. Ao usar dados, mapas ou resultados da plataforma em trabalhos acadêmicos, técnicos ou comerciais, cite-a usando um dos formatos abaixo.',
    why_title: 'Por que citar',
    why:
      'A citação garante rastreabilidade científica, permite a reprodutibilidade das análises, dá o devido crédito à pesquisa financiada pela FAPESP e reconhece o software registrado no INPI. Também ajuda a sustentar o desenvolvimento aberto da plataforma.',
    copy: 'Copiar',
    copied: 'Copiado!',
    copyright_title: 'Direitos autorais e registro',
    license_title: 'Licença',
    refs_title: 'Base científica',
    refs:
      'As análises são fundamentadas em uma revisão de literatura de 399 referências científicas (372 revisadas por pares), acessível na Base Científica da plataforma.',
    refs_link: 'Ver a Base Científica (399 referências)',
  },
  en: {
    title: 'How to Cite PILAR-2b',
    subtitle:
      'Platform developed by CP2b / NIPE-UNICAMP. When using the platform’s data, maps or results in academic, technical or commercial work, please cite it using one of the formats below.',
    why_title: 'Why cite',
    why:
      'Citation ensures scientific traceability, enables reproducibility of the analyses, gives due credit to FAPESP-funded research, and acknowledges the INPI-registered software. It also helps sustain the open development of the platform.',
    copy: 'Copy',
    copied: 'Copied!',
    copyright_title: 'Copyright & registration',
    license_title: 'License',
    refs_title: 'Scientific basis',
    refs:
      'Analyses are grounded in a literature review of 399 scientific references (372 peer-reviewed), available in the platform’s Scientific Database.',
    refs_link: 'Open the Scientific Database (399 references)',
  },
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
  const tr = T[locale as keyof typeof T] ?? T['pt-BR'];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">{tr.title}</h1>
      <p className="mb-8 text-sm text-gray-600">{tr.subtitle}</p>

      <div className="space-y-4">
        <CiteBlock label="ABNT" text={CITATIONS.abnt} copyLabel={tr.copy} copiedLabel={tr.copied} />
        <CiteBlock label="APA (7th)" text={CITATIONS.apa} copyLabel={tr.copy} copiedLabel={tr.copied} />
        <CiteBlock label="BibTeX" text={CITATIONS.bibtex} copyLabel={tr.copy} copiedLabel={tr.copied} />
      </div>

      <section className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="mb-2 text-base font-semibold text-amber-900">{tr.copyright_title}</h2>
        <p className="text-sm text-amber-900">
          © 2026 NIPE-UNICAMP (CP2b). Software registrado no INPI — Processo nº{' '}
          <strong>BR512026003115-0</strong> (emitido em 12/05/2026, válido até 2076).{' '}
          Pesquisa financiada pela FAPESP (Processo 2024/01112-1 — CP2Bsd).
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h2 className="mb-2 text-base font-semibold text-blue-900">{tr.license_title}</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-blue-900">
          <li>
            Código-fonte: <strong>GNU GPL-3.0</strong> —{' '}
            <a className="underline" href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">
              gnu.org/licenses/gpl-3.0
            </a>
          </li>
          <li>
            Dados e documentação: <strong>Creative Commons CC BY 4.0</strong> (atribuição) —{' '}
            <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
              creativecommons.org/licenses/by/4.0
            </a>
          </li>
          <li>
            Repositório / CITATION.cff:{' '}
            <a className="underline" href="https://github.com/aikiesan/Pilar-2b" target="_blank" rel="noopener noreferrer">
              github.com/aikiesan/Pilar-2b
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <h2 className="mb-1 text-base font-semibold text-gray-800">{tr.why_title}</h2>
        <p className="text-sm text-gray-700">{tr.why}</p>
      </section>

      <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="mb-1 text-base font-semibold text-emerald-900">{tr.refs_title}</h2>
        <p className="mb-2 text-sm text-emerald-900">{tr.refs}</p>
        <a className="text-sm font-medium text-emerald-700 underline" href={`/${locale}/dashboard/scientific-database`}>
          📚 {tr.refs_link}
        </a>
      </section>
    </main>
  );
}
