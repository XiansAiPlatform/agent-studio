import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createXiansClient } from '@/lib/xians/client';

/**
 * POST /api/tenants/[tenantId]/agent-activations/[activationId]/activate
 * Activate an agent instance with workflow configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; activationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId, activationId } = await params;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    if (!activationId) {
      return NextResponse.json(
        { error: 'Activation ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { workflowConfiguration } = body;

    // Create Xians client
    const client = createXiansClient();

    // Call Xians API to activate the agent
    const result = await client.post(
      `/api/v1/admin/tenants/${tenantId}/agentActivations/${activationId}/activate`,
      { workflowConfiguration }
    );

    console.log('[API] Agent activated successfully:', {
      tenantId,
      activationId,
      workflowConfiguration,
      result,
    });

    return NextResponse.json({
      success: true,
      message: 'Agent activated successfully',
      data: result,
    });
  } catch (error: any) {
    console.error('[API] Error activating agent:', error);

    return NextResponse.json(
      {
        error: error.message || 'Failed to activate agent',
        details: error.response || undefined,
      },
      { status: error.status || 500 }
    );
  }
}
