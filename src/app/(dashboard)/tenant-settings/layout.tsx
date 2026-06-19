import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserTenants } from '@/lib/server/get-user-tenants'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'

export const dynamic = 'force-dynamic'

/**
 * Tenant Settings layout - restricts access to TenantParticipantAdmin or system admins only.
 * Users with TenantParticipant role are redirected to dashboard.
 */
export default async function TenantSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // System admins always have access
  if (session.user?.isSystemAdmin) {
    return <>{children}</>
  }

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

  if (participantRole !== 'TenantAdmin') {
    console.log(
      '[Tenant Settings Layout] Access denied - user role is not TenantAdmin, redirecting to dashboard'
    )
    redirect('/dashboard')
  }

  return <>{children}</>
}
