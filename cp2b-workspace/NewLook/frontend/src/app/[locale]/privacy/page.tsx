import LegalDocument, { type LegalText } from '@/components/layout/LegalDocument'
import type { Localized } from '@/lib/localized'

/**
 * Privacy Policy / Política de Privacidade.
 *
 * Draft prepared for review by the UNICAMP Data Protection Officer (Encarregado
 * de Dados / Comissão Central LGPD) before being treated as the institution's
 * official notice. Reflects the platform's actual state as of the version date:
 * no authentication/accounts are active (open access via a shared demonstration
 * profile), and personal data is processed on UNICAMP-managed infrastructure —
 * it is not sent to Supabase, Vercel or Railway.
 */

const VERSION = '2026-06-25'

const TEXT: Localized<LegalText> = {
  'pt-BR': {
    title: 'Política de Privacidade',
    intro:
      'Esta Política descreve como a plataforma PILAR-2b / CP2B Maps trata dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).',
    draftNote:
      'Documento em revisão pelo Encarregado de Dados (DPO) da UNICAMP. Sujeito a ajustes antes de se tornar a notificação oficial da instituição.',
    sections: [
      {
        h: '1. Controlador dos dados',
        p: [
          'O tratamento de dados é realizado sob responsabilidade da Universidade Estadual de Campinas (UNICAMP), por meio do Núcleo Interdisciplinar de Planejamento Energético (NIPE) e do Centro Paulista de Estudos em Biogás e Bioprodutos (CP2B).',
          'Encarregado de Proteção de Dados: contate o Encarregado de Dados (DPO) da UNICAMP. Para assuntos específicos desta plataforma: lucasnc@unicamp.br.',
        ],
      },
      {
        h: '2. Quais dados tratamos',
        p: [
          'Navegação geral: a plataforma é de acesso aberto. Não há sistema de contas/autenticação ativo no momento — o acesso ocorre por um perfil de demonstração compartilhado, sem coleta de dados pessoais de cadastro.',
          'Calculadora de Viabilidade (opcional): se você optar por usar o formulário de contato da calculadora, coletamos nome, e-mail e, opcionalmente, CPF/CNPJ e município, além de metadados técnicos da requisição (endereço IP, navegador). Estes dados só são armazenados mediante o seu consentimento explícito.',
          'Cookies essenciais e logs de servidor padrão podem ser utilizados para o funcionamento e a segurança do serviço.',
        ],
      },
      {
        h: '3. Base legal e finalidade',
        p: [
          'O tratamento dos dados do formulário da calculadora baseia-se no seu consentimento (LGPD, art. 7º, I), coletado de forma livre, informada e inequívoca. O consentimento é registrado com a versão desta Política e a data/hora em que foi concedido.',
          'Finalidade: responder ao seu interesse, possibilitar contato sobre o projeto e produzir estatísticas agregadas de pesquisa. Não utilizamos os dados para decisões automatizadas com efeitos jurídicos.',
        ],
      },
      {
        h: '4. Compartilhamento e localização dos dados',
        p: [
          'Os dados pessoais são processados em infraestrutura administrada pela UNICAMP. Não enviamos dados pessoais a Supabase, Vercel ou Railway.',
          'Não há transferência internacional de dados pessoais e não vendemos nem cedemos seus dados a terceiros para fins de marketing.',
        ],
      },
      {
        h: '5. Retenção e eliminação',
        p: [
          'Os dados são mantidos apenas pelo período necessário às finalidades acima e são eliminados mediante solicitação do titular ou ao término do tratamento (LGPD, art. 15).',
        ],
      },
      {
        h: '6. Direitos do titular (LGPD, art. 18)',
        p: [
          'Você pode solicitar: confirmação e acesso aos dados; correção; anonimização ou eliminação; portabilidade; informação sobre compartilhamento; e revogação do consentimento.',
          'Para exercer esses direitos, contate lucasnc@unicamp.br ou o Encarregado de Dados da UNICAMP. Se você usou a calculadora, pode solicitar acesso ou eliminação do seu registro informando o identificador (lead_id) fornecido no envio.',
        ],
      },
      {
        h: '7. Segurança',
        p: [
          'Adotamos medidas técnicas e administrativas para proteger os dados, incluindo conexões cifradas (HTTPS), controle de origem (CORS), limitação de requisições e validação de entradas.',
        ],
      },
      {
        h: '8. Alterações e contato',
        p: [
          'Esta Política pode ser atualizada; a versão vigente é indicada pela data acima. Dúvidas: lucasnc@unicamp.br.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy',
    intro:
      'This Policy describes how the PILAR-2b / CP2B Maps platform processes personal data, in accordance with the Brazilian General Data Protection Law (Law No. 13.709/2018 — LGPD).',
    draftNote:
      'Draft under review by the UNICAMP Data Protection Officer (DPO). Subject to change before becoming the institution’s official notice.',
    sections: [
      {
        h: '1. Data controller',
        p: [
          // i18n-exempt: English text; São Paulo is a proper noun
          'Processing is carried out under the responsibility of the University of Campinas (UNICAMP), through the Interdisciplinary Center for Energy Planning (NIPE) and the São Paulo Center for Studies in Biogas and Bioproducts (CP2B).',
          'Data Protection: contact the UNICAMP Data Protection Officer (DPO). For platform-specific matters: lucasnc@unicamp.br.',
        ],
      },
      {
        h: '2. What data we process',
        p: [
          'General browsing: the platform is openly accessible. There is no active account/authentication system at this time — access is via a shared demonstration profile, with no collection of registration personal data.',
          'Viability Calculator (optional): if you choose to use the calculator contact form, we collect your name, email and, optionally, tax ID (CPF/CNPJ) and municipality, plus technical request metadata (IP address, browser). This data is stored only with your explicit consent.',
          'Essential cookies and standard server logs may be used for the operation and security of the service.',
        ],
      },
      {
        h: '3. Legal basis and purpose',
        p: [
          'Processing of calculator-form data relies on your consent (LGPD art. 7, I), collected freely, informed and unambiguously. Consent is recorded with the version of this Policy and the date/time it was granted.',
          'Purpose: to respond to your interest, enable contact about the project, and produce aggregate research statistics. We do not use the data for automated decisions with legal effects.',
        ],
      },
      {
        h: '4. Sharing and data location',
        p: [
          'Personal data is processed on UNICAMP-managed infrastructure. We do not send personal data to Supabase, Vercel or Railway.',
          'There is no international transfer of personal data, and we do not sell or share your data with third parties for marketing.',
        ],
      },
      {
        h: '5. Retention and erasure',
        p: [
          'Data is kept only for as long as necessary for the purposes above and is erased upon the data subject’s request or at the end of processing (LGPD art. 15).',
        ],
      },
      {
        h: '6. Data-subject rights (LGPD art. 18)',
        p: [
          'You may request: confirmation and access; correction; anonymization or erasure; portability; information on sharing; and withdrawal of consent.',
          'To exercise these rights, contact lucasnc@unicamp.br or the UNICAMP DPO. If you used the calculator, you can request access to or erasure of your record using the identifier (lead_id) returned on submission.',
        ],
      },
      {
        h: '7. Security',
        p: [
          'We apply technical and administrative measures to protect data, including encrypted connections (HTTPS), origin control (CORS), rate limiting and input validation.',
        ],
      },
      {
        h: '8. Changes and contact',
        p: [
          'This Policy may be updated; the version in force is indicated by the date above. Questions: lucasnc@unicamp.br.',
        ],
      },
    ],
  },
}

export default function PrivacyPage() {
  return <LegalDocument version={VERSION} text={TEXT} />
}
