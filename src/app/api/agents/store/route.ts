import { NextResponse } from 'next/server'
import { createXiansSDK } from '@/lib/xians'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/agents/store
 * Fetch Available Agents from Xians server
 * No tenant ID required - SystemScoped agents
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const basicDataOnly = searchParams.get('basicDataOnly') === 'true'

    // Create SDK instance (no auth token needed for public templates)
    const sdk = createXiansSDK()

    // Fetch Available Agents
    const templates = await sdk.agents.listAgentTemplates({
      basicDataOnly,
    })

    return NextResponse.json(templates)
  } catch (error: any) {
    return handleApiError(error, 'Fetch Agent Templates')
  }
}
