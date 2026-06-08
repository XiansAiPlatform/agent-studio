import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * System Admin → enable / disable (lock out) a user.
 * System administrators only (enforced via withSystemAdmin).
 *
 * Wraps the upstream tenant-scoped enable/disable endpoints behind a single
 * PUT that accepts `{ enabled: boolean, reason?: string }`.
 */

/** Extract userId from /api/system-admin/users/{userId}/status. */
function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)\/status$/)
  return match ? decodeURIComponent(match[1]) : null
}

function getTenantId(request: NextRequest): string | null {
  const tenantId = request.nextUrl.searchParams.get('tenantId')
  return tenantId && tenantId.trim() ? tenantId.trim() : null
}

/**
 * PUT /api/system-admin/users/[userId]/status?tenantId=
 * Body: { enabled: boolean, reason?: string }
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

  let body: { enabled?: boolean; reason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json(
      { error: 'enabled (boolean) is required' },
      { status: 400 }
    )
  }

  const base = `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`

  try {
    const client = createXiansClient()
    const data = body.enabled
      ? await client.put(`${base}/enable`, {})
      : await client.put(`${base}/disable`, { reason: body.reason })
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/status PUT', {
      fallbackMessage: 'Failed to update user status',
    })
  }
})
