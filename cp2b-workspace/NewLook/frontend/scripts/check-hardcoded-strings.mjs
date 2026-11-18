#!/usr/bin/env node
/**
 * Fails when Portuguese UI text is hardcoded in the source instead of read from
 * the message catalogs.
 *
 * The e2e locale test (`e2e/i18n.public.spec.ts`) only sees what renders on page
 * load; popups, expandable panels and empty states are invisible to it. This
 * check is static — no browser, no backend — so it runs in the blocking lint
 * job and covers every file.
 *
 * Scope: every .ts/.tsx file under src/, tests excluded. Detection lives in
 * scripts/lib/portuguese-scan.mjs (TypeScript AST; see its header for what is
 * treated as code rather than copy).
 *
 * Ratchet: PENDING lists the files not translated yet. A finding in any other
 * file fails; so does a PENDING entry that has no findings left, so the list can
 * only shrink. When you finish translating a file, delete its line here.
 *
 * To allow a genuine Portuguese literal — a proper noun, an official dataset
 * name, a citation — add `i18n-exempt: <reason>` in a comment on that line or
 * the line above. A marker without a reason is rejected.
 *
 * Run: npm run i18n:scan              (the gate)
 *      npm run i18n:scan -- --report  (findings per file, including PENDING)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, sep } from 'node:path';
import { scanSource } from './lib/portuguese-scan.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');
const report = process.argv.includes('--report');

/** Files still carrying hardcoded Portuguese. Only ever delete from this list. */
const PENDING = [
];

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== '__tests__' && name !== 'test') sourceFiles(path, out);
    } else if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$|\.d\.ts$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const toPosix = (path) => path.split(sep).join('/');
const pending = new Set(PENDING);
const problems = [];
const perFile = [];

for (const path of sourceFiles(SRC)) {
  const file = toPosix(relative(ROOT, path));
  const { findings, bareExemptions } = scanSource(readFileSync(path, 'utf8'), path);

  for (const line of bareExemptions) {
    problems.push(`${file}:${line}  i18n-exempt needs a reason: \`i18n-exempt: <why>\``);
  }
  if (findings.length) perFile.push([findings.length, file]);

  if (pending.has(file)) {
    if (findings.length === 0) problems.push(`${file}  is clean now — remove it from PENDING`);
    continue;
  }
  for (const { line, text } of findings) {
    problems.push(`${file}:${line}  ${text.slice(0, 80)}`);
  }
}

for (const file of pending) {
  try {
    statSync(join(ROOT, file));
  } catch {
    problems.push(`${file}  is listed in PENDING but does not exist — remove it`);
  }
}

if (report) {
  perFile.sort((a, b) => b[0] - a[0]);
  const total = perFile.reduce((sum, [count]) => sum + count, 0);
  console.log(`${total} Portuguese literal(s) in ${perFile.length} file(s):\n`);
  for (const [count, file] of perFile) {
    console.log(`  ${String(count).padStart(4)}  ${file}${pending.has(file) ? '' : '   ← not in PENDING'}`);
  }
  console.log('');
}

if (problems.length > 0) {
  console.error(`✖ hardcoded Portuguese outside the message catalogs (${problems.length}):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\nMove each string into messages/en.json and messages/pt-BR.json and read it` +
      `\nwith t(). For record-level data use a { 'pt-BR', en } field (src/lib/localized.ts).` +
      `\nIf it is a proper noun or an official dataset name, add` +
      `\n\`i18n-exempt: <reason>\` in a comment on that line.`
  );
  process.exit(1);
}

const scanned = sourceFiles(SRC).length;
console.log(
  `✓ no hardcoded Portuguese in ${scanned - pending.size} of ${scanned} source files` +
    (pending.size ? ` (${pending.size} pending translation)` : '')
);
