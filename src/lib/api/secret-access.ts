import { Session } from 'next-auth'
import { hasCapability } from '@/lib/auth/capabilities'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'

/**
 * Who may manage which user-scoped secrets.
 *
 * Every `settings:view` holder manages tenant-scoped secrets and their OWN
 * user-scoped secrets. Only holders of `secrets:manage-user-scoped`
 * (TenantParticipantAdmin, SysAdmin) may touch secrets that belong to other
 * tenant members.
 */
export interface SecretAccess {
  /** Caller's participant id (lowercase email), or null when unknown. */
  selfUserId: string | null
  canManageOtherUsers: boolean
}

export function normalizeSecretUserId(userId: string | null | undefined): string | null {
  const trimmed = userId?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

/**
 * Whether the caller may create, delete or see a secret owned by `ownerUserId`.
 * Tenant-scoped secrets (no owner) are always allowed.
 */
export function canManageSecretOwner(
  access: SecretAccess,
  ownerUserId: string | null | undefined
): boolean {
  const owner = normalizeSecretUserId(ownerUserId)
  if (!owner) return true
  if (access.canManageOtherUsers) return true
  return access.selfUserId !== null && owner === access.selfUserId
}

export async function resolveSecretAccess(
  session: Session,
  tenantId: string
): Promise<SecretAccess> {
  const capabilities = await getCapabilitiesFromSession(session, tenantId)
  return {
    selfUserId: normalizeSecretUserId(session.user?.email),
    canManageOtherUsers: hasCapability(capabilities, 'secrets:manage-user-scoped'),
  }
}
