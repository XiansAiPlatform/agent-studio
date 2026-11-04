import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { XiansApiError } from '@/lib/xians/client'

vi.mock('server-only', () => ({}))

const DELIVERY_ID = '019a3f2c-8e1b-7c4d-9a2f-3b6e8d1c0a55'

const { contextRef, createXiansClient } = vi.hoisted(() => ({
  contextRef: {
    current: {
      tenantContext: { tenant: { id: 'tenant-1' } },
      params: { integrationId: 'integration-1', deliveryId: '' } as { integrationId: string; deliveryId: string },
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

const BACKEND = `/api/v1/admin/tenants/tenant-1/webhooks/integration-1/incomings/${DELIVERY_ID}`

const request = (method = 'GET') =>
  new NextRequest(`http://localhost/api/integrations/integration-1/deliveries/${DELIVERY_ID}`, { method })

describe('/api/integrations/[integrationId]/deliveries/[deliveryId]', () => {
  const get = vi.fn()
  const del = vi.fn()

  beforeEach(() => {
    get.mockReset()
    del.mockReset()
    createXiansClient.mockReturnValue({ get, delete: del })
    contextRef.current.params = { integrationId: 'integration-1', deliveryId: DELIVERY_ID }
  })

  it('GET returns the delivery for the session tenant', async () => {
    const delivery = { id: DELIVERY_ID, headers: [{ name: 'Cookie', value: '********', masked: true }] }
    get.mockResolvedValue(delivery)

    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(delivery)
    expect(get).toHaveBeenCalledWith(BACKEND)
  })

  it('GET passes a backend 404 through', async () => {
    get.mockRejectedValue(new XiansApiError('Incoming call not found', 404))

    const response = await GET(request())

    expect(response.status).toBe(404)
    expect(JSON.stringify(await response.json())).toContain('Incoming call not found')
  })

  it('DELETE deletes the delivery', async () => {
    del.mockResolvedValue({ message: 'Incoming call deleted successfully' })

    const response = await DELETE(request('DELETE'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(del).toHaveBeenCalledWith(BACKEND)
  })

  it.each([
    { integrationId: '../secrets', deliveryId: DELIVERY_ID },
    { integrationId: 'integration-1', deliveryId: '' },
    { integrationId: 'integration-1', deliveryId: '../x' },
  ])('returns 400 for unsafe ids %j', async params => {
    contextRef.current.params = params

    expect((await GET(request())).status).toBe(400)
    expect((await DELETE(request('DELETE'))).status).toBe(400)
    expect(get).not.toHaveBeenCalled()
    expect(del).not.toHaveBeenCalled()
  })
})
