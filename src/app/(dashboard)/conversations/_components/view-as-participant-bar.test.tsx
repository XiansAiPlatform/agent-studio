// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  USER_SEARCH_DEBOUNCE_MS,
  ViewAsParticipantBar,
} from './view-as-participant-bar'

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
  } as Response
}

describe('ViewAsParticipantBar', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('debounces search so fetch fires at most once per 300ms window', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ users: [{ email: 'alice@example.com', name: 'Alice' }] })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ViewAsParticipantBar
        tenantId="tenant-1"
        currentViewAsEmail={null}
        sessionEmail="admin@example.com"
        onViewAsChange={() => {}}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).not.toContain('search=')

    fireEvent.change(screen.getByLabelText('Search tenant users'), {
      target: { value: 'a' },
    })
    fireEvent.change(screen.getByLabelText('Search tenant users'), {
      target: { value: 'al' },
    })
    fireEvent.change(screen.getByLabelText('Search tenant users'), {
      target: { value: 'alice' },
    })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(USER_SEARCH_DEBOUNCE_MS - 1)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('search=alice')
  })

  it('aborts the in-flight request when the search term changes again', async () => {
    vi.useFakeTimers()
    const signals: AbortSignal[] = []
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      const signal = init?.signal
      if (signal) signals.push(signal)
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'))
        })
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(
      <ViewAsParticipantBar
        tenantId="tenant-1"
        currentViewAsEmail={null}
        sessionEmail="admin@example.com"
        onViewAsChange={() => {}}
      />
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(signals[0]?.aborted).toBe(false)

    fireEvent.change(screen.getByLabelText('Search tenant users'), {
      target: { value: 'bob' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(USER_SEARCH_DEBOUNCE_MS)
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
  })

  it('renders the load error and does not list users', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)))

    render(
      <ViewAsParticipantBar
        tenantId="tenant-1"
        currentViewAsEmail={null}
        sessionEmail="admin@example.com"
        onViewAsChange={() => {}}
      />
    )

    const status = await screen.findByRole('status')
    expect(status.textContent).toMatch(/Failed to load tenant users/)
    expect(screen.getByRole('combobox')).toBeTruthy()
    expect(screen.queryByText('alice@example.com')).toBeNull()
  })

  it('renders the empty-user and privacy banner when viewing another user', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ users: [] }))
    )

    render(
      <ViewAsParticipantBar
        tenantId="tenant-1"
        currentViewAsEmail="other@example.com"
        sessionEmail="admin@example.com"
        onViewAsChange={() => {}}
      />
    )

    expect(
      await screen.findByText(/viewing another user's conversations/i)
    ).toBeTruthy()
    expect(screen.getByText('other@example.com')).toBeTruthy()
    expect(screen.getByRole('button', { name: /exit view-as/i })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('combobox')).toBeTruthy()
  })
})
