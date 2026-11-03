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

import { POST } from './route'

const request = () =>
  new NextRequest('http://localhost/api/integrations/integration-1/disable', { method: 'POST' })

describe('POST /api/integrations/[integrationId]/disable', () => {
  const post = vi.fn()

  beforeEach(() => {
    post.mockReset()
    post.mockResolvedValue(undefined)
    createXiansClient.mockReturnValue({ post })
    contextRef.current.params = { integrationId: 'integration-1' }
  })

  it('calls the backend disable endpoint for the session tenant', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ success: true })
    expect(post).toHaveBeenCalledWith(
      '/api/v1/admin/tenants/tenant-1/integrations/integration-1/disable'
    )
  })

  it.each(['', '../secrets'])('returns 400 for invalid integrationId %j', async integrationId => {
    contextRef.current.params = { integrationId }

    const response = await POST(request())

    expect(response.status).toBe(400)
    expect(post).not.toHaveBeenCalled()
  })

  it('propagates backend errors', async () => {
    const error = new XiansApiError('Integration not found', 404)
    post.mockRejectedValue(error)

    await expect(POST(request())).rejects.toBe(error)
  })
})
