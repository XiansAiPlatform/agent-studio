import { format } from 'date-fns';
import { MetricsCategoriesResponse } from '../types';
import { formatMetricValue, getUnitDisplay } from './format-helpers';

export const REPORT_COLUMNS = [
  'Metric',
  'Samples',
  'Total',
  'Average',
  'Min',
  'Max',
  'Median',
  'P95',
  'P99',
  'Agents',
  'Last Seen',
] as const;

export interface ReportSection {
  category: string;
  totalRecords: number;
  rows: string[][];
}

/**
 * Format a stat value the same way the Performance page does ("—" for null).
 */
export function formatStatCell(value: number | null, unit: string): string {
  if (value === null) {
    return '—';
  }
  const unitDisplay = getUnitDisplay(unit);
  const formatted = formatMetricValue(value, unit).value;
  return unitDisplay ? `${formatted} ${unitDisplay}` : formatted;
}

/**
 * Map the categories response into one table section per category.
 */
export function buildReportSections(data: MetricsCategoriesResponse): ReportSection[] {
  return data.categories.map((category) => ({
    category: category.category,
    totalRecords: category.totalRecords,
    rows: category.types.map(({ type, agents, lastSeen, stats }) => [
      type,
      stats.count.toLocaleString(),
      formatStatCell(stats.sum, stats.unit),
      formatStatCell(stats.average, stats.unit),
      formatStatCell(stats.min, stats.unit),
      formatStatCell(stats.max, stats.unit),
      formatStatCell(stats.median, stats.unit),
      formatStatCell(stats.p95, stats.unit),
      formatStatCell(stats.p99, stats.unit),
      agents.length > 0 ? agents.join(', ') : '—',
      lastSeen ? format(new Date(lastSeen), 'yyyy-MM-dd') : '—',
    ]),
  }));
}

/**
 * File name for the exported report, e.g. performance-report_2026-09-14_2026-10-14.pdf
 */
export function getReportFileName(startDate: string, endDate: string): string {
  // Local dates, so the name matches the period shown in the picker and the report
  const day = (value: string) => format(new Date(value), 'yyyy-MM-dd');
  return `performance-report_${day(startDate)}_${day(endDate)}.pdf`;
}
