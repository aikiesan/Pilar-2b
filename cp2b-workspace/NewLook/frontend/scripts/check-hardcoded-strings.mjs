#!/usr/bin/env node
/**
 * Guards already-translated files against new hardcoded Portuguese.
 *
 * The e2e locale test (`e2e/i18n.public.spec.ts`) only sees what renders on page
 * load. Popups, expandable panels and empty states are invisible to it — which
 * is exactly how `MunicipalityProfilePanel` and `InfrastructureLayer` stayed
 * fully Portuguese while `/en/map` passed. This catches those, statically, with
 * no browser and no backend, so it can run in the blocking lint job.
 *
 * It is a ratchet, not a sweep: it checks only `CLEAN_FILES`, the files already
 * extracted to the catalogs. Add a file to that list the moment you finish it.
 * Running it over the whole tree would just report the work not yet done and
 * would have to be non-blocking, which would make it worthless as a gate.
 *
 * To allow a genuine Portuguese literal — a proper noun, an official dataset
 * name, a scientific term — put `i18n-exempt` in a comment on the same line.
 *
 * Run: npm run i18n:scan
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Files whose user-facing strings all live in messages/. Keep this growing. */
const CLEAN_FILES = [
  'src/app/[locale]/about/page.tsx',
  'src/app/[locale]/cite/page.tsx',
  'src/app/[locale]/guide/page.tsx',
  'src/app/[locale]/guide/layout.tsx',
  'src/app/[locale]/dashboard/technology-routes/page.tsx',
  'src/components/ui/GlobalSearch.tsx',
  'src/components/map/MapLoadingSkeleton.tsx',
  'src/components/map/MunicipalityProfilePanel.tsx',
  'src/components/map/InfrastructureLayer.tsx',
  'src/components/map/ThematicMapBar.tsx',
  'src/components/layout/UnifiedHeader.tsx',
];

/** Characters that appear in Portuguese but not in English. */
const PORTUGUESE_CHARS = /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/;

/** Attributes whose value is read by a user or a screen reader. */
const LOCALIZED_ATTRS = /\b(placeholder|aria-label|title|alt|label|subtitle)="([^"]*)"/g;

/** JSX text between tags, e.g. `>Município<`. */
const JSX_TEXT = />([^<>{}]*)</g;

/** Strips comments so prose in them is never flagged. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (match, prefix) => prefix + ' '.repeat(match.length - prefix.length));
}

const problems = [];

for (const relative of CLEAN_FILES) {
  let source;
  try {
    source = readFileSync(join(ROOT, relative), 'utf8');
  } catch {
    problems.push(`${relative}: listed as clean but could not be read — update CLEAN_FILES`);
    continue;
  }

  const rawLines = source.split('\n');
  const lines = stripComments(source).split('\n');

  lines.forEach((line, index) => {
    // `i18n-exempt` is read from the ORIGINAL line: the marker lives in a
    // comment, which stripComments has already blanked out.
    if (rawLines[index].includes('i18n-exempt')) return;

    const found = new Set();

    for (const [, text] of line.matchAll(JSX_TEXT)) {
      if (PORTUGUESE_CHARS.test(text) && text.trim()) found.add(text.trim());
    }
    for (const [, , value] of line.matchAll(LOCALIZED_ATTRS)) {
      if (PORTUGUESE_CHARS.test(value)) found.add(value);
    }

    for (const text of found) {
      problems.push(`${relative}:${index + 1}  ${text.slice(0, 70)}`);
    }
  });
}

if (problems.length > 0) {
  console.error(`✖ hardcoded Portuguese in files that should be fully translated:\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    `\nMove each string into messages/en.json and messages/pt-BR.json and read it` +
      `\nwith t(). If it is a proper noun or an official dataset name, add an` +
      `\n\`i18n-exempt\` comment on that line saying why.`
  );
  process.exit(1);
}

console.log(`✓ no hardcoded Portuguese in ${CLEAN_FILES.length} translated files`);
