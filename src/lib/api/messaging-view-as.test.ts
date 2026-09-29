import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { rejectClientViewAsParameter } from './messaging-view-as-guards'
import {
  VIEW_AS_PARTICIPANT_QUERY_PARAM,
  getViewAsParticipantIdFromSearchParams,
} from '@/lib/messaging/view-as-constants'
import { forbiddenError } from '@/lib/api/error-handler'
import { mockXiansClient } from '@/lib/xians/mock-xians-client'

vi.mock('server-only', () => ({}))

const { requireSystemAdmin, createXiansClient } = vi.hoisted(() => ({
  requireSystemAdmin: vi.fn(),
  createXiansClient: vi.fn(),
}))

vi.mock('@/lib/api/auth', () => ({
  requireSystemAdmin,
}))

vi.mock('@/lib/xians/client', () => ({
  createXiansClient,
}))

import {
  isEmailTenantMember,
  recordConversationViewAsAudit,
  resetMessagingViewAsCachesForTests,
  resolveMessagingParticipantId,
  TenantMembershipLookupError,
} from './messaging-view-as'

function makeSession(email?: string | null): Session {
  return {
    expires: '2099-01-01T00:00:00.000Z',
    user: email === undefined ? { id: 'u1' } : { email, id: email ?? 'u1' },
  } as Session
}

function viewAsParams(email: string, extra: Record<string, string> = {}) {
  return new URLSearchParams({
    [VIEW_AS_PARTICIPANT_QUERY_PARAM]: email,
    ...extra,
  })
}

function memberList(emails: string[]) {
  return {
    users: emails.map((email) => ({ email, name: email, roles: [], isApproved: true })),
  }
}

async function readError(res: NextResponse | unknown) {
  expect(res).toBeInstanceOf(NextResponse)
  const response = res as NextResponse
  return { status: response.status, body: await response.json() }
}

