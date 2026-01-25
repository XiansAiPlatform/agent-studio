import { NextRequest, NextResponse } from 'next/server';
import { withTenant, ApiContext } from '@/lib/api/with-tenant';
import { createXiansClient } from '@/lib/xians/client';

/**
 * GET /api/tenants/[tenantId]/logs
 * Fetch logs for a tenant with optional filters
 * 
 * Query Parameters (all optional):
 * - agentName: Filter by agent name
 * - activationName: Filter by activation name
 * - workflowId: Filter by workflow ID
 * - workflowType: Filter by workflow type
 * - logLevel: Filter by log level (comma-separated for multiple)
 * - startDate: Start date in ISO 8601 format
 * - endDate: End date in ISO 8601 format
 * - pageSize: Number of items per page (default: 20, max: 100)
 * - page: Page number (default: 1)
 */
export const GET = withTenant(async (request: NextRequest, context: ApiContext) => {
  try {
    const { tenantId } = context;
    const { searchParams } = new URL(request.url);

    console.log('[Logs API] Fetching logs for tenant:', tenantId);

    // Build query parameters for Xians API
    const params = new URLSearchParams();
    
    // Optional filters from frontend
    const agentName = searchParams.get('agentName');
    const activationName = searchParams.get('activationName');
    const workflowId = searchParams.get('workflowId');
    const workflowType = searchParams.get('workflowType');
    const logLevel = searchParams.get('logLevel');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const pageSize = searchParams.get('pageSize') || '20';
    const page = searchParams.get('page') || '1';

    // Add filters to params
    if (agentName) params.set('agentName', agentName);
    if (activationName) params.set('activationName', activationName);
    if (workflowId) params.set('workflowId', workflowId);
    if (workflowType) params.set('workflowType', workflowType);
    if (logLevel) params.set('logLevel', logLevel);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('pageSize', pageSize);
    params.set('page', page);

    // Note: tenantId and participantId are NOT accepted from frontend
    // tenantId comes from the authenticated session via withTenant middleware
    // participantId filtering is not exposed to frontend (server-side only)

    console.log('[Logs API] Query params:', params.toString());

    const client = createXiansClient();
    
    // Call Xians Admin Logs API
    const response = await client.get<any>(
      `/api/v1/admin/tenants/${tenantId}/logs?${params.toString()}`
    );

    console.log('[Logs API] Fetched logs:', {
      count: response.logs?.length || 0,
      totalCount: response.totalCount,
      page: response.page,
      totalPages: response.totalPages,
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Logs API] Error fetching logs:', error);

    const errorMessage = error.message || 'Failed to fetch logs';
    const status = error.status || 500;

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status }
    );
  }
});
