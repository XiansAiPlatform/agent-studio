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

  it('rejects an MCP endpoint that does not request OAuth', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    await expect(discoverMcpOAuth('https://mcp.example.com')).rejects.toThrow(
      'MCP server did not request OAuth authentication (200)'
    )
  })

  it('uses the standard protected-resource metadata URL without a challenge header', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json({
        resource: 'https://mcp.example.com',
        authorization_servers: ['https://auth.example.com'],
      }))
      .mockResolvedValueOnce(Response.json({
        issuer: 'https://auth.example.com',
        authorization_endpoint: 'https://auth.example.com/authorize',
        token_endpoint: 'https://auth.example.com/token',
      }))
    vi.stubGlobal('fetch', fetchMock)

    await discoverMcpOAuth('https://mcp.example.com')
    expect(fetchMock.mock.calls[1]?.[0].toString()).toBe(
      'https://mcp.example.com/.well-known/oauth-protected-resource'
    )
  })

  it.each([
    {
      name: 'mismatched resource',
      resource: { resource: 'https://other.example.com', authorization_servers: ['https://auth.example.com'] },
      authorization: null,
      message: 'does not match the MCP URL',
    },
    {
      name: 'missing authorization server',
      resource: { resource: 'https://mcp.example.com' },
      authorization: null,
      message: 'did not advertise an OAuth authorization server',
    },
    {
      name: 'missing endpoints',
      resource: { resource: 'https://mcp.example.com', authorization_servers: ['https://auth.example.com'] },
      authorization: { issuer: 'https://auth.example.com' },
      message: 'missing authorization or token endpoint',
    },
    {
      name: 'unsupported PKCE',
      resource: { resource: 'https://mcp.example.com', authorization_servers: ['https://auth.example.com'] },
      authorization: {
        issuer: 'https://auth.example.com',
        authorization_endpoint: 'https://auth.example.com/authorize',
        token_endpoint: 'https://auth.example.com/token',
        code_challenge_methods_supported: ['plain'],
      },
      message: 'does not support PKCE S256',
    },
  ])('rejects $name metadata', async ({ resource, authorization, message }) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json(resource))
    if (authorization) fetchMock.mockResolvedValueOnce(Response.json(authorization))
    vi.stubGlobal('fetch', fetchMock)

    await expect(discoverMcpOAuth('https://mcp.example.com')).rejects.toThrow(message)
  })
})
