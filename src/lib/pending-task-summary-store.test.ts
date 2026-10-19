import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it, vi } from 'vitest'

type StoreModule = typeof import('./pending-task-summary-store.ts')
type SyncModule = typeof import('./pending-task-count-sync.ts')

class FakeDocument extends EventTarget {
  visibilityState: 'visible' | 'hidden' = 'visible'

  setVisibility(state: 'visible' | 'hidden') {
    this.visibilityState = state
    this.dispatchEvent(new Event('visibilitychange'))
  }
}

let fakeDocument: FakeDocument
let fetchMock: ReturnType<typeof vi.fn>
let store: StoreModule
let sync: SyncModule

function summaryResponse(totalCount: number) {
  return new Response(JSON.stringify({ totalCount, countsByActivation: {} }), { status: 200 })
}

beforeEach(async () => {
  vi.useFakeTimers()
  vi.resetModules()
  fakeDocument = new FakeDocument()
  fetchMock = vi.fn(async () => summaryResponse(2))
  vi.stubGlobal('document', fakeDocument)
  vi.stubGlobal('fetch', fetchMock)
  store = await import('./pending-task-summary-store.ts')
  sync = await import('./pending-task-count-sync.ts')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('pending-task-summary-store', () => {
  it('shares one request between consumers', async () => {
    const releaseA = store.retainPendingTaskSummary('tenant-1')
    const releaseB = store.retainPendingTaskSummary('tenant-1')
    const releaseC = store.retainPendingTaskSummary('tenant-1')

    await vi.advanceTimersByTimeAsync(0)
    assert.equal(fetchMock.mock.calls.length, 1)
    assert.equal(store.getPendingTaskSummarySnapshot().summary.totalCount, 2)

    await vi.advanceTimersByTimeAsync(store.PENDING_TASK_POLL_INTERVAL_MS)
    assert.equal(fetchMock.mock.calls.length, 2)

    releaseA()
    releaseB()
    releaseC()
  })

  it('stops polling while the tab is hidden and resumes when it is visible again', async () => {
    const release = store.retainPendingTaskSummary('tenant-1')
    await vi.advanceTimersByTimeAsync(0)
    assert.equal(fetchMock.mock.calls.length, 1)

    fakeDocument.setVisibility('hidden')
    await vi.advanceTimersByTimeAsync(store.PENDING_TASK_POLL_INTERVAL_MS * 5)
    assert.equal(fetchMock.mock.calls.length, 1)

    fakeDocument.setVisibility('visible')
    await vi.advanceTimersByTimeAsync(0)
    assert.equal(fetchMock.mock.calls.length, 2)

    release()
  })

  it('stops polling once every consumer is released', async () => {
    const release = store.retainPendingTaskSummary('tenant-1')
    await vi.advanceTimersByTimeAsync(0)
    release()

    await vi.advanceTimersByTimeAsync(store.PENDING_TASK_POLL_INTERVAL_MS * 3)
    assert.equal(fetchMock.mock.calls.length, 1)
  })

  it('bypasses the server cache when a refresh is requested', async () => {
    const release = store.retainPendingTaskSummary('tenant-1')
    await vi.advanceTimersByTimeAsync(0)

    sync.refreshMyPendingTaskCounts()
    await vi.advanceTimersByTimeAsync(0)

    assert.equal(fetchMock.mock.calls.length, 2)
    assert.match(String(fetchMock.mock.calls[1][0]), /fresh=1/)
    release()
  })

  it('keeps the last counts when a poll fails', async () => {
    const release = store.retainPendingTaskSummary('tenant-1')
    await vi.advanceTimersByTimeAsync(0)

    fetchMock.mockImplementationOnce(async () => new Response('boom', { status: 502 }))
    await vi.advanceTimersByTimeAsync(store.PENDING_TASK_POLL_INTERVAL_MS)

    assert.equal(fetchMock.mock.calls.length, 2)
    assert.equal(store.getPendingTaskSummarySnapshot().summary.totalCount, 2)
    release()
  })
})
