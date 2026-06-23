/**
 * Server-side capability resolution.
 *
 * Resolves a user's effective capabilities by making a single
 * `getParticipantTenants` call to the Xians backend and mapping the result
 * through the shared capability model. This is the one place that talks to the
 * backend for authorization; middleware, server layouts and API helpers all go
 * through it so the role -> capability mapping lives in exactly one spot.
 */

import type { Session } from 'next-auth'
import { createXiansClient } from '@/lib/xians/client'
import { XiansTenantsApi } from '@/lib/xians/tenants'
import { getCapabilities, type Capability } from './capabilities'

interface ResolveInput {
  email?: string | null
  accessToken?: string | null
  /** Tenant whose participant role should be considered. Optional for global checks. */
  tenantId?: string | null
}

/**
 * Resolve the capabilities for a user identity. Returns an empty list if the
 * user cannot be identified or the backend lookup fails (fail closed).
 */
export async function resolveCapabilities(input: ResolveInput): Promise<Capability[]> {
  if (!input.email) return []

  try {
    const client = createXiansClient(input.accessToken ?? undefined)
    const tenantsApi = new XiansTenantsApi(client)
    const response = await tenantsApi.getParticipantTenants(input.email)

    if (response.isSystemAdmin) {
      return getCapabilities({ isSystemAdmin: true })
    }

    if (!input.tenantId) {
      // No tenant context and not a system admin: nothing tenant-scoped to grant.
      return []
    }

    const participant = response.tenants.find((t) => t.tenantId === input.tenantId)
    return getCapabilities({ participantRole: participant?.role })
  } catch (error) {
    console.error('[Auth] Failed to resolve capabilities:', error)
    return []
  }
}

/** Resolve capabilities from a NextAuth session (server components / API routes). */
export async function getCapabilitiesFromSession(
  session: Session | null,
  tenantId: string | null
): Promise<Capability[]> {
  if (!session?.user?.email) return []
  return resolveCapabilities({
    email: session.user.email,
    accessToken: (session as { accessToken?: string }).accessToken,
    tenantId,
  })
}

/** Resolve capabilities from a middleware JWT token. */
export async function getCapabilitiesFromToken(
  token: { email?: string | null; accessToken?: string } | null,
  tenantId: string | null
): Promise<Capability[]> {
  if (!token?.email) return []
  return resolveCapabilities({
    email: token.email,
    accessToken: token.accessToken,
    tenantId,
  })
}
