'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * EnableTenantPage - Legacy route
 * Redirects to /no-access page for users without tenant access
 */
export default function EnableTenantPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the no-access page
    router.replace('/no-access')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
