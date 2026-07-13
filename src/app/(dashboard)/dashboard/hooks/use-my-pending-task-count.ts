'use client'

import { useState, useEffect } from 'react'

type TasksListResponse = {
  tasks?: unknown[]
  totalCount?: number | null
  hasNextPage?: boolean
}

/**
 * Fetches the count of the current user's pending (Running) HITL tasks.
 * Prefer totalCount when the API provides it; otherwise use the first page length.
 * Safe for participants and all sidebar roles (viewType=my).
 */
export function useMyPendingTaskCount(enabled = true) {
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    const abortController = new AbortController()

    async function fetchCount() {
      setIsLoading(true)
      try {
        const params = new URLSearchParams({
          viewType: 'my',
          // Tasks page maps frontend "pending" → backend "Running"
          status: 'Running',
        })
        const response = await fetch(`/api/tasks?${params}`, {
          signal: abortController.signal,
        })
        if (!response.ok) {
          setCount(0)
          return
        }
        const data: TasksListResponse = await response.json()
        if (typeof data.totalCount === 'number') {
          setCount(data.totalCount)
        } else {
          const length = Array.isArray(data.tasks) ? data.tasks.length : 0
          // If there are more pages, show at least this page's length as a lower bound
          setCount(data.hasNextPage && length > 0 ? length : length)
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        setCount(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCount()
    return () => abortController.abort()
  }, [enabled])

  return { count, isLoading }
}
