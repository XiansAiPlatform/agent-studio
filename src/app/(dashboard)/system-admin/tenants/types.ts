/**
 * Types for the System Admin → Tenants feature.
 * Mirrors the Xians server Tenant model and admin tenant request DTOs.
 */

export interface Tenant {
  /** MongoDB ObjectId of the tenant document */
  id: string
  /** Human-readable / business tenant identifier (the slug used everywhere) */
  tenantId: string
  name: string
  domain?: string | null
  description?: string | null
  theme?: string | null
  timezone?: string | null
  enabled: boolean
  useSpecificTemporalNamespace: boolean
  createdAt: string
  createdBy: string
  updatedAt?: string | null
}

export interface ListTenantsResponse {
  tenants: Tenant[]
}

export interface CreateTenantRequest {
  tenantId: string
  name: string
  domain?: string
  description?: string
  theme?: string
  timezone?: string
  useSpecificTemporalNamespace?: boolean
}

export interface UpdateTenantRequest {
  name?: string
  domain?: string
  description?: string
  theme?: string
  timezone?: string
  enabled?: boolean
  useSpecificTemporalNamespace?: boolean
}
