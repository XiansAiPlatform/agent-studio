import { TenantProvider } from "./provider"
import { Tenant, TenantContext } from "@/types/tenant"
import { createXiansClient } from "@/lib/xians/client"
import { XiansTenantsApi } from "@/lib/xians/tenants"
import { XiansTenant } from "@/lib/xians/types"

export class XiansTenantProvider implements TenantProvider {
  /**
   * Convert Xians tenant to internal tenant type
   */
  private mapXiansTenantToTenant(xiansTenant: XiansTenant): Tenant {
    return {
      id: xiansTenant.tenantId,
      name: xiansTenant.name,
      slug: xiansTenant.tenantId.toLowerCase(),
      metadata: {
        domain: xiansTenant.domain,
        description: xiansTenant.description,
        logo: xiansTenant.logo,
        theme: xiansTenant.theme,
        timezone: xiansTenant.timezone,
        enabled: xiansTenant.enabled,
        createdAt: xiansTenant.createdAt,
        updatedAt: xiansTenant.updatedAt,
      }
    }
  }

  async getTenant(tenantId: string, authToken?: string): Promise<Tenant | null> {
    try {
      const client = createXiansClient(authToken)
      const tenantsApi = new XiansTenantsApi(client)
      
      const xiansTenant = await tenantsApi.getTenant(tenantId)
      
      // Only return enabled tenants
      if (xiansTenant.enabled === false) {
        return null
      }
      
      return this.mapXiansTenantToTenant(xiansTenant)
    } catch (error) {
      console.error('Error fetching tenant:', error)
      return null
    }
  }

  async getTenantContext(
    userId: string,
    tenantId: string,
    authToken?: string
  ): Promise<TenantContext | null> {
    const tenant = await this.getTenant(tenantId, authToken)
    if (!tenant) return null

    // For now, assume all users are admins for their tenant
    // This can be enhanced later with proper user role management
    return {
      tenant,
      userRole: 'admin',
      permissions: ['read', 'write', 'delete', 'admin']
    }
  }

  async getUserTenants(userId: string, authToken?: string): Promise<Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
  }>> {
    const client = createXiansClient(authToken)
    const tenantsApi = new XiansTenantsApi(client)
    
    // Get all tenants from Xians
    // Note: Errors are now propagated up to be handled by the caller
    const xiansTenants = await tenantsApi.listTenants()

    // xiansTenants.push({
    //   tenantId: 'neworg',
    //   name: 'Neworg Organization',
    //   domain: 'neworg.com',
    //   description: 'Neworg Organization',
    //   enabled: true,
    //   createdAt: new Date().toISOString(),
    //   updatedAt: new Date().toISOString(),
    // })
    
    // Filter to enabled tenants and map to internal format
    const enabledTenants = xiansTenants
      .filter(t => t.enabled !== false)
      .map(t => ({
        tenant: this.mapXiansTenantToTenant(t),
        role: 'admin' as const  // Default role, can be enhanced later
      }))
    
    return enabledTenants
  }
}
