import { NextRequest, NextResponse } from 'next/server';
import { createXiansClient } from '@/lib/xians/client';
import { handleApiError } from '@/lib/api/error-handler';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
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
    const body = await request.json();
    
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
    } = body;

    // SECURITY: Get participantId from authenticated session, not from client
    const participantId = session.user?.email;

    if (!participantId) {
      return NextResponse.json(
        { error: 'User email not found in session' },
        { status: 401 }
      );
    }

    // Validate required fields
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

    if (!text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    // Create Xians client
    const xiansClient = createXiansClient();

    // Prepare request body for Xians API
    const requestBody = {
      agentName,
      activationName,
      participantId,
      text,
      topic,
      data,
      type: type ?? 0, // Default to Chat type (0)
      requestId,
      hint,
      origin,
      // Use the session's access token for authorization
      authorization: (session as any)?.accessToken,
    };

    // Call Xians API to send message
    const response = await xiansClient.post(
      `/api/v1/admin/tenants/${tenantId}/messaging/send`,
      requestBody
    );

    return NextResponse.json(response);
  } catch (error) {
    return handleApiError(error);
  }
}
