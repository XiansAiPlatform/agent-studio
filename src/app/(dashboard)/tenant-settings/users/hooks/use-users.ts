import { useState, useCallback } from 'react'
import {
  TenantUser,
  ListUsersResponse,
  CreateUserRequest,
  UpdateUserRequest,
} from '../types'

interface UseUsersOptions {
  page?: number
  pageSize?: number
  search?: string
}

interface UsersState {
  users: TenantUser[]
  totalCount: number
  page: number
  pageSize: number
  isLoading: boolean
  error: string | null
}

export function useUsers(options: UseUsersOptions = {}) {
  const { page = 1, pageSize = 20, search = '' } = options

  const [state, setState] = useState<UsersState>({
    users: [],
    totalCount: 0,
    page,
    pageSize,
    isLoading: false,
    error: null,
  })

  const [isMutating, setIsMutating] = useState(false)

  const fetchUsers = useCallback(
    async (fetchPage = page, fetchSearch = search) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
      try {
        const params = new URLSearchParams({
          page: String(fetchPage),
          pageSize: String(pageSize),
        })
        if (fetchSearch) params.set('search', fetchSearch)

        const res = await fetch(`/api/settings/users?${params.toString()}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Request failed (${res.status})`)
        }
        const data: ListUsersResponse = await res.json()
        setState({
          users: data.users,
          totalCount: data.totalCount,
          page: data.page,
          pageSize: data.pageSize,
          isLoading: false,
          error: null,
        })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        }))
      }
    },
    [page, pageSize, search]
  )

  const createUser = useCallback(
    async (data: CreateUserRequest): Promise<TenantUser> => {
      setIsMutating(true)
      try {
        const res = await fetch('/api/settings/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to create user (${res.status})`)
        }
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const updateUser = useCallback(
    async (userId: string, data: UpdateUserRequest): Promise<TenantUser> => {
      setIsMutating(true)
      try {
        const res = await fetch(
          `/api/settings/users/${encodeURIComponent(userId)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          }
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to update user (${res.status})`)
        }
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch(
        `/api/settings/users/${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to delete user (${res.status})`)
      }
    } finally {
      setIsMutating(false)
    }
  }, [])

  return {
    ...state,
    isMutating,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  }
}
