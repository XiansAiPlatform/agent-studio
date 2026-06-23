import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getUserTenants } from '@/lib/server/get-user-tenants'
import { DashboardLayoutClient } from './layout-client'
import { BackendUnavailable } from '@/components/backend-unavailable'
import { AccountLocked } from '@/components/account-locked'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'
import { getCapabilities, hasCapability } from '@/lib/auth/capabilities'
import { roleLabel } from '@/lib/auth/roles'

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

    if (result.error === 'config_error') {
      console.error('[Dashboard Layout] Backend authentication failed (check XIANS_APIKEY):', result.message)
      return <BackendUnavailable variant="configuration" errorMessage={result.message} />
    }

    if (result.error === 'access_denied') {
      console.error('[Dashboard Layout] Access denied:', result.message)
      return <AccountLocked errorMessage={result.message} />
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

  // Resolve capabilities server-side from the participant role + system-admin
  // flag. The raw participantRole is never sent to the client; capabilities (a
  // safe, derived abstraction) and a display label are sent instead.
  const isSystemAdmin = result.session?.user?.isSystemAdmin === true

  const cookieStore = await cookies()
  const currentTenantId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value
  const currentTenantData = currentTenantId
    ? tenants.find((t) => t.tenant.id === currentTenantId)
    : tenants[0]
  const participantRole = currentTenantData?.participantRole
  const currentCapabilities = getCapabilities({ participantRole, isSystemAdmin })

  // Anyone with the full-layout capability gets the sidebar. An unknown current
  // tenant (cookie mismatch / no tenant access) falls back to the full layout
  // for robustness, matching prior behavior.
  const showSidebar =
    participantRole === undefined
      ? true
      : hasCapability(currentCapabilities, 'app:use-full-layout')

  const tenantHasTheme = !!currentTenantData?.tenant?.theme
  const canCustomizeTheme =
    hasCapability(currentCapabilities, 'theme:customize') || !tenantHasTheme

  // Map each tenant to client-safe data: capabilities + a display role label.
  // The raw participantRole is intentionally stripped here.
  const initialTenants = tenants.map(({ tenant, role, participantRole: pr }) => ({
    tenant,
    role,
    capabilities: getCapabilities({ participantRole: pr, isSystemAdmin }),
    roleLabel: pr ? roleLabel(pr) : null,
  }))

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
