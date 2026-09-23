/**
 * Tests for the map utility functions.
 *
 * Number formatting is covered by format.test.ts; the potential-class copy by
 * the catalogs. What is left here is the class-code mapping and the share math.
 */

import { calculatePercentage, getCategoryColor, getPotentialCategoryKey } from './mapUtils';

describe('calculatePercentage', () => {
  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(75, 100)).toBe(75);
  });

  it('should handle non-100 totals', () => {
    expect(calculatePercentage(1, 4)).toBe(25);
    expect(calculatePercentage(3, 4)).toBe(75);
    expect(calculatePercentage(2, 8)).toBe(25);
  });

  it('should handle decimal results', () => {
    expect(calculatePercentage(1, 3)).toBeCloseTo(33.33, 2);
    expect(calculatePercentage(2, 3)).toBeCloseTo(66.67, 2);
  });

  it('should return 0 when total is 0', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
  });

  it('should handle zero part', () => {
    expect(calculatePercentage(0, 100)).toBe(0);
  });

  it('should handle part greater than total', () => {
    expect(calculatePercentage(150, 100)).toBe(150);
  });

  it('should handle negative values', () => {
    expect(calculatePercentage(-25, 100)).toBe(-25);
    expect(calculatePercentage(25, -100)).toBe(-25);
  });
});

describe('getPotentialCategoryKey', () => {
  it.each([
    ['ALTO', 'high'],
    ['alto', 'high'],
    ['MEDIO', 'medium'],
    ['MÉDIO', 'medium'],
    ['médio', 'medium'],
    ['BAIXO', 'low'],
    ['Baixo', 'low'],
  ])('maps the backend code %p to %p', (code, key) => {
    expect(getPotentialCategoryKey(code)).toBe(key);
  });

  it.each(['SEM DADOS', 'UNKNOWN', '', null, undefined])('treats %p as unclassified', (code) => {
    expect(getPotentialCategoryKey(code)).toBe('unclassified');
  });
});

describe('getCategoryColor', () => {
  it('colors each class distinctly', () => {
    expect(getCategoryColor('ALTO')).toBe('bg-green-600 text-white');
    expect(getCategoryColor('MÉDIO')).toBe('bg-yellow-500 text-white');
    expect(getCategoryColor('baixo')).toBe('bg-orange-500 text-white');
  });

  it('falls back to grey for missing or unknown classes', () => {
    expect(getCategoryColor('SEM DADOS')).toBe('bg-gray-400 text-white');
    expect(getCategoryColor('invalid')).toBe('bg-gray-400 text-white');
    expect(getCategoryColor(null)).toBe('bg-gray-400 text-white');
    expect(getCategoryColor(undefined)).toBe('bg-gray-400 text-white');
  });
});
