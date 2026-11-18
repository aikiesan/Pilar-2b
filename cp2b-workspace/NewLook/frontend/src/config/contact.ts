/**
 * Official CP2b channels and pages, shared by the menus, the footer and the
 * pages that send readers on, so a changed address is fixed in one place.
 *
 * Who CP2b is (mission, governance, partners, team, research axes, news) lives
 * on the centre's own site, cp2b.unicamp.br, and PILAR-2b links there instead
 * of keeping a second copy that drifts out of date.
 */
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/centro_biogas_cp2b/',
  linkedin: 'https://br.linkedin.com/company/centro-paulista-de-estudos-em-biog%C3%A1s-e-bioprodutos-cp2b',
  youtube: 'https://www.youtube.com/channel/UChp2J3n-9napYyHUEHf3Fhg',
  whatsapp: 'https://wa.me/message/KVJUNJN7SIAZP1',
} as const

export type SocialChannel = keyof typeof SOCIAL_LINKS

export const CP2B_SITE = 'https://cp2b.unicamp.br'

/** Pages of the CP2b site (routes of its cp2b_web/src/App.jsx). */
export const CP2B_PAGES = {
  about: `${CP2B_SITE}/sobre`,
  governance: `${CP2B_SITE}/sobre/governanca`,
  partners: `${CP2B_SITE}/sobre/parceiros`,
  axes: `${CP2B_SITE}/eixos`,
  solutions: `${CP2B_SITE}/solucoes`,
  team: `${CP2B_SITE}/equipe`,
  contact: `${CP2B_SITE}/contato`,
  publications: `${CP2B_SITE}/publicacoes`,
  news: `${CP2B_SITE}/noticias`,
  events: `${CP2B_SITE}/eventos`,
} as const

/** An absolute address (another site), as opposed to a page of this one. */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//.test(href)
}
