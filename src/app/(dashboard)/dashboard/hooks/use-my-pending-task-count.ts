'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { useTenantStore } from '@/store/tenant-store'
import { refreshMyPendingTaskCounts } from '@/lib/pending-task-count-sync'
import {
  EMPTY_PENDING_TASK_SUMMARY,
  pendingTaskActivationKey,
  type PendingTaskSummary,
} from '@/lib/pending-task-summary'
import {
  getPendingTaskSummaryServerSnapshot,
  getPendingTaskSummarySnapshot,
  retainPendingTaskSummary,
  subscribePendingTaskSummary,
} from '@/lib/pending-task-summary-store'

type PendingTaskCountOptions = {
  agentName?: string
  activationName?: string
}

/**
 * Shared summary of the current user's pending (Running) HITL tasks.
 * Every mounted consumer shares one poll, which pauses while the tab is hidden.
 */
export function useMyPendingTaskSummary(enabled = true): {
  summary: PendingTaskSummary
  isLoading: boolean
} {
  const tenantId = useTenantStore((state) => state.currentTenantId)
  const active = enabled && Boolean(tenantId)
  const snapshot = useSyncExternalStore(
    subscribePendingTaskSummary,
    getPendingTaskSummarySnapshot,
    getPendingTaskSummaryServerSnapshot
  )

  useEffect(() => {
    if (!active || !tenantId) return
    return retainPendingTaskSummary(tenantId)
  }, [active, tenantId])

  if (!active) return { summary: EMPTY_PENDING_TASK_SUMMARY, isLoading: false }
  if (snapshot.tenantId !== tenantId) return { summary: EMPTY_PENDING_TASK_SUMMARY, isLoading: true }
  return { summary: snapshot.summary, isLoading: snapshot.isLoading }
}

/**
 * Count of the current user's pending HITL tasks, optionally for one activation.
 * Safe for participants and all sidebar roles (viewType=my).
 */
export function useMyPendingTaskCount(
  enabled = true,
  options: PendingTaskCountOptions = {}
) {
  const { agentName, activationName } = options
  const { summary, isLoading } = useMyPendingTaskSummary(enabled)
  const count =
    agentName && activationName
      ? summary.countsByActivation[pendingTaskActivationKey(agentName, activationName)] ?? 0
      : summary.totalCount

  return { count, isLoading, refetch: refreshMyPendingTaskCounts }
}
