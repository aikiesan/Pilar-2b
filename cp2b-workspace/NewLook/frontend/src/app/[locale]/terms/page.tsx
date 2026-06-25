'use client'

import { useLocale } from 'next-intl'

/**
 * Terms of Use / Termos de Uso.
 * Draft for UNICAMP review. The platform is a research/educational tool; its
 * outputs are indicative estimates, not investment, engineering or legal advice.
 */

const VERSION = '2026-06-25'

type Section = { h: string; p: string[] }
type Doc = { title: string; updated: string; intro: string; sections: Section[]; draftNote: string }

const PT: Doc = {
  title: 'Termos de Uso',
  updated: `Última atualização: ${VERSION}`,
  intro:
    'Ao acessar e utilizar a plataforma PILAR-2b / CP2B Maps, você concorda com estes Termos de Uso.',
  draftNote: 'Documento em revisão institucional pela UNICAMP. Sujeito a alterações.',
  sections: [
    {
      h: '1. Objeto e natureza do serviço',
      p: [
        'O PILAR-2b / CP2B Maps é uma plataforma de pesquisa e finalidade educacional que estima o potencial de biogás e bioprodutos a partir de resíduos no Estado de São Paulo.',
        'Os resultados são estimativas indicativas, baseadas em metodologia científica e dados públicos. Não constituem aconselhamento de investimento, projeto de engenharia ou parecer jurídico, e não substituem estudos de viabilidade detalhados.',
      ],
    },
    {
      h: '2. Acesso',
      p: [
        'No momento, o acesso é aberto, por meio de um perfil de demonstração compartilhado; não há cadastro de usuários. A disponibilidade do serviço pode variar por motivos de manutenção ou pesquisa.',
      ],
    },
    {
      h: '3. Uso aceitável',
      p: [
        'Você concorda em não utilizar a plataforma para fins ilícitos, em não tentar comprometer sua segurança ou integridade, e em não sobrecarregar a infraestrutura por meios automatizados além dos limites de requisição definidos.',
      ],
    },
    {
      h: '4. Propriedade intelectual',
      p: [
        'O código é distribuído sob licença GPL-3.0. A plataforma está registrada no INPI (BR512026003115-0). Os dados de origem pertencem às respectivas fontes (IBGE, MapBiomas, EMBRAPA, entre outras) e devem ser citados conforme suas licenças.',
      ],
    },
    {
      h: '5. Isenção de garantias e limitação de responsabilidade',
      p: [
        'A plataforma é fornecida "no estado em que se encontra", sem garantias de exatidão, completude ou adequação a um fim específico. Na máxima extensão permitida pela lei, a UNICAMP não se responsabiliza por decisões tomadas com base nos resultados.',
      ],
    },
    {
      h: '6. Privacidade',
      p: [
        'O tratamento de dados pessoais é descrito na Política de Privacidade, parte integrante destes Termos.',
      ],
    },
    {
      h: '7. Legislação aplicável e contato',
      p: [
        'Estes Termos são regidos pela legislação brasileira. Dúvidas: lucasnc@unicamp.br.',
      ],
    },
  ],
}

const EN: Doc = {
  title: 'Terms of Use',
  updated: `Last updated: ${VERSION}`,
  intro:
    'By accessing and using the PILAR-2b / CP2B Maps platform, you agree to these Terms of Use.',
  draftNote: 'Draft under UNICAMP institutional review. Subject to change.',
  sections: [
    {
      h: '1. Purpose and nature of the service',
      p: [
        'PILAR-2b / CP2B Maps is a research and educational platform that estimates biogas and bioproduct potential from residues in the State of São Paulo.',
        'Results are indicative estimates based on scientific methodology and public data. They do not constitute investment advice, an engineering design or legal opinion, and do not replace detailed feasibility studies.',
      ],
    },
    {
      h: '2. Access',
      p: [
        'Access is currently open, via a shared demonstration profile; there is no user registration. Service availability may vary for maintenance or research reasons.',
      ],
    },
    {
      h: '3. Acceptable use',
      p: [
        'You agree not to use the platform for unlawful purposes, not to attempt to compromise its security or integrity, and not to overload the infrastructure through automated means beyond the defined rate limits.',
      ],
    },
    {
      h: '4. Intellectual property',
      p: [
        'The code is distributed under the GPL-3.0 licence. The platform is registered with INPI (BR512026003115-0). Source data belongs to its respective providers (IBGE, MapBiomas, EMBRAPA, among others) and must be cited under their licences.',
      ],
    },
    {
      h: '5. Disclaimer of warranties and limitation of liability',
      p: [
        'The platform is provided "as is", without warranties of accuracy, completeness or fitness for a particular purpose. To the maximum extent permitted by law, UNICAMP is not liable for decisions made based on the results.',
      ],
    },
    {
      h: '6. Privacy',
      p: [
        'The processing of personal data is described in the Privacy Policy, which forms part of these Terms.',
      ],
    },
    {
      h: '7. Governing law and contact',
      p: [
        'These Terms are governed by Brazilian law. Questions: lucasnc@unicamp.br.',
      ],
    },
  ],
}

export default function TermsPage() {
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
