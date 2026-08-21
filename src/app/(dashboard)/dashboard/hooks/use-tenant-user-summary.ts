'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/lib/toast'
import { useResolvedLoading } from '@/hooks/use-resolved-loading'

type TenantUserSummary = {
  totalCount: number
}

const DEFAULT_SUMMARY: TenantUserSummary = { totalCount: 0 }

/**
 * Fetches the current tenant's user count for Organizational Overview.
 * Uses pageSize=1 so only the pagination total is needed.
 * Only call when the user has `tenant:manage-users` (pass enabled=false otherwise).
 */
export function useTenantUserSummary(enabled = true) {
  const [summary, setSummary] = useState<TenantUserSummary | null>(null)
  const fetchKey = enabled ? 'tenant-user-summary' : null
  const { isLoading, resolve } = useResolvedLoading(fetchKey, false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const abortController = new AbortController()

    async function fetchSummary() {
      try {
        const params = new URLSearchParams({ page: '1', pageSize: '1' })
        const response = await fetch(`/api/settings/users?${params}`, {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error('Failed to fetch tenant user summary')
        const data = await response.json()
        setSummary({ totalCount: data.totalCount ?? 0 })
        resolve('tenant-user-summary')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        showToast.error({
          title: 'Failed to load user summary',
          description:
            error instanceof Error ? error.message : 'Could not load tenant user count',
        })
        setSummary(DEFAULT_SUMMARY)
        resolve('tenant-user-summary')
      }
    }

    fetchSummary()
    return () => abortController.abort()
  }, [enabled])

  return {
    summary: summary ?? DEFAULT_SUMMARY,
    isLoading,
  }
}
