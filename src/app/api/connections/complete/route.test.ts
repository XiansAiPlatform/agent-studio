import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sealOAuthState, type McpOAuthState } from '@/lib/mcp/oauth-state'

vi.mock('server-only', () => ({}))

const { contextRef, createXiansClient } = vi.hoisted(() => ({
  contextRef: {
    current: {
      session: { user: { id: 'user-1', email: 'admin@example.com' } },
      tenantContext: { tenant: { id: 'tenant-1' }, permissions: ['write'] },
    },
  },
  createXiansClient: vi.fn(),
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withParticipantAdmin: (
    handler: (request: NextRequest, context: typeof contextRef.current) => Promise<Response>
  ) => (request: NextRequest) => handler(request, contextRef.current),
}))

vi.mock('@/lib/xians/client', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/xians/client')>()
  return { ...original, createXiansClient }
})

import { XiansApiError } from '@/lib/xians/client'
import { GET } from './route'

function pending(overrides: Partial<McpOAuthState> = {}): McpOAuthState {
  return {
    state: 'expected-state',
    name: 'HubSpot',
    connectionKey: 'MCP_OAUTH_HUBSPOT',
    providerId: 'oauth-mcp',
    mcpUrl: 'https://mcp.example.com',
    authorizationUrl: 'https://auth.example.com/authorize',
    tokenUrl: 'https://auth.example.com/token',
    scopes: ['crm.read'],
    tokenEndpointAuthMethod: 'client_secret_post',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    codeVerifier: 'verifier',
    agentName: 'Agent',
    activationName: 'Production',
    userId: 'admin@example.com',
    returnUrl: '/settings/connections',
    createdAt: Date.now(),
    ...overrides,
  }
}

function request(state: McpOAuthState, query: string) {
  return new NextRequest(`http://localhost/api/connections/complete?${query}`, {
    headers: { cookie: `mcp-oauth-state=${sealOAuthState(state)}` },
  })
}

function expectCleared(response: Response) {
  expect(response.headers.get('set-cookie')).toContain('mcp-oauth-state=;')
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
}

describe('GET /api/connections/complete for OAuth MCP', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_URL = 'http://localhost'
    process.env.NEXTAUTH_SECRET = 'test-secret'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
    })))
    createXiansClient.mockReturnValue({
      get: vi.fn().mockRejectedValue(new XiansApiError('Not found', 404)),
      post: vi.fn().mockResolvedValue({ id: 'secret-1' }),
      put: vi.fn().mockResolvedValue({}),
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('clears state after a mismatch or missing code', async () => {
    const mismatch = await GET(request(pending(), 'state=wrong&code=code'))
    expect(new URL(mismatch.headers.get('location')!).searchParams.get('error')).toBe('state_mismatch')
    expectCleared(mismatch)

    const missingCode = await GET(request(pending(), 'state=expected-state'))
    expect(new URL(missingCode.headers.get('location')!).searchParams.get('error')).toBe('missing_oauth_params')
    expectCleared(missingCode)

    const expired = await GET(request(
      pending({ createdAt: Date.now() - 600_001 }),
      'state=expected-state&code=code'
    ))
    expect(new URL(expired.headers.get('location')!).searchParams.get('error')).toBe('state_mismatch')
    expectCleared(expired)
  })

  it('stores tokens and restricts the final redirect to the request origin', async () => {
    const response = await GET(request(
      pending({ returnUrl: '/\\evil.example' }),
      'state=expected-state&code=code'
    ))
    const location = new URL(response.headers.get('location')!)

    expect(location.origin).toBe('http://localhost')
    expect(location.pathname).toBe('/settings/connections')
    expect(location.searchParams.get('success')).toBe('connection_created')
    expectCleared(response)
  })

  it('clears state when the provider returns an error or token exchange fails', async () => {
    const providerError = await GET(request(
      pending(),
      'state=expected-state&error=access_denied'
    ))
    expectCleared(providerError)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))
    const tokenError = await GET(request(pending(), 'state=expected-state&code=code'))
    expect(new URL(tokenError.headers.get('location')!).searchParams.get('error')).toBe('token_exchange_failed')
    expectCleared(tokenError)
  })
})
