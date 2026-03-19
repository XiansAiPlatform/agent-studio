import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getUserTenants } from '@/lib/server/get-user-tenants'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'

export const dynamic = 'force-dynamic'

/**
 * Settings layout - restricts access to TenantParticipantAdmin (or system admin) only.
 * Users with TenantParticipant role are redirected to dashboard.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const result = await getUserTenants()

  if (!result.success) {
    if (result.error === 'no_session') {
      redirect('/login')
    }
    redirect('/dashboard')
  }

  const { tenants } = result

  const cookieStore = await cookies()
  const currentTenantId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value
  const currentTenantData = currentTenantId
    ? tenants.find((t: { tenant: { id: string } }) => t.tenant.id === currentTenantId)
    : tenants[0]

  const participantRole = currentTenantData?.participantRole

  if (participantRole !== 'TenantParticipantAdmin') {
    console.log(
      '[Settings Layout] Access denied - user role is not TenantParticipantAdmin, redirecting to dashboard'
    )
    redirect('/dashboard')
  }

  return <>{children}</>
}
