import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { XiansApiError } from '@/lib/xians/client'

vi.mock('server-only', () => ({}))

const DELIVERY_ID = '019a3f2c-8e1b-7c4d-9a2f-3b6e8d1c0a55'

const { contextRef, createXiansClient, requireCapability } = vi.hoisted(() => ({
  contextRef: {
    current: {
      session: { user: { email: 'dev@example.com' } },
      tenantId: 'tenant-1',
      tenantContext: { tenant: { id: 'tenant-1' } },
      params: { integrationId: 'integration-1', deliveryId: '' } as { integrationId: string; deliveryId: string },
    },
  },
  createXiansClient: vi.fn(),
  requireCapability: vi.fn(),
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withParticipantAdmin: (
    handler: (request: NextRequest, context: typeof contextRef.current) => Promise<Response>
  ) => (request: NextRequest) => handler(request, contextRef.current),
}))

vi.mock('@/lib/api/auth', () => ({ requireCapability }))

vi.mock('@/lib/xians/client', async importOriginal => {
  const original = await importOriginal<typeof import('@/lib/xians/client')>()
  return { ...original, createXiansClient }
})

import { POST } from './route'

const BACKEND = `/api/v1/admin/tenants/tenant-1/webhooks/integration-1/incomings/${DELIVERY_ID}/redeliver`

const request = () =>
  new NextRequest(`http://localhost/api/integrations/integration-1/deliveries/${DELIVERY_ID}/redeliver`, {
    method: 'POST',
  })

describe('POST /api/integrations/[integrationId]/deliveries/[deliveryId]/redeliver', () => {
  const post = vi.fn()

  beforeEach(() => {
    post.mockReset()
    requireCapability.mockReset()
    requireCapability.mockResolvedValue(null)
    createXiansClient.mockReturnValue({ post })
    contextRef.current.params = { integrationId: 'integration-1', deliveryId: DELIVERY_ID }
  })

  it('redelivers through the backend and returns its result', async () => {
    const result = { deliveryId: 'new-id', redeliveryOf: DELIVERY_ID, statusCode: 200, durationMs: 840 }
    post.mockResolvedValue(result)

    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(result)
    expect(post).toHaveBeenCalledWith(BACKEND, undefined, { timeoutMs: 295_000 })
    expect(requireCapability).toHaveBeenCalledWith(
      contextRef.current.session,
      'tenant-1',
      'webhooks:redeliver',
      expect.any(String)
    )
  })

  it('refuses users without webhooks:redeliver and never calls the backend', async () => {
    requireCapability.mockResolvedValue(NextResponse.json({ error: 'Redeliver is available to Developers' }, { status: 403 }))

    const response = await POST(request())

    expect(response.status).toBe(403)
    expect(post).not.toHaveBeenCalled()
  })

  it('passes a backend 409 for a truncated call through', async () => {
    post.mockRejectedValue(new XiansApiError('This call was stored truncated, so it cannot be redelivered as it was sent', 409))

    const response = await POST(request())

    expect(response.status).toBe(409)
    expect(JSON.stringify(await response.json())).toContain('cannot be redelivered')
  })

  it('passes a backend 408 through, so the page can tell the call may still have been sent', async () => {
    post.mockRejectedValue(new XiansApiError('The webhook did not answer in time', 408))

    const response = await POST(request())

    expect(response.status).toBe(408)
  })

  it('rejects an unsafe integration id', async () => {
    contextRef.current.params = { integrationId: '../../secrets', deliveryId: DELIVERY_ID }

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(post).not.toHaveBeenCalled()
  })

  it('lets one user run only three redeliveries at once, and frees a slot when one ends', async () => {
    const pending: Array<(value: unknown) => void> = []
    post.mockImplementation(() => new Promise(resolve => pending.push(resolve)))

    const running = [POST(request()), POST(request()), POST(request())]
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(3))

    const refused = await POST(request())
    expect(refused.status).toBe(429)
    expect(post).toHaveBeenCalledTimes(3)

    pending[0]({ deliveryId: 'new-id', statusCode: 200, durationMs: 1 })
    expect((await running[0]).status).toBe(200)

    const next = POST(request())
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(4))

    pending.slice(1).forEach(resolve => resolve({ deliveryId: 'new-id', statusCode: 200, durationMs: 1 }))
    await Promise.all([...running.slice(1), next])
  })

  it('counts redeliveries per user', async () => {
    const pending: Array<(value: unknown) => void> = []
    post.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    const original = contextRef.current.session

    const mine = [POST(request()), POST(request()), POST(request())]
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(3))

    contextRef.current.session = { user: { email: 'other@example.com' } }
    const theirs = POST(request())
    await vi.waitFor(() => expect(post).toHaveBeenCalledTimes(4))
    contextRef.current.session = original

    pending.forEach(resolve => resolve({ deliveryId: 'new-id', statusCode: 200, durationMs: 1 }))
    expect((await theirs).status).toBe(200)
    await Promise.all(mine)
  })

  it('rejects an unsafe delivery id', async () => {
    contextRef.current.params = { integrationId: 'integration-1', deliveryId: '../../secrets' }

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(post).not.toHaveBeenCalled()
  })
})
