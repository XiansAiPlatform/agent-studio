// Roles a tenant admin can assign within their own tenant (SysAdmin excluded).
// Defined once in the single source of truth at `@/lib/auth/roles`.
export {
  TENANT_ROLES,
  TENANT_ROLE_LABELS,
  ROLE_METADATA,
  roleSummary,
} from '@/lib/auth/roles'
export type { TenantRole } from '@/lib/auth/roles'

import type { TenantRole } from '@/lib/auth/roles'
import {
  pickBoolean,
  pickString,
  pickUserIdentity,
  type UserIdentityFields,
} from '@/lib/users/identity'

export interface TenantUser extends UserIdentityFields {
  email: string
  name: string
  /** All roles this user holds within the tenant. */
  roles: TenantRole[]
  isApproved: boolean
  isSysAdmin?: boolean
}

/**
 * Normalize a tenant-user payload from the Xians API.
 * Accepts both camelCase (typical JSON) and snake_case (Mongo-shaped) fields.
 */
export function normalizeTenantUser(raw: unknown): TenantUser {
  const u = (raw ?? {}) as Record<string, unknown>
  const roles = Array.isArray(u.roles)
    ? u.roles
    : u.role != null
      ? [u.role]
      : []

  return {
    ...pickUserIdentity(u),
    email: pickString(u, 'email', 'email') ?? '',
    name: pickString(u, 'name', 'name') ?? '',
    roles: roles as TenantRole[],
    isApproved: pickBoolean(u, 'isApproved', 'is_approved') ?? false,
    isSysAdmin: pickBoolean(u, 'isSysAdmin', 'is_sys_admin') ?? false,
  }
}

export interface ListUsersResponse {
  users: TenantUser[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CreateUserRequest {
  email: string
  name: string
  /** At least one role must be supplied. */
  roles: TenantRole[]
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  isApproved?: boolean
  /** Complete desired role set. Backend will diff against current roles and apply changes. */
  roles?: TenantRole[]
}
