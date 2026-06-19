/** Roles a tenant admin can assign within their own tenant. SysAdmin is excluded. */
export const TENANT_ROLES = [
  'TenantAdmin',
  'TenantUser',
  'TenantParticipantAdmin',
  'TenantParticipant',
] as const

export type TenantRole = (typeof TENANT_ROLES)[number]

export const TENANT_ROLE_LABELS: Record<TenantRole, string> = {
  TenantAdmin: 'Tenant Admin',
  TenantUser: 'Developer',
  TenantParticipantAdmin: 'Participant Admin',
  TenantParticipant: 'Participant',
}

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
