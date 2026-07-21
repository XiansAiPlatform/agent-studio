import { useState, useCallback } from 'react'
import {
  TenantUser,
  ListUsersResponse,
  ListTenantUsersParams,
  ListGlobalUsersResponse,
  ListGlobalUsersParams,
  GlobalUser,
  GlobalUserDetail,
  CreateUserRequest,
  UpdateGlobalUserRequest,
  Role,
} from '../types'

// ── Shared state shape ────────────────────────────────────────────────────────

interface UsersState {
  users: (TenantUser | GlobalUser)[]
  totalCount: number
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null
}

const BASE_URL = '/api/system-admin/users'

async function parseError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error ?? body.message ?? `${fallback} (${res.status})`)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useUsers() {
  const [state, setState] = useState<UsersState>({
    users: [],
    totalCount: 0,
    page: 1,
    pageSize: 20,
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  // ── List: global (no tenant) ─────────────────────────────────────────────

  /**
   * Fetch all users across the platform using the global endpoint
   * GET /api/v1/admin/users (via Next.js proxy).
   */
  const fetchGlobalUsers = useCallback(async (params: ListGlobalUsersParams = {}) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const query = new URLSearchParams()
      query.set('page', String(params.page ?? 1))
      query.set('pageSize', String(params.pageSize ?? 20))
      if (params.search) query.set('search', params.search)
      if (params.isSysAdmin !== undefined) query.set('isSysAdmin', String(params.isSysAdmin))
      if (params.isEnabled !== undefined) query.set('isEnabled', String(params.isEnabled))
      if (params.role) query.set('role', params.role)

      const res = await fetch(`${BASE_URL}?${query.toString()}`)
      if (!res.ok) await parseError(res, 'Failed to load users')

      const data: ListGlobalUsersResponse = await res.json()
      setState({
        users: data.users ?? [],
        totalCount: data.totalCount ?? 0,
        page: data.page ?? 1,
        pageSize: data.pageSize ?? 20,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        users: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  // ── List: tenant-scoped ──────────────────────────────────────────────────

  /**
   * Fetch users for a specific tenant.
   */
  const fetchTenantUsers = useCallback(async (params: ListTenantUsersParams) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const query = new URLSearchParams({ tenantId: params.tenantId })
      query.set('page', String(params.page ?? 1))
      query.set('pageSize', String(params.pageSize ?? 20))
      if (params.search) query.set('search', params.search)
      if (params.role) query.set('role', params.role)

      const res = await fetch(`${BASE_URL}?${query.toString()}`)
      if (!res.ok) await parseError(res, 'Failed to load users')

      const data: ListUsersResponse = await res.json()
      setState({
        users: data.users ?? [],
        totalCount: data.totalCount ?? 0,
        page: data.page ?? 1,
        pageSize: data.pageSize ?? 20,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        users: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  // ── Single user (with memberships) ──────────────────────────────────────

  /**
   * Fetch a single user with all tenant memberships.
   * Uses GET /api/v1/admin/users/{userId} (global, no tenant required).
   */
  const fetchUser = useCallback(async (userId: string): Promise<GlobalUserDetail> => {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(userId)}`)
    if (!res.ok) await parseError(res, 'Failed to fetch user')
    return await res.json()
  }, [])

  // ── Mutations ────────────────────────────────────────────────────────────

  const createUser = useCallback(
    async (tenantId: string, data: CreateUserRequest): Promise<TenantUser> => {
      setIsMutating(true)
      try {
        const res = await fetch(`${BASE_URL}?tenantId=${encodeURIComponent(tenantId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) await parseError(res, 'Failed to create user')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  /**
   * Update a user's global profile (name, email).
   * No tenant context required — uses PATCH /api/v1/admin/users/{userId}.
   */
  const updateUser = useCallback(
    async (userId: string, data: UpdateGlobalUserRequest): Promise<GlobalUserDetail> => {
      setIsMutating(true)
      try {
        const res = await fetch(`${BASE_URL}/${encodeURIComponent(userId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) await parseError(res, 'Failed to update user')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  /**
   * Grant or revoke the global System Admin flag.
   * No tenant context required.
   */
  const setSysAdmin = useCallback(
    async (userId: string, isSysAdmin: boolean): Promise<GlobalUserDetail> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}/sysadmin`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isSysAdmin }),
          }
        )
        if (!res.ok) await parseError(res, 'Failed to update System Admin status')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  /**
   * Add a role to a user within a specific tenant.
   * Calls PUT /api/system-admin/users/{userId}/role?tenantId=
   */
  const addRole = useCallback(
    async (tenantId: string, userId: string, role: Role): Promise<TenantUser> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}/role?tenantId=${encodeURIComponent(tenantId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
          }
        )
        if (!res.ok) await parseError(res, 'Failed to add role')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  /**
   * Remove a specific role from a user within a tenant.
   * Calls DELETE /api/system-admin/users/{userId}/role?tenantId=&role=
   */
  const removeRole = useCallback(
    async (tenantId: string, userId: string, role: Role): Promise<void> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}/role?tenantId=${encodeURIComponent(tenantId)}&role=${encodeURIComponent(role)}`,
          { method: 'DELETE' }
        )
        if (!res.ok && res.status !== 204) await parseError(res, 'Failed to remove role')
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  /**
   * Enable or disable a user account globally. No tenant required.
   */
  const setUserEnabled = useCallback(
    async (userId: string, enabled: boolean, reason?: string): Promise<unknown> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}/status`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, reason }),
          }
        )
        if (!res.ok) await parseError(res, 'Failed to update user status')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  /**
   * Approve or unapprove a user's membership in a specific tenant.
   * Calls PUT /api/system-admin/users/{userId}/approval?tenantId=
   */
  const setApproved = useCallback(
    async (tenantId: string, userId: string, isApproved: boolean): Promise<void> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}/approval?tenantId=${encodeURIComponent(tenantId)}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isApproved }),
          }
        )
        if (!res.ok) await parseError(res, 'Failed to update approval status')
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const deleteUser = useCallback(
    async (tenantId: string, userId: string): Promise<void> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}?tenantId=${encodeURIComponent(tenantId)}`,
          { method: 'DELETE' }
        )
        if (!res.ok && res.status !== 204) {
          await parseError(res, 'Failed to remove user')
        }
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  return {
    ...state,
    isMutating,
    // List fetchers
    fetchGlobalUsers,
    fetchTenantUsers,
    // Single user
    fetchUser,
    // Mutations
    createUser,
    updateUser,
    setSysAdmin,
    addRole,
    removeRole,
    setUserEnabled,
    setApproved,
    deleteUser,
  }
}
