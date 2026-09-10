import type { Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { forbiddenError } from '@/lib/api/error-handler'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'
import { hasCapability } from '@/lib/auth/capabilities'
import type { AgentAccess } from '@/lib/xians/types'

/**
 * Gate for the agent access-management routes.
 *
 * Per product decision the manager must be a Tenant Admin / System Admin, or an
 * owner of that specific agent. Tenant/System admin is authoritative (resolved
 * from the backend role). The owner check is best-effort: the backend stores the
 * canonical user id (`provider|subject`) on `ownerAccess`, while the Studio
 * session exposes the raw subject plus the email, so we match on either and also
 * accept `createdBy`. The backend Admin API itself only checks the service
 * credential, so this Studio-side gate is the real per-user boundary.
 *
 * @returns a NextResponse error to short-circuit with, or null when allowed.
 */
export async function assertCanManageAgentAccess(
  session: Session,
  tenantId: string,
  access: Pick<AgentAccess, 'ownerAccess' | 'createdBy'>
): Promise<NextResponse | null> {
  const capabilities = await getCapabilitiesFromSession(session, tenantId)
  if (
    hasCapability(capabilities, 'system:admin') ||
    hasCapability(capabilities, 'tenant:manage-users')
  ) {
    return null
  }

  const identities = [session.user?.id, session.user?.email].filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  )
  const owners = access.ownerAccess ?? []
  const isOwner =
    identities.some((id) => owners.includes(id)) ||
    identities.some((id) => id === access.createdBy)

  if (isOwner) return null

  return forbiddenError(
    'Only an owner of this agent or a tenant administrator can manage its access.'
  )
}
