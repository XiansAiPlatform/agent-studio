import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { forbiddenError } from '@/lib/api/error-handler'

const { requireSystemAdmin, isEmailTenantMember, recordConversationViewAsAudit } =
  vi.hoisted(() => ({
    requireSystemAdmin: vi.fn(),
    isEmailTenantMember: vi.fn(),
    recordConversationViewAsAudit: vi.fn(),
  }))

vi.mock('@/lib/api/with-tenant', () => ({
  withTenantFromSession: (
    handler: (request: NextRequest, ctx: unknown) => Promise<Response>
  ) => {
    return (request: NextRequest) =>
      handler(request, {
        session: { user: { email: 'admin@example.com' }, accessToken: 'tok' },
        tenantId: 'tenant-1',
        tenantContext: { tenant: { id: 'tenant-1' } },
      })
  },
}))

vi.mock('@/lib/api/auth', () => ({
  requireSystemAdmin,
}))

vi.mock('@/lib/api/messaging-view-as', () => ({
  isEmailTenantMember,
  recordConversationViewAsAudit,
}))

import { POST } from './route'

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/messaging/view-as/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('POST /api/messaging/view-as/audit', () => {
  beforeEach(() => {
    requireSystemAdmin.mockReset()
    isEmailTenantMember.mockReset()
    recordConversationViewAsAudit.mockReset()
    requireSystemAdmin.mockResolvedValue(null)
    isEmailTenantMember.mockResolvedValue(true)
    recordConversationViewAsAudit.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('rejects a non-admin before validating the target', async () => {
    requireSystemAdmin.mockResolvedValue(
      forbiddenError('System administrator access required')
    )

    const { status } = await read(await POST(jsonRequest({})))

    expect(status).toBe(403)
    expect(isEmailTenantMember).not.toHaveBeenCalled()
    expect(recordConversationViewAsAudit).not.toHaveBeenCalled()
  })

  it('requires viewAsParticipantId', async () => {
    const { status, body } = await read(await POST(jsonRequest({})))
    expect(status).toBe(400)
    expect(body.error).toMatch(/viewAsParticipantId is required/)
    expect(recordConversationViewAsAudit).not.toHaveBeenCalled()
  })

  it('skips recording when the admin views themselves', async () => {
    const { status, body } = await read(
      await POST(jsonRequest({ viewAsParticipantId: 'Admin@example.com' }))
    )

    expect(status).toBe(200)
    expect(body).toEqual({ success: true, skipped: true })
    expect(isEmailTenantMember).not.toHaveBeenCalled()
    expect(recordConversationViewAsAudit).not.toHaveBeenCalled()
  })

  it('rejects a target who is not a tenant member', async () => {
    isEmailTenantMember.mockResolvedValue(false)

    const { status, body } = await read(
      await POST(jsonRequest({ viewAsParticipantId: 'outsider@example.com' }))
    )

    expect(status).toBe(400)
    expect(body.error).toMatch(/not a member/)
    expect(recordConversationViewAsAudit).not.toHaveBeenCalled()
  })

  it('records audit for an admin targeting a tenant member', async () => {
    const { status, body } = await read(
      await POST(
        jsonRequest({
          viewAsParticipantId: 'target@example.com',
          agentName: 'Support',
          activationName: 'prod',
        })
      )
    )

    expect(status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(isEmailTenantMember).toHaveBeenCalledWith(
      'tenant-1',
      'target@example.com',
      'tok'
    )
    expect(recordConversationViewAsAudit).toHaveBeenCalledWith(
      {
        tenantId: 'tenant-1',
        adminEmail: 'admin@example.com',
        viewAsParticipantId: 'target@example.com',
        agentName: 'Support',
        activationName: 'prod',
      },
      'tok'
    )
  })
})
