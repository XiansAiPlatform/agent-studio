'use client'

import { useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'

/**
 * Watches for a JWT refresh failure (`session.error`, set by the `jwt`
 * callback in `[...nextauth]/route.ts` when a provider's refresh_token grant
 * itself fails — e.g. the IdP's own refresh token has expired, a boundary
 * usually much longer-lived than the access/id token lifetime the refresh
 * logic otherwise stays ahead of).
 */
export function SessionErrorWatcher() {
  const { data: session } = useSession()
  const handled = useRef(false)

  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError' && !handled.current) {
      handled.current = true
      toast.error('Your session has expired. Please sign in again.')
      signOut({ callbackUrl: '/login' })
    }
  }, [session?.error])

  return null
}
