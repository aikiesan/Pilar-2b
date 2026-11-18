import { toApa, toBibtex } from './citations'
import type { LiteratureReference } from '@/types/scientific'

const ref: LiteratureReference = {
  id: 1,
  authors: 'Velásquez Piñas, J. A.; Venturini, O. J.',
  title: 'Technical assessment of mono-digestion and co-digestion systems',
  journal: 'Renewable Energy',
  year: 2018,
  doi: '10.1016/j.renene.2017.10.085',
  url: null,
  validated: true,
  sector: 'PC_PECUARIA',
  residue: null,
}
const placeholders = { noAuthor: 'Unknown author', noDate: 'n.d.', untitled: 'Untitled' }

describe('citations', () => {
  it('formats APA as plain text, without markdown', () => {
    expect(toApa(ref, placeholders)).toBe(
      'Velásquez Piñas, J. A.; Venturini, O. J. (2018). Technical assessment of mono-digestion and co-digestion systems. ' +
        'Renewable Energy. https://doi.org/10.1016/j.renene.2017.10.085'
    )
  })

  it('fills missing authors, dates and titles with the page-language placeholders', () => {
    const bare = { ...ref, authors: null, year: null, title: '', journal: null, doi: null }
    expect(toApa(bare, { noAuthor: 'Autor desconhecido', noDate: 's.d.', untitled: 'Sem título' })).toBe(
      'Autor desconhecido (s.d.). Sem título.'
    )
  })

  it('keys BibTeX entries by an ASCII surname and the year', () => {
    const bib = toBibtex(ref)
    expect(bib.split('\n')[0]).toBe('@article{velasquez2018,')
    expect(bib).toContain('  doi     = {10.1016/j.renene.2017.10.085},')
    expect(bib.endsWith('}')).toBe(true)
  })
})
