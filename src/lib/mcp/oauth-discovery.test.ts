import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverMcpOAuth } from './oauth-discovery'

afterEach(() => vi.unstubAllGlobals())

describe('MCP OAuth discovery', () => {
  it('discovers OAuth endpoints and scopes from MCP metadata', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"',
        },
      }))
      .mockResolvedValueOnce(Response.json({
        resource: 'https://mcp.example.com',
        authorization_servers: ['https://auth.example.com'],
        scopes_supported: ['crm.read'],
      }))
      .mockResolvedValueOnce(Response.json({
        issuer: 'https://auth.example.com',
        authorization_endpoint: 'https://auth.example.com/authorize',
        token_endpoint: 'https://auth.example.com/token',
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['client_secret_post'],
      }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(discoverMcpOAuth('https://mcp.example.com')).resolves.toEqual({
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['crm.read'],
      tokenEndpointAuthMethod: 'client_secret_post',
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
