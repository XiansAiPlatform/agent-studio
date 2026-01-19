import { Tenant, TenantContext } from "@/types/tenant"

export interface TenantProvider {
  getTenantContext(
    userId: string, 
    tenantId: string,
    authToken?: string
  ): Promise<TenantContext | null>
  
  getTenant(tenantId: string, authToken?: string): Promise<Tenant | null>
  
  getUserTenants(userId: string, authToken?: string): Promise<Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
  }>>
}
