import { NextRequest, NextResponse } from 'next/server';
import { createXiansClient } from '@/lib/xians/client';
import { XiansAgentsApi } from '@/lib/xians/agents';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/tenants/[tenantId]/agents/[agentName]
 * Get agent deployment details by agent name
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; agentName: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId, agentName } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    if (!agentName) {
      return NextResponse.json(
        { error: 'Agent name is required' },
        { status: 400 }
      );
    }

    // Create Xians client
    const client = createXiansClient();
    const agentsApi = new XiansAgentsApi(client);

    // Get agent deployment details
    const agentDeployment = await agentsApi.getAgentDeployment(tenantId, agentName);

    return NextResponse.json(agentDeployment);
  } catch (error: any) {
    console.error('[API] Error fetching agent deployment:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch agent deployment',
        details: error.response || undefined,
      },
      { status: error.status || 500 }
    );
  }
}
