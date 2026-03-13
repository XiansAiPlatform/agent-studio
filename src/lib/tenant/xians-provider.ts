import { TenantProvider } from "./provider"
import { Tenant, TenantContext } from "@/types/tenant"
import { createXiansClient } from "@/lib/xians/client"
import { XiansTenantsApi } from "@/lib/xians/tenants"
import { XiansTenant } from "@/lib/xians/types"
import { COLOR_THEMES, type ColorThemeId } from "@/lib/themes"

const VALID_THEMES = Object.keys(COLOR_THEMES) as ColorThemeId[]

export class XiansTenantProvider implements TenantProvider {
  /**
   * Convert Xians tenant to internal tenant type
   */
  private mapXiansTenantToTenant(xiansTenant: XiansTenant): Tenant {
    const normalised = xiansTenant.theme?.trim().toLowerCase()
    const theme = normalised && VALID_THEMES.includes(normalised as ColorThemeId)
      ? (normalised as ColorThemeId)
      : undefined
    return {
      id: xiansTenant.tenantId,
      name: xiansTenant.name,
      slug: xiansTenant.tenantId.toLowerCase(),
      theme,
      metadata: {
        logo: xiansTenant.logo
      }
    }
  }

  async getTenant(tenantId: string, authToken?: string): Promise<Tenant | null> {
    try {
      const client = createXiansClient(authToken)
      const tenantsApi = new XiansTenantsApi(client)
      
      const xiansTenant = await tenantsApi.getTenant(tenantId)
      
      // API only returns enabled tenants
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

  async getUserTenants(userId: string, authToken?: string, userEmail?: string): Promise<Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
  }>> {
    const client = createXiansClient(authToken)
    const tenantsApi = new XiansTenantsApi(client)
    
    if (!userEmail) {
      console.warn('[XiansTenantProvider] No email provided, cannot fetch participant tenants')
      return []
    }
    
    // Get participant tenants using the new API
    // This returns tenant IDs and names where user has TenantParticipant role
    const response = await tenantsApi.getParticipantTenants(userEmail)
    
    if (response.tenants.length === 0) {
      console.log('[XiansTenantProvider] User has no tenant access')
      return []
    }
    
    console.log('[XiansTenantProvider] User has access to', response.tenants.length, 'tenant(s), isSystemAdmin:', response.isSystemAdmin)
    
    // Fetch full tenant details for each participant tenant
    const tenantPromises = response.tenants.map(async (participantTenant) => {
      const tenantId = participantTenant.tenantId
      const participantRole = participantTenant.role
      const role: 'owner' | 'admin' | 'member' | 'viewer' =
        participantRole !== 'TenantParticipant' ? 'admin' : 'member'
      try {
        const xiansTenant = await tenantsApi.getTenant(tenantId)
        // Prefer the theme from the full tenant response; fall back to the participant list value
        if (!xiansTenant.theme && participantTenant.theme) {
          xiansTenant.theme = participantTenant.theme
        }
        return {
          tenant: this.mapXiansTenantToTenant(xiansTenant),
          role,
          participantRole,
        }
      } catch (error) {
        console.warn(`[XiansTenantProvider] Could not fetch full details for tenant ${tenantId}, using participant list data`)
        // Fall back to the data already available from the participant list response
        const fallbackTenant: XiansTenant = {
          tenantId: participantTenant.tenantId,
          name: participantTenant.tenantName,
          theme: participantTenant.theme,
          logo: participantTenant.logo,
        }
        return {
          tenant: this.mapXiansTenantToTenant(fallbackTenant),
          role,
          participantRole,
        }
      }
    })
    
    const tenants = await Promise.all(tenantPromises)
    
    // Filter out nulls (failed fetches or disabled tenants)
    return tenants.filter((t): t is NonNullable<typeof t> => t !== null)
  }
}
