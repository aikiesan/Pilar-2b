import type L from 'leaflet'
import { crossFadePaneCanvas, fadePaneIn, fadePaneOut, isFading } from '@/lib/mapCrossFade'

// jsdom has neither canvas drawing nor the Web Animations API: both are stood
// in for, so what is tested is the copies' lifecycle, not the pixels.
interface FakeAnimation {
  el: Element
  onfinish: (() => void) | null
  cancel: jest.Mock
  finish: () => void
}
let animations: FakeAnimation[] = []

beforeAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ drawImage: jest.fn(), globalAlpha: 1 }),
  })
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value(this: Element) {
      const animation: FakeAnimation = {
        el: this,
        onfinish: null,
        cancel: jest.fn(),
        finish() {
          this.onfinish?.()
        },
      }
      animations.push(animation)
      return animation
    },
  })
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value(this: Element) {
      return animations.filter((a) => a.el === this)
    },
  })
})

afterAll(() => {
  delete (HTMLCanvasElement.prototype as { getContext?: unknown }).getContext
  delete (Element.prototype as { animate?: unknown }).animate
  delete (Element.prototype as { getAnimations?: unknown }).getAnimations
})

function fakeMap() {
  const handlers: Record<string, Array<() => void>> = {}
  return {
    handlers,
    on: jest.fn((name: string, fn: () => void) => {
      ;(handlers[name] ??= []).push(fn)
    }),
    off: jest.fn((name: string, fn: () => void) => {
      handlers[name] = (handlers[name] ?? []).filter((h) => h !== fn)
    }),
    fire(name: string) {
      ;[...(handlers[name] ?? [])].forEach((fn) => fn())
    },
  }
}

function canvasPane() {
  const pane = document.createElement('div')
  const canvas = document.createElement('canvas')
  canvas.width = 200
  canvas.height = 100
  pane.appendChild(canvas)
  document.body.appendChild(pane)
  return pane
}

const copies = (root: ParentNode) => root.querySelectorAll('.map-fade-snapshot')

beforeEach(() => {
  animations = []
  document.body.innerHTML = ''
  // Motion allowed unless a test asks for less.
  window.matchMedia = jest.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia
})

describe('crossFadePaneCanvas', () => {
  it('lays one copy over the canvas, which goes when its fade ends', () => {
    const map = fakeMap()
    const pane = canvasPane()
    crossFadePaneCanvas(map as unknown as L.Map, pane)
    expect(copies(pane)).toHaveLength(1)
    expect(pane.lastElementChild?.classList.contains('map-fade-snapshot')).toBe(true)
    animations[0].finish()
    expect(copies(pane)).toHaveLength(0)
    expect(isFading(pane)).toBe(false)
    expect(map.handlers.zoomstart).toHaveLength(0)
  })

  it('keeps one copy at most when changes come mid-fade, then none', () => {
    const map = fakeMap()
    const pane = canvasPane()
    crossFadePaneCanvas(map as unknown as L.Map, pane)
    crossFadePaneCanvas(map as unknown as L.Map, pane)
    crossFadePaneCanvas(map as unknown as L.Map, pane)
    expect(copies(pane)).toHaveLength(1)
    expect(map.handlers.zoomstart).toHaveLength(1)
    animations[animations.length - 1].finish()
    expect(copies(pane)).toHaveLength(0)
  })

  it('ends the fade at once when the map zooms', () => {
    const map = fakeMap()
    const pane = canvasPane()
    crossFadePaneCanvas(map as unknown as L.Map, pane)
    map.fire('zoomstart')
    expect(copies(pane)).toHaveLength(0)
    expect(map.handlers.zoomstart).toHaveLength(0)
  })

  it('copies nothing with reduced motion', () => {
    window.matchMedia = jest.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia
    const pane = canvasPane()
    crossFadePaneCanvas(fakeMap() as unknown as L.Map, pane)
    expect(copies(pane)).toHaveLength(0)
  })
})

describe('fadePaneIn / fadePaneOut', () => {
  function layerPane() {
    const parent = document.createElement('div')
    const pane = document.createElement('div')
    pane.innerHTML = '<svg><path class="leaflet-interactive"></path></svg><div class="leaflet-marker-icon"></div>'
    parent.appendChild(pane)
    document.body.appendChild(parent)
    return { parent, pane }
  }

  it('leaves nothing behind when a layer is turned off mid-fade-in', () => {
    const map = fakeMap()
    const { parent, pane } = layerPane()
    fadePaneIn(pane)
    const fadeIn = animations[0]
    // Off before the fade-in ends: the fade-in stops, one copy fades out.
    fadePaneOut(map as unknown as L.Map, pane)
    expect(fadeIn.cancel).toHaveBeenCalled()
    expect(copies(parent)).toHaveLength(1)
    // The layer's own paths and markers go (react-leaflet), the copy fades.
    pane.innerHTML = ''
    animations[animations.length - 1].finish()
    expect(copies(parent)).toHaveLength(0)
    expect(map.handlers.zoomstart).toHaveLength(0)
  })

  it('turned on again mid-fade-out, drops the copy and fades in', () => {
    const map = fakeMap()
    const { parent, pane } = layerPane()
    fadePaneOut(map as unknown as L.Map, pane)
    expect(copies(parent)).toHaveLength(1)
    fadePaneIn(pane)
    expect(copies(parent)).toHaveLength(0)
    expect(animations[animations.length - 1].el).toBe(pane)
  })

  it('leaves no copy of an empty pane, nor with reduced motion', () => {
    const map = fakeMap()
    const parent = document.createElement('div')
    const empty = document.createElement('div')
    parent.appendChild(empty)
    fadePaneOut(map as unknown as L.Map, empty)
    expect(copies(parent)).toHaveLength(0)

    window.matchMedia = jest.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia
    const { parent: other, pane } = layerPane()
    fadePaneOut(map as unknown as L.Map, pane)
    expect(copies(other)).toHaveLength(0)
  })
})
