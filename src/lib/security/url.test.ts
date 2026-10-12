import { describe, expect, it } from 'vitest'
import { validateExternalUrl } from './url'

describe('validateExternalUrl', () => {
  it('rejects compressed IPv4-mapped private IPv6 addresses', () => {
    expect(validateExternalUrl('https://[::ffff:a9fe:a9fe]/').ok).toBe(false)
  })

  it('rejects compressed IPv4-compatible private IPv6 addresses', () => {
    expect(validateExternalUrl('https://[::a9fe:a9fe]/').ok).toBe(false)
  })

  it.each(['https://[fc00::1]/', 'https://[fd00::1]/', 'https://[fe80::1]/'])(
    'rejects private IPv6 address %s',
    (url) => expect(validateExternalUrl(url).ok).toBe(false)
  )
})
