'use client'

import { useState, useEffect } from 'react'
import { showToast } from '@/lib/toast'

export type PlatformSummary = {
  tenantCount: number
  userCount: number
  agentTemplateCount: number
}

const DEFAULT_SUMMARY: PlatformSummary = {
  tenantCount: 0,
  userCount: 0,
  agentTemplateCount: 0,
}

/**
 * Fetches platform-wide tenant and user counts for the SysAdmin dashboard strip.
 * Only call when the user has `system:admin` (pass enabled=false otherwise).
 */
export function usePlatformSummary(enabled = true) {
  const [summary, setSummary] = useState<PlatformSummary | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    const abortController = new AbortController()

    async function fetchSummary() {
      setIsLoading(true)
      try {
        const response = await fetch('/api/system-admin/summary', {
          signal: abortController.signal,
        })
        if (!response.ok) throw new Error('Failed to fetch platform summary')
        const data: PlatformSummary = await response.json()
        setSummary(data)
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        showToast.error({
          title: 'Failed to load platform overview',
          description:
            error instanceof Error ? error.message : 'Could not load platform counts',
        })
        setSummary(DEFAULT_SUMMARY)
      } finally {
        setIsLoading(false)
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
