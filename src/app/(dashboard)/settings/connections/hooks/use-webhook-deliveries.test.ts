// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { deliveriesUrl, useWebhookDeliveries } from './use-webhook-deliveries'
import type { WebhookDeliverySummary } from '../types'

function delivery(n: number): WebhookDeliverySummary {
  return {
    id: `019a0000-0000-7000-8000-${String(n).padStart(12, '0')}`,
    requestId: `request-${n}`,
    receivedAt: new Date(Date.UTC(2026, 10, 3, 4, 0, 60 - n)).toISOString(),
    bodyTruncated: false,
    headersTruncated: false,
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('deliveriesUrl', () => {
  it('includes the cursor only when there is one', () => {
    expect(deliveriesUrl('hook-1', 50)).toBe('/api/integrations/hook-1/deliveries?limit=50')
    expect(deliveriesUrl('hook-1', 2, { receivedAt: '2026-11-03T04:00:00.000Z', id: 'abc' })).toBe(
      '/api/integrations/hook-1/deliveries?limit=2&afterReceivedAt=2026-11-03T04%3A00%3A00.000Z&afterId=abc'
    )
  })
})

describe('useWebhookDeliveries', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the first page, then the next one with the cursor', async () => {
    const [a, b, c] = [delivery(1), delivery(2), delivery(3)]
    fetchMock
      .mockResolvedValueOnce(json({ items: [a, b], nextCursor: { receivedAt: b.receivedAt, id: b.id } }))
      .mockResolvedValueOnce(json({ items: [c], nextCursor: null }))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1', { pageSize: 2 }))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual([a, b])
    expect(result.current.hasMore).toBe(true)

    await act(() => result.current.loadMore())

    expect(fetchMock).toHaveBeenLastCalledWith(deliveriesUrl('hook-1', 2, { receivedAt: b.receivedAt, id: b.id }), {
      signal: undefined,
    })
    expect(result.current.items).toEqual([a, b, c])
    expect(result.current.hasMore).toBe(false)
  })

  it('never shows a row twice when pages overlap', async () => {
    const [a, b] = [delivery(1), delivery(2)]
    fetchMock
      .mockResolvedValueOnce(json({ items: [a], nextCursor: { receivedAt: a.receivedAt, id: a.id } }))
      .mockResolvedValueOnce(json({ items: [a, b], nextCursor: null }))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1', { pageSize: 1 }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(() => result.current.loadMore())

    expect(result.current.items.map(i => i.id)).toEqual([a.id, b.id])
  })

  it('shows no deliveries, not an error, when the server has none recorded (404)', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'Webhook not found' }, 404))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
    expect(result.current.items).toEqual([])
    expect(result.current.hasMore).toBe(false)
  })

  it('shows the server error message when the list fails', async () => {
    fetchMock.mockResolvedValueOnce(json({ error: 'Internal server error' }, 500))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('Internal server error')
    expect(result.current.items).toEqual([])
  })

  it('removes a deleted delivery from the list', async () => {
    const [a, b] = [delivery(1), delivery(2)]
    fetchMock
      .mockResolvedValueOnce(json({ items: [a, b], nextCursor: null }))
      .mockResolvedValueOnce(json({ success: true }))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    await act(() => result.current.deleteDelivery(a.id))

    expect(fetchMock).toHaveBeenLastCalledWith(`/api/integrations/hook-1/deliveries/${a.id}`, { method: 'DELETE' })
    expect(result.current.items).toEqual([b])
  })

  it('keeps the list when a delete fails', async () => {
    const a = delivery(1)
    fetchMock
      .mockResolvedValueOnce(json({ items: [a], nextCursor: null }))
      .mockResolvedValueOnce(json({ error: 'Incoming call not found' }, 404))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await expect(act(() => result.current.deleteDelivery(a.id))).rejects.toThrow('Incoming call not found')
    expect(result.current.items).toEqual([a])
  })

  it('empties the list after delete all and returns the count', async () => {
    const a = delivery(1)
    fetchMock
      .mockResolvedValueOnce(json({ items: [a], nextCursor: { receivedAt: a.receivedAt, id: a.id } }))
      .mockResolvedValueOnce(json({ deletedCount: 2 }))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1', { pageSize: 1 }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let deleted = 0
    await act(async () => {
      deleted = await result.current.deleteAll()
    })

    expect(deleted).toBe(2)
    expect(result.current.items).toEqual([])
    expect(result.current.hasMore).toBe(false)
  })

  it('reloads the first page on request', async () => {
    const [a, b] = [delivery(1), delivery(2)]
    fetchMock
      .mockResolvedValueOnce(json({ items: [a], nextCursor: null }))
      .mockResolvedValueOnce(json({ items: [b, a], nextCursor: null }))

    const { result } = renderHook(() => useWebhookDeliveries('hook-1'))
    await waitFor(() => expect(result.current.items).toEqual([a]))

    act(() => result.current.reload())

    await waitFor(() => expect(result.current.items).toEqual([b, a]))
    expect(result.current.isLoading).toBe(false)
  })
})
