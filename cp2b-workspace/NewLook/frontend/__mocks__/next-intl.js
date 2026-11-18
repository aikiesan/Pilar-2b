const React = require('react')

/**
 * Shared mock for next-intl.
 *
 * next-intl ships ESM that jest does not transform here (it is listed in
 * `transformIgnorePatterns`, but its own `use-intl` dependency re-exports ESM
 * and the chain still breaks at `export{...}`). Before this file existed, the
 * failure mode was: add `useTranslations` to any component and its test suite
 * dies at import time with `SyntaxError: Unexpected token 'export'` — a failure
 * that points at the component's import line rather than at the real cause.
 *
 * Root-level `__mocks__` for a node_modules package applies automatically, with
 * no `jest.mock()` call. Same reasoning as `lucide-react.js` beside this file:
 * translating one more component should never break an unrelated suite.
 *
 * `t(key)` returns the key. That keeps the mock honest — a test asserting on
 * real copy has to say so, by calling `jest.mock('next-intl', ...)` itself with
 * the strings it expects, which several suites already do and which still wins
 * over this file.
 */
function createTranslator() {
  const t = (key, values) => {
    if (values && Object.keys(values).length > 0) {
      // Keep interpolation visible so a missing value is obvious in output.
      const args = Object.entries(values)
        .map(([name, value]) => `${name}=${value}`)
        .join(',')
      return `${key}(${args})`
    }
    return key
  }

  // `t.raw` returns structured data (arrays/objects) in real next-intl. Tests
  // that render a list from it need an array, not a string, or `.map` throws.
  t.raw = () => []
  t.rich = (key) => key
  t.markup = (key) => key
  t.has = () => true

  return t
}

module.exports = {
  useTranslations: () => createTranslator(),
  getTranslations: async () => createTranslator(),
  useLocale: () => 'pt-BR',
  useFormatter: () => ({
    number: (value) => String(value),
    dateTime: (value) => String(value),
    relativeTime: (value) => String(value),
    list: (value) => Array.from(value).join(', '),
  }),
  useNow: () => new Date('2026-01-01T00:00:00Z'),
  useTimeZone: () => 'America/Sao_Paulo',
  useMessages: () => ({}),
  NextIntlClientProvider: ({ children }) => React.createElement(React.Fragment, null, children),
}
