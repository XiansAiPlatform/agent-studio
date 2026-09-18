import { describe, expect, it, vi } from 'vitest'
import {
  expiresAtIsInvalid,
  isoToDatetimeLocal,
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

describe('toDataRecord', () => {
  it('warns and coerces non-object content to {}', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const record = toDataRecord({ id: '1', key: 'k', content: 'oops' }, '1')
    expect(record?.content).toEqual({})
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
