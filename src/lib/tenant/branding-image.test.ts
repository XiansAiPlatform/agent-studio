import { describe, expect, it } from 'vitest'
import { parseBrandingImage } from './branding-image'
import { DEFAULT_FAVICON, tenantFaviconProxyUrl } from './favicon'

describe('parseBrandingImage', () => {
  it('accepts a URL image', () => {
    const result = parseBrandingImage(
      { url: '  https://example.com/icon.png ', width: 32, height: 32 },
      'Favicon'
    )
    expect(result).toEqual({
      image: { url: 'https://example.com/icon.png', width: 32, height: 32 },
    })
  })

  it('strips a data-URL prefix from base64 uploads', () => {
    const result = parseBrandingImage(
      { imgBase64: 'data:image/png;base64,AAAA', width: 16, height: 16 },
      'Favicon'
    )
    expect(result.image?.imgBase64).toBe('AAAA')
    expect(result.image?.url).toBeUndefined()
  })

  it('requires exactly one of url or imgBase64', () => {
    expect(parseBrandingImage({ width: 1, height: 1 }, 'Favicon').error).toMatch(/exactly one/)
    expect(
      parseBrandingImage(
        { url: 'https://example.com/a.png', imgBase64: 'AAAA', width: 1, height: 1 },
        'Favicon'
      ).error
    ).toMatch(/exactly one/)
  })

  it('rejects invalid dimensions', () => {
    expect(
      parseBrandingImage({ url: 'https://example.com/a.png', width: 0, height: 1 }, 'Favicon').error
    ).toMatch(/width and height/)
    expect(
      parseBrandingImage({ url: 'https://example.com/a.png', width: 1.5, height: 1 }, 'Favicon')
        .error
    ).toMatch(/width and height/)
  })

  it('names the image in the URL length error', () => {
    const url = `https://example.com/${'a'.repeat(500)}`
    expect(parseBrandingImage({ url, width: 1, height: 1 }, 'Favicon').error).toBe(
      'Favicon URL cannot exceed 500 characters'
    )
  })

  it('handles a non-object body', () => {
    expect(parseBrandingImage(null, 'Logo').error).toMatch(/exactly one/)
  })
})

describe('tenantFaviconProxyUrl', () => {
  it('builds the proxy path with an encoded tenant id', () => {
    expect(tenantFaviconProxyUrl('acme corp')).toBe('/api/tenants/acme%20corp/favicon')
  })

  it('adds the logo fallback and cache-busting version', () => {
    expect(tenantFaviconProxyUrl('acme', { fallbackToLogo: true, version: 3 })).toBe(
      '/api/tenants/acme/favicon?fallback=logo&v=3'
    )
  })

  it('omits a zero version', () => {
    expect(tenantFaviconProxyUrl('acme', { version: 0 })).toBe('/api/tenants/acme/favicon')
  })

  it('uses the Agent Studio default asset', () => {
    expect(DEFAULT_FAVICON).toBe('/logo.svg')
  })
})
