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

const BASE = '/api/v1/admin/tenants/tenant-1/audit-logs'

function request() {
  return new NextRequest('http://localhost/api/audit-log/filter-options')
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('GET /api/audit-log/filter-options', () => {
  beforeEach(() => {
    createXiansClient.mockReset()
  })

  it('returns all three lists from one request', async () => {
    const get = vi.fn(async (url: string) => {
      if (url === `${BASE}/performed-by`) return ['alice']
      if (url === `${BASE}/actions`) return ['user.role.changed']
      if (url === `${BASE}/activation-names`) return ['prod']
      throw new Error(`unexpected url ${url}`)
    })
    createXiansClient.mockReturnValue({ get })

    const { status, body } = await read(await GET(request()))

    expect(status).toBe(200)
    expect(body).toEqual({
      performedBy: ['alice'],
      actions: ['user.role.changed'],
      activationNames: ['prod'],
    })
    expect(get).toHaveBeenCalledTimes(3)
  })

  it('returns an empty list only for the lookup that failed', async () => {
    const get = vi.fn(async (url: string) => {
      if (url === `${BASE}/actions`) throw new Error('upstream down')
      return ['x']
    })
    createXiansClient.mockReturnValue({ get })

    const { status, body } = await read(await GET(request()))

    expect(status).toBe(200)
    expect(body).toEqual({ performedBy: ['x'], actions: [], activationNames: ['x'] })
  })

  it('returns empty lists when every lookup fails', async () => {
    createXiansClient.mockReturnValue({ get: vi.fn().mockRejectedValue(new Error('boom')) })

    const { status, body } = await read(await GET(request()))

    expect(status).toBe(200)
    expect(body).toEqual({ performedBy: [], actions: [], activationNames: [] })
  })

  it('coerces non-array upstream responses to empty lists', async () => {
    const get = vi.fn(async (url: string) => {
      if (url === `${BASE}/performed-by`) return null
      if (url === `${BASE}/actions`) return { items: ['a'] }
      return 'nope'
    })
    createXiansClient.mockReturnValue({ get })

    const { body } = await read(await GET(request()))

    expect(body).toEqual({ performedBy: [], actions: [], activationNames: [] })
  })
})
