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

export interface TenantUser {
  userId: string
  email: string
  name: string
  /** All roles this user holds within the tenant. */
  roles: TenantRole[]
  isApproved: boolean
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
