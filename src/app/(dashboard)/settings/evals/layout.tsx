import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { CURRENT_TENANT_COOKIE } from '@/lib/api/with-tenant'
import { hasCapability } from '@/lib/auth/capabilities'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'

export const dynamic = 'force-dynamic'

/**
 * Evals under Agent Settings: Tenant Admin and System Admin only, matching the
 * backend `tenant.healthChecks.manage` default. The API routes enforce the same
 * gate (withTenantAdmin); this layout keeps other roles off the page itself.
 */
export default async function EvalsSettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const cookieStore = await cookies()
  const currentTenantId = cookieStore.get(CURRENT_TENANT_COOKIE)?.value ?? null
  const capabilities = await getCapabilitiesFromSession(session, currentTenantId)
  if (!hasCapability(capabilities, 'evals:manage')) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
