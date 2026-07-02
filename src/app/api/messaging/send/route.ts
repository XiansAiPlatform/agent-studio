import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

const MAX_FILES = 5
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024

/** Estimate the decoded byte length of a base64 string without allocating a Buffer. */
function estimateBase64Bytes(base64: string): number {
  const len = base64.length
  if (len === 0) return 0
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((len * 3) / 4) - padding
}

/** Validate the `data.files` payload for File-type messages. Returns an error string or null. */
function validateFilePayload(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return 'data.files is required for file uploads'
  }
  const files = (data as { files?: unknown }).files
  if (!Array.isArray(files) || files.length === 0) {
    return 'data.files must be a non-empty array'
  }
  if (files.length > MAX_FILES) {
    return `A maximum of ${MAX_FILES} files can be sent per message`
  }

  let totalBytes = 0
  for (const file of files) {
    if (!file || typeof file !== 'object') {
      return 'Each file must be an object with content, fileName and contentType'
    }
    const { content, fileName, contentType } = file as Record<string, unknown>
    if (typeof content !== 'string' || !content) {
      return 'Each file must include base64 content'
    }
    if (typeof fileName !== 'string' || !fileName) {
      return 'Each file must include a fileName'
    }
    if (typeof contentType !== 'string' || !contentType) {
      return 'Each file must include a contentType'
    }
    const bytes = estimateBase64Bytes(content)
    if (bytes > MAX_FILE_SIZE_BYTES) {
      return `File "${fileName}" exceeds the 10MB per-file limit`
    }
    totalBytes += bytes
  }
  if (totalBytes > MAX_TOTAL_SIZE_BYTES) {
    return 'Combined attachments exceed the 20MB per-message limit'
  }
  return null
}

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

      const xiansClient = createXiansClient()

      // File uploads use the specialized, strongly-typed /send/file endpoint.
      if (isFileUpload) {
        const fileError = validateFilePayload(data)
        if (fileError) {
          return NextResponse.json({ error: fileError }, { status: 400 })
        }

        const fileRequestBody = {
          agentName,
          activationName,
          participantId,
          text: text ?? '',
          files: (data as { files?: unknown }).files,
          topic,
          requestId,
          hint,
          origin,
          authorization: (session as any)?.accessToken,
        }

        const fileResponse = await xiansClient.post(
          `/api/v1/admin/tenants/${tenantId}/messaging/send/file`,
          fileRequestBody
        )

        return NextResponse.json(fileResponse)
      }

      if (!text) {
        return NextResponse.json(
          { error: 'text is required' },
          { status: 400 }
        )
      }

      const requestBody = {
        agentName,
        activationName,
        participantId,
        text,
        topic,
        data,
        type: type ?? 0,
        requestId,
        hint,
        origin,
        authorization: (session as any)?.accessToken,
      }

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
