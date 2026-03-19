import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { requireParticipantAdmin } from '@/lib/api/auth'
import { getTenantIdFromCookie } from '@/lib/api/with-tenant'

/**
 * GET /api/can-access-settings
 * Checks if the authenticated user has TenantParticipantAdmin (or system admin) access.
 * Used by middleware to enforce settings route protection.
 * Returns 200 if allowed, 403 if not.
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const tenantId = getTenantIdFromCookie(request)
  const authError = await requireParticipantAdmin(session, tenantId)
  if (authError) {
    return authError
  }
  return NextResponse.json({ ok: true })
}
