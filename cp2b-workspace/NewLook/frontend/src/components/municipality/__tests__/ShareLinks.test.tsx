/**
 * Sharing a municipality page: two network links that carry the address, and a
 * copy button that says what happened.
 */
import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ShareLinks from '../ShareLinks'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

const URL = 'https://cp2b.unicamp.br/pilar2b/pt-BR/municipalities/campinas-sp'

function setClipboard(writeText: jest.Mock) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

describe('ShareLinks', () => {
  it('links WhatsApp and LinkedIn to the page, in a new window that says so', () => {
    render(<ShareLinks url={URL} text="Campinas no PILAR-2b" />)
    const whatsapp = screen.getByRole('link', { name: /WhatsApp/ })
    expect(whatsapp).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent(`Campinas no PILAR-2b ${URL}`)}`)
    expect(whatsapp).toHaveAttribute('target', '_blank')
    expect(whatsapp).toHaveAccessibleName(/abre em nova janela/)
    const linkedin = screen.getByRole('link', { name: /LinkedIn/ })
    expect(linkedin.getAttribute('href')).toContain(encodeURIComponent(URL))
  })

  it('copies the address and announces it', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined)
    setClipboard(writeText)
    render(<ShareLinks url={URL} text="x" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))
    })
    expect(writeText).toHaveBeenCalledWith(URL)
    expect(screen.getByRole('status')).toHaveTextContent('Link copiado.')
  })

  it('gives the address when the clipboard is refused', async () => {
    setClipboard(jest.fn().mockRejectedValue(new Error('denied')))
    render(<ShareLinks url={URL} text="x" />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))
    })
    expect(screen.getByRole('status')).toHaveTextContent(URL)
  })
})
