export type ParticipantRole = 'TenantParticipant' | 'TenantParticipantAdmin'

export interface TenantUser {
  userId: string
  email: string
  name: string
  role: ParticipantRole
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
  role: ParticipantRole
}

export interface UpdateUserRequest {
  name?: string
  email?: string
  isApproved?: boolean
  role?: ParticipantRole
}
