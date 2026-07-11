import { useState, useCallback } from 'react'
import {
  Tenant,
  ListTenantsResponse,
  ListTenantsParams,
  TenantsPagination,
  CreateTenantRequest,
  UpdateTenantRequest,
} from '../types'

interface TenantsState {
  tenants: Tenant[]
  pagination: TenantsPagination
  isLoading: boolean
  error: string | null
}

const DEFAULT_PAGINATION: TenantsPagination = {
  page: 1,
  pageSize: 20,
  totalPages: 1,
  totalItems: 0,
  hasNext: false,
  hasPrevious: false,
}

const BASE_URL = '/api/system-admin/tenants'
// Mirrors the upstream AdminApi's pageSize cap. Used when walking every page
// for lookup-style consumers (see fetchAllTenants below).
const MAX_PAGE_SIZE = 100

export function useTenants() {
  const [state, setState] = useState<TenantsState>({
    tenants: [],
    pagination: DEFAULT_PAGINATION,
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  // Full, unpaginated tenant list — kept separate from the paginated `tenants`
  // state above. Used by lookup-style consumers (tenant selector dropdowns,
  // id→name maps in the Users / Agent Templates admin pages) that need every
  // tenant and have no pagination UI of their own to page through.
  const [allTenants, setAllTenants] = useState<Tenant[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(false)

  /**
   * Fetch a single page of tenants for the paginated tenant-management view,
   * optionally filtered server-side by a search term.
   * GET /api/system-admin/tenants?page=&pageSize=&search=
   */
  const fetchTenants = useCallback(async (params: ListTenantsParams = {}) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const query = new URLSearchParams()
      query.set('page', String(params.page ?? 1))
      query.set('pageSize', String(params.pageSize ?? 20))
      if (params.search?.trim()) query.set('search', params.search.trim())
      const res = await fetch(`${BASE_URL}?${query.toString()}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data: ListTenantsResponse = await res.json()
      setState({
        tenants: data.tenants ?? [],
        pagination: data.pagination ?? DEFAULT_PAGINATION,
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
  }, [])

  /**
   * Fetch every tenant on the platform by walking all pages at the upstream's
   * max page size. See `allTenants` above for why this exists separately from
   * `fetchTenants`.
   */
  const fetchAllTenants = useCallback(async () => {
    setIsLoadingAll(true)
    try {
      const collected: Tenant[] = []
      let page = 1
      // Safety cap so an unexpected `hasNext: true` can't loop forever.
      for (let i = 0; i < 1000; i++) {
        const res = await fetch(`${BASE_URL}?page=${page}&pageSize=${MAX_PAGE_SIZE}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Request failed (${res.status})`)
        }
        const data: ListTenantsResponse = await res.json()
        collected.push(...(data.tenants ?? []))
        if (!data.pagination?.hasNext) break
        page += 1
      }
      setAllTenants(collected)
    } catch (err) {
      console.error('[useTenants] Failed to fetch all tenants:', err)
      setAllTenants([])
    } finally {
      setIsLoadingAll(false)
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
    allTenants,
    isLoadingAll,
    fetchAllTenants,
    createTenant,
    updateTenant,
    deleteTenant,
  }
}
