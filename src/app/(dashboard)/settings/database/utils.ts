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

export function stringifyJson(value: unknown, fallback = '{}'): string {
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
}

export function parseJsonObject(text: string, fieldName: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${fieldName} must be valid JSON`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${fieldName} must be a JSON object`);
  }
  return parsed as Record<string, unknown>;
}

/** Convert ISO datetime to a value suitable for `<input type="datetime-local">`. */
export function isoToDatetimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Expiration must be a valid date and time');
  }
  return date.toISOString();
}

