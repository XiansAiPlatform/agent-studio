import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { XiansApiError } from '@/lib/xians/client'
import { mockXiansClient } from '@/lib/xians/mock-xians-client'
import { resetActivationOwnershipCacheForTests } from '@/lib/xians/admin-data'

const { createAdminDataClient, assertCanEditAgent } = vi.hoisted(() => ({
  createAdminDataClient: vi.fn(),
  assertCanEditAgent: vi.fn(),
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withParticipantAdmin: (handler: (request: NextRequest, ctx: unknown) => Promise<Response>) => {
    return (request: NextRequest) =>
      handler(request, {
        session: { user: { email: 'user@example.com' } },
        tenantId: 'tenant-1',
        tenantContext: { tenant: { id: 'tenant-1' } },
      })
  },
}))

vi.mock('@/lib/auth/agent-access', () => ({
  assertCanEditAgent,
}))

vi.mock('@/lib/xians/admin-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/xians/admin-data')>()
  return { ...actual, createAdminDataClient }
})

import { POST } from './route'

const validBody = {
  agentName: 'support',
  activationName: 'act-a',
  dataType: 'preference',
  key: 'studio-test-1',
  content: { note: 'ok' },
}

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/data', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('POST /api/data', () => {
  beforeEach(() => {
    resetActivationOwnershipCacheForTests()
    createAdminDataClient.mockReset()
    assertCanEditAgent.mockReset()
    assertCanEditAgent.mockResolvedValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('creates a record when the caller can edit the agent and owns the activation', async () => {
    const post = vi.fn().mockResolvedValue({ id: 'rec-1', key: validBody.key })
    const get = vi.fn().mockResolvedValue({
      data: [{ name: 'act-a', agentName: 'support' }],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    createAdminDataClient.mockReturnValue(mockXiansClient({ get, post }))

    const { status, body } = await read(await POST(jsonRequest(validBody)))

    expect(status).toBe(201)
    expect(body).toMatchObject({ id: 'rec-1' })
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/tenants/tenant-1/data'),
      expect.objectContaining({
        agentName: 'support',
        activationName: 'act-a',
        dataType: 'preference',
        key: 'studio-test-1',
        content: { note: 'ok' },
      })
    )
  })

  it('rejects an oversized Content-Length before parsing', async () => {
    const post = vi.fn()
    createAdminDataClient.mockReturnValue(mockXiansClient({ post }))

    const { status, body } = await read(
      await POST(
        jsonRequest(validBody, { 'content-length': String(600 * 1024) })
      )
    )

    expect(status).toBe(400)
    expect(body.error).toMatch(/at most/)
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    const { status, body } = await read(await POST(jsonRequest('{not json')))
    expect(status).toBe(400)
    expect(body.error).toBe('Invalid JSON body')
  })

  it('rejects missing agentName/dataType/key/activationName together', async () => {
    const { status, body } = await read(
      await POST(jsonRequest({ content: {} }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe(
      'agentName, dataType, key, and activationName are required'
    )
  })

  it('rejects when only activationName is omitted', async () => {
    const { status, body } = await read(
      await POST(
        jsonRequest({
          agentName: 'support',
          dataType: 'preference',
          key: 'k',
          content: { note: 'ok' },
        })
      )
    )
    expect(status).toBe(400)
    expect(body.error).toBe(
      'agentName, dataType, key, and activationName are required'
    )
  })

  it('rejects when content is omitted', async () => {
    const { status, body } = await read(
      await POST(
        jsonRequest({
          agentName: 'support',
          activationName: 'act-a',
          dataType: 'preference',
          key: 'k',
        })
      )
    )
    expect(status).toBe(400)
    expect(body.error).toBe('content is required')
  })

  it('rejects when content is not a JSON object', async () => {
    const { status, body } = await read(
      await POST(jsonRequest({ ...validBody, content: [] }))
    )
    expect(status).toBe(400)
    expect(body.error).toBe('content must be a JSON object')
  })

  it('forwards a 409 duplicate-key conflict from AdminAPI', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [{ name: 'act-a', agentName: 'support' }],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    const post = vi.fn().mockRejectedValue(new XiansApiError('duplicate key', 409))
    createAdminDataClient.mockReturnValue(mockXiansClient({ get, post }))

    const { status, body } = await read(await POST(jsonRequest(validBody)))

    expect(status).toBe(409)
    expect(body.error).toBe('duplicate key')
  })
})
