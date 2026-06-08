import { useState, useCallback } from 'react'
import {
  TenantUser,
  ListUsersResponse,
  ListUsersParams,
  CreateUserRequest,
  UpdateUserRequest,
  Role,
} from '../types'

interface UsersState {
  users: TenantUser[]
  totalCount: number
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null
}

const BASE_URL = '/api/system-admin/users'

async function parseError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error ?? `${fallback} (${res.status})`)
}

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

  const fetchUsers = useCallback(async (params: ListUsersParams) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const query = new URLSearchParams({ tenantId: params.tenantId })
      if (params.page) query.set('page', String(params.page))
      if (params.pageSize) query.set('pageSize', String(params.pageSize))
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

  const createUser = useCallback(
    async (tenantId: string, data: CreateUserRequest): Promise<TenantUser> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}?tenantId=${encodeURIComponent(tenantId)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        )
        if (!res.ok) await parseError(res, 'Failed to create user')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const updateUser = useCallback(
    async (
      tenantId: string,
      userId: string,
      data: UpdateUserRequest
    ): Promise<TenantUser> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}?tenantId=${encodeURIComponent(tenantId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        )
        if (!res.ok) await parseError(res, 'Failed to update user')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const changeRole = useCallback(
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
        if (!res.ok) await parseError(res, 'Failed to change role')
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const setUserEnabled = useCallback(
    async (
      tenantId: string,
      userId: string,
      enabled: boolean,
      reason?: string
    ): Promise<TenantUser> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `${BASE_URL}/${encodeURIComponent(userId)}/status?tenantId=${encodeURIComponent(tenantId)}`,
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
    fetchUsers,
    createUser,
    updateUser,
    changeRole,
    setUserEnabled,
    deleteUser,
  }
}
