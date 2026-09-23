/**
 * Tests for the hardcoded-Portuguese detector.
 *
 * Run: npm run i18n:test   (node --test, no extra dependencies)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksPortuguese, scanSource } from '../lib/portuguese-scan.mjs';

const texts = (source, fileName = 'x.tsx') => scanSource(source, fileName).findings.map((f) => f.text);

test('looksPortuguese: accented text is Portuguese', () => {
  assert.equal(looksPortuguese('Município'), true);
  assert.equal(looksPortuguese('Distribuição por setor'), true);
});

test('looksPortuguese: unaccented Portuguese is caught by its words', () => {
  assert.equal(looksPortuguese('Sem dados'), true);
  assert.equal(looksPortuguese('Clique para detalhes'), true);
  assert.equal(looksPortuguese('Streams ativos'), true);
  assert.equal(looksPortuguese('Fechar'), true);
});

test('looksPortuguese: English copy, codes and identifiers are not', () => {
  for (const text of [
    'No data',
    'Click for details',
    'Total',
    'Biogas',
    'urbano', // a code
    'ALTO', // a backend class code
    'popup.population', // a message key
    'bg-green-50 border-green-200',
    '@/lib/format',
    'https://cidades.ibge.gov.br/brasil/sp',
    'contato@nipe.unicamp.br',
    'm³/year',
    '—',
  ]) {
    assert.equal(looksPortuguese(text), false, text);
  }
});

test('finds JSX text, including text on its own line', () => {
  const source = `
    export const A = () => (
      <p className="x">
        Cada resíduo possui análises
      </p>
    )`;
  assert.deepEqual(texts(source), ['Cada resíduo possui análises']);
});

test('finds attributes, object values and ternaries', () => {
  const source = `
    const spec = { label: 'Biomassa', unit: 't/ano' }
    const el = <button title="Fechar" aria-label={open ? 'Recolher legenda' : 'Expandir legenda'} />
    const empty = value ?? 'Sem dados'`;
  assert.deepEqual(texts(source), ['Biomassa', 'Fechar', 'Recolher legenda', 'Expandir legenda', 'Sem dados']);
});

test('finds the static parts of template literals', () => {
  assert.deepEqual(texts('const s = `${n} municípios`'), ['municípios']);
});

test('does not treat a template that builds a field name as copy', () => {
  assert.deepEqual(texts('const k = `${sector}_${stem}_medio_m3_yr`'), []);
});

test('reports the right line number', () => {
  const { findings } = scanSource(`const a = 1\nconst b = 'Carregando…'\n`, 'x.ts');
  assert.deepEqual(findings, [{ line: 2, text: 'Carregando…' }]);
});

test('skips comments', () => {
  assert.deepEqual(texts(`// Município em validação\n/* Sem dados */\nconst x = 1`), []);
});

test('skips code: imports, keys, types, comparisons, case labels and matchers', () => {
  const source = `
    import x from './município'
    type Sector = 'URBANO' | 'PECUÁRIA'
    const MAP = { 'Agrícola': 'agricultural' }
    if (category === 'Pecuária') {}
    switch (c) { case 'MÉDIO': break }
    const isEthanol = subtype.includes('termelétrica')
    const label = name.replace('Município de ', '')`;
  assert.deepEqual(texts(source, 'x.ts'), []);
});

test('replace() keeps checking its replacement text', () => {
  assert.deepEqual(texts(`const s = raw.replace('{x}', 'Sem dados')`, 'x.ts'), ['Sem dados']);
});

test('skips developer output', () => {
  const source = `console.error('Erro ao carregar', e)\nlogger.warn('Falha na requisição')`;
  assert.deepEqual(texts(source, 'x.ts'), []);
});

test('skips the Portuguese half of a localized record', () => {
  const source = `const name = { 'pt-BR': 'Bagaço de cana', en: 'Sugarcane bagasse' }`;
  assert.deepEqual(texts(source, 'x.ts'), []);
});

test('the English half of a localized record is still checked', () => {
  const source = `const name = { 'pt-BR': 'Bagaço de cana', en: 'Bagaço de cana' }`;
  assert.deepEqual(texts(source, 'x.ts'), ['Bagaço de cana']);
});

test('honors i18n-exempt with a reason, on the line or the line above', () => {
  const source = `
    const state = 'São Paulo' // i18n-exempt: proper noun
    // i18n-exempt: official dataset name
    const source = 'Atlas de Bioenergia do Estado de São Paulo'
    const other = 'Município'`;
  assert.deepEqual(texts(source, 'x.ts'), ['Município']);
});

test('a marker without a reason exempts nothing and is itself reported', () => {
  const { findings, bareExemptions } = scanSource(`const s = 'São Paulo' // i18n-exempt\n`, 'x.ts');
  assert.deepEqual(findings, [{ line: 1, text: 'São Paulo' }]);
  assert.deepEqual(bareExemptions, [1]);
});

test('a lone Portuguese label may carry punctuation, an identifier may not', () => {
  assert.equal(looksPortuguese('Região:'), true);
  assert.equal(looksPortuguese('Carregando…'), true);
  assert.equal(looksPortuguese('Dados_v2'), false);
});

test('i18n-exempt-file opts a pure data file out entirely', () => {
  const source = `// i18n-exempt-file: bibliographic metadata, cited as published\nexport const REFS = [{ title: 'Potencial de biogás' }]`;
  assert.deepEqual(texts(source, 'x.ts'), []);
});
