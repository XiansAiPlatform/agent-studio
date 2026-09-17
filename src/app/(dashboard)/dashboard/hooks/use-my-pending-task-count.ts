'use client'

import { useCallback, useEffect, useState } from 'react'

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

      const response = await fetch(`/api/tasks?${params}`, { signal })
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

    if (!pollIntervalMs || pollIntervalMs <= 0) {
      return () => abortController.abort()
    }

    const interval = window.setInterval(() => {
      fetchCount(abortController.signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') return
      })
    }, pollIntervalMs)

    return () => {
      abortController.abort()
      window.clearInterval(interval)
    }
  }, [enabled, fetchCount, pollIntervalMs])

  return { count, isLoading, refetch: fetchCount }
}
