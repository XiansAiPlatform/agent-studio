/**
 * Xians Server API - Tenants
 * 
 * Methods for tenant-related API calls
 */

import { XiansClient } from './client'
import { XiansTenant, CreateTenantRequest, UpdateTenantRequest } from './types'

export class XiansTenantsApi {
  constructor(private client: XiansClient) {}

  /**
   * List all tenants
   * GET /api/v1/admin/tenants
   * X-Tenant-Id header is NOT required
   */
  async listTenants(): Promise<XiansTenant[]> {
    return this.client.get<XiansTenant[]>('/api/v1/admin/tenants')
  }

  /**
   * Create a new tenant
   * POST /api/v1/admin/tenants
   * X-Tenant-Id header is NOT required
   */
  async createTenant(data: CreateTenantRequest): Promise<XiansTenant> {
    console.log(`[Xians Tenants] Creating tenant: ${data.tenantId}`, {
      name: data.name,
      domain: data.domain
    })
    
    try {
      const tenant = await this.client.post<XiansTenant>('/api/v1/admin/tenants', data)
      console.log(`[Xians Tenants] Successfully created tenant: ${data.tenantId}`)
      return tenant
    } catch (error: any) {
      console.error(`[Xians Tenants] Failed to create tenant: ${data.tenantId}`, {
        error: error.message,
        status: error.status
      })
      throw error
    }
  }

  /**
   * Get a tenant by ID
   * GET /api/v1/admin/tenants/{tenantId}
   * X-Tenant-Id header is NOT required
   */
  async getTenant(tenantId: string): Promise<XiansTenant> {
    console.log(`[Xians Tenants] Fetching tenant: ${tenantId}`)
    
    try {
      const tenant = await this.client.get<XiansTenant>(`/api/v1/admin/tenants/${tenantId}`)
      console.log(`[Xians Tenants] Successfully fetched tenant: ${tenantId}`, {
        enabled: tenant.enabled,
        name: tenant.name
      })
      return tenant
    } catch (error: any) {
      console.error(`[Xians Tenants] Failed to fetch tenant: ${tenantId}`, {
        error: error.message,
        status: error.status
      })
      throw error
    }
  }

  /**
   * Update an existing tenant
   * PATCH /api/v1/admin/tenants/{tenantId}
   * X-Tenant-Id header is NOT required
   */
  async updateTenant(
    tenantId: string, 
    data: UpdateTenantRequest
  ): Promise<XiansTenant> {
    console.log(`[Xians Tenants] Updating tenant: ${tenantId}`, data)
    
    try {
      const tenant = await this.client.patch<XiansTenant>(
        `/api/v1/admin/tenants/${tenantId}`,
        data
      )
      console.log(`[Xians Tenants] Successfully updated tenant: ${tenantId}`)
      return tenant
    } catch (error: any) {
      console.error(`[Xians Tenants] Failed to update tenant: ${tenantId}`, {
        error: error.message,
        status: error.status
      })
      throw error
    }
  }

  /**
   * Delete a tenant
   * DELETE /api/v1/admin/tenants/{tenantId}
   * X-Tenant-Id header is NOT required
   */
  async deleteTenant(tenantId: string): Promise<void> {
    return this.client.delete<void>(`/api/v1/admin/tenants/${tenantId}`)
  }

  /**
   * Validate if a tenant exists and is enabled
   */
  async validateTenant(tenantId: string): Promise<boolean> {
    console.log(`[Xians Tenants] Validating tenant: ${tenantId}`)
    
    try {
      const tenant = await this.getTenant(tenantId)
      const isEnabled = tenant.enabled !== false
      
      console.log(`[Xians Tenants] Tenant "${tenantId}" validation result:`, {
        exists: true,
        enabled: isEnabled,
        tenantName: tenant.name,
        domain: tenant.domain
      })
      
      return isEnabled
    } catch (error: any) {
      console.error(`[Xians Tenants] Tenant "${tenantId}" validation failed:`, {
        error: error.message,
        status: error.status,
        reason: error.status === 404 ? 'Tenant not found' : 'API error'
      })
      
      return false
    }
  }
}
