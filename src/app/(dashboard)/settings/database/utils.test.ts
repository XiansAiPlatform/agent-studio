import { describe, expect, it, vi } from 'vitest'
import {
  datetimeLocalToIso,
  expiresAtIsInvalid,
  formatContentKey,
  formatDate,
  formatDateForInput,
  formatDateFromInput,
  isoToDatetimeLocal,
  parseJsonObject,
  stringifyJson,
  toDataRecord,
} from './utils'

describe('isoToDatetimeLocal', () => {
  it('returns empty for missing values', () => {
    expect(isoToDatetimeLocal(null)).toBe('')
    expect(expiresAtIsInvalid(null)).toBe(false)
  })

  it('flags unparseable expiresAt as invalid', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(isoToDatetimeLocal('not-a-date')).toBe('')
    expect(expiresAtIsInvalid('not-a-date')).toBe(true)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('datetimeLocalToIso', () => {
  it('returns null for an empty value', () => {
    expect(datetimeLocalToIso('')).toBeNull()
    expect(datetimeLocalToIso('   ')).toBeNull()
  })

  it('converts a datetime-local value to ISO', () => {
    const iso = datetimeLocalToIso('2024-01-15T10:30')
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('throws on an unparseable datetime-local value', () => {
    expect(() => datetimeLocalToIso('not-a-date')).toThrow(/Expiration must be a valid date/)
  })
})

describe('parseJsonObject', () => {
  it('parses a JSON object', () => {
    expect(parseJsonObject('{"a":1}', 'content')).toEqual({ a: 1 })
  })

  it('throws a field-scoped error on invalid JSON', () => {
    expect(() => parseJsonObject('{not json', 'content')).toThrow(/content must be valid JSON/)
  })

  it('throws when the parsed value is not a plain object', () => {
    expect(() => parseJsonObject('[1,2,3]', 'content')).toThrow(/content must be a JSON object/)
    expect(() => parseJsonObject('null', 'content')).toThrow(/content must be a JSON object/)
  })
})

describe('toDataRecord', () => {
  it('warns and coerces non-object content to {}', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const record = toDataRecord({ id: '1', key: 'k', content: 'oops' }, '1')
    expect(record?.content).toEqual({})
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('warns and coerces non-object metadata to undefined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const record = toDataRecord({ id: '1', key: 'k', content: {}, metadata: 'oops' }, '1')
    expect(record?.metadata).toBeUndefined()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('stringifyJson', () => {
  it('uses a distinct placeholder when serialization fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const circular: { self?: unknown } = {}
    circular.self = circular
    const text = stringifyJson(circular, '{}', 'content')
    expect(text).toContain('could not be serialized')
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('date display helpers', () => {
  it('formatDateForInput keeps the YYYY-MM-DD prefix', () => {
    expect(formatDateForInput('2024-03-02T15:00:00.000Z')).toBe('2024-03-02')
  })

  it('formatDateFromInput produces an ISO timestamp', () => {
    expect(formatDateFromInput('2024-03-02')).toBe('2024-03-02T00:00:00.000Z')
  })

  it('formatDate returns a locale string', () => {
    expect(formatDate('2024-03-02T00:00:00.000Z')).toEqual(expect.any(String))
  })

  it('formatContentKey splits camelCase', () => {
    expect(formatContentKey('camelCase')).toBe('Camel Case')
  })
})
