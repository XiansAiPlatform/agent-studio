import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from '@/lib/messaging/view-as-constants'

const { createXiansClient, xiansAdminHeaders } = vi.hoisted(() => ({
  createXiansClient: vi.fn(),
  xiansAdminHeaders: vi.fn(),
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
}))

vi.mock('@/lib/xians/client', () => ({
  createXiansClient,
  xiansAdminHeaders,
}))

import { POST as sendPost } from './send/route'
import { DELETE as messagesDelete } from './messages/route'
import { GET as listenGet } from './listen/route'

function viewAsUrl(path: string) {
  const params = new URLSearchParams({
    agentName: 'Support',
    activationName: 'prod',
    [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'other@example.com',
  })
  return `http://localhost${path}?${params.toString()}`
}

describe('messaging mutation routes reject view-as', () => {
  beforeEach(() => {
    createXiansClient.mockReset()
    xiansAdminHeaders.mockReset()
  })

  it.each([
    {
      name: 'POST /api/messaging/send',
      call: () =>
        sendPost(
          new NextRequest(viewAsUrl('/api/messaging/send'), {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              agentName: 'Support',
              activationName: 'prod',
              text: 'hello',
            }),
          })
        ),
    },
    {
      name: 'DELETE /api/messaging/messages',
      call: () =>
        messagesDelete(
          new NextRequest(viewAsUrl('/api/messaging/messages'), {
            method: 'DELETE',
          })
        ),
    },
    {
      name: 'GET /api/messaging/listen',
      call: () => listenGet(new NextRequest(viewAsUrl('/api/messaging/listen'))),
    },
  ])('$name returns 403 when viewAsParticipantId is present', async ({ call }) => {
    const res = await call()
    expect(res.status).toBe(403)
    expect(createXiansClient).not.toHaveBeenCalled()
    expect(xiansAdminHeaders).not.toHaveBeenCalled()
  })
})
