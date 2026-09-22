import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { requireSystemAdmin } from '@/lib/api/auth'
import { handleApiError, validationError } from '@/lib/api/error-handler'
import {
  isEmailTenantMember,
  recordConversationViewAsAudit,
} from '@/lib/api/messaging-view-as'

/**
 * POST /api/messaging/view-as/audit
 * Records that a system admin entered view-as mode for conversations.
 * The messaging read path also records this (idempotent per admin+target+tenant).
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const authError = await requireSystemAdmin(session)
      if (authError) return authError

      const adminEmail = session?.user?.email?.trim()
      if (!adminEmail) {
        return validationError('User email not found in session')
      }

      const body = (await request.json()) as Record<string, unknown>
      const viewAsParticipantId =
        typeof body.viewAsParticipantId === 'string'
          ? body.viewAsParticipantId.trim()
          : ''
      const agentName =
        typeof body.agentName === 'string' ? body.agentName.trim() : null
      const activationName =
        typeof body.activationName === 'string' ? body.activationName.trim() : null

      if (!viewAsParticipantId) {
        return validationError('viewAsParticipantId is required')
      }

      if (viewAsParticipantId.toLowerCase() === adminEmail.toLowerCase()) {
        return NextResponse.json({ success: true, skipped: true })
      }

      const tenantId = tenantContext.tenant.id
      const accessToken = (session as { accessToken?: string }).accessToken
      const isMember = await isEmailTenantMember(
        tenantId,
        viewAsParticipantId,
        accessToken
      )
      if (!isMember) {
        return validationError('Selected user is not a member of this tenant')
      }

      await recordConversationViewAsAudit(
        {
          tenantId,
          adminEmail,
          viewAsParticipantId,
          agentName,
          activationName,
        },
        accessToken
      )

      return NextResponse.json({ success: true })
    } catch (error) {
      return handleApiError(error, 'messaging/view-as/audit POST', {
        fallbackMessage: 'Failed to record view-as audit',
      })
    }
  }
)
