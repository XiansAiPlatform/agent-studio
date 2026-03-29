import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'

/**
 * Extract userId from the URL path:  /api/settings/users/{userId}
 */
function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/settings\/users\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * PATCH /api/settings/users/[userId]
 * Update a tenant participant user (name, email, active, role).
 * Only accessible by TenantParticipantAdmin.
 */
export const PATCH = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const userId = extractUserId(request.nextUrl.pathname)

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    let body: {
      name?: string
      email?: string
      isApproved?: boolean
      role?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (
      body.role !== undefined &&
      body.role !== 'TenantParticipant' &&
      body.role !== 'TenantParticipantAdmin'
    ) {
      return NextResponse.json(
        {
          error:
            'role must be TenantParticipant or TenantParticipantAdmin',
        },
        { status: 400 }
      )
    }

    try {
      const client = createXiansClient()
      const data = await client.patch<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
        body,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return NextResponse.json(data)
    } catch (error) {
      const apiErr = error instanceof XiansApiError ? error : null
      console.error('[settings/users PATCH] Failed to update user:', error)
      return NextResponse.json(
        { error: apiErr?.message ?? 'Failed to update user' },
        { status: apiErr?.status ?? 500 }
      )
    }
  }
)

/**
 * DELETE /api/settings/users/[userId]
 * Remove a user's participant roles from the tenant.
 * Only accessible by TenantParticipantAdmin.
 */
export const DELETE = withParticipantAdmin(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id
    const userId = extractUserId(request.nextUrl.pathname)

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    try {
      const client = createXiansClient()
      await client.delete<unknown>(
        `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
        { headers: { 'X-Tenant-Id': tenantId } }
      )
      return new NextResponse(null, { status: 204 })
    } catch (error) {
      const apiErr = error instanceof XiansApiError ? error : null
      console.error('[settings/users DELETE] Failed to delete user:', error)
      return NextResponse.json(
        { error: apiErr?.message ?? 'Failed to delete user' },
        { status: apiErr?.status ?? 500 }
      )
    }
  }
)
