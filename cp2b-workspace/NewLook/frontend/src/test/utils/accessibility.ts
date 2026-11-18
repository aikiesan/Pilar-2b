/**
 * Accessibility check for component tests: renders the component and fails on
 * any axe-core violation.
 */
import { axe, toHaveNoViolations } from 'jest-axe'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'

expect.extend(toHaveNoViolations)

/**
 * axe's default rules, with the WCAG AA colour-contrast rule on and AAA's
 * enhanced contrast off. jest-axe turns contrast checks off by default (they do
 * not work in jsdom); this turns the AA one back on, as these suites always did.
 */
const WCAG_AA = {
  rules: {
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: false },
  },
}

/** Renders `component` and fails on any axe violation (WCAG 2.1 AA). */
export const testWCAGAA = async (component: ReactElement): Promise<void> => {
  const { container } = render(component)
  expect(await axe(container, WCAG_AA)).toHaveNoViolations()
}
