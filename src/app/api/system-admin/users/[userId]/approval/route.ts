import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * PUT /api/system-admin/users/[userId]/approval?tenantId=
 *
 * Toggle the isApproved flag for a user's membership in a specific tenant.
 * Body: { isApproved: boolean }
 * Requires tenantId as a query parameter.
 */

function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/users\/([^/]+)\/approval$/)
  return match ? decodeURIComponent(match[1]) : null
}

export const PUT = withSystemAdmin(async (request: NextRequest) => {
  const userId = extractUserId(request.nextUrl.pathname)
  const tenantId = request.nextUrl.searchParams.get('tenantId')?.trim() || null

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  let body: { isApproved?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.isApproved !== 'boolean') {
    return NextResponse.json({ error: 'isApproved (boolean) is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const data = await client.patch(
      `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
      { isApproved: body.isApproved }
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/users/[userId]/approval PUT', {
      fallbackMessage: 'Failed to update approval status',
    })
  }
})
