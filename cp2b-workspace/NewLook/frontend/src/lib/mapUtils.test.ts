/**
 * Tests for Map Utility Functions
 * Tests color scales, formatting, and helper functions for map visualization
 */

import {
  PILAR2B_COLORS,
  BIOGAS_THRESHOLDS,
  getBiogasColor,
  getLegendItems,
  formatBiogas,
  formatBiogasShort,
  formatPopulation,
  formatArea,
  calculatePercentage,
  formatPercentage,
  getCategoryColor,
  getCategoryLabel,
} from './mapUtils';

describe('Constants', () => {
  describe('PILAR2B_COLORS', () => {
    it('should define all required colors', () => {
      expect(PILAR2B_COLORS.darkGreen).toBeDefined();
      expect(PILAR2B_COLORS.mediumGreen).toBeDefined();
      expect(PILAR2B_COLORS.lightGreen).toBeDefined();
      expect(PILAR2B_COLORS.paleGreen).toBeDefined();
      expect(PILAR2B_COLORS.veryPaleGreen).toBeDefined();
      expect(PILAR2B_COLORS.accent).toBeDefined();
      expect(PILAR2B_COLORS.text).toBeDefined();
      expect(PILAR2B_COLORS.border).toBeDefined();
    });

    it('should use valid hex color formats', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;

      Object.values(PILAR2B_COLORS).forEach((color) => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it('should have correct brand colors', () => {
      expect(PILAR2B_COLORS.darkGreen).toBe('#1E5128');
      expect(PILAR2B_COLORS.mediumGreen).toBe('#2D6A2E');
      expect(PILAR2B_COLORS.lightGreen).toBe('#4E9F3D');
    });
  });

  describe('BIOGAS_THRESHOLDS', () => {
    it('should define all thresholds', () => {
      expect(BIOGAS_THRESHOLDS.veryHigh).toBeDefined();
      expect(BIOGAS_THRESHOLDS.high).toBeDefined();
      expect(BIOGAS_THRESHOLDS.medium).toBeDefined();
      expect(BIOGAS_THRESHOLDS.low).toBeDefined();
      expect(BIOGAS_THRESHOLDS.veryLow).toBeDefined();
    });

    it('should have descending threshold values', () => {
      expect(BIOGAS_THRESHOLDS.veryHigh).toBeGreaterThan(BIOGAS_THRESHOLDS.high);
      expect(BIOGAS_THRESHOLDS.high).toBeGreaterThan(BIOGAS_THRESHOLDS.medium);
      expect(BIOGAS_THRESHOLDS.medium).toBeGreaterThan(BIOGAS_THRESHOLDS.low);
      expect(BIOGAS_THRESHOLDS.low).toBeGreaterThan(BIOGAS_THRESHOLDS.veryLow);
    });

    it('should have correct threshold values', () => {
      expect(BIOGAS_THRESHOLDS.veryHigh).toBe(300_000_000);
      expect(BIOGAS_THRESHOLDS.high).toBe(200_000_000);
      expect(BIOGAS_THRESHOLDS.medium).toBe(150_000_000);
      expect(BIOGAS_THRESHOLDS.low).toBe(100_000_000);
      expect(BIOGAS_THRESHOLDS.veryLow).toBe(0);
    });
  });
});

describe('getBiogasColor', () => {
  it('should return darkGreen for very high values', () => {
    expect(getBiogasColor(300_000_000)).toBe(PILAR2B_COLORS.darkGreen);
    expect(getBiogasColor(400_000_000)).toBe(PILAR2B_COLORS.darkGreen);
    expect(getBiogasColor(1_000_000_000)).toBe(PILAR2B_COLORS.darkGreen);
  });

  it('should return mediumGreen for high values', () => {
    expect(getBiogasColor(200_000_000)).toBe(PILAR2B_COLORS.mediumGreen);
    expect(getBiogasColor(250_000_000)).toBe(PILAR2B_COLORS.mediumGreen);
    expect(getBiogasColor(299_999_999)).toBe(PILAR2B_COLORS.mediumGreen);
  });

  it('should return lightGreen for medium values', () => {
    expect(getBiogasColor(150_000_000)).toBe(PILAR2B_COLORS.lightGreen);
    expect(getBiogasColor(175_000_000)).toBe(PILAR2B_COLORS.lightGreen);
    expect(getBiogasColor(199_999_999)).toBe(PILAR2B_COLORS.lightGreen);
  });

  it('should return paleGreen for low values', () => {
    expect(getBiogasColor(100_000_000)).toBe(PILAR2B_COLORS.paleGreen);
    expect(getBiogasColor(125_000_000)).toBe(PILAR2B_COLORS.paleGreen);
    expect(getBiogasColor(149_999_999)).toBe(PILAR2B_COLORS.paleGreen);
  });

  it('should return veryPaleGreen for very low values', () => {
    expect(getBiogasColor(0)).toBe(PILAR2B_COLORS.veryPaleGreen);
    expect(getBiogasColor(50_000_000)).toBe(PILAR2B_COLORS.veryPaleGreen);
    expect(getBiogasColor(99_999_999)).toBe(PILAR2B_COLORS.veryPaleGreen);
  });

  it('should handle edge cases', () => {
    expect(getBiogasColor(0)).toBe(PILAR2B_COLORS.veryPaleGreen);
    expect(getBiogasColor(-1)).toBe(PILAR2B_COLORS.veryPaleGreen);
    expect(getBiogasColor(Number.MAX_SAFE_INTEGER)).toBe(PILAR2B_COLORS.darkGreen);
  });
});

describe('getLegendItems', () => {
  it('should return array of legend items', () => {
    const items = getLegendItems();

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(5);
  });

  it('should have correct structure for each item', () => {
    const items = getLegendItems();

    items.forEach((item) => {
      expect(item).toHaveProperty('color');
      expect(item).toHaveProperty('label');
      expect(item).toHaveProperty('minValue');
    });
  });

  it('should have correct colors', () => {
    const items = getLegendItems();

    expect(items[0].color).toBe(PILAR2B_COLORS.darkGreen);
    expect(items[1].color).toBe(PILAR2B_COLORS.mediumGreen);
    expect(items[2].color).toBe(PILAR2B_COLORS.lightGreen);
    expect(items[3].color).toBe(PILAR2B_COLORS.paleGreen);
    expect(items[4].color).toBe(PILAR2B_COLORS.veryPaleGreen);
  });

  it('should have non-overlapping ranges', () => {
    const items = getLegendItems();

    for (let i = 0; i < items.length - 1; i++) {
      const currentMax = items[i].maxValue;
      const nextMin = items[i + 1].minValue;

      if (currentMax !== undefined && nextMin !== undefined) {
        expect(currentMax).toBeGreaterThan(nextMin);
      }
    }
  });

  it('should cover all possible values', () => {
    const items = getLegendItems();

    // First item should have no upper bound (or very high)
    expect(items[0].minValue).toBe(BIOGAS_THRESHOLDS.veryHigh);

    // Last item should start from 0
    expect(items[items.length - 1].minValue).toBe(0);
  });
});

describe('formatBiogas', () => {
  it('should format billion values correctly', () => {
    expect(formatBiogas(1_000_000_000)).toBe('1.00 billion m³/year');
    expect(formatBiogas(1_500_000_000)).toBe('1.50 billion m³/year');
    expect(formatBiogas(2_234_567_890)).toBe('2.23 billion m³/year');
  });

  it('should format million values correctly', () => {
    expect(formatBiogas(1_000_000)).toBe('1.0 million m³/year');
    expect(formatBiogas(123_456_789)).toBe('123.5 million m³/year');
    expect(formatBiogas(999_999_999)).toBe('1000.0 million m³/year');
  });

  it('should format thousand values correctly', () => {
    expect(formatBiogas(1_000)).toBe('1.0 thousand m³/year');
    expect(formatBiogas(123_456)).toBe('123.5 thousand m³/year');
    expect(formatBiogas(999_999)).toBe('1000.0 thousand m³/year');
  });

  it('should format small values without suffix', () => {
    expect(formatBiogas(0)).toBe('0 m³/year');
    expect(formatBiogas(100)).toBe('100 m³/year');
    expect(formatBiogas(999)).toBe('999 m³/year');
  });

  it('should handle null and undefined', () => {
    expect(formatBiogas(null)).toBe('N/A');
    expect(formatBiogas(undefined)).toBe('N/A');
  });

  it('should handle NaN', () => {
    expect(formatBiogas(NaN)).toBe('N/A');
  });

  it('should handle negative values', () => {
    expect(formatBiogas(-1000)).toBe('-1 m³/year');
    expect(formatBiogas(-1_000_000)).toBe('-1.0 million m³/year');
  });
});

describe('formatBiogasShort', () => {
  it('should format billion values with B suffix', () => {
    expect(formatBiogasShort(1_000_000_000)).toBe('1.0B');
    expect(formatBiogasShort(1_500_000_000)).toBe('1.5B');
    expect(formatBiogasShort(2_234_567_890)).toBe('2.2B');
  });

  it('should format million values with M suffix', () => {
    expect(formatBiogasShort(1_000_000)).toBe('1.0M');
    expect(formatBiogasShort(123_456_789)).toBe('123.5M');
    expect(formatBiogasShort(999_000_000)).toBe('999.0M');
  });

  it('should format thousand values with K suffix', () => {
    expect(formatBiogasShort(1_000)).toBe('1.0K');
    expect(formatBiogasShort(123_456)).toBe('123.5K');
    expect(formatBiogasShort(999_999)).toBe('1000.0K');
  });

  it('should format small values without suffix', () => {
    expect(formatBiogasShort(0)).toBe('0');
    expect(formatBiogasShort(100)).toBe('100');
    expect(formatBiogasShort(999)).toBe('999');
  });

  it('should handle null and undefined', () => {
    expect(formatBiogasShort(null)).toBe('N/A');
    expect(formatBiogasShort(undefined)).toBe('N/A');
  });

  it('should handle NaN', () => {
    expect(formatBiogasShort(NaN)).toBe('N/A');
  });
});

describe('formatPopulation', () => {
  it('should format with thousand separators', () => {
    expect(formatPopulation(1_000)).toBe('1,000');
    expect(formatPopulation(123_456)).toBe('123,456');
    expect(formatPopulation(12_345_678)).toBe('12,345,678');
  });

  it('should handle small numbers', () => {
    expect(formatPopulation(0)).toBe('0');
    expect(formatPopulation(100)).toBe('100');
    expect(formatPopulation(999)).toBe('999');
  });

  it('should handle null and undefined', () => {
    expect(formatPopulation(null)).toBe('N/A');
    expect(formatPopulation(undefined)).toBe('N/A');
  });

  it('should handle NaN', () => {
    expect(formatPopulation(NaN)).toBe('N/A');
  });

  it('should handle very large numbers', () => {
    expect(formatPopulation(1_000_000_000)).toBe('1,000,000,000');
  });
});

describe('formatArea', () => {
  it('should format area with km² suffix', () => {
    expect(formatArea(100)).toBe('100.0 km²');
    expect(formatArea(1234.567)).toBe('1,234.6 km²');
  });

  it('should include one decimal place', () => {
    expect(formatArea(1234.1)).toBe('1,234.1 km²');
    expect(formatArea(1234.9)).toBe('1,234.9 km²');
  });

  it('should handle small values', () => {
    expect(formatArea(0)).toBe('0.0 km²');
    expect(formatArea(0.5)).toBe('0.5 km²');
  });

  it('should handle null and undefined', () => {
    expect(formatArea(null)).toBe('N/A');
    expect(formatArea(undefined)).toBe('N/A');
  });

  it('should handle NaN', () => {
    expect(formatArea(NaN)).toBe('N/A');
  });

  it('should handle large values with separators', () => {
    expect(formatArea(12_345.6)).toBe('12,345.6 km²');
  });
});

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

describe('formatPercentage', () => {
  it('should format percentage with % symbol', () => {
    expect(formatPercentage(50)).toBe('50.0%');
    expect(formatPercentage(25)).toBe('25.0%');
    expect(formatPercentage(75)).toBe('75.0%');
  });

  it('should format with one decimal place', () => {
    expect(formatPercentage(33.33)).toBe('33.3%');
    expect(formatPercentage(66.67)).toBe('66.7%');
    expect(formatPercentage(50.5)).toBe('50.5%');
  });

  it('should handle zero', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('should handle 100%', () => {
    expect(formatPercentage(100)).toBe('100.0%');
  });

  it('should handle values over 100%', () => {
    expect(formatPercentage(150)).toBe('150.0%');
    expect(formatPercentage(200)).toBe('200.0%');
  });

  it('should handle negative values', () => {
    expect(formatPercentage(-25)).toBe('-25.0%');
  });

  it('should handle very small values', () => {
    expect(formatPercentage(0.1)).toBe('0.1%');
    expect(formatPercentage(0.01)).toBe('0.0%');
  });
});

describe('getCategoryColor', () => {
  it('should return correct color for ALTO', () => {
    expect(getCategoryColor('ALTO')).toBe('bg-green-600 text-white');
    expect(getCategoryColor('alto')).toBe('bg-green-600 text-white');
    expect(getCategoryColor('Alto')).toBe('bg-green-600 text-white');
  });

  it('should return correct color for MEDIO', () => {
    expect(getCategoryColor('MEDIO')).toBe('bg-yellow-500 text-white');
    expect(getCategoryColor('MÉDIO')).toBe('bg-yellow-500 text-white');
    expect(getCategoryColor('medio')).toBe('bg-yellow-500 text-white');
    expect(getCategoryColor('médio')).toBe('bg-yellow-500 text-white');
  });

  it('should return correct color for BAIXO', () => {
    expect(getCategoryColor('BAIXO')).toBe('bg-orange-500 text-white');
    expect(getCategoryColor('baixo')).toBe('bg-orange-500 text-white');
    expect(getCategoryColor('Baixo')).toBe('bg-orange-500 text-white');
  });

  it('should return default color for SEM DADOS', () => {
    expect(getCategoryColor('SEM DADOS')).toBe('bg-gray-400 text-white');
    expect(getCategoryColor('sem dados')).toBe('bg-gray-400 text-white');
  });

  it('should return default color for unknown categories', () => {
    expect(getCategoryColor('UNKNOWN')).toBe('bg-gray-400 text-white');
    expect(getCategoryColor('invalid')).toBe('bg-gray-400 text-white');
  });

  it('should handle empty string', () => {
    expect(getCategoryColor('')).toBe('bg-gray-400 text-white');
  });

  it('should handle null and undefined', () => {
    expect(getCategoryColor(null as any)).toBe('bg-gray-400 text-white');
    expect(getCategoryColor(undefined as any)).toBe('bg-gray-400 text-white');
  });
});

describe('getCategoryLabel', () => {
  it('should return correct label for ALTO', () => {
    expect(getCategoryLabel('ALTO')).toBe('Alto Potencial');
    expect(getCategoryLabel('alto')).toBe('Alto Potencial');
  });

  it('should return correct label for MEDIO', () => {
    expect(getCategoryLabel('MEDIO')).toBe('Médio Potencial');
    expect(getCategoryLabel('MÉDIO')).toBe('Médio Potencial');
    expect(getCategoryLabel('medio')).toBe('Médio Potencial');
  });

  it('should return correct label for BAIXO', () => {
    expect(getCategoryLabel('BAIXO')).toBe('Baixo Potencial');
    expect(getCategoryLabel('baixo')).toBe('Baixo Potencial');
  });

  it('should return correct label for SEM DADOS', () => {
    expect(getCategoryLabel('SEM DADOS')).toBe('Sem Classificação');
    expect(getCategoryLabel('sem dados')).toBe('Sem Classificação');
  });

  it('should return default label for unknown categories', () => {
    expect(getCategoryLabel('UNKNOWN')).toBe('Sem Classificação');
    expect(getCategoryLabel('invalid')).toBe('Sem Classificação');
  });

  it('should handle empty string', () => {
    expect(getCategoryLabel('')).toBe('Sem Classificação');
  });

  it('should handle null and undefined', () => {
    expect(getCategoryLabel(null as any)).toBe('Sem Classificação');
    expect(getCategoryLabel(undefined as any)).toBe('Sem Classificação');
  });

  it('should be case-insensitive', () => {
    expect(getCategoryLabel('ALTO')).toBe(getCategoryLabel('alto'));
    expect(getCategoryLabel('MEDIO')).toBe(getCategoryLabel('medio'));
    expect(getCategoryLabel('BAIXO')).toBe(getCategoryLabel('baixo'));
  });
});

describe('Integration tests', () => {
  it('should have consistent color mapping across functions', () => {
    const legendItems = getLegendItems();

    // Very high biogas should map to dark green
    const veryHighColor = getBiogasColor(350_000_000);
    expect(veryHighColor).toBe(legendItems[0].color);

    // High biogas should map to medium green
    const highColor = getBiogasColor(250_000_000);
    expect(highColor).toBe(legendItems[1].color);
  });

  it('should format and calculate percentage consistently', () => {
    const percentage = calculatePercentage(50, 100);
    const formatted = formatPercentage(percentage);

    expect(formatted).toBe('50.0%');
  });

  it('should handle complete biogas workflow', () => {
    const biogasValue = 250_000_000;

    // Get color
    const color = getBiogasColor(biogasValue);
    expect(color).toBe(PILAR2B_COLORS.mediumGreen);

    // Format long
    const formatted = formatBiogas(biogasValue);
    expect(formatted).toBe('250.0 million m³/year');

    // Format short
    const formattedShort = formatBiogasShort(biogasValue);
    expect(formattedShort).toBe('250.0M');
  });
});
