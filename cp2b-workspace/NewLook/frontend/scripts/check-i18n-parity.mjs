#!/usr/bin/env node
/**
 * Fails when the message catalogs drift apart.
 *
 * The English site does not break because translations are bad — `en.json` is
 * good prose. It breaks because a key gets added to `pt-BR.json` during a
 * feature and never reaches `en.json`, and nothing notices until a user sees
 * `calculator.step2.swine` rendered as literal text. That is exactly what
 * happened to the livestock step of the technology-routes wizard.
 *
 * Three checks, all of them things that surface as visible defects:
 *   1. key parity        — a key in one catalog and not the other
 *   2. ICU placeholders  — `{months}` in one locale and not the other, which
 *                          next-intl raises on at render time, not at build
 *   3. empty values      — a key that exists but renders nothing
 *
 * Run: npm run i18n:check
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const MESSAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
const REFERENCE_LOCALE = 'pt-BR';
const TARGET_LOCALES = ['en'];

/**
 * Flattens nested catalogs to dotted leaf paths: { "a": { "b": "x" } } -> { "a.b": "x" }.
 *
 * Arrays are descended into by index, so `features.0` and `features.1` are
 * separate leaves. Treating an array as one opaque leaf would compare only its
 * presence, and a list that lost an entry in translation — four bullet points in
 * pt-BR, three in en — would pass. `Object.entries` gives numeric string keys
 * for arrays, so the same walk handles both.
 */
function flatten(node, prefix = '') {
  return Object.entries(node).reduce((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(acc, flatten(value, path));
    } else {
      acc[path] = value;
    }
    return acc;
  }, {});
}

/**
 * ICU argument names, e.g. "{count} of {total}" -> ["count", "total"].
 *
 * An argument is only ever `{name}` or `{name,` — requiring that terminator is
 * what keeps the branch bodies of a plural out of the result. Without it,
 * `{count, plural, =0 {no municipality} ...}` yields a bogus "no" argument and
 * every plural in the catalog reports a false mismatch against its translation.
 */
function placeholders(value) {
  if (typeof value !== 'string') return [];
  const names = [...value.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((m) => m[1]);
  return [...new Set(names)].sort();
}

function load(locale) {
  const path = join(MESSAGES_DIR, `${locale}.json`);
  try {
    return flatten(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    console.error(`✖ could not read ${locale}.json — ${error.message}`);
    process.exit(1);
  }
}

const reference = load(REFERENCE_LOCALE);
const problems = [];

for (const locale of TARGET_LOCALES) {
  const target = load(locale);

  for (const key of Object.keys(reference)) {
    if (!(key in target)) {
      problems.push(`missing in ${locale}.json: ${key}`);
    }
  }

  for (const key of Object.keys(target)) {
    if (!(key in reference)) {
      problems.push(`missing in ${REFERENCE_LOCALE}.json: ${key}`);
    }
  }

  for (const [key, value] of Object.entries(target)) {
    if (!(key in reference)) continue;

    const expected = placeholders(reference[key]).join(',');
    const actual = placeholders(value).join(',');
    if (expected !== actual) {
      problems.push(
        `placeholder mismatch at ${key}: ${REFERENCE_LOCALE} has {${expected}}, ${locale} has {${actual}}`
      );
    }

    if (typeof value === 'string' && value.trim() === '') {
      problems.push(`empty value in ${locale}.json: ${key}`);
    }
  }
}

if (problems.length > 0) {
  console.error(`✖ i18n catalogs are out of sync (${problems.length} problem(s)):\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(`\nAdd the missing key to every catalog in messages/, then re-run.`);
  process.exit(1);
}

console.log(
  `✓ i18n catalogs in sync — ${Object.keys(reference).length} keys across ` +
    `${[REFERENCE_LOCALE, ...TARGET_LOCALES].join(', ')}`
);
