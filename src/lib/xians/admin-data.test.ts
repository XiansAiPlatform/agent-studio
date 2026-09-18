import { beforeEach, describe, expect, it, vi } from 'vitest'
import { XiansApiError, type XiansClient } from '@/lib/xians/client'

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

function mockClient(getImpl: XiansClient['get']): XiansClient {
  return { get: getImpl } as unknown as XiansClient
}

describe('loadRecordIfEditable', () => {
  const session = { user: { email: 'user@example.com' } } as never

  beforeEach(() => {
    mockedAssertCanEditAgent.mockReset()
  })

  it('returns 404 when AdminAPI has no record', async () => {
    const client = mockClient(
      vi.fn().mockRejectedValue(new XiansApiError('missing', 404))
    )

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
    const client = mockClient(
      vi.fn().mockResolvedValue({ id: 'rec-1', agentName: 'other-agent' })
    )

    const [item, denied] = await loadRecordIfEditable(client, session, 'tenant-1', 'rec-1')

    expect(item).toBeNull()
    expect(denied).toBe(forbidden)
    expect(mockedAssertCanEditAgent).toHaveBeenCalledWith(session, 'tenant-1', 'other-agent')
  })

  it('returns the record when the caller may edit the owning agent', async () => {
    mockedAssertCanEditAgent.mockResolvedValue(null)
    const record = { id: 'rec-1', agentName: 'support', key: 'k' }
    const client = mockClient(vi.fn().mockResolvedValue(record))

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
    const get = vi.fn().mockResolvedValue({
      data: [{ name: 'act-a', agentName: 'other-agent' }],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    const denied = await assertActivationOwnedByAgent(
      mockClient(get),
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
    const get = vi.fn().mockResolvedValue({
      data: [{ name: 'act-a', agentName: 'support' }],
      pagination: { page: 1, pageSize: 100, total: 500, totalPages: 5 },
    })

    const denied = await assertActivationOwnedByAgent(
      mockClient(get),
      'tenant-1',
      'support',
      'act-a'
    )

    expect(denied).toBeNull()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('reuses a positive hit within the short TTL and refetches after it expires', async () => {
    vi.useFakeTimers()
    const get = vi.fn().mockResolvedValue({
      data: [{ name: 'act-a', agentName: 'support' }],
      pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
    })
    const client = mockClient(get)

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
