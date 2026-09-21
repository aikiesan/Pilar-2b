const React = require('react')
const messages = require('../../../messages/pt-BR.json')

/**
 * A next-intl mock that resolves keys against the real pt-BR catalog.
 *
 * The default mock (`__mocks__/next-intl.js`) returns the key, which is right
 * for suites that only care that a component renders. It is wrong for suites
 * that assert on what a user actually reads — accessible names, empty-state
 * copy, a specific warning sentence. Those would either have to hardcode a
 * parallel copy of every string or give up the assertion entirely.
 *
 * This resolves the genuine catalog instead, so a test can keep asserting
 * `/Resíduos Urbanos/` and will legitimately fail if that copy is removed.
 *
 * Use it with:
 *   jest.mock('next-intl', () => jest.requireActual('@/test/mocks/next-intl-real'))
 */
function lookup(path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), messages)
}

function interpolate(template, values) {
  if (!values) return template
  // Only simple {name} arguments; the catalog's ICU plurals are not exercised
  // by the suites that use this mock. If one ever is, resolve it properly here
  // rather than letting a plural render as its raw source.
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  )
}

function createTranslator(namespace) {
  const resolve = (key) => (namespace ? `${namespace}.${key}` : key)

  const t = (key, values) => {
    const value = lookup(resolve(key))
    return typeof value === 'string' ? interpolate(value, values) : resolve(key)
  }

  t.raw = (key) => lookup(resolve(key))
  t.rich = (key, tags) => {
    const value = lookup(resolve(key))
    if (typeof value !== 'string') return resolve(key)
    // Render <strong>…</strong> style tags as plain text so assertions on the
    // sentence still match; the tag functions are invoked for their children.
    return value.replace(/<(\w+)>(.*?)<\/\1>/g, (match, tag, inner) =>
      tags && typeof tags[tag] === 'function' ? inner : match
    )
  }
  t.markup = t.rich
  t.has = (key) => lookup(resolve(key)) !== undefined

  return t
}

module.exports = {
  useTranslations: (namespace) => createTranslator(namespace),
  getTranslations: async (namespace) => createTranslator(namespace),
  useLocale: () => 'pt-BR',
  useFormatter: () => ({
    number: (value) => new Intl.NumberFormat('pt-BR').format(value),
    dateTime: (value) => String(value),
    relativeTime: (value) => String(value),
    list: (value) => Array.from(value).join(', '),
  }),
  useNow: () => new Date('2026-01-01T00:00:00Z'),
  useTimeZone: () => 'America/Sao_Paulo',
  useMessages: () => messages,
  NextIntlClientProvider: ({ children }) => React.createElement(React.Fragment, null, children),
}
