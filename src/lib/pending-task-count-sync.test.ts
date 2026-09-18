import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  refreshMyPendingTaskCounts,
  subscribeMyPendingTaskCountRefresh,
} from './pending-task-count-sync.ts'

describe('pending-task-count-sync', () => {
  it('notifies subscribers once when several refreshes are queued together', async () => {
    let calls = 0
    const unsubscribe = subscribeMyPendingTaskCountRefresh(() => {
      calls += 1
    })

    refreshMyPendingTaskCounts()
    refreshMyPendingTaskCounts()
    refreshMyPendingTaskCounts()

    await new Promise<void>((resolve) => queueMicrotask(() => resolve()))
    assert.equal(calls, 1)
    unsubscribe()
  })

  it('does not notify after unsubscribe', async () => {
    let calls = 0
    const unsubscribe = subscribeMyPendingTaskCountRefresh(() => {
      calls += 1
    })
    unsubscribe()

    refreshMyPendingTaskCounts()
    await new Promise<void>((resolve) => queueMicrotask(() => resolve()))
    assert.equal(calls, 0)
  })
})
