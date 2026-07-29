/**
 * The SP/beta boundary is a single predicate that decides whether a
 * municipality's numbers are presented as canonical or as unvalidated. Every
 * case below is a way that predicate could quietly promote a national row into
 * the canonical layer, which is the failure that matters.
 */

import { isSaoPaulo, SP_UF_CODE, SP_MUNICIPALITY_COUNT } from '../mapScope';

describe('isSaoPaulo', () => {
  it('accepts São Paulo codes as string and as number', () => {
    expect(isSaoPaulo('3550308')).toBe(true);   // São Paulo (capital)
    expect(isSaoPaulo(3550308)).toBe(true);
    expect(isSaoPaulo('3509502')).toBe(true);   // Campinas
    expect(isSaoPaulo('3543402')).toBe(true);   // Ribeirão Preto
  });

  it('rejects other states', () => {
    expect(isSaoPaulo('3304557')).toBe(false);  // Rio de Janeiro (33)
    expect(isSaoPaulo('3106200')).toBe(false);  // Belo Horizonte (31)
    expect(isSaoPaulo('5300108')).toBe(false);  // Brasília (53)
    expect(isSaoPaulo(4106902)).toBe(false);    // Curitiba (41)
  });

  it('does not match a "35" that is not the UF prefix', () => {
    // Bahia 2935 / Minas 3135 etc. contain "35" but not in position 0-1. A
    // naive `includes('35')` would wrongly promote these into the SP layer.
    expect(isSaoPaulo('2903506')).toBe(false);
    expect(isSaoPaulo('1350000')).toBe(false);
  });

  it('treats malformed or missing codes as NOT São Paulo', () => {
    // The conservative direction: an unparseable code degrades into "shown as
    // beta", never into "presented as canonical".
    expect(isSaoPaulo(null)).toBe(false);
    expect(isSaoPaulo(undefined)).toBe(false);
    expect(isSaoPaulo('')).toBe(false);
    expect(isSaoPaulo('35')).toBe(false);        // UF code alone, not a município
    expect(isSaoPaulo('355030')).toBe(false);    // 6 digits — truncated
    expect(isSaoPaulo('35503080')).toBe(false);  // 8 digits — malformed
    expect(isSaoPaulo('abcdefg')).toBe(false);
  });

  it('tolerates surrounding whitespace from the API', () => {
    expect(isSaoPaulo(' 3550308 ')).toBe(true);
  });

  it('pins the constants the UI counts against', () => {
    expect(SP_UF_CODE).toBe('35');
    expect(SP_MUNICIPALITY_COUNT).toBe(645);
  });
});
