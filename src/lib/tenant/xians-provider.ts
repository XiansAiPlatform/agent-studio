import { TenantProvider } from "./provider"
import { Tenant, TenantContext } from "@/types/tenant"
import { createXiansClient } from "@/lib/xians/client"
import { XiansTenantsApi } from "@/lib/xians/tenants"
import { XiansTenant, XiansAdminTenant, XiansParticipantTenant, XiansParticipantRole } from "@/lib/xians/types"
import { COLOR_THEMES, type ColorThemeId } from "@/lib/themes"
import { proxyTenantLogo } from "@/lib/tenant/logo"

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
        logo: proxyTenantLogo(xiansTenant.tenantId, xiansTenant.logo)
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
    authToken?: string,
    userEmail?: string
  ): Promise<TenantContext | null> {
    if (!userEmail) {
      console.warn('[XiansTenantProvider] getTenantContext called without userEmail; denying access')
      return null
    }

    const client = createXiansClient(authToken)
    const tenantsApi = new XiansTenantsApi(client)

    // Look up the user's actual participant role for this tenant.
    // System-admin status does NOT auto-grant tenant access here; users must be
    // an explicit participant of the requested tenant.
    let participantResponse
    try {
      participantResponse = await tenantsApi.getParticipantTenants(userEmail)
    } catch (error) {
      console.error('[XiansTenantProvider] Failed to fetch participant tenants:', error)
      return null
    }

    const participant = participantResponse.tenants.find(t => t.tenantId === tenantId)
    const isSystemAdmin = participantResponse.isSystemAdmin

    // System admins get full admin access to any tenant even without an explicit participant role
    if (!participant && !isSystemAdmin) {
      return null
    }

    const tenant = await this.getTenant(tenantId, authToken)
    if (!tenant) return null

    // TenantAdmin, TenantParticipantAdmin, and TenantUser (Developer) all receive
    // full admin permissions for agent-level operations. Tenant management
    // operations (user/tenant settings) are further gated by withParticipantAdmin
    // which only allows TenantAdmin.
    const adminRoles = new Set(['TenantAdmin', 'TenantParticipantAdmin', 'TenantUser'])
    const isAdmin = adminRoles.has(participant?.role ?? '') || isSystemAdmin
    return {
      tenant,
      userRole: isAdmin ? 'admin' : 'member',
      permissions: isAdmin
        ? ['read', 'write', 'delete', 'admin']
        : ['read'],
    }
  }

  /**
   * Build the tenant list for a system admin: every enabled tenant on the
   * platform with full admin access. Where the admin also has an explicit
   * participant role, that role is preserved; otherwise the tenant is surfaced
   * with admin-level flags so the full layout (sidebar, developer, tenant admin)
   * is available.
   */
  private async getSystemAdminTenants(
    tenantsApi: XiansTenantsApi,
    participantTenants: XiansParticipantTenant[]
  ): Promise<Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
    isTenantAdmin: boolean
    isDeveloper: boolean
    participantRole: XiansParticipantRole | undefined
  }>> {
    let allTenants: XiansAdminTenant[]
    try {
      allTenants = await tenantsApi.getAllTenants()
    } catch (error) {
      console.error(
        '[XiansTenantProvider] Failed to fetch all tenants for system admin, falling back to participant tenants:',
        error
      )
      // Fall back to participant tenants so the admin still has some access.
      return this.mapParticipantTenants(participantTenants)
    }

    // Map explicit participant roles by tenantId so we can preserve them.
    const participantRoleById = new Map<string, XiansParticipantRole | undefined>(
      participantTenants.map((t) => [t.tenantId, t.role])
    )

    const enabledTenants = allTenants.filter((t) => t.enabled !== false)

    console.log(
      '[XiansTenantProvider] System admin has access to all',
      enabledTenants.length,
      'enabled tenant(s)'
    )

    return enabledTenants.map((adminTenant) => {
      const xiansTenant: XiansTenant = {
        tenantId: adminTenant.tenantId,
        name: adminTenant.name,
        theme: adminTenant.theme ?? undefined,
      }
      // Preserve the admin's explicit role where one exists; otherwise treat
      // them as a tenant admin so layout/theme decisions grant full access.
      const participantRole = participantRoleById.get(adminTenant.tenantId) ?? 'TenantAdmin'
      return {
        tenant: this.mapXiansTenantToTenant(xiansTenant),
        role: 'admin' as const,
        isTenantAdmin: true,
        isDeveloper: true,
        participantRole,
      }
    })
  }

  /**
   * Map a list of participant tenants (approved only) to the internal tenant
   * shape using only the data already present in the participant list response.
   *
   * Full per-tenant details (notably the logo) are intentionally NOT fetched
   * here to keep tenant-list loading to a single API call regardless of how
   * many tenants the user belongs to. The current tenant's logo is hydrated
   * lazily on the client via /api/tenants/validate.
   */
  private mapParticipantTenants(
    participantTenants: XiansParticipantTenant[]
  ): Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
    isTenantAdmin: boolean
    isDeveloper: boolean
    participantRole: XiansParticipantRole | undefined
  }> {
    return participantTenants
      .filter((t) => t.isApproved !== false)
      .map((participantTenant) => {
        const participantRole = participantTenant.role
        const isTenantAdmin = participantRole === 'TenantAdmin'
        const isDeveloper = participantRole === 'TenantUser'
        const role: 'owner' | 'admin' | 'member' | 'viewer' =
          participantRole === 'TenantParticipant' ? 'member' : 'admin'
        const xiansTenant: XiansTenant = {
          tenantId: participantTenant.tenantId,
          name: participantTenant.tenantName,
          theme: participantTenant.theme,
          logo: participantTenant.logo,
        }
        return {
          tenant: this.mapXiansTenantToTenant(xiansTenant),
          role,
          isTenantAdmin,
          isDeveloper,
          participantRole,
        }
      })
  }

  async getUserTenants(userId: string, authToken?: string, userEmail?: string): Promise<Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
    isTenantAdmin: boolean
    isDeveloper: boolean
    participantRole: XiansParticipantRole | undefined
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

    // System admins get access to EVERY tenant on the platform via the tenant
    // switcher, regardless of explicit participation.
    if (response.isSystemAdmin) {
      return this.getSystemAdminTenants(tenantsApi, response.tenants)
    }

    if (response.tenants.length === 0) {
      console.log('[XiansTenantProvider] User has no tenant access')
      return []
    }

    const tenants = this.mapParticipantTenants(response.tenants)

    if (tenants.length === 0) {
      console.log('[XiansTenantProvider] User has no approved tenant access')
      return []
    }

    console.log(
      '[XiansTenantProvider] User has access to',
      tenants.length,
      '/',
      response.tenants.length,
      'approved tenant(s)'
    )

    return tenants
  }
}
