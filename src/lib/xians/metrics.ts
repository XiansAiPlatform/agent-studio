/**
 * Xians Server API - Metrics
 * 
 * API functions for metrics and performance monitoring
 */

import { createXiansClient } from './client';

/**
 * Get metrics categories overview for a tenant
 * GET /api/v1/admin/tenants/{tenantId}/metrics/categories
 */
export async function getMetricsCategories(
  tenantId: string,
  startDate: string,
  endDate: string,
  filters?: {
    agentName?: string;
    activationName?: string;
  },
  authToken?: string
): Promise<any> {
  const client = createXiansClient(authToken);
  
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  
  // Add optional filters
  if (filters?.agentName) {
    params.set('agentName', filters.agentName);
  }
  if (filters?.activationName) {
    params.set('activationName', filters.activationName);
  }
  
  return client.get<any>(
    `/api/v1/admin/tenants/${tenantId}/metrics/categories?${params.toString()}`
  );
}

/**
 * Get metrics statistics for a tenant
 * GET /api/v1/admin/tenants/{tenantId}/metrics/stats
 * 
 * SECURITY WARNING: This function is designed to be called from Next.js API routes only.
 * The participantId filter MUST be derived from the authenticated session, NEVER from client input.
 * API routes should always pass session.user?.email as participantId to ensure users can only
 * view their own metrics.
 */
export async function getMetricsStats(
  tenantId: string,
  startDate: string,
  endDate: string,
  filters?: {
    agentName?: string;
    activationName?: string;
    participantId?: string;  // MUST be from session, never from client
    workflowType?: string;
    model?: string;
  },
  authToken?: string
): Promise<any> {
  const client = createXiansClient(authToken);
  
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  
  // Add optional filters
  if (filters?.agentName) {
    params.set('agentName', filters.agentName);
  }
  if (filters?.activationName) {
    params.set('activationName', filters.activationName);
  }
  if (filters?.participantId) {
    params.set('participantId', filters.participantId);
  }
  if (filters?.workflowType) {
    params.set('workflowType', filters.workflowType);
  }
  if (filters?.model) {
    params.set('model', filters.model);
  }
  
  return client.get<any>(
    `/api/v1/admin/tenants/${tenantId}/metrics/stats?${params.toString()}`
  );
}

/**
 * Get metrics timeseries data for a tenant
 * GET /api/v1/admin/tenants/{tenantId}/metrics/timeseries
 * 
 * SECURITY WARNING: This function is designed to be called from Next.js API routes only.
 * The participantId filter MUST be derived from the authenticated session, NEVER from client input.
 * API routes should always pass session.user?.email as participantId to ensure users can only
 * view their own metrics.
 */
export async function getMetricsTimeseries(
  tenantId: string,
  category: string,
  type: string,
  startDate: string,
  endDate: string,
  groupBy: string = 'day',
  filters?: {
    agentName?: string;
    activationName?: string;
    participantId?: string;  // MUST be from session, never from client
    workflowType?: string;
    model?: string;
  },
  authToken?: string
): Promise<any> {
  const client = createXiansClient(authToken);
  
  const params = new URLSearchParams({
    category,
    type,
    startDate,
    endDate,
    groupBy,
  });
  
  // Add optional filters
  if (filters?.agentName) {
    params.set('agentName', filters.agentName);
  }
  if (filters?.activationName) {
    params.set('activationName', filters.activationName);
  }
  if (filters?.participantId) {
    params.set('participantId', filters.participantId);
  }
  if (filters?.workflowType) {
    params.set('workflowType', filters.workflowType);
  }
  if (filters?.model) {
    params.set('model', filters.model);
  }
  
  return client.get<any>(
    `/api/v1/admin/tenants/${tenantId}/metrics/timeseries?${params.toString()}`
  );
}
