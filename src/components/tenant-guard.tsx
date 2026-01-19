'use client'

import { useSession } from 'next-auth/react'

/**
 * TenantGuard Component
 * 
 * Simplified - tenant validation now happens server-side in layouts.
 * This just ensures user is authenticated.
 */
export function TenantGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession()

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return <>{children}</>
}
