import { act, render } from '@testing-library/react'
import CountUp from './CountUp'

const format = (v: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v)} mi m³`

const visible = (container: HTMLElement) => container.querySelector('span > span')?.textContent
const announced = (container: HTMLElement) => container.querySelector('.sr-only')?.textContent ?? visible(container)

beforeEach(() => {
  jest.useFakeTimers()
  // Motion allowed unless a test asks for less.
  window.matchMedia = jest.fn(() => ({ matches: false })) as unknown as typeof window.matchMedia
})
afterEach(() => jest.useRealTimers())

describe('CountUp', () => {
  it('stands still on first show', () => {
    const { container } = render(<CountUp value={12.4} format={format} />)
    expect(visible(container)).toBe('12,4 mi m³')
    expect(container.querySelector('.sr-only')).toBeNull()
    expect(container.querySelector('[aria-hidden]')).toBeNull()
  })

  it('counts to a new value, formatted on every frame, announcing only the final one', () => {
    const { container, rerender } = render(<CountUp value={10} format={format} />)
    rerender(<CountUp value={20} format={format} />)
    // Mid-count: a value between the two, in the caller's format; the
    // counting text is hidden from screen readers, the final value is not.
    act(() => {
      jest.advanceTimersByTime(100)
    })
    const mid = visible(container) ?? ''
    expect(mid).toMatch(/^\d+,\d mi m³$/)
    expect(mid).not.toBe('10,0 mi m³')
    expect(mid).not.toBe('20,0 mi m³')
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe(mid)
    expect(announced(container)).toBe('20,0 mi m³')
    // Done: the final value alone, read as usual.
    act(() => {
      jest.advanceTimersByTime(400)
    })
    expect(visible(container)).toBe('20,0 mi m³')
    expect(container.querySelector('.sr-only')).toBeNull()
  })

  it('a change mid-count starts from the value on screen', () => {
    const { container, rerender } = render(<CountUp value={0} format={(v) => v.toFixed(2)} />)
    rerender(<CountUp value={100} format={(v) => v.toFixed(2)} />)
    act(() => {
      jest.advanceTimersByTime(100)
    })
    const reached = parseFloat(visible(container) ?? '')
    rerender(<CountUp value={50} format={(v) => v.toFixed(2)} />)
    act(() => {
      jest.advanceTimersByTime(16)
    })
    const next = parseFloat(visible(container) ?? '')
    // Never back to 0: it moves on from where it was, towards 50.
    expect(reached).toBeGreaterThan(0)
    expect(Math.abs(next - reached)).toBeLessThan(Math.abs(next - 0))
    act(() => {
      jest.advanceTimersByTime(400)
    })
    expect(visible(container)).toBe('50.00')
  })

  it('swaps at once with reduced motion', () => {
    window.matchMedia = jest.fn(() => ({ matches: true })) as unknown as typeof window.matchMedia
    const { container, rerender } = render(<CountUp value={10} format={format} />)
    rerender(<CountUp value={20} format={format} />)
    expect(visible(container)).toBe('20,0 mi m³')
    expect(container.querySelector('.sr-only')).toBeNull()
  })
})
