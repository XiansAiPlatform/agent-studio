import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { TemplateDeployments } from '@/app/(dashboard)/system-admin/agent-templates/types'

/**
 * Extract templateId from the URL path:
 * /api/system-admin/agent-templates/{templateId}/deployments
 */
function extractTemplateId(pathname: string): string | null {
  const match = pathname.match(
    /\/api\/system-admin\/agent-templates\/([^/]+)\/deployments$/
  )
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * GET /api/system-admin/agent-templates/[templateId]/deployments
 *
 * Lists the tenants that currently have a deployed instance of the template
 * via GET /api/v1/admin/agentTemplates/{id}/deployments. System administrators only.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const templateId = extractTemplateId(request.nextUrl.pathname)
  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 })
  }

  try {
    const client = createXiansClient()
    const data = await client.get<TemplateDeployments>(
      `/api/v1/admin/agentTemplates/${encodeURIComponent(templateId)}/deployments`
    )
    return NextResponse.json(data)
  } catch (error) {
    return handleApiError(
      error,
      'system-admin/agent-templates/[templateId]/deployments GET',
      { fallbackMessage: 'Failed to fetch template deployments' }
    )
  }
})
