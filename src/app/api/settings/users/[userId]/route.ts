import { NextRequest, NextResponse } from 'next/server'
import { withTenantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient, XiansApiError } from '@/lib/xians/client'
import { TENANT_ROLES } from '@/app/(dashboard)/system-admin/users/types'

/**
 * Extract userId from the URL path:  /api/settings/users/{userId}
 */
function extractUserId(pathname: string): string | null {
  const match = pathname.match(/\/api\/settings\/users\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * PATCH /api/settings/users/[userId]
 * Update a tenant user (name, email, isApproved, roles).
 * Only accessible by TenantParticipantAdmin.
 *
 * When `roles` is supplied the backend fetches the user's current roles from
 * the Xians platform, computes the diff, and applies each add/remove
 * independently so the result always matches the desired set.
 */
export const PATCH = withTenantAdmin(
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
      roles?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // Validate roles array when provided.
    let desiredRoles: string[] | undefined
    if (body.roles !== undefined) {
      if (!Array.isArray(body.roles) || body.roles.length === 0) {
        return NextResponse.json(
          { error: 'roles must be a non-empty array' },
          { status: 400 }
        )
      }
      const invalid = (body.roles as string[]).find(
        (r) => !TENANT_ROLES.includes(r as (typeof TENANT_ROLES)[number])
      )
      if (invalid) {
        return NextResponse.json(
          { error: `Invalid role "${invalid}". Allowed: ${TENANT_ROLES.join(', ')}` },
          { status: 400 }
        )
      }
      desiredRoles = body.roles as string[]
    }

    try {
      const client = createXiansClient()

      // Update scalar fields (name, email, isApproved) if any were supplied.
      const profileBody: { name?: string; email?: string; isApproved?: boolean } = {}
      if (body.name !== undefined) profileBody.name = body.name
      if (body.email !== undefined) profileBody.email = body.email
      if (body.isApproved !== undefined) profileBody.isApproved = body.isApproved

      let updatedUser: unknown = null
      if (Object.keys(profileBody).length > 0) {
        updatedUser = await client.patch<unknown>(
          `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
          profileBody,
          { headers: { 'X-Tenant-Id': tenantId } }
        )
      }

      // Apply role changes when a desired role set was provided.
      if (desiredRoles) {
        // Fetch the user's current roles for this tenant via the global endpoint.
        const globalUser = await client.get<{
          memberships?: Array<{ tenantId: string; roles: string[] }>
        }>(`/api/v1/admin/users/${encodeURIComponent(userId)}`)

        const currentRoles: string[] =
          globalUser.memberships?.find((m) => m.tenantId === tenantId)?.roles ?? []

        const rolesToAdd = desiredRoles.filter((r) => !currentRoles.includes(r))
        const rolesToRemove = currentRoles.filter((r) => !desiredRoles!.includes(r))

        for (const role of rolesToAdd) {
          await client.patch(
            `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}`,
            { role },
            { headers: { 'X-Tenant-Id': tenantId } }
          )
        }

        for (const role of rolesToRemove) {
          await client.delete(
            `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(role)}`,
            { headers: { 'X-Tenant-Id': tenantId } }
          )
        }

        // Re-fetch to return the latest state.
        updatedUser = await client.get<unknown>(
          `/api/v1/admin/users/${encodeURIComponent(userId)}`
        )
      }

      return NextResponse.json(updatedUser ?? { success: true })
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
 * Remove a user's roles from the tenant.
 * Only accessible by TenantParticipantAdmin.
 */
export const DELETE = withTenantAdmin(
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
