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
    const dataType = searchParams.get('dataType');
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '100';

    if (!startDate || !endDate || !agentName || !dataType) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate, agentName, dataType' },
        { status: 400 }
      );
    }

    // Validate pagination parameters
    const skipNum = parseInt(skip, 10);
    const limitNum = parseInt(limit, 10);
    
    if (isNaN(skipNum) || skipNum < 0) {
      return NextResponse.json(
        { error: 'Invalid skip parameter. Must be a non-negative integer.' },
        { status: 400 }
      );
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return NextResponse.json(
        { error: 'Invalid limit parameter. Must be between 1 and 1000.' },
        { status: 400 }
      );
    }

    const xiansClient = createXiansClient(session.accessToken);
    
    const xiansParams = new URLSearchParams({
      startDate,
      endDate,
      agentName,
      dataType,
      skip: skipNum.toString(),
      limit: limitNum.toString(),
    });

    if (activationName) {
      xiansParams.set('activationName', activationName);
    }

    const response = await xiansClient.get(
      `/api/v1/admin/tenants/${tenantId}/data?${xiansParams.toString()}`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Data Records API] Error:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Data records not found' },
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
      { error: error.message || 'Failed to fetch data records' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
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
    const dataType = searchParams.get('dataType');

    if (!startDate || !endDate || !agentName || !dataType) {
      return NextResponse.json(
        { error: 'Missing required parameters: startDate, endDate, agentName, dataType' },
        { status: 400 }
      );
    }

    const xiansClient = createXiansClient(session.accessToken);
    
    const xiansParams = new URLSearchParams({
      startDate,
      endDate,
      agentName,
      dataType,
    });

    const response = await xiansClient.delete(
      `/api/v1/admin/tenants/${tenantId}/data?${xiansParams.toString()}`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Data Delete API] Error:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Data not found' },
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
      { error: error.message || 'Failed to delete data' },
      { status: error.status || 500 }
    );
  }
}