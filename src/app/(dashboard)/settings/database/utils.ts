/**
 * Format ISO date string for HTML date input (YYYY-MM-DD)
 */
export function formatDateForInput(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Convert date input string to ISO date string
 */
export function formatDateFromInput(dateString: string): string {
  return new Date(dateString + 'T00:00:00.000Z').toISOString();
}

/**
 * Format date string for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

/**
 * Format a content key for display (e.g., "camelCase" -> "Camel Case")
 */
export function formatContentKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
}

