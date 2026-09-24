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

import { POST } from './route'

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/workflows/cancel', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('POST /api/workflows/cancel', () => {
  beforeEach(() => {
    createXiansClient.mockReset()
  })

  it('requires workflowId', async () => {
    const { status, body } = await read(await POST(postRequest({ force: false })))
    expect(status).toBe(400)
    expect(body.error).toMatch(/workflowId/i)
  })

  it('posts cancel with force=false by default', async () => {
    const post = vi.fn().mockResolvedValue({ success: true })
    createXiansClient.mockReturnValue({ post })

    const { status } = await read(
      await POST(postRequest({ workflowId: 'tenant-1:Agent:Chat:prod', force: false }))
    )

    expect(status).toBe(200)
    const url = post.mock.calls[0][0] as string
    expect(url).toContain('/tenants/tenant-1/workflows/cancel?')
    expect(url).toContain('workflowId=tenant-1%3AAgent%3AChat%3Aprod')
    expect(url).toContain('force=false')
  })

  it('posts terminate with force=true', async () => {
    const post = vi.fn().mockResolvedValue({ success: true })
    createXiansClient.mockReturnValue({ post })

    await POST(postRequest({ workflowId: 'wf-1', force: true }))
    const url = post.mock.calls[0][0] as string
    expect(url).toContain('force=true')
  })
})
