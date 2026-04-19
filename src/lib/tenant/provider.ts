import { Tenant, TenantContext } from "@/types/tenant"
import type { XiansParticipantRole } from "@/lib/xians/types"

export interface TenantProvider {
  getTenantContext(
    userId: string, 
    tenantId: string,
    authToken?: string,
    userEmail?: string
  ): Promise<TenantContext | null>
  
  getTenant(tenantId: string, authToken?: string): Promise<Tenant | null>
  
  getUserTenants(
    userId: string, 
    authToken?: string, 
    userEmail?: string
  ): Promise<Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
    /** Server-only: participant role from Xians; never pass to client */
    participantRole?: XiansParticipantRole
  }>>
}
