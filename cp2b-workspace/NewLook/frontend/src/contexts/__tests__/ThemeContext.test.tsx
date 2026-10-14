/**
 * Light is the standard look: a dark system preference does not switch the
 * platform to dark; only the visitor's own choice does.
 */
import React from 'react'
import { act, render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeContext'

function Probe() {
  const { resolvedTheme, toggleTheme } = useTheme()
  return (
    <button type="button" onClick={toggleTheme}>
      {resolvedTheme}
    </button>
  )
}

const prefersDark = () =>
  (window.matchMedia as jest.Mock).mockImplementation((query: string) => ({
    matches: query.includes('dark'),
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }))

beforeEach(() => {
  localStorage.clear()
  document.documentElement.className = ''
})

describe('ThemeProvider', () => {
  it('starts light even when the system prefers dark', () => {
    prefersDark()
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(screen.getByRole('button')).toHaveTextContent('light')
    expect(document.documentElement).toHaveClass('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('reads the "system" value left by earlier versions as light', () => {
    prefersDark()
    localStorage.setItem('pilar2b-theme', 'system')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem('pilar2b-theme')).toBe('light')
  })

  it('keeps a visitor who chose dark in dark, and toggles back', () => {
    localStorage.setItem('pilar2b-theme', 'dark')
    render(<ThemeProvider><Probe /></ThemeProvider>)
    expect(document.documentElement).toHaveClass('dark')

    act(() => screen.getByRole('button').click())
    expect(document.documentElement).toHaveClass('light')
    expect(localStorage.getItem('pilar2b-theme')).toBe('light')
  })
})
