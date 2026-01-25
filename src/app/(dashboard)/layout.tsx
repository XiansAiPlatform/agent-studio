import { redirect } from 'next/navigation'
import { getUserTenants } from '@/lib/server/get-user-tenants'
import { DashboardLayoutClient } from './layout-client'
import { BackendUnavailable } from '@/components/backend-unavailable'

/**
 * Server Component - Dashboard Layout
 * 
 * Validates user has tenants server-side before rendering.
 * Redirects to /no-access if no tenants found.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch tenants server-side
  const result = await getUserTenants()
  
  // Handle different error states
  if (!result.success) {
    if (result.error === 'no_session') {
      redirect('/login')
    }
    
    if (result.error === 'backend_unavailable') {
      console.error('[Dashboard Layout] Backend unavailable:', result.message)
      return <BackendUnavailable errorMessage={result.message} />
    }
    
    // Unknown error - also show backend unavailable screen
    console.error('[Dashboard Layout] Unknown error:', result.message)
    return <BackendUnavailable errorMessage={result.message} />
  }

  const { tenants } = result
  
  // Server-side redirect if no tenants
  if (tenants.length === 0) {
    console.log('[Dashboard Layout] No tenants found, redirecting to /no-access')
    redirect('/no-access')
  }

  console.log('[Dashboard Layout] User has', tenants.length, 'tenant(s), rendering dashboard')

  // Pass tenants to client component
  return (
    <DashboardLayoutClient initialTenants={tenants}>
      {children}
    </DashboardLayoutClient>
  )
}
