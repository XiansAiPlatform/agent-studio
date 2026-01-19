import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Tenant } from '@/types/tenant'

interface TenantState {
  tenants: Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
  }>
  currentTenantId: string | null
  isLoading: boolean
  error: string | null
  hasAttemptedFetch: boolean  // Track if we've tried to fetch at least once
  
  // Actions
  setTenants: (tenants: TenantState['tenants']) => void
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
          error: null
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
