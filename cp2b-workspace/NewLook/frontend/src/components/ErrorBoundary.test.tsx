import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

function Boom(): React.ReactElement {
  throw new Error('kaboom')
}

describe('ErrorBoundary', () => {
  // React logs caught render errors; keep the test output readable.
  let consoleError: jest.SpyInstance
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => consoleError.mockRestore())

  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>fine</p>
      </ErrorBoundary>
    )
    expect(screen.getByText('fine')).toBeInTheDocument()
  })

  it('shows the translated fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Algo não saiu como esperado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('"Ir para o início" is a full-load link to the locale home', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    )
    // Under the app's base path (empty in tests), never a bare "/pt-BR" that
    // would leave /pilar2b in production.
    expect(screen.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/pt-BR')
  })

  it('prefers a custom fallback', () => {
    render(
      <ErrorBoundary fallback={<p>custom</p>}>
        <Boom />
      </ErrorBoundary>
    )
    expect(screen.getByText('custom')).toBeInTheDocument()
  })

  it('reports the error to onError', () => {
    const onError = jest.fn()
    render(
      <ErrorBoundary onError={onError}>
        <Boom />
      </ErrorBoundary>
    )
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'kaboom' }), expect.anything())
  })

  it('"Try again" renders the children again', () => {
    let shouldThrow = true
    function Flaky() {
      if (shouldThrow) throw new Error('once')
      return <p>recovered</p>
    }
    render(
      <ErrorBoundary>
        <Flaky />
      </ErrorBoundary>
    )
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(screen.getByText('recovered')).toBeInTheDocument()
  })
})
