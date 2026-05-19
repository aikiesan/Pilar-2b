/**
 * PILAR-2b V3 - Map Utility Functions
 * Color scales, formatting, and helper functions for map visualization
 */

// PILAR-2b Brand Colors
export const PILAR2B_COLORS = {
  darkGreen: '#1E5128',
  mediumGreen: '#2D6A2E',
  lightGreen: '#4E9F3D',
  paleGreen: '#A8D5BA',
  veryPaleGreen: '#D8E9A8',
  accent: '#D8E9A8',
  text: '#2C3E50',
  border: '#E5E7EB',
};

// Biogas potential thresholds (in m³/year)
export const BIOGAS_THRESHOLDS = {
  veryHigh: 300_000_000,  // >300M
  high: 200_000_000,      // 200-300M
  medium: 150_000_000,    // 150-200M
  low: 100_000_000,       // 100-150M
  veryLow: 0,             // <100M
};

/**
 * Get color for biogas potential value (choropleth map)
 */
export function getBiogasColor(biogas: number): string {
  if (biogas >= BIOGAS_THRESHOLDS.veryHigh) return PILAR2B_COLORS.darkGreen;
  if (biogas >= BIOGAS_THRESHOLDS.high) return PILAR2B_COLORS.mediumGreen;
  if (biogas >= BIOGAS_THRESHOLDS.medium) return PILAR2B_COLORS.lightGreen;
  if (biogas >= BIOGAS_THRESHOLDS.low) return PILAR2B_COLORS.paleGreen;
  return PILAR2B_COLORS.veryPaleGreen;
}

/**
 * Get legend items for map
 */
export function getLegendItems() {
  return [
    {
      color: PILAR2B_COLORS.darkGreen,
      label: 'Very High (>300M)',
      minValue: BIOGAS_THRESHOLDS.veryHigh,
    },
    {
      color: PILAR2B_COLORS.mediumGreen,
      label: 'High (200-300M)',
      minValue: BIOGAS_THRESHOLDS.high,
      maxValue: BIOGAS_THRESHOLDS.veryHigh,
    },
    {
      color: PILAR2B_COLORS.lightGreen,
      label: 'Medium (150-200M)',
      minValue: BIOGAS_THRESHOLDS.medium,
      maxValue: BIOGAS_THRESHOLDS.high,
    },
    {
      color: PILAR2B_COLORS.paleGreen,
      label: 'Low (100-150M)',
      minValue: BIOGAS_THRESHOLDS.low,
      maxValue: BIOGAS_THRESHOLDS.medium,
    },
    {
      color: PILAR2B_COLORS.veryPaleGreen,
      label: 'Very Low (<100M)',
      minValue: 0,
      maxValue: BIOGAS_THRESHOLDS.low,
    },
  ];
}

/**
 * Format biogas value for display
 * Examples: "123.4 million m³/year", "1.2 billion m³/year"
 */
export function formatBiogas(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)} billion m³/year`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} million m³/year`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)} thousand m³/year`;
  }
  return `${value.toFixed(0)} m³/year`;
}

/**
 * Format biogas value (short version)
 * Examples: "123.4M", "1.2B"
 */
export function formatBiogasShort(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

/**
 * Format population with thousand separators
 * Example: "123,456"
 */
export function formatPopulation(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  return value.toLocaleString('en-US');
}

/**
 * Format area with decimals
 * Example: "1,234.5 km²"
 */
export function formatArea(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'N/A';
  }
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  })} km²`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return (part / total) * 100;
}

/**
 * Format percentage
 * Example: "45.2%"
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get category badge color
 */
export function getCategoryColor(category: string): string {
  const categoryUpper = category?.toUpperCase() || 'SEM DADOS';

  switch (categoryUpper) {
    case 'ALTO':
      return 'bg-green-600 text-white';
    case 'MEDIO':
    case 'MÉDIO':
      return 'bg-yellow-500 text-white';
    case 'BAIXO':
      return 'bg-orange-500 text-white';
    case 'SEM DADOS':
    default:
      return 'bg-gray-400 text-white';
  }
}

/**
 * Get category label in Portuguese
 */
export function getCategoryLabel(category: string): string {
  const categoryUpper = category?.toUpperCase() || 'SEM DADOS';

  const labels: Record<string, string> = {
    'ALTO': 'Alto Potencial',
    'MEDIO': 'Médio Potencial',
    'MÉDIO': 'Médio Potencial',
    'BAIXO': 'Baixo Potencial',
    'SEM DADOS': 'Sem Classificação',
  };

  return labels[categoryUpper] || 'Sem Classificação';
}
