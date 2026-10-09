import { describe, expect, it } from 'vitest'
import { validateExternalUrl } from './url'

describe('validateExternalUrl', () => {
  it('rejects compressed IPv4-mapped private IPv6 addresses', () => {
    expect(validateExternalUrl('https://[::ffff:a9fe:a9fe]/').ok).toBe(false)
  })
})
