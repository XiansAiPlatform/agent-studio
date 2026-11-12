// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

const { push, navigation } = vi.hoisted(() => ({
  push: vi.fn(),
  // One object per test: the hook re-reads the URL whenever its identity changes.
  navigation: { searchParams: new URLSearchParams() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => navigation.searchParams,
}))

import { useLogsUrlState } from './use-logs-url-state'

const ACTIVATION = { agentName: 'Agent', activationName: 'prod' }

function renderAt(query: string) {
  navigation.searchParams = new URLSearchParams(query)
  return renderHook(() => useLogsUrlState())
}

const lastUrl = () => push.mock.calls.at(-1)![0] as string
const lastQuery = () => new URLSearchParams(lastUrl().split('?')[1] ?? '')

describe('useLogsUrlState request ID', () => {
  beforeEach(() => push.mockReset())

  it('reads requestId from the URL into the drilled-in log filters', () => {
    const { result } = renderAt('requestId=req-1')

    expect(result.current.selectedRequestId).toBe('req-1')
    expect(result.current.isStreamView).toBe(false)
    expect(result.current.logFilters.requestId).toBe('req-1')
  })

  it('has no request ID, and shows the streams, when the URL has none', () => {
    const { result } = renderAt('')

    expect(result.current.selectedRequestId).toBeNull()
    expect(result.current.isStreamView).toBe(true)
    expect(result.current.logFilters.requestId).toBeUndefined()
  })

  it('keeps the request ID through a page change and filters that leave the scope alone', () => {
    const { result } = renderAt('requestId=req-1')

    act(() => result.current.handlePageChange(2))
    expect(result.current.selectedRequestId).toBe('req-1')
    expect(lastQuery().get('requestId')).toBe('req-1')
    expect(lastQuery().get('page')).toBe('2')

    act(() => result.current.applyFilterSliderChanges(null, null, ['Error'], null, null, 'timeout', false))
    expect(result.current.selectedRequestId).toBe('req-1')
    expect(lastQuery().get('requestId')).toBe('req-1')
    expect(lastQuery().get('search')).toBe('timeout')
  })

  it('drops the request ID when the activation scope changes', () => {
    const { result } = renderAt('requestId=req-1')

    act(() => result.current.applyFilterSliderChanges(ACTIVATION, null, [], null, null, null, false))

    expect(result.current.selectedRequestId).toBeNull()
    expect(result.current.isStreamView).toBe(true)
    expect(lastQuery().has('requestId')).toBe(false)
    expect(lastQuery().get('agent')).toBe('Agent')
  })

  it('drops the request ID when the workflow type scope changes', () => {
    const { result } = renderAt('agent=Agent&activation=prod&requestId=req-1')

    act(() => result.current.applyFilterSliderChanges(ACTIVATION, 'Processing Workflow', [], null, null, null, false))

    expect(result.current.selectedRequestId).toBeNull()
    expect(lastQuery().has('requestId')).toBe(false)
    expect(lastQuery().get('workflowType')).toBe('Processing Workflow')
  })

  it('clears the request ID on Back to streams', () => {
    const { result } = renderAt('requestId=req-1&page=3')

    act(() => result.current.handleBackToStreams())

    expect(result.current.selectedRequestId).toBeNull()
    expect(result.current.isStreamView).toBe(true)
    expect(lastUrl()).toBe('/settings/logs')
  })
})
