import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { handleApiError } from '@/lib/api/error-handler'
import { resolveAgentEditability, resolveAgentEditabilityFor } from '@/lib/auth/agent-access'

/**
 * GET /api/agent-access
 * GET /api/agent-access?userId={idOrEmail}
 *
 * Without `userId`: the set of agents the signed-in user may edit in the
 * current tenant, for the settings-page agent pickers.
 *
 * With `userId`: the same, but for the named user instead of the caller —
 * used by the "Manage access" dialog to tell whether a *listed* user is a
 * TenantAdmin/SysAdmin (who always has full access) even when that user isn't
 * a member of this tenant and so doesn't appear in the tenant user directory.
 * Any caller with settings:view may look this up for any user id; the
 * response is just role flags + this tenant's per-agent grants, not anything
 * more sensitive than what "Manage access" already displays.
 *
 * Tenant comes from the session cookie either way.
 * Response: { canEditAll: boolean, editable: string[], levels: Record<string, 'Read'|'Write'|'Owner'> }
 */
export const GET = withParticipantAdmin(
  async (request: NextRequest, { session, tenantContext }: ApiContext) => {
    try {
      const userId = request.nextUrl.searchParams.get('userId')
      const { canEditAll, levels, editable } = userId
        ? await resolveAgentEditabilityFor(userId, tenantContext.tenant.id)
        : await resolveAgentEditability(session, tenantContext.tenant.id)
      return NextResponse.json({ canEditAll, editable: [...editable], levels })
    } catch (error) {
      return handleApiError(error, 'Agent Access')
    }
  }
)
