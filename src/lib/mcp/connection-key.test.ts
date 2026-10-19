import { describe, expect, it } from 'vitest'
import { oauthMcpConnectionKey } from './connection-key'

describe('OAuth MCP connection keys', () => {
  it('creates a readable stable key', () => {
    expect(oauthMcpConnectionKey('HubSpot Production')).toMatch(/^MCP_OAUTH_HUBSPOT_PRODUCTION_[A-F0-9]{8}$/)
  })

  it('creates a stable key when the name has no ASCII characters', () => {
    expect(oauthMcpConnectionKey('顧客')).toBe(oauthMcpConnectionKey('顧客'))
  })

  it('distinguishes names with the same readable slug', () => {
    expect(oauthMcpConnectionKey('My Connection')).not.toBe(oauthMcpConnectionKey('My-Connection!'))
  })
})
