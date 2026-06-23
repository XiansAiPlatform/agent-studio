/**
 * Hook for fetching and managing an agent's schedules.
 *
 * The tenant is resolved server-side from the session cookie; the agent name
 * (selected via the sidebar agent picker) scopes every request and keys the
 * cache. Schedules can only be listed and deleted — they are created by the
 * agents themselves, so there is no create/update mutation here.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { Schedule, ScheduleDeleteResult, ScheduleRun } from '../types'

interface UseSchedulesOptions {
  agentName?: string
  status?: string
  searchTerm?: string
}

async function parseError(response: Response, fallback: string): Promise<never> {
  const body = await response.json().catch(() => ({}))
  throw new Error(body.error || fallback)
}

async function fetchSchedules(options: UseSchedulesOptions): Promise<Schedule[]> {
  if (!options.agentName) return []

  const params = new URLSearchParams()
  params.set('agentName', options.agentName)
  if (options.status && options.status !== 'all') params.set('status', options.status)
  if (options.searchTerm) params.set('searchTerm', options.searchTerm)

  const response = await fetch(`/api/schedules?${params.toString()}`)
  if (!response.ok) {
    await parseError(response, `Failed to fetch schedules: ${response.statusText}`)
  }

  const data = await response.json()
  // Endpoint returns a bare list; be defensive about wrapped shapes.
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.schedules)) return data.schedules
  if (Array.isArray(data?.items)) return data.items
  return []
}

export async function fetchUpcomingRuns(
  agentName: string,
  scheduleId: string,
  count = 10
): Promise<ScheduleRun[]> {
  const params = new URLSearchParams({ agentName, scheduleId, count: String(count) })
  const response = await fetch(`/api/schedules/upcoming-runs?${params.toString()}`)
  if (!response.ok) {
    await parseError(response, 'Failed to fetch upcoming runs')
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function fetchScheduleHistory(
  agentName: string,
  scheduleId: string,
  count = 50
): Promise<ScheduleRun[]> {
  const params = new URLSearchParams({ agentName, scheduleId, count: String(count) })
  const response = await fetch(`/api/schedules/history?${params.toString()}`)
  if (!response.ok) {
    await parseError(response, 'Failed to fetch schedule history')
  }
  const data = await response.json()
  return Array.isArray(data) ? data : []
}

async function setSchedulePausedRequest(
  agentName: string,
  scheduleId: string,
  paused: boolean
): Promise<void> {
  const params = new URLSearchParams({ agentName, scheduleId })
  const action = paused ? 'pause' : 'resume'
  const response = await fetch(`/api/schedules/${action}?${params.toString()}`, {
    method: 'POST',
  })
  if (!response.ok) {
    await parseError(response, `Failed to ${action} schedule`)
  }
}

async function deleteScheduleRequest(
  agentName: string,
  scheduleId: string
): Promise<void> {
  const params = new URLSearchParams({ agentName, scheduleId })
  const response = await fetch(`/api/schedules/by-id?${params.toString()}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    await parseError(response, 'Failed to delete schedule')
  }
}

async function deleteAllSchedulesRequest(
  agentName: string
): Promise<ScheduleDeleteResult> {
  const params = new URLSearchParams({ agentName })
  const response = await fetch(`/api/schedules?${params.toString()}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    await parseError(response, 'Failed to delete schedules')
  }
  return response.json()
}

export function useSchedules(options: UseSchedulesOptions) {
  const { currentTenantId } = useTenant()
  const [schedules, setSchedules] = useState<Schedule[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const optionsKey = useMemo(
    () =>
      JSON.stringify({
        tenantId: currentTenantId,
        agentName: options.agentName,
        status: options.status,
        searchTerm: options.searchTerm,
      }),
    [currentTenantId, options.agentName, options.status, options.searchTerm]
  )

  const load = useCallback(async () => {
    if (!options.agentName) {
      setSchedules(undefined)
      return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchSchedules(options)
      setSchedules(data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err : new Error('Failed to fetch schedules'))
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey])

  useEffect(() => {
    load()
    return () => abortRef.current?.abort()
  }, [load])

  const deleteSchedule = useCallback(
    async (scheduleId: string) => {
      if (!options.agentName) return
      await deleteScheduleRequest(options.agentName, scheduleId)
      await load()
    },
    [options.agentName, load]
  )

  const setSchedulePaused = useCallback(
    async (scheduleId: string, paused: boolean) => {
      if (!options.agentName) return
      await setSchedulePausedRequest(options.agentName, scheduleId, paused)
      await load()
    },
    [options.agentName, load]
  )

  const deleteAllSchedules = useCallback(async () => {
    if (!options.agentName) return undefined
    const result = await deleteAllSchedulesRequest(options.agentName)
    await load()
    return result
  }, [options.agentName, load])

  return {
    schedules,
    isLoading,
    error,
    refetch: load,
    deleteSchedule,
    deleteAllSchedules,
    setSchedulePaused,
  }
}
