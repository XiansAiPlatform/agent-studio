import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { XiansApiError } from '@/lib/xians/client'
import { unsealOAuthState } from '@/lib/mcp/oauth-state'

vi.mock('server-only', () => ({}))

const { contextRef, createXiansClient, discoverMcpOAuth } = vi.hoisted(() => ({
  contextRef: {
    current: {
      session: { user: { id: 'user-1', email: 'admin@example.com' } },
      tenantContext: { tenant: { id: 'tenant-1' }, permissions: ['write'] },
    },
  },
  createXiansClient: vi.fn(),
  discoverMcpOAuth: vi.fn(),
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

vi.mock('@/lib/mcp/oauth-discovery', () => ({ discoverMcpOAuth }))

import { POST } from './route'

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/connections/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'HubSpot Production',
      providerId: 'oauth-mcp',
      clientId: 'client-id',
      clientSecret: 'client-secret',
      mcpUrl: 'https://mcp.example.com',
      agentName: 'Agent',
      activationName: 'Production',
      returnUrl: '/settings/connections?agentName=Agent',
      ...overrides,
    }),
  })
}

function sealedState(response: Response): string {
  const cookie = response.headers.get('set-cookie')
  const value = cookie?.match(/mcp-oauth-state=([^;]+)/)?.[1]
  if (!value) throw new Error('OAuth state cookie was not set')
  return decodeURIComponent(value)
}

describe('POST /api/connections/initiate for OAuth MCP', () => {
  beforeEach(() => {
    process.env.NEXTAUTH_URL = 'http://localhost'
    process.env.NEXTAUTH_SECRET = 'test-secret'
    contextRef.current.tenantContext.permissions = ['write']
    createXiansClient.mockReturnValue({
      get: vi.fn().mockRejectedValue(new XiansApiError('Not found', 404)),
    })
    discoverMcpOAuth.mockResolvedValue({
      authorizationUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['crm.read'],
      tokenEndpointAuthMethod: 'client_secret_post',
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('creates a PKCE authorization request and sealed state cookie', async () => {
    const response = await POST(request())
    const payload = await response.json()
    const authUrl = new URL(payload.authUrl)
    const pending = unsealOAuthState(sealedState(response))

    expect(response.status).toBe(200)
    expect(authUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authUrl.searchParams.get('resource')).toBe('https://mcp.example.com')
    expect(pending.connectionKey).toBe('MCP_OAUTH_HUBSPOT_PRODUCTION')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
  })

  it('uses the default return path for an external or backslash URL', async () => {
    const response = await POST(request({ returnUrl: '/\\evil.example' }))
    expect(unsealOAuthState(sealedState(response)).returnUrl).toBe('/settings/connections')
  })

  it('rejects a duplicate connection key', async () => {
    createXiansClient.mockReturnValue({ get: vi.fn().mockResolvedValue({ id: 'secret-1' }) })
    const response = await POST(request())
    expect(response.status).toBe(409)
  })

  it('requires an activation and write permission', async () => {
    expect((await POST(request({ activationName: undefined }))).status).toBe(400)
    contextRef.current.tenantContext.permissions = []
    expect((await POST(request())).status).toBe(403)
  })

  it('reports OAuth discovery failures', async () => {
    discoverMcpOAuth.mockRejectedValue(new Error('metadata unavailable'))
    const response = await POST(request())
    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: 'OAuth discovery failed: metadata unavailable',
    })
  })
})
