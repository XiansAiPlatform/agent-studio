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
  ROLE_METADATA,
  roleLabel,
  roleSummary,
} from '@/lib/auth/roles'
export type { TenantRole, Role } from '@/lib/auth/roles'

import type { TenantRole } from '@/lib/auth/roles'
import {
  pickBoolean,
  pickString,
  pickUserIdentity,
  type UserIdentityFields,
} from '@/lib/users/identity'

// ── Tenant-scoped user type (used for per-tenant list & role assignment) ────

export interface TenantUser extends UserIdentityFields {
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
export interface GlobalUser extends UserIdentityFields {
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
  /** Filter by role: 'SysAdmin' or any tenant role (matched in any tenant). */
  role?: string
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
export interface GlobalUserDetail extends UserIdentityFields {
  email: string
  name: string
  isSysAdmin: boolean
  isEnabled: boolean
  memberships: UserTenantMembership[]
}

function pickEnabled(raw: Record<string, unknown>): boolean {
  const isEnabled = pickBoolean(raw, 'isEnabled', 'is_enabled')
  if (isEnabled !== undefined) return isEnabled
  const isLockedOut = pickBoolean(raw, 'isLockedOut', 'is_locked_out')
  return isLockedOut !== true
}

function normalizeMembership(raw: unknown): UserTenantMembership {
  const m = (raw ?? {}) as Record<string, unknown>
  const roles = Array.isArray(m.roles)
    ? m.roles.map(String)
    : m.role != null
      ? [String(m.role)]
      : []
  const tenantId = pickString(m, 'tenantId', 'tenant') ?? ''
  return {
    tenantId,
    tenantName: pickString(m, 'tenantName', 'tenant_name') ?? tenantId,
    roles,
    isApproved: pickBoolean(m, 'isApproved', 'is_approved') ?? false,
  }
}

export function normalizeAdminTenantUser(raw: unknown): TenantUser {
  const u = (raw ?? {}) as Record<string, unknown>
  const roles = Array.isArray(u.roles)
    ? u.roles.map(String)
    : u.role != null
      ? [String(u.role)]
      : []
  const identity = pickUserIdentity(u)
  return {
    ...identity,
    email: pickString(u, 'email', 'email') ?? '',
    name: pickString(u, 'name', 'name') ?? '',
    roles,
    isSysAdmin: pickBoolean(u, 'isSysAdmin', 'is_sys_admin') ?? false,
    isApproved: pickBoolean(u, 'isApproved', 'is_approved') ?? false,
    isEnabled: pickEnabled(u),
  }
}

export function normalizeGlobalUser(raw: unknown): GlobalUser {
  const u = (raw ?? {}) as Record<string, unknown>
  const identity = pickUserIdentity(u)
  const tenantCount = u.tenantCount ?? u.tenant_count
  return {
    ...identity,
    email: pickString(u, 'email', 'email') ?? '',
    name: pickString(u, 'name', 'name') ?? '',
    isSysAdmin: pickBoolean(u, 'isSysAdmin', 'is_sys_admin') ?? false,
    isEnabled: pickEnabled(u),
    tenantCount: typeof tenantCount === 'number' ? tenantCount : Number(tenantCount) || 0,
  }
}

export function normalizeGlobalUserDetail(raw: unknown): GlobalUserDetail {
  const u = (raw ?? {}) as Record<string, unknown>
  const identity = pickUserIdentity(u)
  const membershipsRaw = Array.isArray(u.memberships)
    ? u.memberships
    : Array.isArray(u.tenant_roles)
      ? u.tenant_roles
      : Array.isArray(u.tenantRoles)
        ? u.tenantRoles
        : []
  return {
    ...identity,
    email: pickString(u, 'email', 'email') ?? '',
    name: pickString(u, 'name', 'name') ?? '',
    isSysAdmin: pickBoolean(u, 'isSysAdmin', 'is_sys_admin') ?? false,
    isEnabled: pickEnabled(u),
    memberships: membershipsRaw.map(normalizeMembership),
  }
}

// ── Mutation request types ────────────────────────────────────────────────────

/**
 * Create a brand-new account and add it to the tenant.
 *
 * The backend rejects this with 409 if any account already holds `email`; in
 * that case the account has to be added by id via AddExistingUserRequest.
 */
export interface CreateUserRequest {
  email: string
  name: string
  role: TenantRole
}

/**
 * Add an account that already exists to a tenant.
 *
 * `userId` must be a user id — an email address is rejected with 400 because a
 * single address can belong to accounts from more than one identity provider.
 */
export interface AddExistingUserRequest {
  userId: string
  role: TenantRole
}

/**
 * Body of POST /api/v1/admin/tenants/{tenantId}/users. `role` is always
 * required; the remaining fields pick one of the two modes above. `userId` and
 * `email`/`name` are mutually exclusive — when `userId` is present the backend
 * ignores `email` and `name`.
 */
export type AddTenantUserRequest = AddExistingUserRequest | CreateUserRequest

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
