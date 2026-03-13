import { ColorThemeId } from '@/lib/themes'

export interface Tenant {
  id: string
  name: string
  slug: string
  theme?: ColorThemeId
  metadata?: Record<string, any>
}

export interface TenantContext {
  tenant: Tenant
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
  permissions: string[]
}
