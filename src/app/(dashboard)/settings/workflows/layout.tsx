import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hasCapability } from '@/lib/auth/capabilities'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'

export const dynamic = 'force-dynamic'

/**
 * Temporal Workflows under Agent Settings — Tenant Admin and System Admin only.
 */
export default async function WorkflowsSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const capabilities = await getCapabilitiesFromSession(session, null)
  if (!hasCapability(capabilities, 'tenant:manage-users')) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
