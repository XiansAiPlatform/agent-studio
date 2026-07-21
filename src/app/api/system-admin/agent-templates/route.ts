import { NextRequest, NextResponse } from 'next/server'
import { withSystemAdmin } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'
import type { AgentTemplate } from '@/app/(dashboard)/system-admin/agent-templates/types'

/**
 * GET /api/system-admin/agent-templates
 *
 * Lists all system-wide agent templates (system-scoped agents) via
 * GET /api/v1/admin/agentTemplates. System administrators only.
 *
 * Supports ?basicDataOnly=true to skip heavy definition payloads (source,
 * markdown, activities) — the agent metadata is always returned in full.
 */
export const GET = withSystemAdmin(async (request: NextRequest) => {
  const basicDataOnly = request.nextUrl.searchParams.get('basicDataOnly') ?? 'true'

  try {
    const client = createXiansClient()
    const data = await client.get<AgentTemplate[]>(
      `/api/v1/admin/agentTemplates?basicDataOnly=${basicDataOnly === 'false' ? 'false' : 'true'}`
    )
    return NextResponse.json(data ?? [])
  } catch (error) {
    return handleApiError(error, 'system-admin/agent-templates GET', {
      fallbackMessage: 'Failed to list agent templates',
    })
  }
})
