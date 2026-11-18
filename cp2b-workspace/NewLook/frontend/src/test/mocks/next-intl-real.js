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

// Index of the brace that closes the one at `start`.
function closingBrace(source, start) {
  let depth = 0
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return i
  }
  return source.length - 1
}

// `=0 {…} one {…} other {…}` → { '=0': '…', one: '…', other: '…' }
function branches(source) {
  const options = {}
  let i = 0
  for (;;) {
    const match = /^\s*([=\w]+)\s*\{/.exec(source.slice(i))
    if (!match) return options
    const open = i + match[0].length - 1
    const close = closingBrace(source, open)
    options[match[1]] = source.slice(open + 1, close)
    i = close + 1
  }
}

// Enough ICU for the catalog: {name}, {n, plural, …} with `#`, {v, select, …}.
// Plurals follow pt-BR rules, the locale this mock serves.
function format(template, values = {}) {
  let out = ''
  for (let i = 0; i < template.length; i++) {
    if (template[i] !== '{') {
      out += template[i]
      continue
    }
    const end = closingBrace(template, i)
    const body = template.slice(i + 1, end)
    const icu = /^\s*(\w+)\s*,\s*(plural|select)\s*,/.exec(body)
    if (icu) {
      const [, name, kind] = icu
      const options = branches(body.slice(icu[0].length))
      const value = values[name]
      let branch =
        kind === 'plural'
          ? options[`=${value}`] ?? options[new Intl.PluralRules('pt-BR').select(Number(value))] ?? options.other
          : options[value] ?? options.other
      if (kind === 'plural' && branch !== undefined) {
        branch = branch.replace(/#/g, new Intl.NumberFormat('pt-BR').format(Number(value)))
      }
      out += format(branch ?? '', values)
    } else {
      const name = body.trim()
      out += Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : `{${body}}`
    }
    i = end
  }
  return out
}

function createTranslator(namespace) {
  const resolve = (key) => (namespace ? `${namespace}.${key}` : key)

  const t = (key, values) => {
    const value = lookup(resolve(key))
    return typeof value === 'string' ? format(value, values) : resolve(key)
  }

  t.raw = (key) => lookup(resolve(key))
  // Like next-intl: each <tag>…</tag> becomes what its function returns, so a
  // test can find the link or the <strong> a message renders. (This used to
  // flatten the tags to text, which hid a missing link from every test.)
  t.rich = (key, values = {}) => {
    const value = lookup(resolve(key))
    if (typeof value !== 'string') return resolve(key)
    const text = format(value, values)
    const parts = []
    const tag = /<(\w+)>(.*?)<\/\1>/g
    let last = 0
    let match
    while ((match = tag.exec(text))) {
      if (match.index > last) parts.push(text.slice(last, match.index))
      const render = values[match[1]]
      parts.push(
        typeof render === 'function'
          ? React.createElement(React.Fragment, { key: parts.length }, render(match[2]))
          : match[0]
      )
      last = match.index + match[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length === 1 ? parts[0] : parts
  }
  t.markup = (key, values = {}) => {
    const value = lookup(resolve(key))
    if (typeof value !== 'string') return resolve(key)
    return format(value, values).replace(/<(\w+)>(.*?)<\/\1>/g, (match, name, inner) =>
      typeof values[name] === 'function' ? values[name](inner) : match
    )
  }
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
