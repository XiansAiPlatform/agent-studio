import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const { contextRef, createXiansClient } = vi.hoisted(() => ({
  contextRef: {
    current: {
      session: { accessToken: 'token' },
      tenantContext: { tenant: { id: 'tenant-1' } },
      params: {},
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

import { GET } from './route'

const request = (query: string) => new NextRequest(`http://localhost/api/logs?${query}`)

describe('GET /api/logs', () => {
  const get = vi.fn()

  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ logs: [], totalCount: 0 })
    createXiansClient.mockReturnValue({ get })
  })

  it('turns requestId into a property filter, so one delivery\'s logs come back from every workflow', async () => {
    const response = await GET(request('requestId=3f9a6c2e-41d8-4b7e-9c55-0a1e7d2b8f64&startDate=2026-11-04T10%3A08%3A41.000Z'))

    expect(response.status).toBe(200)
    const path = get.mock.calls[0][0] as string
    const query = new URLSearchParams(path.split('?')[1])
    expect(query.getAll('property')).toEqual(['requestId:3f9a6c2e-41d8-4b7e-9c55-0a1e7d2b8f64'])
    expect(query.get('startDate')).toBe('2026-11-04T10:08:41.000Z')
    expect(query.has('workflowId')).toBe(false)
  })

  it.each([['a,b'], ['req id'], ['x'.repeat(129)]])('refuses a request ID that is not one (%s)', async requestId => {
    const response = await GET(request(`requestId=${encodeURIComponent(requestId)}`))

    expect(response.status).toBe(400)
    expect(get).not.toHaveBeenCalled()
  })

  it('sends no property filter without a request ID', async () => {
    await GET(request('workflowId=w-1'))

    const query = new URLSearchParams((get.mock.calls[0][0] as string).split('?')[1])
    expect(query.has('property')).toBe(false)
    expect(query.get('workflowId')).toBe('w-1')
  })
})
