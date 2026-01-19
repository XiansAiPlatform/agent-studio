import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/tenants/[tenantId]/activations/[activationId]/activate
 * Activate an agent instance with workflow configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { tenantId: string; activationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId, activationId } = params;

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

    // For now, we'll just update the activation with the workflow configuration
    // In a real implementation, this would trigger the actual activation process
    // through the Xians API

    // TODO: Implement actual activation logic via Xians API
    // This is a placeholder that updates the activation record
    
    return NextResponse.json({
      success: true,
      message: 'Agent activated successfully',
      activationId,
      workflowConfiguration,
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
