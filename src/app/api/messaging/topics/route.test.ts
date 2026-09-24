import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { mockXiansClient } from '@/lib/xians/mock-xians-client'
import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from '@/lib/messaging/view-as-constants'
import { forbiddenError } from '@/lib/api/error-handler'

vi.mock('server-only', () => ({}))

const { createXiansClient, requireSystemAdmin, sessionRef } = vi.hoisted(() => ({
  createXiansClient: vi.fn(),
  requireSystemAdmin: vi.fn(),
  sessionRef: {
    current: {
      user: { email: 'admin@example.com' },
      accessToken: 'tok',
    },
  },
}))

vi.mock('@/lib/api/auth', () => ({
  requireSystemAdmin,
}))

vi.mock('@/lib/api/with-tenant', () => ({
  withTenantFromSession: (
    handler: (request: NextRequest, ctx: unknown) => Promise<Response>
  ) => {
    return (request: NextRequest) =>
      handler(request, {
        session: sessionRef.current,
        tenantId: 'tenant-1',
        tenantContext: { tenant: { id: 'tenant-1' } },
      })
  },
}))

vi.mock('@/lib/xians/client', () => ({
  createXiansClient,
}))

import { resetMessagingViewAsCachesForTests } from '@/lib/api/messaging-view-as'
import { GET } from './route'

function topicsUrl(extra: Record<string, string> = {}) {
  const params = new URLSearchParams({
    agentName: 'Support',
    activationName: 'prod',
    ...extra,
  })
  return `http://localhost/api/messaging/topics?${params.toString()}`
}

function stubClient(get: ReturnType<typeof vi.fn>, post = vi.fn().mockResolvedValue({ id: 'a' })) {
  createXiansClient.mockReturnValue(mockXiansClient({ get, post }))
}

describe('GET /api/messaging/topics view-as wiring', () => {
  beforeEach(() => {
    resetMessagingViewAsCachesForTests()
    createXiansClient.mockReset()
    requireSystemAdmin.mockReset()
    requireSystemAdmin.mockResolvedValue(null)
    sessionRef.current = {
      user: { email: 'admin@example.com' },
      accessToken: 'tok',
    }
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('uses the session email when viewAsParticipantId is absent', async () => {
    const get = vi.fn().mockResolvedValue({ topics: [], pagination: { total: 0, pageSize: 20, hasMore: false } })
    stubClient(get)

    const res = await GET(new NextRequest(topicsUrl()))

    expect(res.status).toBe(200)
    expect(get).toHaveBeenCalledTimes(1)
    expect(String(get.mock.calls[0]?.[0])).toContain(
      'participantId=admin%40example.com'
    )
  })

  it('honors viewAsParticipantId for a system admin', async () => {
    const get = vi.fn().mockImplementation((url: string) => {
      if (String(url).includes('/users')) {
        return Promise.resolve({
          users: [
            {
              email: 'target@example.com',
              name: 'Target',
              roles: [],
              isApproved: true,
            },
          ],
        })
      }
      return Promise.resolve({
        topics: [],
        pagination: { total: 0, pageSize: 20, hasMore: false },
      })
    })
    stubClient(get)

    const res = await GET(
      new NextRequest(
        topicsUrl({ [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'target@example.com' })
      )
    )

    expect(res.status).toBe(200)
    const topicsCall = get.mock.calls.find((call) =>
      String(call[0]).includes('/messaging/topics')
    )
    expect(String(topicsCall?.[0])).toContain('participantId=target%40example.com')
  })

  it('rejects a non-admin viewAsParticipantId with 403', async () => {
    sessionRef.current = {
      user: { email: 'user@example.com' },
      accessToken: 'tok',
    }
    requireSystemAdmin.mockResolvedValue(
      forbiddenError('System administrator access required')
    )
    const get = vi.fn()
    stubClient(get)

    const res = await GET(
      new NextRequest(
        topicsUrl({ [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'target@example.com' })
      )
    )

    expect(res.status).toBe(403)
    expect(get).not.toHaveBeenCalled()
  })
})
