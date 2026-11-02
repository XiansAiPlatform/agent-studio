'use client'

import { useEffect, useRef } from "react"
import { signOut, useSession } from "next-auth/react"
import { usePathname } from "next/navigation"
import { SESSION_EXPIRED_HEADER } from "@/lib/api/session-expired"

const EXPIRED_CALLBACK_URL = '/login?reason=expired'
const IDLE_STORAGE_KEY = 'agent-studio-last-activity'
const IDLE_CHECK_INTERVAL_MS = 30 * 1000
const ACTIVITY_WRITE_THROTTLE_MS = 5 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const


const PUBLIC_PATH_PREFIXES = ['/login', '/api/auth']

// A forced sign-out must not leave a stale timestamp behind, or the next login
// would be treated as idle and signed out again.
function clearLastActivity() {
  try {
    localStorage.removeItem(IDLE_STORAGE_KEY)
  } catch {
    // Storage unavailable; nothing to clear.
  }
}

function isPublicPath(pathname: string | null) {
  return !!pathname && PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))
}

/**
 * Session Guard
 *
 * Sends the user back to the login page when the session is no longer usable:
 * the session is gone or its token refresh failed, an API call returns 401, or
 * the user has been inactive for too long. Without this, a stale tab silently
 * shows empty data and a placeholder avatar until the user logs out and in.
 */
export function SessionGuard({ idleTimeoutMinutes }: { idleTimeoutMinutes: number }) {
  // 0 disables the idle timeout.
  const IDLE_TIMEOUT_MS = idleTimeoutMinutes * 60 * 1000
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const signingOut = useRef(false)
  const onPublicPath = isPublicPath(pathname)

  const expireSession = useRef(() => {})
  expireSession.current = () => {
    if (signingOut.current || isPublicPath(window.location.pathname)) return
    signingOut.current = true
    clearLastActivity()
    signOut({ callbackUrl: EXPIRED_CALLBACK_URL }).catch(() => {
      window.location.href = EXPIRED_CALLBACK_URL
    })
  }

  // Session missing or its token refresh failed.
  const refreshFailed = session?.error === 'RefreshAccessTokenError'
  useEffect(() => {
    if (onPublicPath) return
    if (status === 'unauthenticated' || refreshFailed) expireSession.current()
  }, [status, refreshFailed, onPublicPath])

  // A 401 marked with SESSION_EXPIRED_HEADER means the session is no longer valid.
  // API routes must use sessionExpiredResponse() for that, and 403 for any other
  // authorization failure, so an unrelated 401 can't sign the user out.
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args)
      if (response.status === 401 && response.headers.get(SESSION_EXPIRED_HEADER)) {
        try {
          const input = args[0]
          const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
          const url = new URL(rawUrl, window.location.origin)
          if (
            url.origin === window.location.origin &&
            url.pathname.startsWith('/api/') &&
            !url.pathname.startsWith('/api/auth/')
          ) {
            expireSession.current()
          }
        } catch {
          // Unparseable URL: not ours to judge.
        }
      }
      return response
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Idle timeout, shared across tabs through localStorage.
  useEffect(() => {
    // Nobody is signed in on public pages (login), so any stored timestamp is stale.
    if (onPublicPath) {
      clearLastActivity()
      return
    }
    if (IDLE_TIMEOUT_MS <= 0 || status !== 'authenticated') return

    // This tab's own last activity, so a missing or unreadable stored value
    // (cleared by another tab, storage blocked) cannot read as "active just now".
    let lastActivity = 0
    const readLastActivity = () => {
      let stored = 0
      try {
        stored = Number(localStorage.getItem(IDLE_STORAGE_KEY)) || 0
      } catch {
        // Storage unavailable; rely on this tab's own activity.
      }
      return Math.max(stored, lastActivity) || Date.now()
    }
    let lastWrite = 0
    const markActive = () => {
      const now = Date.now()
      lastActivity = now
      if (now - lastWrite < ACTIVITY_WRITE_THROTTLE_MS) return
      lastWrite = now
      try {
        localStorage.setItem(IDLE_STORAGE_KEY, String(now))
      } catch {
        // Storage unavailable; idle tracking degrades to this tab's own check.
      }
    }
    const checkIdle = () => {
      if (Date.now() - readLastActivity() > IDLE_TIMEOUT_MS) expireSession.current()
    }
    // Timers are throttled in background tabs, so also check on return.
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkIdle()
    }

    // Check the stored value before this mount counts as activity.
    checkIdle()
    if (signingOut.current) return
    markActive()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, markActive, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(checkIdle, IDLE_CHECK_INTERVAL_MS)

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, markActive))
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(timer)
    }
  }, [status, onPublicPath, IDLE_TIMEOUT_MS])

  return null
}
