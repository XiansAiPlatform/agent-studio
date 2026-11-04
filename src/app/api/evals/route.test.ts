import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const { createXiansClient, assertCanEditAgent } = vi.hoisted(() => ({
  createXiansClient: vi.fn(),
  assertCanEditAgent: vi.fn(),
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withTenantAdmin: (handler: (request: NextRequest, ctx: unknown) => Promise<Response>) => {
    return (request: NextRequest, routeContext?: { params?: Promise<Record<string, string>> }) =>
      Promise.resolve(routeContext?.params ?? {}).then((params) =>
        handler(request, {
          session: { user: { email: 'admin@example.com' }, accessToken: 'tok' },
          tenantId: 'tenant-1',
          tenantContext: { tenant: { id: 'tenant-1' } },
          params,
        })
      )
  },
}))

vi.mock('@/lib/xians/client', () => ({ createXiansClient }))
vi.mock('@/lib/auth/agent-access', () => ({ assertCanEditAgent }))

import { GET, POST } from './route'
import { DELETE, PUT } from './[checkId]/route'
import { GET as GET_RUNS } from './[checkId]/runs/route'
import { GET as GET_TARGETS } from './webhook-targets/route'

const ACTIVATIONS = [
  { id: 'act-prod', name: 'prod', agentName: 'Support Agent', isActive: true },
  { id: 'act-other', name: 'prod', agentName: 'Other Agent', isActive: true },
]

const QUERY = 'agentName=Support%20Agent&activationName=prod'

function request(path: string, init?: { method?: string; body?: unknown }) {
  return new NextRequest(`http://localhost${path}`, {
    method: init?.method ?? 'GET',
    headers: init?.body ? { 'content-type': 'application/json' } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
}

function mockClient(overrides: Partial<Record<'get' | 'post' | 'put' | 'delete', ReturnType<typeof vi.fn>>> = {}) {
  const client = {
    get: vi.fn(async (path: string) => (path.includes('/agentActivations?') ? ACTIVATIONS : [])),
    post: vi.fn().mockResolvedValue({ id: 'chk-1' }),
    put: vi.fn().mockResolvedValue({ id: 'chk-1' }),
    delete: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
  createXiansClient.mockReturnValue(client)
  return client
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('/api/evals', () => {
  beforeEach(() => {
    createXiansClient.mockReset()
    assertCanEditAgent.mockReset()
    assertCanEditAgent.mockResolvedValue(null)
  })

  it('requires agentName and activationName', async () => {
    mockClient()
    const { status } = await read(await GET(request('/api/evals?agentName=Support%20Agent')))
    expect(status).toBe(400)
  })

  it('denies when the user may not edit the agent, before calling the backend', async () => {
    const client = mockClient()
    assertCanEditAgent.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }))

    const { status } = await read(await GET(request(`/api/evals?${QUERY}`)))

    expect(status).toBe(403)
    expect(assertCanEditAgent).toHaveBeenCalledWith(expect.anything(), 'tenant-1', 'Support Agent')
    expect(client.get).not.toHaveBeenCalled()
  })

  it('resolves the activation id server-side by agent + activation name', async () => {
    const client = mockClient()

    const { status, body } = await read(await GET(request(`/api/evals?${QUERY}`)))

    expect(status).toBe(200)
    expect(body.activation).toEqual({ name: 'prod', agentName: 'Support Agent', isActive: true })
    expect(client.get).toHaveBeenLastCalledWith(
      '/api/v1/admin/tenants/tenant-1/agentActivations/act-prod/health-checks'
    )
  })

  it('returns 404 for an activation the agent does not have', async () => {
    const client = mockClient()

    const { status } = await read(
      await GET(request('/api/evals?agentName=Support%20Agent&activationName=missing'))
    )

    expect(status).toBe(404)
    expect(client.get).toHaveBeenCalledTimes(1) // only the activation lookup
  })

  it('forwards the create body and returns 201', async () => {
    const client = mockClient()
    const body = { name: 'greets', type: 'chat', intervalMinutes: 15, chat: { message: 'Hi', assertions: [] } }

    const { status } = await read(await POST(request(`/api/evals?${QUERY}`, { method: 'POST', body })))

    expect(status).toBe(201)
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-1/agentActivations/act-prod/health-checks',
      body
    )
  })

  it('lists webhook targets for the resolved activation', async () => {
    const targets = [{ workflowType: 'Git Events Workflow', status: 'running', methods: [{ name: 'health-ping' }] }]
    const client = mockClient({
      get: vi.fn(async (path: string) => (path.includes('/agentActivations?') ? ACTIVATIONS : targets)),
    })

    const { status, body } = await read(await GET_TARGETS(request(`/api/evals/webhook-targets?${QUERY}`)))

    expect(status).toBe(200)
    expect(body).toEqual(targets)
    expect(client.get).toHaveBeenLastCalledWith(
      '/api/v1/admin/tenants/tenant-1/agentActivations/act-prod/health-checks/webhook-targets'
    )
  })

  it('passes backend validation errors through with their status', async () => {
    mockClient({
      post: vi.fn().mockRejectedValue(Object.assign(new Error('intervalMinutes must be between 5 and 1440'), { status: 400 })),
    })

    const { status, body } = await read(
      await POST(request(`/api/evals?${QUERY}`, { method: 'POST', body: { name: 'x' } }))
    )

    expect(status).toBe(400)
    expect(body.error).toMatch(/intervalMinutes/)
  })
})

describe('/api/evals/[checkId]', () => {
  beforeEach(() => {
    createXiansClient.mockReset()
    assertCanEditAgent.mockReset()
    assertCanEditAgent.mockResolvedValue(null)
  })

  const ctx = (checkId: string) => ({ params: Promise.resolve({ checkId }) })

  it('rejects ids that could change the upstream path', async () => {
    const client = mockClient()

    const { status } = await read(await DELETE(request(`/api/evals/x?${QUERY}`, { method: 'DELETE' }), ctx('..')))

    expect(status).toBe(400)
    expect(client.delete).not.toHaveBeenCalled()
  })

  it('updates and deletes under the resolved activation', async () => {
    const client = mockClient()

    await PUT(request(`/api/evals/chk-1?${QUERY}`, { method: 'PUT', body: { name: 'x' } }), ctx('chk-1'))
    await DELETE(request(`/api/evals/chk-1?${QUERY}`, { method: 'DELETE' }), ctx('chk-1'))

    const base = '/api/v1/admin/tenants/tenant-1/agentActivations/act-prod/health-checks/chk-1'
    expect(client.put).toHaveBeenCalledWith(base, { name: 'x' })
    expect(client.delete).toHaveBeenCalledWith(base)
  })

  it('forwards only the supported run-history filters', async () => {
    const client = mockClient()

    await GET_RUNS(
      request(`/api/evals/chk-1/runs?${QUERY}&status=fail&page=2&pageSize=10&evil=1`),
      ctx('chk-1')
    )

    expect(client.get).toHaveBeenLastCalledWith(
      '/api/v1/admin/tenants/tenant-1/agentActivations/act-prod/health-checks/chk-1/runs?status=fail&page=2&pageSize=10'
    )
  })
})
