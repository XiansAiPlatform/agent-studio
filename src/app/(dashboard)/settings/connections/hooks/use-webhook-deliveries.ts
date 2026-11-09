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

interface UseWebhookDeliveriesOptions {
  /** Rows per request. The server accepts 1–200. */
  pageSize?: number
}

/**
 * Whether a workflow has written any logs. Logs for a run that doesn't exist, or hasn't logged yet,
 * would open an empty page, so callers link elsewhere when this is false. Any failure counts as false.
 */
export async function workflowHasLogs(workflowId: string, signal?: AbortSignal): Promise<boolean> {
  const query = new URLSearchParams({ workflowId, pageSize: '1', page: '1' })
  try {
    const response = await fetch(`/api/logs?${query}`, { signal })
    if (!response.ok) return false
    const data = (await response.json()) as { totalCount?: number }
    return (data.totalCount ?? 0) > 0
  } catch {
    return false
  }
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
