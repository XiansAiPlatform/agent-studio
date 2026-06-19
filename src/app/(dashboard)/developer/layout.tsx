import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getUserTenants } from '@/lib/server/get-user-tenants'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'

export const dynamic = 'force-dynamic'

/**
 * Developer layout — restricts access to TenantUser (Developer), TenantParticipantAdmin,
 * TenantAdmin, and system admins. Plain TenantParticipants are redirected.
 */
export default async function DeveloperLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

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
  const developerRoles = new Set(['TenantAdmin', 'TenantParticipantAdmin', 'TenantUser'])

  if (!participantRole || !developerRoles.has(participantRole)) {
    console.log(
      '[Developer Layout] Access denied — role',
      participantRole,
      'not in developer roles, redirecting to dashboard'
    )
    redirect('/dashboard')
  }

  return <>{children}</>
}
