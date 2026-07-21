'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'
import type { Capability } from '@/lib/auth/capabilities'

interface RequireCapabilityProps {
  /** Capability required to stay on the page. */
  permission: Capability
  children: React.ReactNode
  /** Where to send users who lack the capability. Defaults to /dashboard. */
  redirectTo?: string
  /** Rendered while auth is still loading or a redirect is in flight. */
  fallback?: React.ReactNode
}

/**
 * Client-side UX guard for whole pages. Redirects users lacking the capability
 * once auth has loaded. Real authorization is enforced server-side (middleware
 * + layouts + API route guards); this only avoids flashing inaccessible UI.
 */
export function RequireCapability({
  permission,
  children,
  redirectTo = '/dashboard',
  fallback = null,
}: RequireCapabilityProps) {
  const router = useRouter()
  const { isLoading } = useAuth()
  const { can } = usePermissions()
  const allowed = can(permission)

  useEffect(() => {
    if (!isLoading && !allowed) {
      router.replace(redirectTo)
    }
  }, [isLoading, allowed, redirectTo, router])

  if (isLoading || !allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
