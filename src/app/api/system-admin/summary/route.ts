import { NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { ListTenantsResponse } from '@/app/(dashboard)/system-admin/tenants/types'
import type { ListGlobalUsersResponse } from '@/app/(dashboard)/system-admin/users/types'
import type { AgentTemplate } from '@/app/(dashboard)/system-admin/agent-templates/types'

/**
 * GET /api/system-admin/summary
 * Lightweight platform counts for the SysAdmin dashboard strip.
 * Tenants/users use pageSize=1 pagination totals; agent templates have no
 * paginated list API, so we fetch basicDataOnly metadata and use array length.
 */
export const GET = withSystemAdmin(async () => {
  try {
    const client = createXiansClient()
    const query = 'page=1&pageSize=1'

    const [tenants, users, templates] = await Promise.all([
      client.get<ListTenantsResponse>(`/api/v1/admin/tenants?${query}`),
      client.get<ListGlobalUsersResponse>(`/api/v1/admin/users?${query}`),
      client.get<AgentTemplate[]>(
        '/api/v1/admin/agentTemplates?basicDataOnly=true'
      ),
    ])

    return NextResponse.json({
      tenantCount: tenants.pagination?.totalItems ?? 0,
      userCount: users.totalCount ?? 0,
      agentTemplateCount: Array.isArray(templates) ? templates.length : 0,
    })
  } catch (error) {
    return handleApiError(error, 'system-admin/summary GET', {
      fallbackMessage: 'Failed to load platform summary',
    })
  }
})
