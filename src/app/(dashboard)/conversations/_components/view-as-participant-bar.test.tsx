// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import {
  USER_SEARCH_DEBOUNCE_MS,
  USER_SEARCH_TIMEOUT_MS,
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
    const requests: Array<{ signal?: AbortSignal; promise: Promise<unknown> }> = []
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const signal = init?.signal ?? undefined
      const promise = new Promise((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'))
          return
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'))
        })
        if (String(url).includes('search=bob')) {
          resolve(
            jsonResponse({ users: [{ email: 'bob@example.com', name: 'Bob' }] })
          )
        }
      })
      requests.push({ signal, promise })
      return promise
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
    expect(requests[0]?.signal?.aborted).toBe(false)

    fireEvent.change(screen.getByLabelText('Search tenant users'), {
      target: { value: 'bob' },
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(USER_SEARCH_DEBOUNCE_MS)
      await Promise.resolve()
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(requests[0]?.signal?.aborted).toBe(true)
    expect(requests[1]?.signal?.aborted).toBe(false)
    await expect(requests[0]?.promise).rejects.toMatchObject({ name: 'AbortError' })
    expect(screen.queryByRole('status')).toBeNull()
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

  it('drops tenant users whose email or name is not a string', async () => {
    polyfillPointerCapture()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          users: [
            { email: 'alice@example.com', name: 'Alice' },
            { email: 123, name: 'Bad' },
            { email: 'bob@example.com', name: null },
            { name: 'NoEmail' },
          ],
        })
      )
    )

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
    fireEvent.click(screen.getByRole('combobox'))

    expect(
      await screen.findByRole('option', { name: 'Alice (alice@example.com)' })
    ).toBeTruthy()
    expect(screen.queryByText('bob@example.com')).toBeNull()
    expect(screen.queryByText('NoEmail')).toBeNull()
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

  it('surfaces an error when the user search request times out', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          const signal = init?.signal
          if (signal?.aborted) {
            reject(new DOMException('Aborted', 'AbortError'))
            return
          }
          signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      })
    )

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

    await act(async () => {
      await vi.advanceTimersByTimeAsync(USER_SEARCH_TIMEOUT_MS)
      await Promise.resolve()
    })

    expect(screen.getByRole('status').textContent).toMatch(
      /Timed out loading tenant users/
    )
  })

  it('asks for consent before applying view-as, and cancel leaves the admin on their own chats', async () => {
    polyfillPointerCapture()
    const onViewAsChange = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ users: [{ email: 'alice@example.com', name: 'Alice' }] })
      )
    )

    render(
      <ViewAsParticipantBar
        tenantId="tenant-1"
        currentViewAsEmail={null}
        sessionEmail="admin@example.com"
        onViewAsChange={onViewAsChange}
      />
    )

    await chooseViewAsUser('Alice (alice@example.com)')

    expect(
      await screen.findByRole('alertdialog', {
        name: /view another user's conversations/i,
      })
    ).toBeTruthy()
    expect(screen.getByText(/recorded in the audit log/i)).toBeTruthy()
    expect(screen.getByText(/get consent from/i)).toBeTruthy()
    expect(onViewAsChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).toBeNull()
    expect(onViewAsChange).not.toHaveBeenCalled()
  })

  it('applies view-as only after Continue', async () => {
    polyfillPointerCapture()
    const onViewAsChange = vi.fn()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ users: [{ email: 'alice@example.com', name: 'Alice' }] })
      )
    )

    render(
      <ViewAsParticipantBar
        tenantId="tenant-1"
        currentViewAsEmail={null}
        sessionEmail="admin@example.com"
        onViewAsChange={onViewAsChange}
      />
    )

    await chooseViewAsUser('Alice (alice@example.com)')
    fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))

    expect(onViewAsChange).toHaveBeenCalledTimes(1)
    expect(onViewAsChange).toHaveBeenCalledWith('alice@example.com')
  })
})

function polyfillPointerCapture() {
  HTMLElement.prototype.hasPointerCapture = () => false
  HTMLElement.prototype.setPointerCapture = () => {}
  HTMLElement.prototype.releasePointerCapture = () => {}
  HTMLElement.prototype.scrollIntoView = () => {}
}

async function chooseViewAsUser(optionName: string) {
  await act(async () => {
    await Promise.resolve()
  })
  fireEvent.click(screen.getByRole('combobox'))
  fireEvent.click(await screen.findByRole('option', { name: optionName }))
}
