import { createVisibleTimer } from '../visibleTime'

/** A timer on a hand-moved clock, with the tab's visibility under test control. */
function setup() {
  let clock = 0
  let visible = true
  const send = jest.fn()
  const timer = createVisibleTimer(send, () => clock, () => visible)
  return {
    timer,
    send,
    wait: (seconds: number) => {
      clock += seconds * 1000
    },
    setVisible: (value: boolean) => {
      visible = value
    },
  }
}

describe('visible time', () => {
  it("sends a page's time when the next page opens", () => {
    const { timer, send, wait } = setup()
    timer.start('/map')
    wait(42)
    timer.start('/guide')

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith('/map', 42)
  })

  it('counts only the time the tab is in the foreground', () => {
    const { timer, send, wait, setVisible } = setup()
    timer.start('/map')
    wait(10)
    setVisible(false)
    timer.hidden()
    wait(600) // away
    setVisible(true)
    timer.visible()
    wait(5)
    timer.start('/guide')

    expect(send.mock.calls).toEqual([
      ['/map', 10],
      ['/map', 5],
    ])
  })

  it('sends nothing under a second, and nothing before a page', () => {
    const { timer, send, wait } = setup()
    timer.hidden()
    timer.start('/map')
    wait(0.5)
    timer.start('/guide')

    expect(send).not.toHaveBeenCalled()
  })

  it('does not count a page opened in a background tab until it is shown', () => {
    const { timer, send, wait, setVisible } = setup()
    setVisible(false)
    timer.start('/map')
    wait(300)
    setVisible(true)
    timer.visible()
    wait(7)
    timer.hidden()

    expect(send).toHaveBeenCalledWith('/map', 7)
  })
})
