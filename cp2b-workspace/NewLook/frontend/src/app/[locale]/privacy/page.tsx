import LegalDocument, { type LegalText } from '@/components/layout/LegalDocument'
import type { Localized } from '@/lib/localized'

/**
 * Privacy Policy / Política de Privacidade.
 *
 * Draft for review by the UNICAMP Data Protection Officer (Encarregado de
 * Dados / Comissão Central LGPD) before it is treated as the institution's
 * official notice. It describes the platform as it is on the version date:
 * invite-only accounts, the newsletter, the statistics cookie (with consent),
 * the calculator's contact form, and the third-party map services the browser
 * loads. Personal data is processed on UNICAMP-managed infrastructure.
 *
 * VERSION is the notice version each newsletter consent records: keep it in
 * step with CONSENT_TEXT_VERSION in backend/app/api/v1/endpoints/newsletter.py,
 * and with CONSENT_VERSION in src/lib/consent.ts when the cookie section changes.
 */

const VERSION = '2026-09-25'

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
          'Navegação: a plataforma é de acesso aberto. O servidor registra, como qualquer site, o endereço IP, o navegador, a página pedida e a data e hora de cada acesso, para o funcionamento e a segurança do serviço.',
          'Contas de acesso: as contas são criadas por um administrador, por convite, para pesquisadores e colaboradores. Tratamos nome, e-mail, a senha (guardada apenas como hash bcrypt, nunca em texto), o perfil e o nível de acesso, as datas de criação e do último acesso e o número de tentativas de senha erradas. Ao entrar, um token de sessão fica no seu navegador; ele expira em pouco tempo e é revogado quando você sai. O acesso a recursos confidenciais é registrado (quem, qual recurso, quando e de qual endereço IP).',
          'Newsletter: ao se inscrever (no rodapé, na página Sobre ou no aviso de cookies), guardamos o seu e-mail, o idioma, o formulário usado, a versão desta Política e a data e hora da inscrição. Não guardamos endereço IP nem dados do navegador.',
          'Estatísticas de uso, apenas se você escolher “Aceitar tudo” no aviso de cookies: um identificador aleatório guardado no cookie pilar2b_vid, um identificador aleatório da sessão (por aba do navegador), a página visitada (sem parâmetros de endereço), o idioma, o tipo de dispositivo (celular, tablet ou computador) e, na primeira página da visita, o site de onde você veio. Não guardamos endereço IP nem a identificação do navegador. Os dados servem apenas para contar visitas e saber quais páginas são usadas.',
          'Calculadora de Viabilidade (opcional): se você enviar o formulário de contato da calculadora, guardamos nome, e-mail, município, os dados do cálculo e metadados técnicos da requisição (endereço IP, navegador e página de origem), apenas com o seu consentimento explícito. Não coletamos CPF nem CNPJ.',
        ],
      },
      {
        h: '3. Base legal e finalidade',
        p: [
          'Newsletter, estatísticas de uso e calculadora: consentimento (LGPD, art. 7º, I), livre, informado e inequívoco, que você pode revogar a qualquer momento. O consentimento da newsletter é registrado com a versão desta Política e a data e hora. Finalidades: enviar novidades do PILAR-2b; medir o uso da plataforma para melhorá-la; responder ao seu interesse e produzir estatísticas agregadas de pesquisa.',
          'Contas de acesso: legítimo interesse e execução das atividades de pesquisa (LGPD, art. 7º, V e IX), para autenticar e autorizar pesquisadores e colaboradores. Registros do servidor e armazenamento essencial no navegador: legítimo interesse (art. 7º, IX), para o funcionamento e a segurança do serviço.',
          'Não usamos os dados para decisões automatizadas com efeitos jurídicos nem para publicidade.',
        ],
      },
      {
        h: '4. Cookies e armazenamento no navegador',
        p: [
          'Essenciais, sem necessidade de consentimento: a sua escolha sobre cookies, o idioma, o tema claro ou escuro, as preferências do mapa e, quando você entra na sua conta, o token de sessão. Ficam no armazenamento local do navegador e não são usados para identificar visitantes.',
          'Estatísticas, apenas com “Aceitar tudo”: o cookie pilar2b_vid, válido por 13 meses contados da primeira visita e sem renovação automática, e um identificador da sessão que é apagado quando a aba é fechada.',
          'Você pode mudar a sua escolha a qualquer momento em “Preferências de cookies”, no rodapé de todas as páginas. Ao escolher “Apenas essenciais”, o cookie de estatísticas é apagado e nenhuma estatística é enviada.',
        ],
      },
      {
        h: '5. Compartilhamento e localização dos dados',
        p: [
          'Os dados pessoais são processados em infraestrutura administrada pela UNICAMP. Não enviamos dados pessoais a Supabase, Vercel, Railway nem a serviços de análise de terceiros, e não vendemos nem cedemos seus dados a terceiros.',
          'Para desenhar o mapa, o seu navegador busca as imagens de fundo diretamente em serviços de mapas de terceiros (OpenStreetMap, CARTO, Esri ou OpenTopoMap, conforme o mapa-base escolhido) e dados públicos na API do IBGE. Como em qualquer acesso a um site, esses serviços recebem o seu endereço IP e dados do navegador, conforme as suas próprias políticas; alguns estão fora do Brasil. Nenhum identificador da plataforma é enviado a eles.',
        ],
      },
      {
        h: '6. Retenção e eliminação',
        p: [
          'Contas de acesso: enquanto a conta estiver ativa. Ao fim da colaboração a conta é desativada e depois eliminada; os registros de acesso a recursos confidenciais são mantidos para prestação de contas.',
          'Newsletter: até você cancelar a inscrição. O registro da inscrição e do cancelamento é mantido como prova do consentimento e eliminado a seu pedido.',
          'Estatísticas de uso: cada registro é eliminado automaticamente após 13 meses.',
          'Calculadora e registros do servidor: apenas pelo período necessário às finalidades acima, com eliminação a seu pedido ou ao término do tratamento (LGPD, art. 15).',
        ],
      },
      {
        h: '7. Direitos do titular (LGPD, art. 18)',
        p: [
          'Você pode solicitar: confirmação e acesso aos dados; correção; anonimização ou eliminação; portabilidade; informação sobre compartilhamento; e revogação do consentimento.',
          'Para cancelar a newsletter, use o link de cancelamento enviado com ela. Para as estatísticas, use “Preferências de cookies”, no rodapé. Para os demais direitos, contate lucasnc@unicamp.br ou o Encarregado de Dados da UNICAMP. Se você usou a calculadora, pode solicitar acesso ou eliminação do seu registro informando o identificador (lead_id) fornecido no envio.',
        ],
      },
      {
        h: '8. Segurança',
        p: [
          'Adotamos medidas técnicas e administrativas para proteger os dados, incluindo conexões cifradas (HTTPS), senhas guardadas como hash bcrypt, bloqueio temporário da conta (15 minutos) após 5 tentativas de senha erradas, tokens de sessão revogáveis, controle de origem (CORS), limitação de requisições, validação de entradas, registro de acesso a recursos confidenciais e remoção de e-mails e CPF/CNPJ dos registros da aplicação.',
        ],
      },
      {
        h: '9. Alterações e contato',
        p: [
          'Esta Política pode ser atualizada; a versão vigente é indicada pela data acima. Quando a descrição dos cookies mudar, o aviso de cookies pedirá a sua escolha novamente. Dúvidas: lucasnc@unicamp.br.',
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
          'Browsing: the platform is openly accessible. Like any website, the server records the IP address, browser, requested page and date and time of each request, to run and secure the service.',
          'User accounts: accounts are created by an administrator, by invitation, for researchers and collaborators. We process name, e-mail, the password (kept only as a bcrypt hash, never as text), the role and access level, the creation and last sign-in dates, and the number of failed password attempts. When you sign in, a session token is kept in your browser; it expires after a short time and is revoked when you sign out. Access to confidential resources is recorded (who, which resource, when and from which IP address).',
          'Newsletter: when you subscribe (in the footer, on the About page or in the cookie notice), we keep your e-mail, language, the form you used, the version of this Policy and the date and time you subscribed. We keep no IP address and no browser details.',
          'Usage statistics, only if you choose “Accept all” in the cookie notice: a random identifier kept in the pilar2b_vid cookie, a random session identifier (per browser tab), the page visited (without URL parameters), the language, the device type (phone, tablet or computer) and, on the first page of a visit, the site you came from. We keep no IP address and no browser identification. The data is used only to count visits and see which pages are used.',
          'Viability Calculator (optional): if you send the calculator’s contact form, we keep your name, e-mail, municipality, the calculation data and technical request metadata (IP address, browser and referring page), only with your explicit consent. We do not collect tax IDs (CPF/CNPJ).',
        ],
      },
      {
        h: '3. Legal basis and purpose',
        p: [
          'Newsletter, usage statistics and calculator: consent (LGPD art. 7, I), given freely, informed and unambiguously, which you can withdraw at any time. Newsletter consent is recorded with the version of this Policy and the date and time. Purposes: sending PILAR-2b news; measuring how the platform is used in order to improve it; responding to your interest and producing aggregate research statistics.',
          'User accounts: legitimate interest and the conduct of research activities (LGPD art. 7, V and IX), to authenticate and authorise researchers and collaborators. Server records and essential browser storage: legitimate interest (art. 7, IX), to run and secure the service.',
          'We do not use the data for automated decisions with legal effects or for advertising.',
        ],
      },
      {
        h: '4. Cookies and browser storage',
        p: [
          'Essential, needing no consent: your cookie choice, the language, the light or dark theme, the map preferences and, when you sign in, the session token. They are kept in the browser’s local storage and are not used to identify visitors.',
          'Statistics, only with “Accept all”: the pilar2b_vid cookie, valid for 13 months from your first visit and not renewed automatically, and a session identifier that is deleted when the tab is closed.',
          'You can change your choice at any time under “Cookie preferences”, at the foot of every page. Choosing “Essential only” deletes the statistics cookie and stops all statistics.',
        ],
      },
      {
        h: '5. Sharing and data location',
        p: [
          'Personal data is processed on UNICAMP-managed infrastructure. We do not send personal data to Supabase, Vercel, Railway or any third-party analytics service, and we do not sell or share your data with third parties.',
          'To draw the map, your browser fetches the background images directly from third-party map services (OpenStreetMap, CARTO, Esri or OpenTopoMap, depending on the base map chosen) and public data from IBGE’s API. As with any website, these services receive your IP address and browser details under their own policies; some are outside Brazil. No platform identifier is sent to them.',
        ],
      },
      {
        h: '6. Retention and erasure',
        p: [
          'User accounts: while the account is active. When a collaboration ends the account is deactivated and later deleted; the records of access to confidential resources are kept for accountability.',
          'Newsletter: until you unsubscribe. The record of the subscription and of the unsubscription is kept as proof of consent and erased at your request.',
          'Usage statistics: each record is deleted automatically after 13 months.',
          'Calculator and server records: only for as long as the purposes above require, erased at your request or at the end of processing (LGPD art. 15).',
        ],
      },
      {
        h: '7. Data-subject rights (LGPD art. 18)',
        p: [
          'You may request: confirmation and access; correction; anonymization or erasure; portability; information on sharing; and withdrawal of consent.',
          'To unsubscribe from the newsletter, use the unsubscribe link that comes with it. For the statistics, use “Cookie preferences” in the footer. For other rights, contact lucasnc@unicamp.br or the UNICAMP DPO. If you used the calculator, you can request access to or erasure of your record using the identifier (lead_id) returned on submission.',
        ],
      },
      {
        h: '8. Security',
        p: [
          'We apply technical and administrative measures to protect data, including encrypted connections (HTTPS), passwords kept as bcrypt hashes, a temporary account lock (15 minutes) after 5 wrong password attempts, revocable session tokens, origin control (CORS), rate limiting, input validation, a record of access to confidential resources, and the removal of e-mail addresses and tax IDs from the application’s logs.',
        ],
      },
      {
        h: '9. Changes and contact',
        p: [
          'This Policy may be updated; the version in force is indicated by the date above. When the description of the cookies changes, the cookie notice asks for your choice again. Questions: lucasnc@unicamp.br.',
        ],
      },
    ],
  },
}

export default function PrivacyPage() {
  return <LegalDocument version={VERSION} text={TEXT} />
}
