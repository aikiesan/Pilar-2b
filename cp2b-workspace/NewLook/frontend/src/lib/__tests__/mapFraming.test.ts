import { inClearArea, readPx, shouldFrame, toolWindowPadding, DEFAULT_TOP_CLEAR } from '../mapFraming'

const desktop = { x: 992, y: 735 }
const phone = { x: 375, y: 675 }

describe('toolWindowPadding', () => {
  it('keeps a desktop result left of the window and under the control row', () => {
    expect(toolWindowPadding(desktop, { topClear: 118 })).toEqual({
      paddingTopLeft: [24, 130],
      paddingBottomRight: [340 + 12 + 24, 24],
    })
  })

  it('leaves room for the wider Compare window', () => {
    expect(toolWindowPadding(desktop, { windowWidth: 380 }).paddingBottomRight[0]).toBe(380 + 12 + 24)
  })

  it('falls back to the one-line row when the row has not been measured', () => {
    expect(toolWindowPadding(desktop).paddingTopLeft[1]).toBe(DEFAULT_TOP_CLEAR + 12)
  })

  it('keeps a phone result above the sheet and the bottom bar', () => {
    const { paddingBottomRight } = toolWindowPadding(phone, { topClear: 164, bottomBar: 56 })
    expect(paddingBottomRight).toEqual([24, Math.round(675 * 0.55 + 56) + 12])
  })

  it('follows the viewport, not the map, when told it is landscape', () => {
    // A sidebar can leave a landscape screen's map taller than wide.
    const { paddingBottomRight } = toolWindowPadding({ x: 700, y: 760 }, { landscape: true })
    expect(paddingBottomRight).toEqual([340 + 12 + 24, 24])
  })
})

describe('shouldFrame', () => {
  const padding = toolWindowPadding(desktop, { topClear: 118 })

  it('always frames on arrival from a link, even with the pick in view', () => {
    expect(shouldFrame(true, [{ x: 300, y: 400 }], desktop, padding)).toBe(true)
  })

  it('keeps the view after a click on a place in the clear area', () => {
    expect(shouldFrame(false, [{ x: 300, y: 400 }], desktop, padding)).toBe(false)
  })

  it('moves when a pick is off screen, under the window or under the row', () => {
    expect(shouldFrame(false, [{ x: -40, y: 400 }], desktop, padding)).toBe(true)
    expect(shouldFrame(false, [{ x: 800, y: 400 }], desktop, padding)).toBe(true)
    expect(shouldFrame(false, [{ x: 300, y: 90 }], desktop, padding)).toBe(true)
  })

  it('moves when either of two picks (Compare) is out of the clear area', () => {
    expect(shouldFrame(false, [{ x: 300, y: 400 }, { x: 900, y: 400 }], desktop, padding)).toBe(true)
  })

  it('has nothing to frame with no pick after a click', () => {
    expect(shouldFrame(false, [], desktop, padding)).toBe(false)
  })
})

describe('inClearArea', () => {
  it('counts the clear area\'s edges as inside', () => {
    const padding = toolWindowPadding(desktop, { topClear: 118 })
    expect(inClearArea({ x: 24, y: 130 }, desktop, padding)).toBe(true)
    expect(inClearArea({ x: 23, y: 130 }, desktop, padding)).toBe(false)
  })
})

describe('readPx', () => {
  it('reads a CSS length in px, or nothing', () => {
    expect(readPx('183px')).toBe(183)
    expect(readPx(' 56px ')).toBe(56)
    expect(readPx('')).toBeNull()
    expect(readPx(null)).toBeNull()
    expect(readPx('auto')).toBeNull()
  })
})
