#!/usr/bin/env node
/**
 * Reports catalog keys that no source file reads.
 *
 * TypeScript already rejects the opposite mistake: `src/types/next-intl.d.ts`
 * types every `t('key')` against the catalog, so a key used in code but missing
 * from messages/ fails `npm run typecheck`. Nothing, however, notices a key that
 * outlived the component that read it — and a catalog full of dead strings is
 * exactly where translators waste time and where stale copy gets "fixed" in one
 * locale only.
 *
 * How usage is detected, statically and conservatively:
 *   - `const t = useTranslations('ns')` / `getTranslations('ns')` /
 *     `getTranslations({ namespace: 'ns' })` bind a translator to a namespace;
 *   - `t('key')`, `t.rich('key')`, `t.raw('key')`, `t.has('key')` mark `ns.key`
 *     — and, for `t.raw`, everything under it — as used;
 *   - a template key, `t(\`scenario_${id}\`)`, marks every key starting with
 *     `ns.scenario_` as used, since the suffix is only known at runtime;
 *   - a call on a translator the file received as a parameter (namespace
 *     unknown) marks every key ending in `.key` as used, anywhere;
 *   - a key kept in data and passed to `t` later — `nameKey:
 *     'residue_scenarios.baseline_name'`, a validation code `'required'` — is
 *     used when some string literal in the source equals the key minus one of
 *     the namespaces a translator is bound to somewhere.
 *
 * It errs towards "used": a false "unused" would invite deleting live copy. So
 * the report can miss dead keys, but a key it lists is very likely dead.
 *
 * Run: npm run i18n:unused            (report only)
 *      npm run i18n:unused -- --strict (exit 1 when anything is reported)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = join(ROOT, 'messages', 'pt-BR.json');
const SOURCE_DIRS = [join(ROOT, 'src')];
const strict = process.argv.includes('--strict');

/** Dotted leaf paths of the catalog; arrays count as one leaf each element. */
function leaves(node, prefix = '', out = []) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') leaves(value, path, out);
    else out.push(path);
  }
  return out;
}

function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== '__tests__' && name !== 'test') sourceFiles(path, out);
    } else if (/\.(tsx?|jsx?)$/.test(name) && !/\.(test|spec)\.[jt]sx?$|\.d\.ts$/.test(name)) {
      out.push(path);
    }
  }
  return out;
}

const BINDING =
  /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:(['"])([^'"]*)\2|\{[^}]*namespace:\s*(['"])([^'"]*)\4[^}]*\})?\s*\)/g;
const CALL = /\b(\w+)(?:\.(rich|raw|has|markup))?\(\s*(?:(['"])([^'"]+)\3|`([^`]*)`)/g;

const exact = new Set();
const prefixes = new Set();
const suffixes = new Set();
/** Every namespace some translator is bound to, and every key-like string literal. */
const boundNamespaces = new Set();
const literals = new Set();
const LITERAL = /(['"`])([\w-]+(?:\.[\w-]+)*)\1/g;

for (const file of SOURCE_DIRS.flatMap((dir) => sourceFiles(dir))) {
  const source = readFileSync(file, 'utf8');
  const namespaces = new Map();
  for (const match of source.matchAll(BINDING)) {
    namespaces.set(match[1], match[3] ?? match[5] ?? '');
    if (match[3] ?? match[5]) boundNamespaces.add(match[3] ?? match[5]);
  }
  for (const [, , literal] of source.matchAll(LITERAL)) literals.add(literal);

  for (const [, callee, method, , literal, template] of source.matchAll(CALL)) {
    const bound = namespaces.has(callee);
    // Unbound callees only count when they look like a translator that was
    // passed in (`t`, `tMap`, `translate`); `fetch('…')` is not a key.
    if (!bound && !/^(t|t[A-Z]\w*|translate)$/.test(callee)) continue;
    const ns = bound ? namespaces.get(callee) : null;
    const join_ = (key) => (ns ? `${ns}.${key}` : key);

    if (literal !== undefined) {
      if (ns === null) suffixes.add(literal);
      else if (method === 'raw') prefixes.add(`${join_(literal)}.`), exact.add(join_(literal));
      else exact.add(join_(literal));
    } else if (template !== undefined) {
      const staticHead = template.split('${')[0];
      if (ns === null) {
        // `${slug}.title` with an unknown namespace: nothing safe to infer
        // beyond "some key under some namespace", so only the tail counts.
        const tail = template.split('}').pop();
        if (tail) suffixes.add(tail.replace(/^\./, ''));
      } else if (staticHead) {
        prefixes.add(join_(staticHead));
      } else {
        prefixes.add(ns ? `${ns}.` : '');
      }
    }
  }
}

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
const isUsed = (key) => {
  if (exact.has(key)) return true;
  for (const prefix of prefixes) if (key.startsWith(prefix)) return true;
  // Array leaves (`list.0`) are used when the array itself is read.
  const arrayParent = key.replace(/\.\d+(\..*)?$/, '');
  if (arrayParent !== key && (exact.has(arrayParent) || [...prefixes].some((p) => arrayParent.startsWith(p)))) {
    return true;
  }
  for (const suffix of suffixes) if (key === suffix || key.endsWith(`.${suffix}`)) return true;
  if (literals.has(key)) return true;
  for (const ns of boundNamespaces) {
    if (key.startsWith(`${ns}.`) && literals.has(key.slice(ns.length + 1))) return true;
  }
  return false;
};

const unused = leaves(catalog).filter((key) => !isUsed(key));

if (unused.length === 0) {
  console.log('✓ every catalog key is read by at least one source file');
  process.exit(0);
}

const byNamespace = unused.reduce((acc, key) => {
  const ns = key.split('.')[0];
  (acc[ns] ??= []).push(key);
  return acc;
}, {});

console.log(`${strict ? '✖' : '!'} ${unused.length} catalog key(s) no source file reads:\n`);
for (const [ns, keys] of Object.entries(byNamespace)) {
  console.log(`  ${ns} (${keys.length})`);
  for (const key of keys) console.log(`    ${key}`);
}
console.log('\nDelete them from every catalog in messages/, or read them where they belong.');
process.exit(strict ? 1 : 0);
