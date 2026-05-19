/**
 * Accessibility Testing Utilities
 * Shared utilities for accessibility testing with axe-core
 */
import { axe, toHaveNoViolations } from 'jest-axe'
import { render, RenderResult } from '@testing-library/react'

expect.extend(toHaveNoViolations)

/**
 * Test component for accessibility violations
 */
export const testAccessibility = async (
  component: React.ReactElement,
  axeConfig?: any
): Promise<void> => {
  const { container } = render(component)
  const results = await axe(container, axeConfig)
  expect(results).toHaveNoViolations()
}

/**
 * Test rendered container for accessibility violations
 */
export const testAccessibilityOnContainer = async (
  container: Element,
  axeConfig?: any
): Promise<void> => {
  const results = await axe(container, axeConfig)
  expect(results).toHaveNoViolations()
}

/**
 * Common axe configuration for different levels of testing
 */
export const axeConfigs = {
  // WCAG 2.1 Level AA compliance
  wcagAA: {
    rules: {
      // Color contrast (AA level)
      'color-contrast': { enabled: true },
      // Enhanced color contrast (AAA level) - disable for AA testing
      'color-contrast-enhanced': { enabled: false },
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
  },

  // WCAG 2.1 Level AAA compliance
  wcagAAA: {
    rules: {
      'color-contrast': { enabled: true },
      'color-contrast-enhanced': { enabled: true },
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21aa', 'wcag21aaa'],
  },

  // Critical accessibility issues only
  critical: {
    runOnly: {
      type: 'tag',
      values: ['wcag2a'],
    },
  },

  // Skip color contrast tests (useful for development)
  skipColorContrast: {
    rules: {
      'color-contrast': { enabled: false },
      'color-contrast-enhanced': { enabled: false },
    },
  },
}

/**
 * Test component against WCAG 2.1 Level AA standards
 */
export const testWCAGAA = async (component: React.ReactElement): Promise<void> => {
  return testAccessibility(component, axeConfigs.wcagAA)
}

/**
 * Test component against WCAG 2.1 Level AAA standards
 */
export const testWCAGAAA = async (component: React.ReactElement): Promise<void> => {
  return testAccessibility(component, axeConfigs.wcagAAA)
}

/**
 * Test only critical accessibility issues
 */
export const testCriticalA11y = async (component: React.ReactElement): Promise<void> => {
  return testAccessibility(component, axeConfigs.critical)
}

/**
 * Test accessibility with custom configuration
 */
export const testCustomA11y = async (
  component: React.ReactElement,
  config: any
): Promise<void> => {
  return testAccessibility(component, config)
}

/**
 * Create a11y test helper for specific component categories
 */
export const createA11yTestSuite = (componentType: 'form' | 'navigation' | 'interactive' | 'display') => {
  const configs = {
    form: {
      ...axeConfigs.wcagAA,
      rules: {
        ...axeConfigs.wcagAA.rules,
        'label': { enabled: true },
        'label-title-only': { enabled: true },
        'form-field-multiple-labels': { enabled: true },
      },
    },
    navigation: {
      ...axeConfigs.wcagAA,
      rules: {
        ...axeConfigs.wcagAA.rules,
        'landmark-unique': { enabled: true },
        'region': { enabled: true },
        'skip-link': { enabled: true },
      },
    },
    interactive: {
      ...axeConfigs.wcagAA,
      rules: {
        ...axeConfigs.wcagAA.rules,
        'button-name': { enabled: true },
        'link-name': { enabled: true },
        'interactive-supports-focus': { enabled: true },
      },
    },
    display: {
      ...axeConfigs.wcagAA,
      rules: {
        ...axeConfigs.wcagAA.rules,
        'image-alt': { enabled: true },
        'object-alt': { enabled: true },
      },
    },
  }

  return {
    testComponent: async (component: React.ReactElement) => {
      return testAccessibility(component, configs[componentType])
    },
    config: configs[componentType],
  }
}

/**
 * Keyboard navigation test utilities
 */
export const keyboardTestUtils = {
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  ShiftTab: { key: 'Tab', code: 'Tab', keyCode: 9, shiftKey: true },
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  Space: { key: ' ', code: 'Space', keyCode: 32 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
}

/**
 * Test focus management
 */
export const testFocusManagement = {
  expectFocusable: (element: Element) => {
    expect(element).toHaveAttribute('tabindex', expect.any(String))
  },
  expectNotFocusable: (element: Element) => {
    expect(element).not.toHaveAttribute('tabindex')
  },
  expectAriaLabel: (element: Element, label?: string) => {
    if (label) {
      expect(element).toHaveAttribute('aria-label', label)
    } else {
      expect(element).toHaveAttribute('aria-label')
    }
  },
  expectAriaLabelledBy: (element: Element, id?: string) => {
    if (id) {
      expect(element).toHaveAttribute('aria-labelledby', id)
    } else {
      expect(element).toHaveAttribute('aria-labelledby')
    }
  },
}

/**
 * Screen reader test utilities
 */
export const screenReaderUtils = {
  expectScreenReaderText: (element: Element, text: string) => {
    const srText = element.querySelector('.sr-only')
    expect(srText).toHaveTextContent(text)
  },
  expectAriaLive: (element: Element, politeness: 'polite' | 'assertive' | 'off') => {
    expect(element).toHaveAttribute('aria-live', politeness)
  },
  expectAriaAtomic: (element: Element, atomic: boolean = true) => {
    expect(element).toHaveAttribute('aria-atomic', atomic.toString())
  },
}