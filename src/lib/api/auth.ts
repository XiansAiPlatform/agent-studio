/**
 * API Authorization Utilities
 * 
 * Helpers for verifying user permissions and roles in API routes
 */

import { Session } from 'next-auth'
import { createXiansClient } from '@/lib/xians/client'
import { XiansTenantsApi } from '@/lib/xians/tenants'
import { forbiddenError, unauthorizedError } from './error-handler'
import { NextResponse } from 'next/server'

/**
 * Verify if a user is a system administrator
 * Makes a fresh API call to check current admin status (not relying on session cache)
 * 
 * @param session - The user's session
 * @returns Object with isSystemAdmin boolean and user email
 * @throws Error if verification fails or user is not authenticated
 */
export async function verifySystemAdmin(session: Session | null): Promise<{
  isSystemAdmin: boolean
  email: string
}> {
  if (!session?.user?.email) {
    throw new Error('User email not found in session')
  }

  const email = session.user.email

  try {
    // Create Xians client with user's access token
    const client = createXiansClient((session as any)?.accessToken)
    const tenantsApi = new XiansTenantsApi(client)

    // Make fresh API call to check current system admin status
    const response = await tenantsApi.getParticipantTenants(email)

    console.log('[Auth] System admin verification for', email, '- isSystemAdmin:', response.isSystemAdmin)

    return {
      isSystemAdmin: response.isSystemAdmin,
      email,
    }
  } catch (error: any) {
    console.error('[Auth] Failed to verify system admin status:', error)
    throw new Error(`Failed to verify system admin status: ${error.message}`)
  }
}

/**
 * Require system admin access for an API route
 * Returns a forbidden error response if user is not a system admin
 * 
 * @param session - The user's session
 * @returns null if user is authorized, NextResponse with error if not
 * 
 * @example
 * ```typescript
 * const session = await getServerSession(authOptions)
 * const authError = await requireSystemAdmin(session)
 * if (authError) return authError
 * 
 * // User is verified as system admin, continue with protected logic
 * ```
 */
export async function requireSystemAdmin(
  session: Session | null
): Promise<NextResponse | null> {
  // Check if session exists
  if (!session) {
    return unauthorizedError('Authentication required')
  }

  try {
    // Verify system admin status with fresh API call
    const { isSystemAdmin, email } = await verifySystemAdmin(session)

    if (!isSystemAdmin) {
      console.warn('[Auth] Access denied - user is not a system admin:', email)
      return forbiddenError('System administrator access required')
    }

    // User is authorized
    console.log('[Auth] System admin access granted:', email)
    return null
  } catch (error: any) {
    console.error('[Auth] System admin verification failed:', error)
    return forbiddenError('Unable to verify system administrator access')
  }
}

/**
 * Check if user is a system admin (without throwing/returning errors)
 * Useful for conditional logic where you want to handle the result yourself
 * 
 * @param session - The user's session
 * @returns true if user is system admin, false otherwise
 */
export async function isSystemAdmin(session: Session | null): Promise<boolean> {
  if (!session) {
    return false
  }

  try {
    const { isSystemAdmin } = await verifySystemAdmin(session)
    return isSystemAdmin
  } catch (error) {
    console.error('[Auth] Failed to check system admin status:', error)
    return false
  }
}
