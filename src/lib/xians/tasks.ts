/**
 * Xians Server API - Tasks
 * 
 * API functions for task operations
 */

import { createXiansClient } from './client'
import { XiansTenantStats } from './types'

/**
 * Get tenant statistics (tasks and messages) for a tenant within a date range
 * GET /api/v1/admin/tenants/{tenantId}/stats
 */
export async function getTenantStats(
  tenantId: string,
  startDate: string,
  endDate: string,
  authToken?: string
): Promise<XiansTenantStats> {
  const client = createXiansClient(authToken)
  
  const params = new URLSearchParams({
    startDate,
    endDate,
  })
  
  return client.get<XiansTenantStats>(
    `/api/v1/admin/tenants/${tenantId}/stats?${params.toString()}`
  )
}
