/**
 * API Authorization Utilities
 *
 * Helpers for verifying user capabilities in API routes. All checks resolve the
 * user's capabilities once (via `resolveCapabilities`) and gate on a capability
 * rather than hardcoded role strings, so the role -> capability mapping lives in
 * a single place (`@/lib/auth/capabilities`).
 */

import { Session } from 'next-auth'
import { forbiddenError, unauthorizedError } from './error-handler'
import { NextResponse } from 'next/server'
import { hasCapability, type Capability } from '@/lib/auth/capabilities'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'

/**
 * Generic capability gate for API routes.
 *
 * Resolves the current user's capabilities (fresh backend lookup) for the given
 * tenant and returns a NextResponse error if the required capability is missing,
 * or null if the user is authorized.
 *
 * @param session - The user's session
 * @param tenantId - The current tenant ID (from the current-tenant-id cookie),
 *   or null for global checks such as `system:admin`
 * @param capability - The capability required to access the route
 * @param forbiddenMessage - Message used for the 403 response
 */
export async function requireCapability(
  session: Session | null,
  tenantId: string | null,
  capability: Capability,
  forbiddenMessage: string
): Promise<NextResponse | null> {
  if (!session) {
    return unauthorizedError('Authentication required')
  }

  try {
    const capabilities = await getCapabilitiesFromSession(session, tenantId)
    if (!hasCapability(capabilities, capability)) {
      console.warn(
        `[Auth] Access denied - missing capability "${capability}" for`,
        session.user?.email
      )
      return forbiddenError(forbiddenMessage)
    }
    return null
  } catch (error) {
    console.error(`[Auth] Capability check failed for "${capability}":`, error)
    return forbiddenError(forbiddenMessage)
  }
}

/**
 * Check if the current user is a system administrator (non-throwing).
 * Useful for conditional logic where you want to handle the result yourself.
 * @public
 */
export async function isSystemAdmin(session: Session | null): Promise<boolean> {
  if (!session) return false
  try {
    const capabilities = await getCapabilitiesFromSession(session, null)
    return hasCapability(capabilities, 'system:admin')
  } catch (error) {
    console.error('[Auth] Failed to check system admin status:', error)
    return false
  }
}

/**
 * Require system administrator access for an API route.
 * Returns a forbidden error response if the user is not a system admin.
 *
 * @example
 * const session = await getServerSession(authOptions)
 * const authError = await requireSystemAdmin(session)
 * if (authError) return authError
 */
export async function requireSystemAdmin(
  session: Session | null
): Promise<NextResponse | null> {
  return requireCapability(
    session,
    null,
    'system:admin',
    'System administrator access required'
  )
}

/**
 * Require access to Agent Settings (`/settings/*`) for an API route.
 * Granted to TenantAdmin, TenantParticipantAdmin, TenantUser, and system admins.
 *
 * @param session - The user's session
 * @param currentTenantId - The tenant ID from the current-tenant-id cookie
 */
export async function requireParticipantAdmin(
  session: Session | null,
  currentTenantId: string | null
): Promise<NextResponse | null> {
  if (session && !currentTenantId) {
    return forbiddenError('Participant admin access requires a selected tenant')
  }
  return requireCapability(
    session,
    currentTenantId,
    'settings:view',
    'Participant administrator access required'
  )
}

/**
 * Require tenant user-management access (`/tenant-settings/*`) for an API route.
 * Granted to TenantAdmin and system admins only.
 *
 * @param session - The user's session
 * @param currentTenantId - The tenant ID from the current-tenant-id cookie
 */
export async function requireTenantAdmin(
  session: Session | null,
  currentTenantId: string | null
): Promise<NextResponse | null> {
  if (session && !currentTenantId) {
    return forbiddenError('Tenant admin access requires a selected tenant')
  }
  return requireCapability(
    session,
    currentTenantId,
    'tenant:manage-users',
    'Tenant administrator access required'
  )
}
