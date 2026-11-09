import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWebhookBaseUrl } from './webhook-base-url'

describe('getWebhookBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers the public webhook URL over the server URL', () => {
    vi.stubEnv('XIANS_WEBHOOK_PUBLIC_URL', 'https://hooks.example.com')
    vi.stubEnv('XIANS_SERVER_URL', 'http://xians-server:5000')
    expect(getWebhookBaseUrl()).toBe('https://hooks.example.com')
  })

  it('falls back to the server URL when the public URL is unset or blank', () => {
    vi.stubEnv('XIANS_WEBHOOK_PUBLIC_URL', '   ')
    vi.stubEnv('XIANS_SERVER_URL', 'http://xians-server:5000')
    expect(getWebhookBaseUrl()).toBe('http://xians-server:5000')
  })

  it('is empty when neither URL is set', () => {
    vi.stubEnv('XIANS_WEBHOOK_PUBLIC_URL', '')
    vi.stubEnv('XIANS_SERVER_URL', '')
    expect(getWebhookBaseUrl()).toBe('')
  })

  it('trims whitespace and every trailing slash', () => {
    vi.stubEnv('XIANS_WEBHOOK_PUBLIC_URL', '  https://hooks.example.com//  ')
    expect(getWebhookBaseUrl()).toBe('https://hooks.example.com')
  })
})
