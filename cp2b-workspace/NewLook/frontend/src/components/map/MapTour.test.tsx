import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ptBR from '../../../messages/pt-BR.json'
import MapTour from './MapTour'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

const TOUR = ptBR.Map.tour

/** Mounts the tour and lets the first-visit delay run out. */
async function mount() {
  const view = render(<MapTour />)
  await act(async () => {
    jest.advanceTimersByTime(1500)
  })
  return view
}

const card = () => screen.queryByRole('heading', { name: TOUR.steps.welcome.title })

describe('MapTour', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  afterEach(() => jest.useRealTimers())

  it('opens by itself on the first visit, with Metaninho greeting and the step counter', async () => {
    await mount()
    expect(card()).toBeInTheDocument()
    // jsdom lays nothing out, so only the centered steps remain: welcome and click.
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
  })

  it('"Não mostrar novamente" closes it and keeps it from opening by itself again', async () => {
    const { unmount } = await mount()
    fireEvent.click(screen.getByRole('button', { name: TOUR.never }))
    await act(async () => {})
    expect(card()).not.toBeInTheDocument()
    expect(window.localStorage.getItem('pilar2b-map-tour-done')).not.toBeNull()
    unmount()
    window.sessionStorage.clear()
    await mount()
    expect(card()).not.toBeInTheDocument()
  })

  it('the close button ends it for this visit only', async () => {
    await mount()
    fireEvent.click(screen.getByRole('button', { name: TOUR.close }))
    await act(async () => {})
    expect(card()).not.toBeInTheDocument()
    expect(window.localStorage.getItem('pilar2b-map-tour-done')).toBeNull()
    expect(window.sessionStorage.getItem('pilar2b-map-tour-later')).not.toBeNull()
  })

  it('the help button opens it again at the first step', async () => {
    window.localStorage.setItem('pilar2b-map-tour-done', '1')
    await mount()
    expect(card()).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: TOUR.open }))
    await act(async () => {})
    expect(card()).toBeInTheDocument()
  })
})
