import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Tenant } from '@/types/tenant'
import type { Capability } from '@/lib/auth/capabilities'
import type { ColorThemeId } from '@/lib/themes'

interface TenantLogo {
  url?: string | null
  imgBase64?: string | null
  width?: number
  height?: number
}

interface TenantState {
  tenants: Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
    /** Capabilities the current user has within this tenant (derived server-side). */
    capabilities: Capability[]
    /** Human-readable role label for display (e.g. "Developer"); null if unknown. */
    roleLabel: string | null
  }>
  currentTenantId: string | null
  isLoading: boolean
  error: string | null
  hasAttemptedFetch: boolean  // Track if we've tried to fetch at least once
  /** When false, user cannot change theme (tenant has set theme and user is not admin) */
  canCustomizeTheme: boolean

  // Actions
  setTenants: (tenants: TenantState['tenants']) => void
  setCanCustomizeTheme: (value: boolean) => void
  /** Lazily hydrate a tenant's logo (fetched after the list is loaded). */
  setTenantLogo: (tenantId: string, logo: TenantLogo | null | undefined) => void
  /**
   * Update a tenant's color theme in the live store so the change is reflected
   * immediately (and survives tenant switches) without re-fetching the list.
   */
  setTenantTheme: (tenantId: string, theme: ColorThemeId | null | undefined) => void
  setCurrentTenant: (tenantId: string) => void
  getCurrentTenant: () => TenantState['tenants'][0] | undefined
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearTenants: () => void
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      tenants: [],
      currentTenantId: null,
      isLoading: false,
      error: null,
      hasAttemptedFetch: false,
      canCustomizeTheme: true,

      setCanCustomizeTheme: (value) => set({ canCustomizeTheme: value }),

      setTenantTheme: (tenantId, theme) => {
        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.tenant.id === tenantId
              ? { ...t, tenant: { ...t.tenant, theme: theme ?? undefined } }
              : t
          ),
        }))
      },

      setTenantLogo: (tenantId, logo) => {
        set((state) => ({
          tenants: state.tenants.map((t) =>
            t.tenant.id === tenantId
              ? {
                  ...t,
                  tenant: {
                    ...t.tenant,
                    metadata: { ...t.tenant.metadata, logo },
                  },
                }
              : t
          ),
        }))
      },

      setTenants: (tenants) => {
        set({ tenants, error: null, hasAttemptedFetch: true })
        
        // Auto-select first tenant if none selected or current is invalid
        const currentId = get().currentTenantId
        const currentExists = tenants.some(t => t.tenant.id === currentId)
        
        if (tenants.length > 0 && (!currentId || !currentExists)) {
          const firstTenant = tenants[0]
          console.log('[TenantStore] Auto-selecting tenant:', firstTenant.tenant.id)
          set({ currentTenantId: firstTenant.tenant.id })
        }
      },
      
      setCurrentTenant: (tenantId) => {
        const tenantExists = get().tenants.some(t => t.tenant.id === tenantId)
        
        if (!tenantExists) {
          console.error('[TenantStore] Invalid tenant ID:', tenantId)
          set({ error: `Tenant "${tenantId}" not found` })
          return
        }
        
        console.log('[TenantStore] Switching to tenant:', tenantId)
        set({ currentTenantId: tenantId, error: null })
      },
      
      getCurrentTenant: () => {
        const { tenants, currentTenantId } = get()
        return tenants.find(t => t.tenant.id === currentTenantId)
      },
      
      setLoading: (isLoading) => {
        set({ isLoading })
      },
      
      setError: (error) => {
        set({ error, hasAttemptedFetch: true })
      },
      
      clearError: () => {
        set({ error: null })
      },
      
      clearTenants: () => {
        set({ 
          tenants: [], 
          currentTenantId: null, 
          error: null,
          canCustomizeTheme: true
        })
      }
    }),
    {
      name: 'tenant-storage',
      partialize: (state) => ({
        currentTenantId: state.currentTenantId
      })
    }
  )
)
