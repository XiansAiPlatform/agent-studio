/**
 * Types for the System Admin → Users feature.
 * Mirrors the Xians server AdminUserEndpoints and AdminGlobalUserEndpoints DTOs.
 */

// Role identifiers and labels live in the single source of truth at
// `@/lib/auth/roles` and are re-exported here for backwards compatibility.
export {
  TENANT_ROLES,
  ALL_ROLES,
  ROLE_LABELS,
  roleLabel,
} from '@/lib/auth/roles'
export type { TenantRole, Role } from '@/lib/auth/roles'

import type { Role, TenantRole } from '@/lib/auth/roles'

// ── Tenant-scoped user type (used for per-tenant list & role assignment) ────

export interface TenantUser {
  userId: string
  email: string
  name: string
  roles: string[]
  isSysAdmin: boolean
  isApproved: boolean
  isEnabled: boolean
}

export interface ListUsersResponse {
  users: TenantUser[]
  totalCount: number
  page: number
  pageSize: number
}

/** Parameters for the tenant-scoped user list. tenantId is required here. */
export interface ListTenantUsersParams {
  tenantId: string
  page?: number
  pageSize?: number
  search?: string
  role?: string
}

// ── Global (tenant-independent) user types ───────────────────────────────────

/**
 * A user as returned by GET /api/v1/admin/users (global list).
 * Has a tenantCount but no per-tenant role — those are in GlobalUserDetail.
 */
export interface GlobalUser {
  userId: string
  email: string
  name: string
  isSysAdmin: boolean
  isEnabled: boolean
  tenantCount: number
}

export interface ListGlobalUsersResponse {
  users: GlobalUser[]
  totalCount: number
  page: number
  pageSize: number
}

export interface ListGlobalUsersParams {
  page?: number
  pageSize?: number
  search?: string
  isSysAdmin?: boolean
  isEnabled?: boolean
}

/** A user's role inside one tenant, returned as part of GlobalUserDetail. */
export interface UserTenantMembership {
  tenantId: string
  tenantName: string
  roles: string[]
  isApproved: boolean
}

/**
 * Full user detail returned by GET /api/v1/admin/users/{userId}.
 * Includes all tenant memberships.
 */
export interface GlobalUserDetail {
  userId: string
  email: string
  name: string
  isSysAdmin: boolean
  isEnabled: boolean
  memberships: UserTenantMembership[]
}

// ── Mutation request types ────────────────────────────────────────────────────

export interface CreateUserRequest {
  email: string
  name: string
  role: TenantRole
}

/** A single tenant + role pair for new-user creation. */
export interface TenantMembershipInput {
  tenantId: string
  role: TenantRole
}

/** Full payload collected by the New User dialog before orchestration. */
export interface NewUserFormData {
  name: string
  email: string
  isSysAdmin: boolean
  isEnabled: boolean
  /** At least one membership is required to create a user on the backend. */
  memberships: TenantMembershipInput[]
}

/** Global profile update — only name and email; no tenant required. */
export interface UpdateGlobalUserRequest {
  name?: string
  email?: string
}

// ── Deprecated: kept for the fan-out /tenants sub-route (unused after migration) ─

/** @deprecated Use GlobalUserDetail.memberships instead. */
export interface GetUserTenantsResponse {
  userId: string
  email: string
  memberships: UserTenantMembership[]
}
