import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { createXiansClient } = vi.hoisted(() => ({
  createXiansClient: vi.fn(),
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withTenantAdmin: (handler: (request: NextRequest, ctx: unknown) => Promise<Response>) => {
    return (request: NextRequest) =>
      handler(request, {
        session: { user: { email: 'admin@example.com' }, accessToken: 'tok' },
        tenantId: 'tenant-1',
        tenantContext: { tenant: { id: 'tenant-1' } },
      })
  },
}))

vi.mock('@/lib/xians/client', () => ({ createXiansClient }))

import { GET } from './route'

function getRequest(query: string) {
  return new NextRequest(`http://localhost/api/workflows?${query}`)
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('GET /api/workflows', () => {
  beforeEach(() => {
    createXiansClient.mockReset()
  })

  it('requires agentName and activationName', async () => {
    const { status, body } = await read(await GET(getRequest('agentName=Agent')))
    expect(status).toBe(400)
    expect(body.error).toMatch(/activationName/i)
  })

  it('proxies list with agent + idPostfix mapping', async () => {
    const get = vi.fn().mockResolvedValue({
      workflows: [],
      pageSize: 20,
      hasNextPage: false,
    })
    createXiansClient.mockReturnValue({ get })

    const { status } = await read(
      await GET(getRequest('agentName=My%20Agent&activationName=prod&status=running&pageSize=20'))
    )

    expect(status).toBe(200)
    expect(get).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/admin\/tenants\/tenant-1\/workflows\/list\?/)
    )
    const url = get.mock.calls[0][0] as string
    expect(url).toContain('agent=My+Agent')
    expect(url).toContain('idPostfix=prod')
    expect(url).toContain('status=running')
    expect(url).toContain('pageSize=20')
  })
})
