// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const signOut = vi.fn()
let sessionState: { data: unknown; status: string }
let pathname = '/'

vi.mock('next-auth/react', () => ({
  useSession: () => sessionState,
  signOut: (...args: unknown[]) => signOut(...args),
}))
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))

import { SessionGuard } from './session-guard'
import { SESSION_EXPIRED_HEADER } from '@/lib/api/session-expired'

const IDLE_KEY = 'agent-studio-last-activity'
const EXPIRED = { callbackUrl: '/login?reason=expired' }

function authenticated() {
  sessionState = { data: { user: { email: 'a@b.c' } }, status: 'authenticated' }
}

describe('SessionGuard', () => {
  let originalFetch: typeof window.fetch
  let stubFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    signOut.mockReset().mockResolvedValue(undefined)
    localStorage.clear()
    pathname = '/'
    authenticated()
    originalFetch = window.fetch
    stubFetch = vi.fn()
    window.fetch = stubFetch as unknown as typeof window.fetch
    window.history.pushState({}, '', '/')
  })

  afterEach(() => {
    cleanup()
    window.fetch = originalFetch
    vi.useRealTimers()
  })

  it('signs out when unauthenticated', () => {
    sessionState = { data: null, status: 'unauthenticated' }
    render(<SessionGuard idleTimeoutMinutes={0} />)
    expect(signOut).toHaveBeenCalledWith(EXPIRED)
  })

  it('signs out when token refresh failed', () => {
    sessionState = { data: { error: 'RefreshAccessTokenError' }, status: 'authenticated' }
    render(<SessionGuard idleTimeoutMinutes={0} />)
    expect(signOut).toHaveBeenCalledWith(EXPIRED)
  })

  describe('API 401 handling', () => {
    const respond = (status: number, headers: Record<string, string> = {}) =>
      stubFetch.mockResolvedValue(new Response(null, { status, headers }))
    const marked = { [SESSION_EXPIRED_HEADER]: '1' }

    it('signs out on a marked same-origin /api 401', async () => {
      respond(401, marked)
      render(<SessionGuard idleTimeoutMinutes={0} />)
      await window.fetch('/api/tasks')
      expect(signOut).toHaveBeenCalledWith(EXPIRED)
    })

    it.each([
      ['unmarked 401', '/api/tasks', 401, {}],
      ['marked 403', '/api/tasks', 403, marked],
      ['/api/auth 401', '/api/auth/session', 401, marked],
      ['cross-origin 401', 'https://other.example/api/tasks', 401, marked],
    ])('ignores %s', async (_name, url, status, headers) => {
      respond(status, headers)
      render(<SessionGuard idleTimeoutMinutes={0} />)
      await window.fetch(url)
      expect(signOut).not.toHaveBeenCalled()
    })

    it('signs out only once for repeated expiry signals', async () => {
      respond(401, marked)
      render(<SessionGuard idleTimeoutMinutes={0} />)
      await window.fetch('/api/a')
      await window.fetch('/api/b')
      expect(signOut).toHaveBeenCalledTimes(1)
    })

    it('restores the original fetch on unmount', () => {
      const { unmount } = render(<SessionGuard idleTimeoutMinutes={0} />)
      expect(window.fetch).not.toBe(stubFetch)
      unmount()
      expect(window.fetch).toBe(stubFetch)
    })
  })

  describe('idle timeout', () => {
    it('signs out on mount when the stored activity is stale', () => {
      localStorage.setItem(IDLE_KEY, String(Date.now() - 11 * 60 * 1000))
      render(<SessionGuard idleTimeoutMinutes={10} />)
      expect(signOut).toHaveBeenCalledWith(EXPIRED)
      expect(localStorage.getItem(IDLE_KEY)).toBeNull()
    })

    it('signs out after the timeout with no activity', () => {
      render(<SessionGuard idleTimeoutMinutes={1} />)
      vi.advanceTimersByTime(61 * 1000 + 30 * 1000)
      expect(signOut).toHaveBeenCalledTimes(1)
    })

    it('stays signed in while the user is active', () => {
      render(<SessionGuard idleTimeoutMinutes={1} />)
      for (let i = 0; i < 6; i++) {
        vi.advanceTimersByTime(30 * 1000)
        window.dispatchEvent(new Event('mousemove'))
      }
      expect(signOut).not.toHaveBeenCalled()
    })

    it('is disabled when the timeout is 0', () => {
      render(<SessionGuard idleTimeoutMinutes={0} />)
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)
      expect(signOut).not.toHaveBeenCalled()
    })

    it('uses the new timeout when the prop changes', () => {
      const { rerender } = render(<SessionGuard idleTimeoutMinutes={0} />)
      rerender(<SessionGuard idleTimeoutMinutes={1} />)
      vi.advanceTimersByTime(61 * 1000 + 30 * 1000)
      expect(signOut).toHaveBeenCalledTimes(1)
    })
  })

  it('does nothing on public paths and clears stale activity', () => {
    pathname = '/login'
    window.history.pushState({}, '', '/login')
    sessionState = { data: null, status: 'unauthenticated' }
    localStorage.setItem(IDLE_KEY, '1')
    render(<SessionGuard idleTimeoutMinutes={1} />)
    expect(signOut).not.toHaveBeenCalled()
    expect(localStorage.getItem(IDLE_KEY)).toBeNull()
  })
})
