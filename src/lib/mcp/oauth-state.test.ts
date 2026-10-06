import { afterEach, describe, expect, it } from 'vitest'
import { sealOAuthState, unsealOAuthState, type McpOAuthState } from './oauth-state'
import { getOAuthCallbackUrl } from './oauth-url'

const originalSecret = process.env.NEXTAUTH_SECRET
const originalUrl = process.env.NEXTAUTH_URL

afterEach(() => {
  process.env.NEXTAUTH_SECRET = originalSecret
  process.env.NEXTAUTH_URL = originalUrl
})

describe('MCP OAuth state', () => {
  it('builds the canonical callback URL', () => {
    process.env.NEXTAUTH_URL = 'http://localhost:3010/'
    expect(getOAuthCallbackUrl()).toBe('http://localhost:3010/api/connections/complete')
  })

  it('round trips encrypted state', () => {
    process.env.NEXTAUTH_SECRET = 'test-secret'
    const state: McpOAuthState = {
      state: 'state',
      name: 'CRM MCP',
      connectionKey: 'MCP_OAUTH_CRM_MCP',
      providerId: 'oauth-mcp',
      mcpUrl: 'https://mcp.example.com',
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['crm.read'],
      tokenEndpointAuthMethod: 'client_secret_post',
      clientId: 'client',
      clientSecret: 'secret',
      codeVerifier: 'verifier',
      agentName: 'Agent',
      activationName: 'dev',
      userId: 'user@example.com',
      returnUrl: '/settings/connections',
      createdAt: 1,
    }

    expect(unsealOAuthState(sealOAuthState(state))).toEqual(state)
  })

  it('rejects tampered state', () => {
    process.env.NEXTAUTH_SECRET = 'test-secret'
    const sealed = sealOAuthState({
      state: 'state',
      name: 'CRM MCP',
      connectionKey: 'MCP_OAUTH_CRM_MCP',
      providerId: 'oauth-mcp',
      mcpUrl: 'https://mcp.example.com',
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['crm.read'],
      tokenEndpointAuthMethod: 'client_secret_post',
      clientId: 'client',
      clientSecret: 'secret',
      codeVerifier: 'verifier',
      agentName: 'Agent',
      activationName: 'dev',
      userId: 'user@example.com',
      returnUrl: '/settings/connections',
      createdAt: 1,
    })

    const index = Math.floor(sealed.length / 2)
    const replacement = sealed[index] === 'A' ? 'B' : 'A'
    const tampered = `${sealed.slice(0, index)}${replacement}${sealed.slice(index + 1)}`
    expect(() => unsealOAuthState(tampered)).toThrow()
  })
})
