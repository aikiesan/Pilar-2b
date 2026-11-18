import React from 'react'
import { render, screen } from '@testing-library/react'
import LegalDocument, { type LegalText } from './LegalDocument'
import type { Localized } from '@/lib/localized'

// The real catalog, served as pt-BR by the mock.
jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

const text: Localized<LegalText> = {
  'pt-BR': {
    title: 'Termos de Uso',
    intro: 'Ao usar a plataforma, você concorda.',
    draftNote: 'Documento em revisão.',
    sections: [{ h: '1. Objeto', p: ['Primeiro parágrafo.', 'Segundo parágrafo.'] }],
  },
  en: {
    title: 'Terms of Use',
    intro: 'By using the platform, you agree.',
    draftNote: 'Draft under review.',
    sections: [{ h: '1. Scope', p: ['First paragraph.'] }],
  },
}

describe('LegalDocument', () => {
  it("renders the page language's text", () => {
    render(<LegalDocument version="2026-06-25" text={text} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de Uso' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '1. Objeto' })).toBeInTheDocument()
    expect(screen.getByText('Segundo parágrafo.')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent('Documento em revisão.')
    expect(screen.queryByText('Terms of Use')).not.toBeInTheDocument()
  })

  it('writes the version date in the page language, on the day written', () => {
    render(<LegalDocument version="2026-06-25" text={text} />)
    expect(screen.getByText('Última atualização: 25 de junho de 2026')).toBeInTheDocument()
  })
})
