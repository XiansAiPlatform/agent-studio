import { afterEach, describe, expect, it, vi } from 'vitest'
import { discoverMcpOAuth } from './oauth-discovery'

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }))
vi.mock('node:dns/promises', () => ({ lookup }))

afterEach(() => vi.unstubAllGlobals())

describe('MCP OAuth discovery', () => {
  afterEach(() => lookup.mockReset())

  it('discovers OAuth endpoints and scopes from MCP metadata', async () => {
    lookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }])
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
    lookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))
    await expect(discoverMcpOAuth('https://mcp.example.com')).rejects.toThrow(
      'MCP server did not request OAuth authentication (200)'
    )
  })

  it('uses the standard protected-resource metadata URL without a challenge header', async () => {
    lookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }])
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
    lookup.mockResolvedValue([{ address: '203.0.113.10', family: 4 }])
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(Response.json(resource))
    if (authorization) fetchMock.mockResolvedValueOnce(Response.json(authorization))
    vi.stubGlobal('fetch', fetchMock)

    await expect(discoverMcpOAuth('https://mcp.example.com')).rejects.toThrow(message)
  })

  it('rejects a hostname that resolves to a private address', async () => {
    lookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }])
    vi.stubGlobal('fetch', vi.fn())

    await expect(discoverMcpOAuth('https://mcp.example.com')).rejects.toThrow(
      'URL host resolves to a private address'
    )
    expect(fetch).not.toHaveBeenCalled()
  })
})
