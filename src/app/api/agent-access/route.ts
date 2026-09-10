import { NextRequest, NextResponse } from 'next/server'
import { withParticipantAdmin, ApiContext } from '@/lib/api/with-tenant'
import { handleApiError } from '@/lib/api/error-handler'
import { resolveAgentEditability } from '@/lib/auth/agent-access'

/**
 * GET /api/agent-access
 * The set of agents the signed-in user may edit in the current tenant, for the
 * settings-page agent pickers. Tenant comes from the session cookie.
 * Response: { canEditAll: boolean, editable: string[], levels: Record<string, 'Read'|'Write'|'Owner'> }
 */
export const GET = withParticipantAdmin(
  async (_request: NextRequest, { session, tenantContext }: ApiContext) => {
    try {
      const { canEditAll, levels, editable } = await resolveAgentEditability(
        session,
        tenantContext.tenant.id
      )
      return NextResponse.json({ canEditAll, editable: [...editable], levels })
    } catch (error) {
      return handleApiError(error, 'Agent Access')
    }
  }
)
