import { NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import { resolveSecretAccess } from '@/lib/api/secret-access'
import { normalizeTenantUser } from '@/app/(dashboard)/tenant-settings/users/types'

/**
 * GET /api/settings/secrets/participants
 * Directory of tenant users for the user-scoped secret picker.
 * Requires secrets:manage-user-scoped (TenantParticipantAdmin, SysAdmin): only
 * callers who may create secrets for other members need the member directory.
 * Returns only identity fields (no roles or lockout data).
 */
export const GET = withParticipantAdmin(
  async (_request, { session, tenantContext }: ApiContext) => {
    const tenantId = tenantContext.tenant.id

    try {
      const access = await resolveSecretAccess(session, tenantId)
      if (!access.canManageOtherUsers) {
        return NextResponse.json(
          { error: 'Not authorized to list tenant participants' },
          { status: 403 }
        )
      }

      const client = createXiansClient()
      const participants: Array<{ userId: string; name: string; email: string }> = []
      let page = 1
      const pageSize = 100
      let hasMore = true

      while (hasMore) {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        })
        const data = await client.get<{
          users?: unknown[]
          page?: number
          pageSize?: number
          totalCount?: number
        }>(
          `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}/users?${params.toString()}`,
          { headers: { 'X-Tenant-Id': tenantId } }
        )

        const pageUsers = (data.users ?? []).map((raw) => {
          const user = normalizeTenantUser(raw)
          return {
            userId: user.userId,
            name: user.name,
            email: user.email,
          }
        }).filter((user) => user.userId || user.email)

        participants.push(...pageUsers)

        const loaded = page * (data.pageSize ?? pageSize)
        const total = data.totalCount ?? participants.length
        hasMore = pageUsers.length > 0 && loaded < total
        page += 1
        if (page > 50) break
      }

      return NextResponse.json({ participants })
    } catch (error) {
      return handleApiError(error, 'settings/secrets/participants GET', {
        fallbackMessage: 'Failed to list participants',
      })
    }
  }
)
