import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createXiansClient } from '@/lib/xians/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; recordId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, recordId } = await params;

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const xiansClient = createXiansClient((session as any)?.accessToken);

    const response = await xiansClient.delete(
      `/api/v1/admin/tenants/${tenantId}/data/${recordId}`
    );

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Individual Data Delete API] Error:', error);
    
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'Record not found' },
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
      { error: error.message || 'Failed to delete record' },
      { status: error.status || 500 }
    );
  }
}