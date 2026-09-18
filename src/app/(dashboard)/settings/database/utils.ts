import { type DataRecord } from './types';

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
  if (Number.isNaN(date.getTime())) {
    console.warn('[isoToDatetimeLocal] Unparseable expiresAt, treating as empty:', iso);
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDataRecord(raw: unknown, fallbackId: string): DataRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const nested =
    item.data && typeof item.data === 'object' && !Array.isArray(item.data)
      ? (item.data as Record<string, unknown>)
      : item;
  const id =
    typeof nested.id === 'string' && nested.id.trim() ? nested.id.trim() : fallbackId;
  const key = typeof nested.key === 'string' ? nested.key : '';
  if (!id || !key) return null;
  const content =
    nested.content && typeof nested.content === 'object' && !Array.isArray(nested.content)
      ? (nested.content as Record<string, unknown>)
      : {};
  const metadata =
    nested.metadata && typeof nested.metadata === 'object' && !Array.isArray(nested.metadata)
      ? (nested.metadata as Record<string, unknown>)
      : nested.metadata === null
        ? null
        : undefined;
  return {
    id,
    key,
    participantId: typeof nested.participantId === 'string' ? nested.participantId : '',
    content,
    metadata,
    createdAt: typeof nested.createdAt === 'string' ? nested.createdAt : '',
    updatedAt: typeof nested.updatedAt === 'string' ? nested.updatedAt : null,
    expiresAt: typeof nested.expiresAt === 'string' ? nested.expiresAt : null,
    type: typeof nested.type === 'string' ? nested.type : null,
    agentName: typeof nested.agentName === 'string' ? nested.agentName : null,
    activationName: typeof nested.activationName === 'string' ? nested.activationName : null,
  };
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

