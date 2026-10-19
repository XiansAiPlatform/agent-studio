import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  isSameDay,
  startOfDay,
  subDays,
  subMonths,
} from 'date-fns';
import { DateRange, DateRangePreset } from '../types';

/**
 * Longest range the metrics API accepts (AdminMetricsService.MaxDateRangeDays)
 */
export const MAX_RANGE_DAYS = 365;

/**
 * Get the first day of a preset range. Every preset ends today, inclusive.
 */
function getPresetStart(preset: DateRangePreset, today: Date): Date {
  switch (preset) {
    case 'last7days':
      return subDays(today, 6);
    case 'last3months':
      return addDays(subMonths(today, 3), 1);
    case 'last6months':
      return addDays(subMonths(today, 6), 1);
    case 'last1year':
      // 365 days including today, so leap years never exceed MAX_RANGE_DAYS
      return subDays(today, MAX_RANGE_DAYS - 1);
    case 'last1month':
    default:
      return addDays(subMonths(today, 1), 1);
  }
}

/**
 * Build a range covering whole local days from start to end
 */
export function toDateRange(start: Date, end: Date): DateRange {
  return {
    startDate: startOfDay(start).toISOString(),
    endDate: endOfDay(end).toISOString(),
  };
}

/**
 * Get date range for a preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const today = new Date();
  return toDateRange(getPresetStart(preset, today), today);
}

/**
 * Find the preset matching a range, or 'custom' if none does
 */
export function detectPreset(startDate: string, endDate: string): DateRangePreset {
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (!isSameDay(end, today)) return 'custom';

  const presets: DateRangePreset[] = ['last7days', 'last1month', 'last3months', 'last6months', 'last1year'];
  return presets.find((preset) => isSameDay(start, getPresetStart(preset, today))) ?? 'custom';
}

/**
 * Check whether a range is longer than the API allows
 */
export function isRangeTooLong(start: Date, end: Date): boolean {
  return differenceInCalendarDays(end, start) + 1 > MAX_RANGE_DAYS;
}

/**
 * Format a date range for display
 */
export function formatDateRangeDisplay(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  };

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}
