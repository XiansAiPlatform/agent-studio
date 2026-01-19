export interface Tenant {
  id: string
  name: string
  slug: string
  metadata?: Record<string, any>
}

export interface TenantContext {
  tenant: Tenant
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: string[]
}
