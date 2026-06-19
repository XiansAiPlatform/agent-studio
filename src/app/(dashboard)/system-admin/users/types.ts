/**
 * Types for the System Admin → Users feature.
 * Mirrors the Xians server AdminUserEndpoints and AdminGlobalUserEndpoints DTOs.
 */

/** Roles that can be assigned to a user within a tenant (everything except SysAdmin). */
export const TENANT_ROLES = [
  'TenantAdmin',
  'TenantUser',
  'TenantParticipantAdmin',
  'TenantParticipant',
] as const

/** All assignable roles. SysAdmin is a global flag that only a system admin may grant. */
export const ALL_ROLES = ['SysAdmin', ...TENANT_ROLES] as const

export type TenantRole = (typeof TENANT_ROLES)[number]
export type Role = (typeof ALL_ROLES)[number]

/** Human-readable labels for each role. */
export const ROLE_LABELS: Record<Role, string> = {
  SysAdmin: 'System Admin',
  TenantAdmin: 'Tenant Admin',
  TenantUser: 'Developer',
  TenantParticipantAdmin: 'Participant Admin',
  TenantParticipant: 'Participant',
}

export function roleLabel(role: string): string {
  return (ROLE_LABELS as Record<string, string>)[role] ?? role
}

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

/** Tenant-scoped update (role, isApproved still need tenant context). */
export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: Role
  isApproved?: boolean
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

// ── Helpers ───────────────────────────────────────────────────────────────────

export function effectiveRole(user: TenantUser): Role {
  if (user.isSysAdmin) return 'SysAdmin'
  return (user.roles?.[0] as Role) ?? 'TenantParticipant'
}
