import { subscribeMyPendingTaskCountRefresh } from '@/lib/pending-task-count-sync'
import {
  EMPTY_PENDING_TASK_SUMMARY,
  parsePendingTaskSummary,
  type PendingTaskSummary,
} from '@/lib/pending-task-summary'

export const PENDING_TASK_POLL_INTERVAL_MS = 20_000

export type PendingTaskSummarySnapshot = {
  tenantId: string | null
  summary: PendingTaskSummary
  isLoading: boolean
}

const INITIAL_SNAPSHOT: PendingTaskSummarySnapshot = {
  tenantId: null,
  summary: EMPTY_PENDING_TASK_SUMMARY,
  isLoading: true,
}

const listeners = new Set<() => void>()
let snapshot = INITIAL_SNAPSHOT
let activeTenantId: string | null = null
let consumers = 0
let lastFetchedAt = 0
let timer: ReturnType<typeof setTimeout> | null = null
let inflight: { controller: AbortController; promise: Promise<void> } | null = null
let stopRefreshSubscription: (() => void) | null = null

function setSnapshot(next: PendingTaskSummarySnapshot) {
  snapshot = next
  for (const listener of [...listeners]) listener()
}

function isHidden(): boolean {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden'
}

function clearTimer() {
  if (timer) clearTimeout(timer)
  timer = null
}

function load(fresh: boolean): Promise<void> {
  if (inflight && !fresh) return inflight.promise
  inflight?.controller.abort()

  const tenantId = activeTenantId
  const controller = new AbortController()
  const params = new URLSearchParams({ viewType: 'my', status: 'Running', summary: '1' })
  if (fresh) params.set('fresh', '1')

  const promise = (async () => {
    try {
      const response = await fetch(`/api/tasks?${params}`, {
        signal: controller.signal,
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(`Pending task summary failed: ${response.status}`)
      const summary = parsePendingTaskSummary(await response.json())
      if (controller.signal.aborted || tenantId !== activeTenantId) return
      setSnapshot({ tenantId, summary, isLoading: false })
    } catch (error) {
      if (controller.signal.aborted || tenantId !== activeTenantId) return
      if (error instanceof Error && error.name === 'AbortError') return
      // Keep the last known counts; a transient failure should not blank the badges.
      if (snapshot.isLoading) setSnapshot({ ...snapshot, tenantId, isLoading: false })
    } finally {
      if (inflight?.controller === controller) {
        inflight = null
        lastFetchedAt = Date.now()
      }
    }
  })()

  inflight = { controller, promise }
  return promise
}

/** Schedule the next poll, or stop polling when nobody is watching or the tab is hidden. */
function sync() {
  clearTimer()
  if (consumers === 0 || !activeTenantId || isHidden()) return
  const delay = Math.max(0, PENDING_TASK_POLL_INTERVAL_MS - (Date.now() - lastFetchedAt))
  timer = setTimeout(async () => {
    timer = null
    await load(false)
    sync()
  }, delay)
}

function handleVisibilityChange() {
  sync()
}

function handleRefreshRequest() {
  if (consumers === 0 || !activeTenantId) return
  void load(true).then(sync)
}

function resetForTenant(tenantId: string) {
  inflight?.controller.abort()
  inflight = null
  clearTimer()
  activeTenantId = tenantId
  lastFetchedAt = 0
  setSnapshot({ ...INITIAL_SNAPSHOT, tenantId })
}

export function subscribePendingTaskSummary(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPendingTaskSummarySnapshot(): PendingTaskSummarySnapshot {
  return snapshot
}

export function getPendingTaskSummaryServerSnapshot(): PendingTaskSummarySnapshot {
  return INITIAL_SNAPSHOT
}

/**
 * Keep the shared poll running while at least one consumer is mounted.
 * All consumers share a single request every `PENDING_TASK_POLL_INTERVAL_MS`.
 */
export function retainPendingTaskSummary(tenantId: string): () => void {
  if (tenantId !== activeTenantId) resetForTenant(tenantId)

  consumers += 1
  if (consumers === 1) {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
    stopRefreshSubscription = subscribeMyPendingTaskCountRefresh(handleRefreshRequest)
  }
  sync()

  let released = false
  return () => {
    if (released) return
    released = true
    consumers -= 1
    if (consumers > 0) return

    clearTimer()
    inflight?.controller.abort()
    inflight = null
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    stopRefreshSubscription?.()
    stopRefreshSubscription = null
  }
}
