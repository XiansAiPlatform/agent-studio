/**
 * Types for the System Admin → Users feature.
 * Mirrors the Xians server AdminUserEndpoints DTOs
 * (XiansAi.Server.Src/Features/AdminApi/Endpoints/AdminUserEndpoints.cs).
 *
 * The backend user endpoints are tenant-scoped
 * (/api/v1/admin/tenants/{tenantId}/users), so every operation here is performed
 * against a specific tenant chosen by the system administrator.
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

/** Human-readable labels for each role (matches the meaning documented in SystemRoles.cs). */
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

/** A user as returned from the tenant-scoped admin user endpoints. */
export interface TenantUser {
  userId: string
  email: string
  name: string
  /** Tenant-scoped roles held by the user in the selected tenant. */
  roles: string[]
  /** True when the user is a global system administrator. */
  isSysAdmin: boolean
  /** Tenant membership approval flag. */
  isApproved: boolean
  /** False when the account is locked out (disabled). */
  isEnabled: boolean
}

export interface ListUsersResponse {
  users: TenantUser[]
  totalCount: number
  page: number
  pageSize: number
}

export interface ListUsersParams {
  tenantId: string
  page?: number
  pageSize?: number
  search?: string
  role?: string
}

export interface CreateUserRequest {
  email: string
  name: string
  /** One of the tenant-scoped roles (SysAdmin cannot be assigned on creation). */
  role: TenantRole
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  role?: Role
  isApproved?: boolean
}

/**
 * Resolve the single role to display/assign for a user. The backend keeps a
 * user's tenant role as a single entry, plus a global SysAdmin flag.
 */
export function effectiveRole(user: TenantUser): Role {
  if (user.isSysAdmin) return 'SysAdmin'
  return (user.roles[0] as Role) ?? 'TenantParticipant'
}
