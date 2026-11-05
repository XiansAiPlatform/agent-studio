import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { XiansApiError } from '@/lib/xians/client'

vi.mock('server-only', () => ({}))

const { contextRef, createXiansClient } = vi.hoisted(() => ({
  contextRef: {
    current: {
      tenantContext: { tenant: { id: 'tenant-1' } },
      params: { integrationId: 'integration-1' } as { integrationId: string },
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

import { DELETE, GET } from './route'

const BACKEND = '/api/v1/admin/tenants/tenant-1/webhooks/integration-1/incomings'
const DELIVERY_ID = '019a3f2c-8e1b-7c4d-9a2f-3b6e8d1c0a55'

const request = (query = '', method = 'GET') =>
  new NextRequest(`http://localhost/api/integrations/integration-1/deliveries${query}`, { method })

describe('/api/integrations/[integrationId]/deliveries', () => {
  const get = vi.fn()
  const del = vi.fn()

  beforeEach(() => {
    get.mockReset()
    del.mockReset()
    createXiansClient.mockReturnValue({ get, delete: del })
    contextRef.current.params = { integrationId: 'integration-1' }
  })

  describe('GET', () => {
    it('lists deliveries for the session tenant and returns the page as is', async () => {
      const page = { items: [{ id: DELIVERY_ID, requestId: 'r-1', receivedAt: '2026-11-03T04:23:36Z', bodyTruncated: false, headersTruncated: false }], nextCursor: null }
      get.mockResolvedValue(page)

      const response = await GET(request())

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(page)
      expect(get).toHaveBeenCalledWith(BACKEND)
    })

    it('forwards the page size and cursor', async () => {
      get.mockResolvedValue({ items: [], nextCursor: null })

      await GET(request(`?limit=50&afterReceivedAt=2026-11-03T04:23:36.826Z&afterId=${DELIVERY_ID}`))

      expect(get).toHaveBeenCalledWith(
        `${BACKEND}?limit=50&afterReceivedAt=2026-11-03T04%3A23%3A36.826Z&afterId=${DELIVERY_ID}`
      )
    })

    it.each([
      ['?limit=0'],
      ['?limit=201'],
      ['?limit=abc'],
      ['?afterReceivedAt=2026-11-03T04:23:36Z'],
      [`?afterId=${DELIVERY_ID}`],
      [`?afterReceivedAt=not-a-date&afterId=${DELIVERY_ID}`],
      ['?afterReceivedAt=2026-11-03T04:23:36Z&afterId=../x'],
    ])('returns 400 for %s', async query => {
      const response = await GET(request(query))

      expect(response.status).toBe(400)
      expect(get).not.toHaveBeenCalled()
    })

    it.each(['', '../secrets'])('returns 400 for invalid integrationId %j', async integrationId => {
      contextRef.current.params = { integrationId }

      const response = await GET(request())

      expect(response.status).toBe(400)
      expect(get).not.toHaveBeenCalled()
    })

    it('returns 500 when the backend fails', async () => {
      get.mockRejectedValue(new XiansApiError('boom', 500))

      expect((await GET(request())).status).toBe(500)
    })

    it('passes a backend 404 through with its message', async () => {
      get.mockRejectedValue(new XiansApiError('Webhook not found', 404))

      const response = await GET(request())

      expect(response.status).toBe(404)
      expect(JSON.stringify(await response.json())).toContain('Webhook not found')
    })
  })

  describe('DELETE', () => {
    it('deletes every delivery and returns the count', async () => {
      del.mockResolvedValue({ message: 'Deleted 3 incoming call(s)', deletedCount: 3 })

      const response = await DELETE(request('', 'DELETE'))

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ deletedCount: 3 })
      expect(del).toHaveBeenCalledWith(BACKEND)
    })

    it('passes a backend 404 through with its message', async () => {
      del.mockRejectedValue(new XiansApiError('Webhook not found', 404))

      const response = await DELETE(request('', 'DELETE'))

      expect(response.status).toBe(404)
      expect(JSON.stringify(await response.json())).toContain('Webhook not found')
    })

    it('returns 400 for an invalid integrationId', async () => {
      contextRef.current.params = { integrationId: '../secrets' }

      expect((await DELETE(request('', 'DELETE'))).status).toBe(400)
      expect(del).not.toHaveBeenCalled()
    })

    it('returns 500 when the backend fails', async () => {
      del.mockRejectedValue(new XiansApiError('boom', 500))

      expect((await DELETE(request('', 'DELETE'))).status).toBe(500)
    })
  })
})
