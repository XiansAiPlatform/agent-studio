import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const { createXiansClient } = vi.hoisted(() => ({ createXiansClient: vi.fn() }))

vi.mock('@/lib/api/with-tenant', () => ({
  withParticipantAdmin: (
    handler: (request: NextRequest, context: unknown) => Promise<Response>
  ) => (request: NextRequest) => handler(request, {
    session: { user: { id: 'user-1', email: 'admin@example.com' } },
    tenantContext: { tenant: { id: 'tenant-1' }, permissions: ['write'] },
  }),
}))

vi.mock('@/lib/xians/client', () => ({ createXiansClient }))

import { GET } from './route'

describe('GET /api/connections OAuth MCP mapping', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('maps OAuth MCP secrets and filters unrelated records', async () => {
    createXiansClient.mockReturnValue({ get: vi.fn().mockResolvedValue([
      {
        id: 'secret-1',
        key: 'MCP_OAUTH_HUBSPOT',
        agentId: 'Agent',
        activationName: 'Production',
        additionalData: { purpose: 'mcp-oauth', name: 'HubSpot', endpoint: 'https://mcp.example.com' },
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: null,
        createdBy: 'admin@example.com',
      },
      {
        id: 'secret-2',
        key: 'OTHER',
        additionalData: { purpose: 'other' },
        createdAt: '2026-10-01T00:00:00Z',
        createdBy: 'admin@example.com',
      },
    ]) })

    const response = await GET(new NextRequest('http://localhost/api/connections'))
    const payload = await response.json()

    expect(payload.total).toBe(1)
    expect(payload.connections[0]).toMatchObject({
      id: 'secret-1',
      name: 'HubSpot',
      updatedAt: '2026-10-01T00:00:00Z',
      configuration: { connectionKey: 'MCP_OAUTH_HUBSPOT' },
    })
  })

  it('keeps the connections response available when Secret Vault fails', async () => {
    createXiansClient.mockReturnValue({ get: vi.fn().mockRejectedValue(new Error('unavailable')) })
    const response = await GET(new NextRequest('http://localhost/api/connections'))
    await expect(response.json()).resolves.toMatchObject({ connections: [], total: 0 })
  })
})
