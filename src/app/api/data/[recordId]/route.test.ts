import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { XiansApiError } from '@/lib/xians/client'
import { mockXiansClient } from '@/lib/xians/mock-xians-client'

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

import { DELETE, GET, PUT } from './route'

const params = { params: Promise.resolve({ recordId: 'rec-1' }) }

function jsonRequest(body: unknown, method = 'PUT') {
  return new NextRequest('http://localhost/api/data/rec-1', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('GET /api/data/[recordId]', () => {
  beforeEach(() => {
    createAdminDataClient.mockReset()
    assertCanEditAgent.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns 404 when the record is missing', async () => {
    createAdminDataClient.mockReturnValue(
      mockXiansClient({
        get: vi.fn().mockRejectedValue(new XiansApiError('missing', 404)),
      })
    )

    const { status, body } = await read(
      await GET(new NextRequest('http://localhost/api/data/rec-1'), params)
    )

    expect(status).toBe(404)
    expect(body.error).toBe('Record not found')
  })

  it('returns the agent-access denial when the caller cannot edit the owning agent', async () => {
    assertCanEditAgent.mockResolvedValue(
      Response.json({ error: 'You need write access to this agent to perform this action.' }, { status: 403 })
    )
    createAdminDataClient.mockReturnValue(
      mockXiansClient({
        get: vi.fn().mockResolvedValue({ id: 'rec-1', agentName: 'other-agent' }),
      })
    )

    const { status, body } = await read(
      await GET(new NextRequest('http://localhost/api/data/rec-1'), params)
    )

    expect(status).toBe(403)
    expect(body.error).toMatch(/write access/)
    expect(assertCanEditAgent).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-1',
      'other-agent'
    )
  })

  it('returns the record on the happy path', async () => {
    assertCanEditAgent.mockResolvedValue(null)
    const record = { id: 'rec-1', agentName: 'support', key: 'k' }
    createAdminDataClient.mockReturnValue(
      mockXiansClient({ get: vi.fn().mockResolvedValue(record) })
    )

    const { status, body } = await read(
      await GET(new NextRequest('http://localhost/api/data/rec-1'), params)
    )

    expect(status).toBe(200)
    expect(body).toEqual(record)
  })
})

describe('PUT /api/data/[recordId]', () => {
  beforeEach(() => {
    createAdminDataClient.mockReset()
    assertCanEditAgent.mockReset()
    assertCanEditAgent.mockResolvedValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('drops identity fields from the forwarded AdminAPI payload', async () => {
    const put = vi.fn().mockResolvedValue({ id: 'rec-1', key: 'k2' })
    createAdminDataClient.mockReturnValue(
      mockXiansClient({
        get: vi.fn().mockResolvedValue({ id: 'rec-1', agentName: 'support' }),
        put,
      })
    )

    const { status } = await read(
      await PUT(
        jsonRequest({
          agentName: 'hacked',
          activationName: 'other-act',
          dataType: 'renamed',
          tenantId: 'other-tenant',
          key: 'k2',
          content: { n: 1 },
        }),
        params
      )
    )

    expect(status).toBe(200)
    expect(put).toHaveBeenCalledWith(
      expect.stringContaining('/data/rec-1'),
      { key: 'k2', content: { n: 1 } }
    )
  })

  it('rejects an invalid expiresAt', async () => {
    createAdminDataClient.mockReturnValue(
      mockXiansClient({
        get: vi.fn().mockResolvedValue({ id: 'rec-1', agentName: 'support' }),
      })
    )

    const { status, body } = await read(
      await PUT(jsonRequest({ expiresAt: 'not-a-date' }), params)
    )

    expect(status).toBe(400)
    expect(body.error).toMatch(/ISO date-time/)
  })

  it('rejects an empty payload after identity fields are dropped', async () => {
    createAdminDataClient.mockReturnValue(
      mockXiansClient({
        get: vi.fn().mockResolvedValue({ id: 'rec-1', agentName: 'support' }),
      })
    )

    const { status, body } = await read(
      await PUT(jsonRequest({ agentName: 'support', dataType: 't' }), params)
    )

    expect(status).toBe(400)
    expect(body.error).toBe('No updatable fields were provided')
  })
})

describe('DELETE /api/data/[recordId]', () => {
  beforeEach(() => {
    createAdminDataClient.mockReset()
    assertCanEditAgent.mockReset()
    assertCanEditAgent.mockResolvedValue(null)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('deletes after authorizing from the record’s owning agent', async () => {
    const del = vi.fn().mockResolvedValue({ ok: true })
    createAdminDataClient.mockReturnValue(
      mockXiansClient({
        get: vi.fn().mockResolvedValue({ id: 'rec-1', agentName: 'support' }),
        delete: del,
      })
    )

    const { status, body } = await read(
      await DELETE(new NextRequest('http://localhost/api/data/rec-1', { method: 'DELETE' }), params)
    )

    expect(status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(del).toHaveBeenCalledWith(expect.stringContaining('/data/rec-1'))
    expect(assertCanEditAgent).toHaveBeenCalledWith(
      expect.anything(),
      'tenant-1',
      'support'
    )
  })
})
