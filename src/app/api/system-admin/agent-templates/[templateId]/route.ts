import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { AgentTemplateAgent } from '@/app/(dashboard)/system-admin/agent-templates/types'

/**
 * Extract templateId from the URL path:
 * /api/system-admin/agent-templates/{templateId}
 */
function extractTemplateId(pathname: string): string | null {
  const match = pathname.match(/\/api\/system-admin\/agent-templates\/([^/]+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * GET /api/system-admin/agent-templates/[templateId]
 * Fetch a single agent template by its MongoDB ObjectId. System administrators only.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const templateId = extractTemplateId(request.nextUrl.pathname)
  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const data = await client.get<AgentTemplateAgent>(
      `/api/v1/admin/agentTemplates/${encodeURIComponent(templateId)}`
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(error, 'system-admin/agent-templates/[templateId] GET', {
      fallbackMessage: 'Failed to fetch agent template',
    })
  }
})

/**
 * DELETE /api/system-admin/agent-templates/[templateId]
 * Permanently delete a system-wide agent template (including its flow
 * definitions and system-scoped knowledge). Existing tenant deployments are
 * NOT removed. System administrators only.
 */
export const DELETE = withSystemAdmin(async (request: NextRequest) => {
  const templateId = extractTemplateId(request.nextUrl.pathname)
  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    await client.delete<unknown>(
      `/api/v1/admin/agentTemplates/${encodeURIComponent(templateId)}`
    )
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleApiError(error, 'system-admin/agent-templates/[templateId] DELETE', {
      fallbackMessage: 'Failed to delete agent template',
    })
  }
})
