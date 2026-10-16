import { afterEach, describe, expect, it } from 'vitest'
import { getOAuthCallbackUrl } from './oauth-url'

const originalUrl = process.env.NEXTAUTH_URL

afterEach(() => {
  if (originalUrl === undefined) delete process.env.NEXTAUTH_URL
  else process.env.NEXTAUTH_URL = originalUrl
})

describe('getOAuthCallbackUrl', () => {
  it('builds the callback URL from NEXTAUTH_URL', () => {
    process.env.NEXTAUTH_URL = 'https://studio.example.com/'
    expect(getOAuthCallbackUrl()).toBe('https://studio.example.com/api/connections/complete')
  })

  it('requires NEXTAUTH_URL', () => {
    delete process.env.NEXTAUTH_URL
    expect(() => getOAuthCallbackUrl()).toThrow('NEXTAUTH_URL')
  })
})
