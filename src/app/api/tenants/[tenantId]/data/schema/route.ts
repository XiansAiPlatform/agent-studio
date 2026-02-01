import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createXiansClient } from '@/lib/xians/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const agentName = searchParams.get('agentName');
    const activationName = searchParams.get('activationName');

    if (!startDate || !endDate || !agentName || !activationName) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate, agentName, activationName' },
        { status: 400 }
      );
    }

    const xiansClient = createXiansClient((session as any)?.accessToken);
    
    const xiansParams = new URLSearchParams({
      startDate,
      endDate,
      agentName,
      activationName,
    });

    const response = await xiansClient.get(
      `/api/v1/admin/tenants/${tenantId}/data/schema?${xiansParams.toString()}`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Data Schema API] Error:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Data schema not found' },
        { status: 404 }
      );
    }
    
    if (error.status === 403) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch data schema' },
      { status: error.status || 500 }
    );
  }
}