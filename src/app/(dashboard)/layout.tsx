import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getUserTenants } from '@/lib/server/get-user-tenants'
import { DashboardLayoutClient } from './layout-client'
import { BackendUnavailable } from '@/components/backend-unavailable'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'

/**
 * Server Component - Dashboard Layout
 *
 * Validates user has tenants server-side before rendering.
 * Redirects to /no-access if no tenants found.
 * Layout mode (sidebar vs single-panel) is determined server-side from participant
 * role - never exposed to client to prevent manipulation.
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

  // Determine layout mode from current tenant's participant role (server-only)
  const cookieStore = await cookies()
  const currentTenantId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value
  const currentTenantData = currentTenantId
    ? tenants.find((t) => t.tenant.id === currentTenantId)
    : tenants[0]
  const participantRole = currentTenantData?.participantRole
  const showSidebar =
    participantRole !== 'TenantParticipant' // TenantParticipantAdmin or undefined (cookie mismatch / no tenant access) → full layout for robustness

  const tenantHasTheme = !!currentTenantData?.tenant?.theme
  const isParticipantAdmin = participantRole === 'TenantParticipantAdmin'
  const canCustomizeTheme = isParticipantAdmin || !tenantHasTheme

  // Strip participantRole from tenants - never pass to client
  const initialTenants = tenants.map(({ tenant, role }) => ({ tenant, role }))

  console.log(
    '[Dashboard Layout] User has',
    tenants.length,
    'tenant(s), layout:',
    showSidebar ? 'sidebar' : 'participant',
    ', rendering dashboard'
  )

  return (
    <DashboardLayoutClient
      initialTenants={initialTenants}
      showSidebar={showSidebar}
      canCustomizeTheme={canCustomizeTheme}
    >
      {children}
    </DashboardLayoutClient>
  )
}
