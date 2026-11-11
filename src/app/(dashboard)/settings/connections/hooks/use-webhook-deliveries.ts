/**
 * Hook for the calls a builtin webhook has received (its deliveries).
 * The tenant comes from the session cookie, so no tenant id is sent.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  WebhookDeliveryCursor,
  WebhookDeliveryDetail,
  WebhookDeliveryPage,
  WebhookDeliverySummary,
  WebhookRedeliveryResult,
} from '../types'

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.error === 'string') return body.error
    if (typeof body?.error?.message === 'string') return body.error.message
  } catch {
    // Body was not JSON.
  }
  return fallback
}

export function deliveriesUrl(
  integrationId: string,
  limit: number,
  after?: WebhookDeliveryCursor | null
): string {
  const query = new URLSearchParams({ limit: String(limit) })
  if (after) {
    query.set('afterReceivedAt', after.receivedAt)
    query.set('afterId', after.id)
  }
  return `/api/integrations/${encodeURIComponent(integrationId)}/deliveries?${query}`
}

function deliveryUrl(integrationId: string, deliveryId: string): string {
  return `/api/integrations/${encodeURIComponent(integrationId)}/deliveries/${encodeURIComponent(deliveryId)}`
}

async function fetchPage(
  integrationId: string,
  limit: number,
  after: WebhookDeliveryCursor | null,
  signal?: AbortSignal
): Promise<WebhookDeliveryPage> {
  const response = await fetch(deliveriesUrl(integrationId, limit, after), { signal })
  // Nothing has been recorded for this webhook yet, so show it as having no deliveries.
  if (response.status === 404) return { items: [], nextCursor: null }
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to load deliveries'))
  const page = (await response.json()) as WebhookDeliveryPage
  return { items: page.items ?? [], nextCursor: page.nextCursor ?? null }
}

export async function fetchWebhookDelivery(
  integrationId: string,
  deliveryId: string,
  signal?: AbortSignal
): Promise<WebhookDeliveryDetail> {
  const response = await fetch(deliveryUrl(integrationId, deliveryId), { signal })
  if (!response.ok) throw new Error(await errorMessage(response, 'Failed to load delivery'))
  return response.json()
}

/** Sends a recorded call to its webhook again. Resolves once the webhook has answered. */
/** A redelivery that failed. `status` is null when no answer came back at all. */
export class RedeliveryError extends Error {
  constructor(
    message: string,
    readonly status: number | null
  ) {
    super(message)
    this.name = 'RedeliveryError'
  }

  /**
   * True when the call may still have reached the webhook and run the agent: no answer, a
   * timeout, or a server or gateway error. A refusal (403, 404, 409) means nothing was sent.
   */
  get outcomeUnknown(): boolean {
    return this.status === null || this.status === 408 || this.status >= 500
  }
}

export async function redeliverWebhookDelivery(
  integrationId: string,
  deliveryId: string
): Promise<WebhookRedeliveryResult> {
  let response: Response
  try {
    response = await fetch(`${deliveryUrl(integrationId, deliveryId)}/redeliver`, { method: 'POST' })
  } catch (err) {
    throw new RedeliveryError(err instanceof Error ? err.message : 'Failed to redeliver', null)
  }
  if (!response.ok) throw new RedeliveryError(await errorMessage(response, 'Failed to redeliver'), response.status)
  return response.json()
}

interface UseWebhookDeliveriesOptions {
  /** Rows per request. The server accepts 1–200. */
  pageSize?: number
}

export function useWebhookDeliveries(
  integrationId: string | null,
  { pageSize = 50 }: UseWebhookDeliveriesOptions = {}
) {
  const [items, setItems] = useState<WebhookDeliverySummary[]>([])
  const [nextCursor, setNextCursor] = useState<WebhookDeliveryCursor | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // The first page is loading until the key it was fetched for matches the current one.
  const requestKey = integrationId ? `${integrationId}:${pageSize}:${reloadToken}` : null
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const isLoading = requestKey !== null && loadedKey !== requestKey

  // Bumped by every first-page load and delete-all, so a slower Load more can't append stale rows.
  const generation = useRef(0)

  useEffect(() => {
    if (!integrationId || !requestKey) return
    const controller = new AbortController()
    const current = ++generation.current
    fetchPage(integrationId, pageSize, null, controller.signal)
      .then(page => {
        // A delete-all while this page was in flight wins; its rows are already gone.
        if (current !== generation.current) return
        setItems(page.items)
        setNextCursor(page.nextCursor)
        setError(null)
      })
      .catch(err => {
        if (controller.signal.aborted || current !== generation.current) return
        setItems([])
        setNextCursor(null)
        setError(err instanceof Error ? err.message : 'Failed to load deliveries')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedKey(requestKey)
      })
    return () => controller.abort()
  }, [integrationId, pageSize, requestKey])

  const reload = useCallback(() => setReloadToken(n => n + 1), [])

  const loadMore = useCallback(async () => {
    if (!integrationId || !nextCursor || isLoadingMore) return
    const current = generation.current
    setIsLoadingMore(true)
    try {
      const page = await fetchPage(integrationId, pageSize, nextCursor)
      if (current !== generation.current) return
      // A row deleted or trimmed between pages never repeats, but guard against overlap anyway.
      setItems(previous => {
        const seen = new Set(previous.map(item => item.id))
        return [...previous, ...page.items.filter(item => !seen.has(item.id))]
      })
      setNextCursor(page.nextCursor)
    } catch (err) {
      if (current !== generation.current) return
      setError(err instanceof Error ? err.message : 'Failed to load more deliveries')
    } finally {
      // Cleared even when superseded: the flag belongs to this request, and leaving it set would lock Load more.
      setIsLoadingMore(false)
    }
  }, [integrationId, pageSize, nextCursor, isLoadingMore])

  const deleteDelivery = useCallback(
    async (deliveryId: string) => {
      if (!integrationId) return
      const response = await fetch(deliveryUrl(integrationId, deliveryId), { method: 'DELETE' })
      if (!response.ok) throw new Error(await errorMessage(response, 'Failed to delete delivery'))
      setItems(previous => previous.filter(item => item.id !== deliveryId))
    },
    [integrationId]
  )

  /** Deletes every delivery of the webhook, including ones not loaded yet. Returns the number deleted. */
  const deleteAll = useCallback(async (): Promise<number> => {
    if (!integrationId) return 0
    const response = await fetch(`/api/integrations/${encodeURIComponent(integrationId)}/deliveries`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(await errorMessage(response, 'Failed to delete deliveries'))
    const { deletedCount } = (await response.json()) as { deletedCount: number }
    generation.current++
    setItems([])
    setNextCursor(null)
    return deletedCount
  }, [integrationId])

  return {
    items,
    hasMore: nextCursor !== null,
    isLoading,
    isLoadingMore,
    error,
    reload,
    loadMore,
    deleteDelivery,
    deleteAll,
  }
}
