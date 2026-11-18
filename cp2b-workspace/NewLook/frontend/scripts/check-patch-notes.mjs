#!/usr/bin/env node
/**
 * Validates src/data/patch-notes.json.
 *
 * The notes deliberately sit outside messages/*.json, so check-i18n-parity.mjs
 * never sees them. Without this, an entry written in a hurry with only pt-BR
 * would ship, and the English page would silently fall back to Portuguese --
 * exactly the drift the i18n gate exists to prevent, just through a side door.
 *
 * Checks:
 *   1. shape        -- required fields present, `kind` from the known set
 *   2. both locales -- every localized string has pt-BR AND en, neither empty
 *   3. dates        -- parseable ISO 8601 and carrying an offset, since the page
 *                      renders them in the reader's timezone
 *   4. ordering     -- newest first, so the page never has to sort at runtime
 *   5. versions     -- no duplicates (the page keys its list on them)
 *
 * Run: npm run patch-notes:check
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILE = join(ROOT, 'src', 'data', 'patch-notes.json');
const LOCALES = ['pt-BR', 'en'];
const KINDS = new Set(['added', 'changed', 'fixed', 'security', 'data']);
/** ISO 8601 that ends in Z or +/-HH:MM. A bare date drifts a day across zones. */
const HAS_OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

const problems = [];

function checkLocalized(value, where) {
  if (!value || typeof value !== 'object') {
    problems.push(`${where}: expected an object with ${LOCALES.join(' and ')}`);
    return;
  }
  for (const locale of LOCALES) {
    const text = value[locale];
    if (typeof text !== 'string' || text.trim() === '') {
      problems.push(`${where}: missing or empty "${locale}"`);
    }
  }
}

const { entries } = JSON.parse(readFileSync(FILE, 'utf8'));

if (!Array.isArray(entries)) {
  console.error('patch-notes.json: "entries" must be an array');
  process.exit(1);
}

const seenVersions = new Set();
let previousDate = null;

entries.forEach((entry, index) => {
  const where = `entries[${index}]`;

  if (typeof entry.version !== 'string' || entry.version.trim() === '') {
    problems.push(`${where}: missing "version"`);
  } else if (seenVersions.has(entry.version)) {
    problems.push(`${where}: duplicate version "${entry.version}" -- the page keys its list on it`);
  } else {
    seenVersions.add(entry.version);
  }

  const time = Date.parse(entry.date);
  if (Number.isNaN(time)) {
    problems.push(`${where}: "date" is not a parseable ISO 8601 timestamp`);
  } else {
    if (!HAS_OFFSET.test(entry.date)) {
      problems.push(`${where}: "date" needs a UTC offset (e.g. -03:00), it is rendered per timezone`);
    }
    if (previousDate !== null && time > previousDate) {
      problems.push(`${where}: out of order -- entries run newest first`);
    }
    previousDate = time;
  }


  checkLocalized(entry.title, `${where}.title`);

  if (!Array.isArray(entry.changes) || entry.changes.length === 0) {
    problems.push(`${where}: "changes" must be a non-empty array`);
    return;
  }

  entry.changes.forEach((change, changeIndex) => {
    const changeWhere = `${where}.changes[${changeIndex}]`;
    if (!KINDS.has(change.kind)) {
      problems.push(`${changeWhere}: unknown kind "${change.kind}" (expected ${[...KINDS].join(', ')})`);
    }
    checkLocalized(change.text, `${changeWhere}.text`);
  });
});

if (problems.length > 0) {
  console.error(`patch-notes.json: ${problems.length} problem(s)\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

const changeCount = entries.reduce((total, entry) => total + entry.changes.length, 0);
console.log(`patch-notes.json ok -- ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}, ${changeCount} changes, both locales present`);
