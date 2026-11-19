import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import ptBR from '../../../messages/pt-BR.json'
import MapTour, { MapTourButton } from './MapTour'
import { saveConsent } from '@/lib/consent'

jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))

const TOUR = ptBR.Map.tour

/** Mounts the tour with its button and lets the first-visit delay run out. */
async function mount() {
  const view = render(
    <>
      <MapTourButton />
      <MapTour />
    </>,
  )
  await act(async () => {
    jest.advanceTimersByTime(1500)
  })
  return view
}

const click = async (name: string) => {
  fireEvent.click(screen.getByRole('button', { name }))
  await act(async () => {})
}
const offer = () => screen.queryByRole('dialog', { name: TOUR.offer.title })
const tour = () => screen.queryByRole('heading', { name: TOUR.steps.welcome.title })

describe('MapTour', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    window.localStorage.clear()
    window.sessionStorage.clear()
    saveConsent('essential')
  })
  afterEach(() => jest.useRealTimers())

  it('on the first visit Metaninho offers the guide, and the guide opens on accepting', async () => {
    await mount()
    expect(offer()).toHaveTextContent(TOUR.offer.body)
    expect(tour()).not.toBeInTheDocument()
    await click(TOUR.offer.start)
    expect(offer()).not.toBeInTheDocument()
    expect(tour()).toBeInTheDocument()
    // jsdom lays nothing out, so only the centered steps remain: welcome and click.
    expect(screen.getByText('1 de 2')).toBeInTheDocument()
  })

  it('waits for the cookie choice, so the banner never covers the offer', async () => {
    window.localStorage.clear()
    await mount()
    expect(offer()).not.toBeInTheDocument()
    await act(async () => {
      saveConsent('all')
    })
    await act(async () => {
      jest.advanceTimersByTime(1500)
    })
    expect(offer()).toBeInTheDocument()
  })

  it('"Agora não" hides the offer for this visit only', async () => {
    await mount()
    await click(TOUR.offer.later)
    expect(offer()).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem('pilar2b-map-tour-later')).not.toBeNull()
    expect(window.localStorage.getItem('pilar2b-map-tour-done')).toBeNull()
  })

  it('"Não mostrar novamente" stops the offer on later visits', async () => {
    const { unmount } = await mount()
    await click(TOUR.never)
    expect(offer()).not.toBeInTheDocument()
    unmount()
    window.sessionStorage.clear()
    await mount()
    expect(offer()).not.toBeInTheDocument()
  })

  it('the guide button opens the tour at any time, and its close button ends it', async () => {
    window.localStorage.setItem('pilar2b-map-tour-done', '1')
    await mount()
    expect(offer()).not.toBeInTheDocument()
    await click(TOUR.open)
    expect(tour()).toBeInTheDocument()
    await click(TOUR.close)
    expect(tour()).not.toBeInTheDocument()
  })
})
