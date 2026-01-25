/**
 * Xians Server API - Tenants
 * 
 * Methods for tenant-related API calls
 */

import { XiansClient } from './client'
import { XiansTenant, XiansParticipantTenant } from './types'

export class XiansTenantsApi {
  constructor(private client: XiansClient) {}

  /**
   * Get a tenant by ID
   * GET /api/v1/admin/tenants/{tenantId}
   * Only returns enabled tenants (404 if disabled or not found)
   */
  async getTenant(tenantId: string): Promise<XiansTenant> {
    console.log(`[Xians Tenants] Fetching tenant: ${tenantId}`)
    
    try {
      const tenant = await this.client.get<XiansTenant>(`/api/v1/admin/tenants/${tenantId}`)
      console.log(`[Xians Tenants] Successfully fetched tenant: ${tenantId}`, {
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
   * Validate if a tenant exists and is enabled
   * Returns true if tenant exists (API only returns enabled tenants)
   */
  async validateTenant(tenantId: string): Promise<boolean> {
    console.log(`[Xians Tenants] Validating tenant: ${tenantId}`)
    
    try {
      const tenant = await this.getTenant(tenantId)
      
      console.log(`[Xians Tenants] Tenant "${tenantId}" is valid:`, {
        tenantName: tenant.name
      })
      
      return true
    } catch (error: any) {
      console.error(`[Xians Tenants] Tenant "${tenantId}" validation failed:`, {
        error: error.message,
        status: error.status,
        reason: error.status === 404 ? 'Tenant not found or disabled' : 'API error'
      })
      
      return false
    }
  }

  /**
   * Get participant tenants by email
   * GET /api/v1/admin/participants/{email}/tenants
   * Returns list of tenants where user has TenantParticipant role
   */
  async getParticipantTenants(email: string): Promise<XiansParticipantTenant[]> {
    console.log(`[Xians Tenants] Fetching participant tenants for: ${email}`)
    
    try {
      const participantTenants = await this.client.get<XiansParticipantTenant[]>(
        `/api/v1/admin/participants/${encodeURIComponent(email)}/tenants`
      )
      
      console.log(`[Xians Tenants] Found ${participantTenants.length} tenants for ${email}:`, 
        participantTenants.map(t => `${t.tenantId} (${t.tenantName})`).join(', '))
      
      return participantTenants
    } catch (error: any) {
      console.error(`[Xians Tenants] Failed to fetch participant tenants for ${email}:`, {
        error: error.message,
        status: error.status
      })
      
      // If 404, user has no tenants - return empty array
      if (error.status === 404) {
        return []
      }
      
      throw error
    }
  }
}
