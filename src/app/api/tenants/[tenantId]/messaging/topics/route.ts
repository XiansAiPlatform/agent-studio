import { NextRequest, NextResponse } from 'next/server';
import { createXiansClient } from '@/lib/xians/client';
import { handleApiError } from '@/lib/api/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    
    const agentName = searchParams.get('agentName');
    const activationName = searchParams.get('activationName');
    const participantId = searchParams.get('participantId') || session.user.email || '';
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';

    if (!agentName) {
      return NextResponse.json(
        { error: 'agentName is required' },
        { status: 400 }
      );
    }

    if (!activationName) {
      return NextResponse.json(
        { error: 'activationName is required' },
        { status: 400 }
      );
    }

    // Create Xians client
    const xiansClient = createXiansClient();

    // Build query parameters
    const queryParams = new URLSearchParams({
      agentName,
      activationName,
      participantId,
      page,
      pageSize,
    });

    // Call Xians API to get topics
    const topics = await xiansClient.get(
      `/api/v1/admin/tenants/${tenantId}/messaging/topics?${queryParams.toString()}`
    );

    return NextResponse.json(topics);
  } catch (error) {
    return handleApiError(error);
  }
}
