type Listener = () => void

const listeners = new Set<Listener>()
let queued = false

/** Subscribe to pending-count refresh requests (header badge, sidebar, toasts). */
export function subscribeMyPendingTaskCountRefresh(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Ask every mounted pending-count consumer to refetch. Coalesces bursts
 * (several task cards mounting at once) into a single refresh.
 */
export function refreshMyPendingTaskCounts() {
  if (queued) return
  queued = true
  queueMicrotask(() => {
    queued = false
    for (const listener of [...listeners]) {
      listener()
    }
  })
}
