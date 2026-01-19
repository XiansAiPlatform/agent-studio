'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * EnableTenantPage - Legacy route
 * Redirects to /settings/tenant for consistency
 */
export default function EnableTenantPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new settings page
    router.replace('/settings/tenant')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting to settings...</p>
    </div>
  )
}
