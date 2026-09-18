'use client'

import { useCallback, useEffect, useState } from 'react'
import { subscribeMyPendingTaskCountRefresh } from '@/lib/pending-task-count-sync'

type TasksListResponse = {
  tasks?: unknown[]
  totalCount?: number | null
  hasNextPage?: boolean
}

type PendingTaskCountOptions = {
  pollIntervalMs?: number
  agentName?: string
  activationName?: string
}

/**
 * Fetches the count of the current user's pending (Running) HITL tasks.
 * Prefer totalCount when the API provides it; otherwise use the first page length.
 * Safe for participants and all sidebar roles (viewType=my).
 */
export function useMyPendingTaskCount(
  enabled = true,
  options: PendingTaskCountOptions = {}
) {
  const { pollIntervalMs, agentName, activationName } = options
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(enabled)

  const fetchCount = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({
        viewType: 'my',
        status: 'Running',
      })
      if (agentName) params.set('agentName', agentName)
      if (activationName) params.set('activationName', activationName)

      const response = await fetch(`/api/tasks?${params}`, {
        signal,
        cache: 'no-store',
      })
      if (!response.ok) {
        setCount(0)
        return
      }
      const data: TasksListResponse = await response.json()
      if (typeof data.totalCount === 'number') {
        setCount(data.totalCount)
        return
      }
      const length = Array.isArray(data.tasks) ? data.tasks.length : 0
      setCount(data.hasNextPage && length > 0 ? length : length)
    },
    [agentName, activationName]
  )

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      setCount(0)
      return
    }

    const abortController = new AbortController()

    async function load() {
      setIsLoading(true)
      try {
        await fetchCount(abortController.signal)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setCount(0)
      } finally {
        if (!abortController.signal.aborted) setIsLoading(false)
      }
    }

    load()

    const interval =
      pollIntervalMs && pollIntervalMs > 0
        ? window.setInterval(() => {
            fetchCount(abortController.signal).catch((error) => {
              if (error instanceof Error && error.name === 'AbortError') return
            })
          }, pollIntervalMs)
        : null

    const unsubscribe = subscribeMyPendingTaskCountRefresh(() => {
      fetchCount(abortController.signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return
      })
    })

    return () => {
      abortController.abort()
      if (interval) window.clearInterval(interval)
      unsubscribe()
    }
  }, [enabled, fetchCount, pollIntervalMs])

  return { count, isLoading, refetch: fetchCount }
}
