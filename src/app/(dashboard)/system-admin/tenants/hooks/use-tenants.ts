import { useState, useCallback } from 'react'
import {
  Tenant,
  ListTenantsResponse,
  CreateTenantRequest,
  UpdateTenantRequest,
} from '../types'

interface TenantsState {
  tenants: Tenant[]
  isLoading: boolean
  error: string | null
}

const BASE_URL = '/api/system-admin/tenants'

export function useTenants() {
  const [state, setState] = useState<TenantsState>({
    tenants: [],
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  const fetchTenants = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch(BASE_URL)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data: ListTenantsResponse = await res.json()
      setState({ tenants: data.tenants ?? [], isLoading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  const createTenant = useCallback(
    async (data: CreateTenantRequest): Promise<Tenant> => {
      setIsMutating(true)
      try {
        const res = await fetch(BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to create tenant (${res.status})`)
        }
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const updateTenant = useCallback(
    async (tenantId: string, data: UpdateTenantRequest): Promise<Tenant> => {
      setIsMutating(true)
      try {
        const res = await fetch(`${BASE_URL}/${encodeURIComponent(tenantId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to update tenant (${res.status})`)
        }
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const deleteTenant = useCallback(async (tenantId: string): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(tenantId)}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to delete tenant (${res.status})`)
      }
    } finally {
      setIsMutating(false)
    }
  }, [])

  return {
    ...state,
    isMutating,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
  }
}
