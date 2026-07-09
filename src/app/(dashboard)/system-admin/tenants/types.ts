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
  createdAt: string
  createdBy: string
  updatedAt?: string | null
}

export interface TenantsPagination {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface ListTenantsResponse {
  tenants: Tenant[]
  pagination: TenantsPagination
}

export interface ListTenantsParams {
  page?: number
  pageSize?: number
  /** Case-insensitive server-side match on tenantId, name, domain or description. */
  search?: string
}

export interface CreateTenantRequest {
  tenantId: string
  name: string
  domain?: string
  description?: string
  theme?: string
  timezone?: string
}

export interface UpdateTenantRequest {
  name?: string
  domain?: string
  description?: string
  theme?: string
  timezone?: string
  enabled?: boolean
}
