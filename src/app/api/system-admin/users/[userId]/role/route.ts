import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { ALL_ROLES } from '@/app/(dashboard)/system-admin/users/types'

/**
 * System Admin → change a user's role within a tenant.
 * System administrators only (enforced via withSystemAdmin).
 *
 * Assigning the SysAdmin role is permitted here because the upstream call uses
 * the service API key (SysAdmin scope); the backend only allows a SysAdmin
 * caller to grant the global SysAdmin role.
 */

/** Extract userId from /api/system-admin/users/{userId}/role. */
function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)\/role$/)
  return match ? decodeURIComponent(match[1]) : null
}

function getTenantId(request: NextRequest): string | null {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  return tenantId && tenantId.trim() ? tenantId.trim() : null
}

/**
 * PUT /api/system-admin/users/[userId]/role?tenantId=
 * Replace the user's role with the supplied role.
 */
export const PUT = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  const tenantId = getTenantId(request)
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  let body: { role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.role || !ALL_ROLES.includes(body.role as (typeof ALL_ROLES)[number])) {
    return NextResponse.json(
      { error: `role must be one of: ${ALL_ROLES.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const client = createXiansClient()
    const data = await client.put(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}/role`,
      { role: body.role }
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/role PUT', {
      fallbackMessage: 'Failed to change role',
    })
  }
})
