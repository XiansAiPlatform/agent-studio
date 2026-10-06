import { describe, expect, it } from 'vitest'
import { oauthMcpConnectionKey } from './connection-key'

describe('OAuth MCP connection keys', () => {
  it('creates a readable stable key', () => {
    expect(oauthMcpConnectionKey('HubSpot Production')).toBe('MCP_OAUTH_HUBSPOT_PRODUCTION')
  })

  it('creates a stable key when the name has no ASCII characters', () => {
    expect(oauthMcpConnectionKey('顧客')).toMatch(/^MCP_OAUTH_[A-F0-9]{8}$/)
    expect(oauthMcpConnectionKey('顧客')).toBe(oauthMcpConnectionKey('顧客'))
  })
})
