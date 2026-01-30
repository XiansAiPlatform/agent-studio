import { DateRange, DateRangePreset } from '../types';

/**
 * Get the date range for "last month" (previous calendar month)
 */
export function getLastMonthRange(): DateRange {
  const now = new Date();
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  
  // Set to start of day (00:00:00)
  firstDayOfLastMonth.setHours(0, 0, 0, 0);
  
  // Set to end of day (23:59:59)
  lastDayOfLastMonth.setHours(23, 59, 59, 999);
  
  return {
    startDate: firstDayOfLastMonth.toISOString(),
    endDate: lastDayOfLastMonth.toISOString(),
  };
}

/**
 * Get the date range for "this month" (current calendar month)
 */
export function getThisMonthRange(): DateRange {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  firstDayOfMonth.setHours(0, 0, 0, 0);
  lastDayOfMonth.setHours(23, 59, 59, 999);
  
  return {
    startDate: firstDayOfMonth.toISOString(),
    endDate: lastDayOfMonth.toISOString(),
  };
}

/**
 * Get date range for a preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  let startDate = new Date();
  
  switch (preset) {
    case 'last7days':
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last30days':
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'last90days':
      startDate.setDate(now.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'thisMonth':
      return getThisMonthRange();
    case 'lastMonth':
      return getLastMonthRange();
    default:
      // Default to this month
      return getThisMonthRange();
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
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
