import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockXiansClient } from '@/lib/xians/mock-xians-client'
import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from '@/lib/messaging/view-as-constants'

const { createXiansClient } = vi.hoisted(() => ({
  createXiansClient: vi.fn(),
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withTenantFromSession: (
    handler: (request: NextRequest, ctx: unknown) => Promise<Response>
  ) => {
    return (request: NextRequest) =>
      handler(request, {
        session: { user: { email: 'user@example.com' }, accessToken: 'tok' },
        tenantId: 'tenant-1',
        tenantContext: { tenant: { id: 'tenant-1' } },
      })
  },
  withParticipantAdmin: (
    handler: (request: NextRequest, ctx: unknown) => Promise<Response>
  ) => {
    return (request: NextRequest) =>
      handler(request, {
        session: { user: { email: 'user@example.com' } },
        tenantId: 'tenant-1',
        tenantContext: { tenant: { id: 'tenant-1' } },
      })
  },
}))

vi.mock('@/lib/xians/client', () => ({
  createXiansClient,
}))

import { POST } from './route'

const validBody = {
  messageId: 'msg-1',
  threadId: 'thread-1',
  agentName: 'Support',
  workflowId: 'wf-1',
  workflowType: 'chat',
  participantId: 'user@example.com',
  starRating: 5,
}

function jsonRequest(body: unknown, url = 'http://localhost/api/messaging/feedback') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function read(res: Response) {
  return { status: res.status, body: await res.json() }
}

describe('POST /api/messaging/feedback', () => {
  beforeEach(() => {
    createXiansClient.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('forwards feedback using the session email as participantId', async () => {
    const post = vi.fn().mockResolvedValue({ id: 'fb-1' })
    createXiansClient.mockReturnValue(mockXiansClient({ post }))

    const { status, body } = await read(await POST(jsonRequest(validBody)))

    expect(status).toBe(201)
    expect(body).toEqual({ id: 'fb-1' })
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/tenants/tenant-1/feedback'),
      expect.objectContaining({
        participantId: 'user@example.com',
        messageId: 'msg-1',
        starRating: 5,
      })
    )
  })

  it('overrides a matching participantId to the session email', async () => {
    const post = vi.fn().mockResolvedValue({ id: 'fb-1' })
    createXiansClient.mockReturnValue(mockXiansClient({ post }))

    await POST(jsonRequest({ ...validBody, participantId: 'User@example.com' }))

    expect(post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ participantId: 'user@example.com' })
    )
  })

  it('rejects a participantId that does not match the session user', async () => {
    const post = vi.fn()
    createXiansClient.mockReturnValue(mockXiansClient({ post }))

    const { status, body } = await read(
      await POST(
        jsonRequest({ ...validBody, participantId: 'impersonated@example.com' })
      )
    )

    expect(status).toBe(403)
    expect(body.error).toMatch(/participantId must match/)
    expect(post).not.toHaveBeenCalled()
  })

  it('rejects view-as on the feedback mutation', async () => {
    const post = vi.fn()
    createXiansClient.mockReturnValue(mockXiansClient({ post }))

    const { status } = await read(
      await POST(
        jsonRequest({
          ...validBody,
          [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'other@example.com',
        })
      )
    )

    expect(status).toBe(403)
    expect(post).not.toHaveBeenCalled()
  })
})
