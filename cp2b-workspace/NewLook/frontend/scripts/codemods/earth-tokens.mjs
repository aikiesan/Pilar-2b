#!/usr/bin/env node
/**
 * Earth-palette codemod (Phase 1a visual identity).
 *
 * Moves UI chrome off the green-era colours onto the earth palette defined in
 * src/styles/palette.js:
 *
 *   green-N / emerald-N  → terra-N      (same step: the ramps share lightness,
 *   lime-N               → ochre-N       so contrast carries over)
 *   teal-N               → dusk-N
 *   blue/sky/indigo-N    → dusk-N       (info panels, links, selected states)
 *   cp2b-*               → terra / ochre / gray, by what the class does
 *   [#1E5128] & co.      → terra-800 …   (hard-coded green hexes)
 *   rounded-full on a padded text chip → rounded-sm (pills become tags)
 *
 * What it leaves alone, by design:
 *   - files where colour is data (map layer renderers, legends, chart series):
 *     DATA_FILES below;
 *   - lines that carry a status meaning (success, valid, gains): STATUS below.
 *     Status keeps Tailwind's green so it never reads as the brand colour.
 * Every skipped line is listed in the report for a human to check.
 *
 * Run:  node scripts/codemods/earth-tokens.mjs          (dry run, report only)
 *       node scripts/codemods/earth-tokens.mjs --write  (apply)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const WRITE = process.argv.includes('--write')

/** UI chrome lives here. */
const SCOPE = [
  'src/app',
  'src/components/layout',
  'src/components/ui',
  'src/components/comparison',
  'src/components/dashboard',
  'src/components/map',
  'src/components/analysis',
  'src/components/scientific',
  'src/components/auth',
  'src/components/analytics',
  'src/components/guide',
  'src/components/municipality',
]

/** Colour is data in these: a layer, a legend or a chart series. */
const DATA_FILES = [
  /components\/map\/.*Layer\.tsx$/,
  /components\/map\/.*Legend\.tsx$/,
  /components\/map\/examples\//,
  /components\/analysis\/charts\//,
  /__tests__\//,
  /\.test\.tsx?$/,
]

/** A line that says "this went well" keeps its green. */
const STATUS =
  /success|Success|isValid|\bvalid\b|positive|TrendingUp|ArrowUp|increase|gain|healthy|online|aprovad|approved|available|CheckCircle2 className="[^"]*text-green/

const FAMILY = { green: 'terra', emerald: 'terra', lime: 'ochre', teal: 'dusk', blue: 'dusk', sky: 'dusk', indigo: 'dusk' }
const UTIL = '(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|from|to|via|fill|stroke|divide|outline|accent|placeholder|decoration|shadow|caret)'
const PALETTE_RE = new RegExp(`\\b(${UTIL})-(green|emerald|lime|teal|blue|sky|indigo)-(\\d{2,3})\\b`, 'g')

// cp2b-* by utility: a ring is a focus ring, a border is a rule, a fill is a surface.
const CP2B = {
  green: () => 'terra-600',
  'dark-green': () => 'terra-700',
  'green-light': () => 'terra-500',
  'lime-light': (u) => (u === 'border' ? 'terra-200' : 'terra-100'),
  lime: (u) =>
    u === 'ring' || u === 'ring-offset' || u === 'outline' ? 'terra-600'
    : u === 'border' ? 'terra-300'
    : u === 'text' ? 'terra-300'
    : u === 'bg' ? 'terra-200'
    : 'terra-400',
  primary: () => 'terra-800',
  secondary: () => 'ochre-600',
  accent: () => 'terra-100',
  orange: () => 'ochre-600',
  'orange-light': () => 'ochre-300',
  dark: () => 'gray-900',
}
const CP2B_RE = new RegExp(
  `\\b(${UTIL})-cp2b-(dark-green|green-light|green|lime-light|lime|primary|secondary|accent|orange-light|orange|dark|gray-(\\d{2,3}))\\b`,
  'g'
)

const HEX = {
  '1E5128': 'terra-800',
  '2C6B3A': 'terra-700',
  '163D1F': 'terra-900',
  '1B5E20': 'terra-700',
  '2F7D32': 'terra-600',
}
const HEX_RE = new RegExp(`\\b(${UTIL})-\\[#(${Object.keys(HEX).join('|')})\\]`, 'gi')

// A padded text chip: rounded-full + px-/py- + text-size, and no fixed size.
const PILL_RE = /\brounded-full\b/
const isPill = (line) =>
  PILL_RE.test(line) &&
  /\bpx-[\d.]+/.test(line) &&
  /\bpy-[\d.[\]px]+/.test(line) &&
  /\btext-(xs|sm|\[1[01]px\])\b/.test(line) &&
  !/\b(h|w|size)-(\d|\[)/.test(line) &&
  !/translate-x|peer|toggle|switch|avatar|spinner|animate-/i.test(line)

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) sourceFiles(path, out)
    else if (/\.(tsx|ts)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(path)
  }
  return out
}

const report = { files: 0, changes: 0, pills: 0, byFile: {}, skippedStatus: [], dataFiles: [] }

for (const scope of SCOPE) {
  let files
  try {
    files = sourceFiles(join(ROOT, scope))
  } catch {
    continue
  }
  for (const file of files) {
    const rel = relative(ROOT, file)
    const source = readFileSync(file, 'utf8')
    if (DATA_FILES.some((re) => re.test(rel))) {
      if (/(green|emerald|lime|teal|blue|sky|indigo)-\d{2,3}|cp2b-|#1E5128/i.test(source)) report.dataFiles.push(rel)
      continue
    }
    let fileChanges = 0
    const lines = source.split('\n').map((line, index) => {
      if (!/(green|emerald|lime|teal|blue|sky|indigo)-\d|cp2b-|\[#|rounded-full/i.test(line)) return line
      if (STATUS.test(line) && /(green|emerald)-\d/.test(line)) {
        report.skippedStatus.push(`${rel}:${index + 1}: ${line.trim().slice(0, 160)}`)
        return line
      }
      let next = line
        .replace(PALETTE_RE, (_, util, family, step) => `${util}-${FAMILY[family]}-${step}`)
        .replace(CP2B_RE, (_, util, name, grayStep) =>
          grayStep ? `${util}-gray-${grayStep}` : `${util}-${CP2B[name](util)}`
        )
        .replace(HEX_RE, (_, util, hex) => `${util}-${HEX[hex.toUpperCase()]}`)
      if (isPill(next)) {
        next = next.replace(/\brounded-full\b/, 'rounded-sm')
        report.pills++
      }
      if (next !== line) fileChanges++
      return next
    })
    if (fileChanges) {
      report.files++
      report.changes += fileChanges
      report.byFile[rel] = fileChanges
      if (WRITE) writeFileSync(file, lines.join('\n'))
    }
  }
}

console.log(`${WRITE ? 'Changed' : 'Would change'} ${report.changes} line(s) in ${report.files} file(s); ${report.pills} pill(s) → rounded-sm.\n`)
for (const [file, n] of Object.entries(report.byFile).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${file}`)
console.log(`\nKept green — status lines (${report.skippedStatus.length}):`)
for (const line of report.skippedStatus) console.log(`  ${line}`)
console.log(`\nNot touched — colour is data (${report.dataFiles.length}):`)
for (const file of report.dataFiles) console.log(`  ${file}`)