describe('messaging-view-as guards', () => {
  it('reads viewAsParticipantId from search params', () => {
    const params = new URLSearchParams({
      [VIEW_AS_PARTICIPANT_QUERY_PARAM]: ' user@example.com ',
    })
    expect(getViewAsParticipantIdFromSearchParams(params)).toBe('user@example.com')
  })

  it('rejects view-as on mutation when present in query', async () => {
    const params = new URLSearchParams({
      [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'other@example.com',
    })
    const res = rejectClientViewAsParameter(params)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('rejects view-as on mutation when present in body', async () => {
    const params = new URLSearchParams()
    const res = rejectClientViewAsParameter(params, {
      [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'other@example.com',
    })
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('allows mutations without view-as', () => {
    const res = rejectClientViewAsParameter(new URLSearchParams())
    expect(res).toBeNull()
  })
})

describe('resolveMessagingParticipantId', () => {
  const tenantId = 'tenant-1'
  const accessToken = 'tok'

  beforeEach(() => {
    resetMessagingViewAsCachesForTests()
    requireSystemAdmin.mockReset()
    createXiansClient.mockReset()
    requireSystemAdmin.mockResolvedValue(null)
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns the session email when view-as is not requested', async () => {
    const res = await resolveMessagingParticipantId({
      session: makeSession('admin@example.com'),
      tenantId,
      searchParams: new URLSearchParams(),
      accessToken,
    })

    expect(res).toEqual({
      participantId: 'admin@example.com',
      viewAsActive: false,
    })
    expect(requireSystemAdmin).not.toHaveBeenCalled()
    expect(createXiansClient).not.toHaveBeenCalled()
  })

  it('treats self-view as a no-op without an admin check', async () => {
    const res = await resolveMessagingParticipantId({
      session: makeSession('admin@example.com'),
      tenantId,
      searchParams: viewAsParams(' Admin@example.com '),
      accessToken,
    })

    expect(res).toEqual({
      participantId: 'admin@example.com',
      viewAsActive: false,
    })
    expect(requireSystemAdmin).not.toHaveBeenCalled()
    expect(createXiansClient).not.toHaveBeenCalled()
  })

  it('rejects a missing session email', async () => {
    const { status, body } = await readError(
      await resolveMessagingParticipantId({
        session: makeSession(null),
        tenantId,
        searchParams: viewAsParams('user@example.com'),
        accessToken,
      })
    )
    expect(status).toBe(401)
    expect(body.error).toMatch(/email/i)
  })

  it('rejects a non-admin even when viewAsParticipantId is malformed', async () => {
    requireSystemAdmin.mockResolvedValue(
      forbiddenError('System administrator access required')
    )

    const { status } = await readError(
      await resolveMessagingParticipantId({
        session: makeSession('user@example.com'),
        tenantId,
        searchParams: viewAsParams('not-an-email'),
        accessToken,
      })
    )

    expect(status).toBe(403)
    expect(createXiansClient).not.toHaveBeenCalled()
  })

  it('rejects a non-admin with a well-formed target email', async () => {
    requireSystemAdmin.mockResolvedValue(
      forbiddenError('System administrator access required')
    )

    const { status } = await readError(
      await resolveMessagingParticipantId({
        session: makeSession('user@example.com'),
        tenantId,
        searchParams: viewAsParams('other@example.com'),
        accessToken,
      })
    )

    expect(status).toBe(403)
    expect(createXiansClient).not.toHaveBeenCalled()
  })

  it('rejects an invalid email format after the admin check', async () => {
    const { status, body } = await readError(
      await resolveMessagingParticipantId({
        session: makeSession('admin@example.com'),
        tenantId,
        searchParams: viewAsParams('not-an-email'),
        accessToken,
      })
    )

    expect(requireSystemAdmin).toHaveBeenCalled()
    expect(status).toBe(400)
    expect(body.error).toMatch(/valid email/i)
    expect(createXiansClient).not.toHaveBeenCalled()
  })

  it('honors view-as for an admin targeting a tenant member and records audit first', async () => {
    const get = vi.fn().mockResolvedValue(memberList(['target@example.com']))
    const post = vi.fn().mockResolvedValue({ id: 'audit-1' })
    createXiansClient.mockReturnValue(mockXiansClient({ get, post }))

    const res = await resolveMessagingParticipantId({
      session: makeSession('admin@example.com'),
      tenantId,
      searchParams: viewAsParams('target@example.com', {
        agentName: 'Support',
        activationName: 'prod',
      }),
      accessToken,
    })

    expect(res).toEqual({
      participantId: 'target@example.com',
      viewAsActive: true,
      viewAsTarget: 'target@example.com',
      adminEmail: 'admin@example.com',
    })
    expect(get).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('/tenants/tenant-1/audit-logs'),
      expect.objectContaining({
        action: 'conversation.view_as',
        description: 'System admin viewed conversations as target@example.com',
        activationName: 'prod',
        details: expect.objectContaining({
          targetParticipantId: 'target@example.com',
          agentName: 'Support',
        }),
      })
    )
  })

  it('rejects an admin targeting a non-member and does not record audit', async () => {
    const get = vi.fn().mockResolvedValue(memberList(['someone-else@example.com']))
    const post = vi.fn()
    createXiansClient.mockReturnValue(mockXiansClient({ get, post }))

    const { status, body } = await readError(
      await resolveMessagingParticipantId({
        session: makeSession('admin@example.com'),
        tenantId,
        searchParams: viewAsParams('outsider@example.com'),
        accessToken,
      })
    )

    expect(status).toBe(403)
    expect(body.error).toMatch(/not a member/i)
    expect(post).not.toHaveBeenCalled()
  })

  it('does not re-hit membership or audit on a repeated admin+target+tenant resolve', async () => {
    const get = vi.fn().mockResolvedValue(memberList(['target@example.com']))
    const post = vi.fn().mockResolvedValue({ id: 'audit-1' })
    createXiansClient.mockReturnValue(mockXiansClient({ get, post }))

    const options = {
      session: makeSession('admin@example.com'),
      tenantId,
      searchParams: viewAsParams('target@example.com'),
      accessToken,
    }

    await resolveMessagingParticipantId(options)
    const second = await resolveMessagingParticipantId(options)

    expect(second).toMatchObject({ viewAsActive: true, participantId: 'target@example.com' })
    expect(get).toHaveBeenCalledTimes(1)
    expect(post).toHaveBeenCalledTimes(1)
    expect(requireSystemAdmin).toHaveBeenCalledTimes(1)
  })

  it('still honors view-as when the upstream audit write fails', async () => {
    const get = vi.fn().mockResolvedValue(memberList(['target@example.com']))
    const post = vi.fn().mockRejectedValue(new Error('no audit endpoint'))
    createXiansClient.mockReturnValue(mockXiansClient({ get, post }))

    const res = await resolveMessagingParticipantId({
      session: makeSession('admin@example.com'),
      tenantId,
      searchParams: viewAsParams('target@example.com'),
      accessToken,
    })

    expect(res).toMatchObject({
      viewAsActive: true,
      participantId: 'target@example.com',
    })
    expect(console.error).toHaveBeenCalled()
  })

  it('records a separate audit when agent or activation differs', async () => {
    const get = vi.fn().mockResolvedValue(memberList(['target@example.com']))
    const post = vi.fn().mockResolvedValue({ id: 'audit-1' })
    createXiansClient.mockReturnValue(mockXiansClient({ get, post }))

    await resolveMessagingParticipantId({
      session: makeSession('admin@example.com'),
      tenantId,
      searchParams: viewAsParams('target@example.com', {
        agentName: 'Support',
        activationName: 'prod',
      }),
      accessToken,
    })
    await resolveMessagingParticipantId({
      session: makeSession('admin@example.com'),
      tenantId,
      searchParams: viewAsParams('target@example.com', {
        agentName: 'Billing',
        activationName: 'prod',
      }),
      accessToken,
    })

    expect(post).toHaveBeenCalledTimes(2)
  })

  it('returns 503 when tenant membership lookup fails unexpectedly', async () => {
    const get = vi.fn().mockRejectedValue(new Error('upstream down'))
    createXiansClient.mockReturnValue(mockXiansClient({ get }))

    const { status, body } = await readError(
      await resolveMessagingParticipantId({
        session: makeSession('admin@example.com'),
        tenantId,
        searchParams: viewAsParams('target@example.com'),
        accessToken,
      })
    )

    expect(status).toBe(503)
    expect(body.code).toBe('membership_unavailable')
    expect(body.error).toMatch(/membership/i)
  })
})

describe('isEmailTenantMember', () => {
  beforeEach(() => {
    resetMessagingViewAsCachesForTests()
    createXiansClient.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns false for an implausible email without calling upstream', async () => {
    await expect(isEmailTenantMember('tenant-1', 'not-an-email')).resolves.toBe(false)
    expect(createXiansClient).not.toHaveBeenCalled()
  })

  it('matches tenant members case-insensitively', async () => {
    const get = vi.fn().mockResolvedValue(memberList(['Target@Example.com']))
    createXiansClient.mockReturnValue(mockXiansClient({ get }))

    await expect(
      isEmailTenantMember('tenant-1', 'target@example.com')
    ).resolves.toBe(true)
  })

  it('pages through tenant users when the first page does not include the target', async () => {
    const firstPage = {
      users: Array.from({ length: 100 }, (_, i) => ({
        email: `u${i}@example.com`,
        name: `U${i}`,
        roles: [],
        isApproved: true,
      })),
      totalCount: 101,
      page: 1,
      pageSize: 100,
    }
    const secondPage = {
      users: [{ email: 'target@example.com', name: 'Target', roles: [], isApproved: true }],
      totalCount: 101,
      page: 2,
      pageSize: 100,
    }
    const get = vi.fn().mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage)
    createXiansClient.mockReturnValue(mockXiansClient({ get }))

    await expect(
      isEmailTenantMember('tenant-1', 'target@example.com')
    ).resolves.toBe(true)
    expect(get).toHaveBeenCalledTimes(2)
    expect(String(get.mock.calls[0]?.[0])).toContain('page=1')
    expect(String(get.mock.calls[1]?.[0])).toContain('page=2')
  })

  it('fetches remaining membership pages concurrently after page 1', async () => {
    const filler = (prefix: string) =>
      Array.from({ length: 100 }, (_, i) => ({
        email: `${prefix}${i}@example.com`,
        name: `${prefix}${i}`,
        roles: [],
        isApproved: true,
      }))
    const pages: Record<number, ReturnType<typeof memberList> & {
      totalCount: number
      page: number
      pageSize: number
    }> = {
      1: { users: filler('a'), totalCount: 250, page: 1, pageSize: 100 },
      2: { users: filler('b'), totalCount: 250, page: 2, pageSize: 100 },
      3: {
        ...memberList(['target@example.com']),
        totalCount: 250,
        page: 3,
        pageSize: 100,
      },
    }
    const get = vi.fn().mockImplementation((url: string) => {
      const page = Number(new URL(url, 'https://xians.example').searchParams.get('page'))
      return Promise.resolve(pages[page])
    })
    createXiansClient.mockReturnValue(mockXiansClient({ get }))

    await expect(
      isEmailTenantMember('tenant-1', 'target@example.com')
    ).resolves.toBe(true)
    expect(get).toHaveBeenCalledTimes(3)
    const requested = get.mock.calls.map((call) => String(call[0]))
    expect(requested[0]).toContain('page=1')
    expect(requested.slice(1).some((url) => url.includes('page=2'))).toBe(true)
    expect(requested.slice(1).some((url) => url.includes('page=3'))).toBe(true)
  })

  it('does not fan out to max pages when totalCount is missing', async () => {
    const filler = (prefix: string) =>
      Array.from({ length: 100 }, (_, i) => ({
        email: `${prefix}${i}@example.com`,
        name: `${prefix}${i}`,
        roles: [],
        isApproved: true,
      }))
    const get = vi.fn().mockImplementation((url: string) => {
      const page = Number(new URL(url, 'https://xians.example').searchParams.get('page'))
      if (page === 1) {
        return Promise.resolve({ users: filler('a'), page: 1, pageSize: 100 })
      }
      if (page === 2) {
        return Promise.resolve({
          users: [{ email: 'other@example.com', name: 'Other', roles: [], isApproved: true }],
          page: 2,
          pageSize: 100,
        })
      }
      return Promise.resolve({ users: filler('x'), page, pageSize: 100 })
    })
    createXiansClient.mockReturnValue(mockXiansClient({ get }))

    await expect(
      isEmailTenantMember('tenant-1', 'target@example.com')
    ).resolves.toBe(false)
    expect(get.mock.calls.length).toBeLessThan(10)
    expect(get).toHaveBeenCalledTimes(4)
  })

  it('throws TenantMembershipLookupError on unexpected failure, without caching it', async () => {
    const get = vi
      .fn()
      .mockRejectedValueOnce(new Error('upstream down'))
      .mockResolvedValueOnce(memberList(['target@example.com']))
    createXiansClient.mockReturnValue(mockXiansClient({ get }))

    await expect(isEmailTenantMember('tenant-1', 'target@example.com')).rejects.toBeInstanceOf(
      TenantMembershipLookupError
    )
    await expect(isEmailTenantMember('tenant-1', 'target@example.com')).resolves.toBe(
      true
    )
    expect(get).toHaveBeenCalledTimes(2)
  })
})

describe('recordConversationViewAsAudit', () => {
  beforeEach(() => {
    resetMessagingViewAsCachesForTests()
    createXiansClient.mockReset()
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('is idempotent per admin+target+tenant+agent+activation', async () => {
    const post = vi.fn().mockResolvedValue({ id: 'audit-1' })
    createXiansClient.mockReturnValue(mockXiansClient({ post }))

    const payload = {
      tenantId: 'tenant-1',
      adminEmail: 'admin@example.com',
      viewAsParticipantId: 'target@example.com',
    }

    await recordConversationViewAsAudit(payload, 'tok')
    await recordConversationViewAsAudit(payload, 'tok')

    expect(post).toHaveBeenCalledTimes(1)
  })

  it('retries after an upstream audit write failure', async () => {
    const post = vi
      .fn()
      .mockRejectedValueOnce(new Error('no audit endpoint'))
      .mockResolvedValueOnce({ id: 'audit-1' })
    createXiansClient.mockReturnValue(mockXiansClient({ post }))

    const payload = {
      tenantId: 'tenant-1',
      adminEmail: 'admin@example.com',
      viewAsParticipantId: 'target@example.com',
    }

    await recordConversationViewAsAudit(payload, 'tok')
    await recordConversationViewAsAudit(payload, 'tok')

    expect(post).toHaveBeenCalledTimes(2)
    expect(console.error).toHaveBeenCalled()
  })
})
