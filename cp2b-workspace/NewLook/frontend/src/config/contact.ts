/**
 * Official CP2b channels, shared by the footer and the About page's contact
 * section so a changed handle is fixed in one place.
 */
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/centro_biogas_cp2b/',
  linkedin: 'https://br.linkedin.com/company/centro-paulista-de-estudos-em-biog%C3%A1s-e-bioprodutos-cp2b',
  youtube: 'https://www.youtube.com/channel/UChp2J3n-9napYyHUEHf3Fhg',
  whatsapp: 'https://wa.me/message/KVJUNJN7SIAZP1',
} as const

export type SocialChannel = keyof typeof SOCIAL_LINKS
