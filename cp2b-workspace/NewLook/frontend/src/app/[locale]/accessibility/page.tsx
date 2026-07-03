'use client'

import { useLocale } from 'next-intl'

/**
 * Accessibility Statement / Declaração de Acessibilidade.
 *
 * Aligned with WCAG 2.1, the Brazilian e-MAG model and the Lei Brasileira de
 * Inclusão (Lei 13.146/2015). Draft for UNICAMP review. Declares the current
 * conformance target (Level A, with Level AA in progress) and known limitations
 * (notably the interactive map), plus a feedback channel.
 */

const VERSION = '2026-06-25'

type Section = { h: string; p: string[] }
type Doc = { title: string; updated: string; intro: string; sections: Section[]; draftNote: string }

const PT: Doc = {
  title: 'Declaração de Acessibilidade',
  updated: `Última atualização: ${VERSION}`,
  draftNote: 'Documento em revisão institucional pela UNICAMP. Sujeito a alterações.',
  intro:
    'A plataforma PILAR-2b / CP2B Maps busca ser acessível ao maior número possível de pessoas, seguindo as Diretrizes de Acessibilidade para Conteúdo Web (WCAG 2.1), o Modelo de Acessibilidade em Governo Eletrônico (e-MAG) e a Lei Brasileira de Inclusão (Lei nº 13.146/2015).',
  sections: [
    {
      h: '1. Nível de conformidade',
      p: [
        'Objetivo atual: conformidade com o WCAG 2.1 Nível A, com o Nível AA em andamento.',
        'Adotamos HTML semântico, atributos ARIA, navegação por teclado, indicadores de foco visíveis, idioma de página declarado e respeito à preferência de movimento reduzido do usuário.',
      ],
    },
    {
      h: '2. Recursos de acessibilidade',
      p: [
        'Link "pular para o conteúdo" em todas as páginas; rótulos associados a campos de formulário; mensagens de erro anunciadas; contraste de cor adequado nos elementos principais; suporte a leitores de tela.',
      ],
    },
    {
      h: '3. Limitações conhecidas',
      p: [
        'O mapa interativo (baseado em Leaflet) ainda apresenta limitações de operação por teclado e por leitores de tela. Como alternativa acessível, os mesmos dados estão disponíveis em tabelas e rankings nas páginas de análise.',
        'Estamos trabalhando para ampliar a cobertura de textos alternativos em gráficos e para concluir a verificação do Nível AA (contraste de elementos não textuais, redimensionamento e reflow).',
      ],
    },
    {
      h: '4. Tecnologias e avaliação',
      p: [
        'A acessibilidade é verificada de forma automatizada na integração contínua (jest-axe, eslint-plugin-jsx-a11y) e por revisão manual com teclado e leitores de tela.',
      ],
    },
    {
      h: '5. Contato e feedback',
      p: [
        'Encontrou uma barreira de acessibilidade? Escreva para lucasnc@unicamp.br. Responderemos e buscaremos uma solução o mais rápido possível.',
      ],
    },
  ],
}

const EN: Doc = {
  title: 'Accessibility Statement',
  updated: `Last updated: ${VERSION}`,
  draftNote: 'Draft under UNICAMP institutional review. Subject to change.',
  intro:
    'The PILAR-2b / CP2B Maps platform aims to be accessible to as many people as possible, following the Web Content Accessibility Guidelines (WCAG 2.1), the Brazilian e-MAG model and the Brazilian Inclusion Law (Law No. 13.146/2015).',
  sections: [
    {
      h: '1. Conformance level',
      p: [
        'Current goal: WCAG 2.1 Level A conformance, with Level AA in progress.',
        'We use semantic HTML, ARIA attributes, keyboard navigation, visible focus indicators, a declared page language, and respect for the user’s reduced-motion preference.',
      ],
    },
    {
      h: '2. Accessibility features',
      p: [
        'A “skip to content” link on every page; labels associated with form fields; announced error messages; adequate colour contrast on primary elements; screen-reader support.',
      ],
    },
    {
      h: '3. Known limitations',
      p: [
        'The interactive map (Leaflet-based) still has limitations for keyboard and screen-reader operation. As an accessible alternative, the same data is available as tables and rankings on the analysis pages.',
        'We are expanding alternative-text coverage on charts and completing Level AA verification (non-text contrast, resize and reflow).',
      ],
    },
    {
      h: '4. Technology and evaluation',
      p: [
        'Accessibility is checked automatically in continuous integration (jest-axe, eslint-plugin-jsx-a11y) and through manual keyboard and screen-reader review.',
      ],
    },
    {
      h: '5. Contact and feedback',
      p: [
        'Found an accessibility barrier? Write to lucasnc@unicamp.br. We will respond and work to resolve it as quickly as possible.',
      ],
    },
  ],
}

export default function AccessibilityPage() {
  const locale = useLocale()
  const doc = locale === 'en' ? EN : PT

  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">{doc.title}</h1>
      <p className="text-sm text-gray-500 mb-4">{doc.updated}</p>
      <p
        role="note"
        className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-md px-3 py-2 mb-6"
      >
        {doc.draftNote}
      </p>
      <p className="text-gray-700 mb-8 leading-relaxed">{doc.intro}</p>

      {doc.sections.map((s) => (
        <section key={s.h} className="mb-6">
          <h2 className="text-xl font-semibold mb-2">{s.h}</h2>
          {s.p.map((para, i) => (
            <p key={i} className="text-gray-700 leading-relaxed mb-2">
              {para}
            </p>
          ))}
        </section>
      ))}
    </main>
  )
}
