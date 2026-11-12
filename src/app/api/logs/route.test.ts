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

  const backendQuery = () => new URL(`http://x${get.mock.calls[0][0] as string}`).searchParams

  const REQUEST_ID = 'd960231d-93fc-41bc-b9ac-5db2c31ed199'

  it('passes any other workflow ID through as workflowId', async () => {
    await GET(request(new URLSearchParams({ workflowId: 't:a:Integrator Workflow:Raven' }).toString()))

    expect(backendQuery().get('workflowId')).toBe('t:a:Integrator Workflow:Raven')
    expect(backendQuery().get('workflowIds')).toBeNull()
  })

  it("adds the run to a delivery's receiving workflow, so the whole delivery shows", async () => {
    const response = await GET(
      request(new URLSearchParams({ workflowId: `t:a:Integrator Workflow:Raven:${REQUEST_ID}` }).toString())
    )

    expect(response.status).toBe(200)
    expect(backendQuery().get('workflowIds')).toBe(
      `t:a:Integrator Workflow:Raven:${REQUEST_ID},t:a:Processing Workflow:Raven:${REQUEST_ID}`
    )
    expect(backendQuery().get('workflowId')).toBeNull()
  })
})
