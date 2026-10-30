import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('server-only', () => ({}))

const { createXiansClient, assertCanEditAgent } = vi.hoisted(() => ({
  createXiansClient: vi.fn(),
  assertCanEditAgent: vi.fn(),
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withParticipantAdmin: (
    handler: (request: NextRequest, context: unknown) => Promise<Response>
  ) => (request: NextRequest) => handler(request, {
    session: { user: { id: 'user-1', email: 'admin@example.com' } },
    tenantContext: { tenant: { id: 'tenant-1' }, permissions: ['write'] },
  }),
}))

vi.mock('@/lib/xians/client', () => ({ createXiansClient }))
vi.mock('@/lib/auth/agent-access', () => ({ assertCanEditAgent }))
vi.mock('@/lib/api/secret-access', () => ({
  resolveSecretAccess: vi.fn().mockResolvedValue({}),
  canManageSecretOwner: vi.fn().mockReturnValue(true),
}))

import { POST } from './route'

const agents = { agents: [{ id: 'agent-1', name: 'compello' }], pagination: { hasNext: false } }
const activations = { activations: [{ name: 'prod-eu' }], pagination: { hasNext: false } }

function mockClient() {
  const post = vi.fn().mockResolvedValue({ id: 's1' })
  const get = vi.fn(async (path: string) => (path.includes('agentActivations') ? activations : agents))
  createXiansClient.mockReturnValue({ get, post })
  return { get, post }
}

const request = (body: unknown) =>
  new NextRequest('http://localhost/api/settings/secrets', {
    method: 'POST',
    body: JSON.stringify(body),
  })

describe('POST /api/settings/secrets agent scopes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertCanEditAgent.mockResolvedValue(null)
  })

  it('creates an agent-scoped secret with the agent object id', async () => {
    const { post } = mockClient()
    const res = await POST(request({ key: 'K', value: 'v', scope: 'agent', agentId: 'agent-1' }))
    expect(res.status).toBe(201)
    expect(assertCanEditAgent).toHaveBeenCalledWith(expect.anything(), 'tenant-1', 'compello')
    expect(post.mock.calls[0][1]).toMatchObject({ tenantId: 'tenant-1', agentId: 'agent-1' })
  })

  it('creates an activation-scoped secret sending only activationName', async () => {
    const { post } = mockClient()
    const res = await POST(
      request({ key: 'K', value: 'v', scope: 'activation', agentId: 'agent-1', activationName: 'prod-eu' })
    )
    expect(res.status).toBe(201)
    const payload = post.mock.calls[0][1]
    expect(payload).toMatchObject({ activationName: 'prod-eu' })
    expect(payload).not.toHaveProperty('agentId')
  })

  it('rejects an unknown agent with 400 and saves nothing', async () => {
    const { post } = mockClient()
    const res = await POST(request({ key: 'K', value: 'v', scope: 'agent', agentId: 'missing' }))
    expect(res.status).toBe(400)
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects an activation that does not belong to the agent', async () => {
    const { post } = mockClient()
    const res = await POST(
      request({ key: 'K', value: 'v', scope: 'activation', agentId: 'agent-1', activationName: 'other-agents-activation' })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('Activation not found')
    expect(post).not.toHaveBeenCalled()
  })

  it('forwards the access-denied response and saves nothing', async () => {
    const { post } = mockClient()
    assertCanEditAgent.mockResolvedValue(NextResponse.json({ error: 'forbidden' }, { status: 403 }))
    const res = await POST(request({ key: 'K', value: 'v', scope: 'agent', agentId: 'agent-1' }))
    expect(res.status).toBe(403)
    expect(post).not.toHaveBeenCalled()
  })
})
