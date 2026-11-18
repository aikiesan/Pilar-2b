import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { axe } from 'jest-axe'
import ptBR from '../../../../messages/pt-BR.json'
import Metaninho from '../Metaninho'
import MetaninhoAmigo from '../MetaninhoAmigo'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

const TIPS = ptBR.mascot.lines.tips

describe('Metaninho', () => {
  it('is decoration: empty alt, hidden from assistive technology', () => {
    const { container } = render(<Metaninho pose="feliz" size={90} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('aria-hidden', 'true')
    expect(img.getAttribute('src')).toContain('/images/metaninho/metaninho-feliz.webp')
    expect(img).toHaveAttribute('height', '90')
  })

  it('falls back to the neutral pose for an unknown one', () => {
    // @ts-expect-error: a pose that does not exist
    const { container } = render(<Metaninho pose="dançando" />)
    expect(container.querySelector('img')).toHaveAttribute('data-pose', 'neutro')
  })
})

describe('MetaninhoAmigo', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('is a named button whose bubble starts empty', () => {
    render(<MetaninhoAmigo />)
    expect(screen.getByRole('button', { name: ptBR.mascot.label })).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('says the lines in turn, then the bubble closes by itself', () => {
    render(<MetaninhoAmigo />)
    const button = screen.getByRole('button', { name: ptBR.mascot.label })
    fireEvent.click(button)
    expect(screen.getByRole('status')).toHaveTextContent(TIPS[0])
    fireEvent.click(button)
    expect(screen.getByRole('status')).toHaveTextContent(TIPS[1])
    act(() => {
      jest.advanceTimersByTime(7100)
    })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('closes with Escape', () => {
    render(<MetaninhoAmigo />)
    const button = screen.getByRole('button', { name: ptBR.mascot.label })
    fireEvent.click(button)
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('can say the page-not-found lines instead', () => {
    render(<MetaninhoAmigo lines="not_found" />)
    fireEvent.click(screen.getByRole('button', { name: ptBR.mascot.label }))
    expect(screen.getByRole('status')).toHaveTextContent(ptBR.mascot.lines.not_found[0])
  })

  it('has no axe violations, closed or open', async () => {
    jest.useRealTimers()
    const { container } = render(<MetaninhoAmigo />)
    expect(await axe(container)).toHaveNoViolations()
    fireEvent.click(screen.getByRole('button', { name: ptBR.mascot.label }))
    expect(await axe(container)).toHaveNoViolations()
  })
})
