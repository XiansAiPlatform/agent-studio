import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * POST /api/messaging/send
 * Send a message. Tenant is injected from session (httpOnly cookie).
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const body = await request.json()

      const {
        agentName,
        activationName,
        text,
        topic,
        data,
        type,
        requestId,
        hint,
        origin,
      } = body

      const isFileUpload = type === 'File'
      const participantId = session.user?.email

      if (!participantId) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 401 }
        )
      }

      if (!agentName || !activationName) {
        return NextResponse.json(
          { error: 'agentName and activationName are required' },
          { status: 400 }
        )
      }

      if (isFileUpload) {
        if (!data) {
          return NextResponse.json(
            { error: 'data (base64 file content) is required for file uploads' },
            { status: 400 }
          )
        }
      } else if (!text) {
        return NextResponse.json(
          { error: 'text is required' },
          { status: 400 }
        )
      }

      const requestBody = {
        agentName,
        activationName,
        participantId,
        text: text ?? (isFileUpload ? '' : undefined),
        topic,
        data,
        type: isFileUpload ? 'File' : (type ?? 0),
        requestId,
        hint,
        origin,
        authorization: (session as any)?.accessToken,
      }

      const xiansClient = createXiansClient()
      const response = await xiansClient.post(
        `/api/v1/admin/tenants/${tenantId}/messaging/send`,
        requestBody
      )

      return NextResponse.json(response)
    } catch (error) {
      return handleApiError(error)
    }
  }
)
