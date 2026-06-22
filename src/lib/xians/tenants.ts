/**
 * Xians Server API - Tenants
 * 
 * Methods for tenant-related API calls
 */

import { XiansClient } from './client'
import { XiansTenant, XiansAdminTenant, XiansParticipantTenant, XiansParticipantTenantsResponse } from './types'
import { createTtlCache, TENANT_LOOKUP_TTL_MS } from './cache'
import { SERVICE_API_KEY_ERROR_HINT, isServiceApiKeyError } from './errors'

// Module-level caches shared across every XiansTenantsApi instance (a fresh
// instance is created per request). Keyed purely by the upstream lookup args
// because results don't depend on the caller — see ./cache for rationale.
const getTenantCache = createTtlCache<XiansTenant>(TENANT_LOOKUP_TTL_MS)
const participantTenantsCache = createTtlCache<XiansParticipantTenantsResponse>(TENANT_LOOKUP_TTL_MS)
const allTenantsCache = createTtlCache<XiansAdminTenant[]>(TENANT_LOOKUP_TTL_MS)

const ALL_TENANTS_CACHE_KEY = '__all__'

export class XiansTenantsApi {
  constructor(private client: XiansClient) {}

  /**
   * Get a tenant by ID
   * GET /api/v1/admin/tenants/{tenantId}
   * Only returns enabled tenants (404 if disabled or not found)
   */
  async getTenant(tenantId: string): Promise<XiansTenant> {
    return getTenantCache.get(tenantId, async () => {
      console.log(`[Xians Tenants] Fetching tenant: ${tenantId}`)

      try {
        // Encode the tenant ID to keep it confined to a single URL path segment.
        // Prevents path traversal / server-side request forgery via crafted IDs.
        const tenant = await this.client.get<XiansTenant>(
          `/api/v1/admin/tenants/${encodeURIComponent(tenantId)}`
        )
        console.log('[Xians Tenants] Successfully fetched tenant: %s', tenantId, {
          name: tenant.name
        })
        return tenant
      } catch (error: any) {
        console.error('[Xians Tenants] Failed to fetch tenant: %s', tenantId, {
          error: error.message,
          status: error.status,
          ...(isServiceApiKeyError(error) ? { hint: SERVICE_API_KEY_ERROR_HINT } : {})
        })
        throw error
      }
    })
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
   * List every tenant on the platform.
   * GET /api/v1/admin/tenants
   * Requires system-admin scope (provided by the service API key). Used to give
   * system admins access to all tenants in the tenant switcher.
   */
  async getAllTenants(): Promise<XiansAdminTenant[]> {
    return allTenantsCache.get(ALL_TENANTS_CACHE_KEY, async () => {
      console.log('[Xians Tenants] Fetching all tenants (system-admin scope)')

      try {
        const tenants = await this.client.get<XiansAdminTenant[]>(
          '/api/v1/admin/tenants'
        )
        console.log(`[Xians Tenants] Fetched ${tenants?.length ?? 0} tenant(s)`)
        return tenants ?? []
      } catch (error: any) {
        console.error('[Xians Tenants] Failed to fetch all tenants:', {
          error: error.message,
          status: error.status,
          ...(isServiceApiKeyError(error) ? { hint: SERVICE_API_KEY_ERROR_HINT } : {})
        })
        throw error
      }
    })
  }

  /**
   * Get participant tenants by email
   * GET /api/v1/admin/participants/{email}/tenants
   * Returns list of tenants where user has TenantParticipant role plus system admin flag
   */
  async getParticipantTenants(email: string): Promise<XiansParticipantTenantsResponse> {
    return participantTenantsCache.get(email, async () => {
      console.log(`[Xians Tenants] Fetching participant tenants for: ${email}`)

      try {
        const response = await this.client.get<XiansParticipantTenantsResponse>(
          `/api/v1/admin/participants/${encodeURIComponent(email)}`
        )

        console.log(`[Xians Tenants] Found ${response.tenants.length} tenants for ${email} (isSystemAdmin: ${response.isSystemAdmin}):`,
          response.tenants.map(t => `${t.tenantId} (${t.tenantName})`).join(', '))

        return response
      } catch (error: any) {
        console.error(`[Xians Tenants] Failed to fetch participant tenants for ${email}:`, {
          error: error.message,
          status: error.status,
          ...(isServiceApiKeyError(error) ? { hint: SERVICE_API_KEY_ERROR_HINT } : {})
        })

        // If 404, user has no tenants - return empty response
        if (error.status === 404) {
          return {
            isSystemAdmin: false,
            tenants: []
          }
        }

        throw error
      }
    })
  }
}
