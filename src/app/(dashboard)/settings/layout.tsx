import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'
import { hasCapability } from '@/lib/auth/capabilities'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'

export const dynamic = 'force-dynamic'

/**
 * Agent Settings layout - requires the `settings:view` capability (TenantAdmin,
 * TenantParticipantAdmin, TenantUser, and system admins).
 * Plain TenantParticipant users are redirected to dashboard.
 */
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const cookieStore = await cookies()
  const currentTenantId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value ?? null
  const capabilities = await getCapabilitiesFromSession(session, currentTenantId)

  if (!hasCapability(capabilities, 'settings:view')) {
    console.log(
      '[Settings Layout] Access denied - missing settings:view capability, redirecting to dashboard'
    )
    redirect('/dashboard')
  }

  return <>{children}</>
}
