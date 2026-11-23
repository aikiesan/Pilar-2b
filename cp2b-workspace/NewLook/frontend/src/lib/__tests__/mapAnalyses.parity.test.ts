// Pins the cases shared with the backend (analysis_classes.py) to the map's TS.
import { axisBreaks, axisClassOf, type AxisMethod, type Breaks } from '../mapAnalyses'
import cases from './fixtures/analysis-breaks-cases.json'

describe('mapAnalyses parity with the backend fixtures', () => {
  it.each(cases.breaks)('axisBreaks %#', ({ method, values, breaks }) => {
    expect(axisBreaks(values, method as AxisMethod)).toEqual(breaks)
  })

  it.each(cases.classes)('axisClassOf %#', ({ method, invert, breaks, value, class: c }) => {
    expect(axisClassOf(value, breaks as Breaks | null, { method: method as AxisMethod, invert })).toBe(c)
  })
})
