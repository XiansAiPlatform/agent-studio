import { FormattedValue } from '../types';

/**
 * Format a metric value with its unit
 */
export function formatMetricValue(value: number, unit: string): FormattedValue {
  let formattedValue: string;
  
  switch (unit.toLowerCase()) {
    case 'tokens':
      formattedValue = value.toLocaleString();
      break;
    case 'milliseconds':
    case 'ms':
      formattedValue = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      break;
    case 'count':
      formattedValue = value.toLocaleString();
      break;
    default:
      formattedValue = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  
  return {
    value: formattedValue,
    unit,
  };
}

/**
 * Get a display-friendly unit name
 */
export function getUnitDisplay(unit: string): string {
  const unitMap: Record<string, string> = {
    'tokens': 'tokens',
    'milliseconds': 'ms',
    'ms': 'ms',
    'count': '',
    'bytes': 'bytes',
    'seconds': 's',
  };
  
  return unitMap[unit.toLowerCase()] || unit;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}
