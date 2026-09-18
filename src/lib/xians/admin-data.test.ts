import { beforeEach, describe, expect, it, vi } from 'vitest'
import { XiansApiError } from '@/lib/xians/client'
import { mockXiansClient } from '@/lib/xians/mock-xians-client'

vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}))

vi.mock('@/lib/auth/agent-access', () => ({
  assertCanEditAgent: vi.fn(),
}))

import { assertCanEditAgent } from '@/lib/auth/agent-access'
import {
  ACTIVATION_OWNERSHIP_TTL_MS,
  assertActivationOwnedByAgent,
  loadRecordIfEditable,
  oversizedRequestError,
  resetActivationOwnershipCacheForTests,
} from '@/lib/xians/admin-data'

const mockedAssertCanEditAgent = vi.mocked(assertCanEditAgent)

function page(
  data: Array<{ name: string; agentName: string }>,
  totalPages = 1,
  pageNumber = 1
) {
  return {
    data,
    pagination: { page: pageNumber, pageSize: 100, total: data.length, totalPages },
  }
}

describe('loadRecordIfEditable', () => {
  const session = { user: { email: 'user@example.com' } } as never

  beforeEach(() => {
    mockedAssertCanEditAgent.mockReset()
  })

  it('returns 404 when AdminAPI has no record', async () => {
    const client = mockXiansClient({
      get: vi.fn().mockRejectedValue(new XiansApiError('missing', 404)),
    })

    const [item, denied] = await loadRecordIfEditable(client, session, 'tenant-1', 'rec-1')

    expect(item).toBeNull()
    expect(denied).toMatchObject({
      status: 404,
      body: { error: 'Record not found', code: 'not_found' },
    })
    expect(mockedAssertCanEditAgent).not.toHaveBeenCalled()
  })

  it('returns the agent-access denial when the caller cannot edit the owning agent', async () => {
    const forbidden = { status: 403, body: { error: 'forbidden' } }
    mockedAssertCanEditAgent.mockResolvedValue(forbidden as never)
    const client = mockXiansClient({
      get: vi.fn().mockResolvedValue({ id: 'rec-1', agentName: 'other-agent' }),
    })

    const [item, denied] = await loadRecordIfEditable(client, session, 'tenant-1', 'rec-1')

    expect(item).toBeNull()
    expect(denied).toBe(forbidden)
    expect(mockedAssertCanEditAgent).toHaveBeenCalledWith(session, 'tenant-1', 'other-agent')
  })

  it('returns the record when the caller may edit the owning agent', async () => {
    mockedAssertCanEditAgent.mockResolvedValue(null)
    const record = { id: 'rec-1', agentName: 'support', key: 'k' }
    const client = mockXiansClient({ get: vi.fn().mockResolvedValue(record) })

    const [item, denied] = await loadRecordIfEditable(client, session, 'tenant-1', 'rec-1')

    expect(denied).toBeNull()
    expect(item).toEqual(record)
  })
})

describe('assertActivationOwnedByAgent', () => {
  beforeEach(() => {
    resetActivationOwnershipCacheForTests()
  })

  it('denies when the activation belongs to a different agent', async () => {
    const get = vi.fn().mockResolvedValue(page([{ name: 'act-a', agentName: 'other-agent' }]))
    const denied = await assertActivationOwnedByAgent(
      mockXiansClient({ get }),
      'tenant-1',
      'support',
      'act-a'
    )

    expect(denied).toMatchObject({
      status: 400,
      body: { error: 'activationName does not belong to this agent' },
    })
  })

  it('stops paging once the target activation is found', async () => {
    const get = vi.fn().mockResolvedValue(
      page([{ name: 'act-a', agentName: 'support' }], 5)
    )

    const denied = await assertActivationOwnedByAgent(
      mockXiansClient({ get }),
      'tenant-1',
      'support',
      'act-a'
    )

    expect(denied).toBeNull()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('finds the activation on a later page', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(page([{ name: 'other', agentName: 'support' }], 2, 1))
      .mockResolvedValueOnce(page([{ name: 'act-a', agentName: 'support' }], 2, 2))

    const denied = await assertActivationOwnedByAgent(
      mockXiansClient({ get }),
      'tenant-1',
      'support',
      'act-a'
    )

    expect(denied).toBeNull()
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('denies when the activation is not found on any page', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce(page([{ name: 'other', agentName: 'support' }], 2, 1))
      .mockResolvedValueOnce(page([{ name: 'still-other', agentName: 'support' }], 2, 2))

    const denied = await assertActivationOwnedByAgent(
      mockXiansClient({ get }),
      'tenant-1',
      'support',
      'act-missing'
    )

    expect(denied).toMatchObject({ status: 400 })
    expect(get).toHaveBeenCalledTimes(2)
  })

  it('does not cache activation-not-owned denials', async () => {
    const get = vi.fn().mockResolvedValue(page([], 1))
    const client = mockXiansClient({ get })

    await assertActivationOwnedByAgent(client, 'tenant-1', 'support', 'act-a')
    await assertActivationOwnedByAgent(client, 'tenant-1', 'support', 'act-a')

    expect(get).toHaveBeenCalledTimes(2)
  })

  it('rethrows unexpected AdminAPI errors instead of masking them as denial', async () => {
    const get = vi.fn().mockRejectedValue(new Error('AdminAPI unavailable'))
    await expect(
      assertActivationOwnedByAgent(mockXiansClient({ get }), 'tenant-1', 'support', 'act-a')
    ).rejects.toThrow('AdminAPI unavailable')
  })

  it('reuses a positive hit within the short TTL and refetches after it expires', async () => {
    vi.useFakeTimers()
    const get = vi.fn().mockResolvedValue(page([{ name: 'act-a', agentName: 'support' }]))
    const client = mockXiansClient({ get })

    await expect(
      assertActivationOwnedByAgent(client, 'tenant-1', 'support', 'act-a')
    ).resolves.toBeNull()
    await expect(
      assertActivationOwnedByAgent(client, 'tenant-1', 'support', 'act-a')
    ).resolves.toBeNull()
    expect(get).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(ACTIVATION_OWNERSHIP_TTL_MS + 1)
    await expect(
      assertActivationOwnedByAgent(client, 'tenant-1', 'support', 'act-a')
    ).resolves.toBeNull()
    expect(get).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})

describe('oversizedRequestError', () => {
  it('rejects when Content-Length exceeds the body ceiling', () => {
    const request = new Request('http://localhost/api/data', {
      method: 'POST',
      headers: { 'content-length': String(600 * 1024) },
    })
    const denied = oversizedRequestError(request)
    expect(denied).toMatchObject({ status: 400 })
  })

  it('allows a missing Content-Length (checked after parse)', () => {
    const request = new Request('http://localhost/api/data', { method: 'POST' })
    expect(oversizedRequestError(request)).toBeNull()
  })
})
