import { NextRequest, NextResponse } from 'next/server';
import { createXiansClient } from '@/lib/xians/client';
import { handleApiError } from '@/lib/api/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
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
    const topic = searchParams.get('topic'); // Can be null (omitted), empty string (general discussions), or topic name

    // SECURITY: Get participantId from authenticated session, not from client
    const participantId = session.user?.email;

    if (!participantId) {
      return NextResponse.json(
        { error: 'User email not found in session' },
        { status: 401 }
      );
    }

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
    });

    // Add topic parameter if provided
    // null = not provided (don't add to query params)
    // undefined or empty string = general discussions (scope=null)
    // specific string = that topic
    if (topic !== null) {
      queryParams.append('topic', topic);
    }

    // Call Xians API to delete messages
    await xiansClient.delete(
      `/api/v1/admin/tenants/${tenantId}/messaging/messages?${queryParams.toString()}`
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
