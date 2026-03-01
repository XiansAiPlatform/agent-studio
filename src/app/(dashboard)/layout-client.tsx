'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { useTenantStore } from '@/store/tenant-store'
import { Tenant } from '@/types/tenant'

interface Props {
  children: React.ReactNode
  initialTenants: Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
  }>
}

/**
 * Client Component - Dashboard Layout UI
 * 
 * Receives validated tenant data from server component.
 * Validates the currently selected tenant exists in the list.
 */
export function DashboardLayoutClient({ children, initialTenants }: Props) {
  const { setTenants, currentTenantId, setCurrentTenant, clearTenants } = useTenantStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isValidating, setIsValidating] = useState(true)
  const hasInitializedRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Initialize store and validate selected tenant
  useEffect(() => {
    // Prevent duplicate calls in React Strict Mode
    if (hasInitializedRef.current) {
      console.log('[Dashboard Client] Already initialized, skipping duplicate call')
      return
    }

    const initializeAndValidate = async () => {
      if (initialTenants && initialTenants.length > 0) {
        console.log('[Dashboard Client] Initializing with', initialTenants.length, 'tenant(s)')
        
        // Always update the tenant list (so user menu can show tenants)
        setTenants(initialTenants)
        
        // Get the tenant ID that was selected (either the persisted one or auto-selected)
        // Note: After setTenants(), the store may have auto-selected a valid tenant
        const selectedTenantId = useTenantStore.getState().currentTenantId
        
        // Check if the selected tenant exists in the initialTenants list
        const tenantExistsInList = initialTenants.some(t => t.tenant.id === selectedTenantId)
        
        if (!tenantExistsInList && selectedTenantId) {
          console.warn('[Dashboard Client] Selected tenant', selectedTenantId, 'not found in user tenant list')
          console.log('[Dashboard Client] Available tenants:', initialTenants.map(t => t.tenant.id).join(', '))
          // setTenants() should have auto-selected the first tenant, verify it worked
          const newlySelectedId = useTenantStore.getState().currentTenantId
          console.log('[Dashboard Client] Current tenant after auto-selection:', newlySelectedId)
        }
        
        // Get the final selected tenant after potential auto-selection
        const finalSelectedTenantId = useTenantStore.getState().currentTenantId
        const finalTenantExistsInList = initialTenants.some(t => t.tenant.id === finalSelectedTenantId)
        
        // Only validate if we have a selected tenant that exists in the list
        if (finalSelectedTenantId && finalTenantExistsInList) {
          console.log('[Dashboard Client] Validating current tenant in Xians:', finalSelectedTenantId)

          // Sync current tenant to server (httpOnly cookie) so API routes can inject it
          // Tenant ID must never be passed from frontend - see docs/arch-tests/rule-tenantid-use.md
          fetch('/api/user/current-tenant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: finalSelectedTenantId }),
          }).catch((err) => console.warn('[Dashboard Client] Failed to sync tenant to server:', err))

          // Create abort controller for this request
          abortControllerRef.current = new AbortController()
          
          try {
            const response = await fetch(`/api/tenants/${finalSelectedTenantId}/validate`, {
              cache: 'no-store',
              signal: abortControllerRef.current.signal,
            })
            
            const data = await response.json()
            const isValid = data.exists && data.enabled
            
            console.log('[Dashboard Client] Tenant', finalSelectedTenantId, 'validation:', 
              isValid ? 'VALID' : 'INVALID')
            
            if (!isValid) {
              console.warn('[Dashboard Client] Tenant not found in Xians:', finalSelectedTenantId)
              console.log('[Dashboard Client] This tenant may have been deleted or disabled. Redirecting to no-access page.')
              
              // Clear tenants and redirect to no-access page
              clearTenants()
              router.push('/no-access')
              return
            }
          } catch (error) {
            // Ignore abort errors
            if (error instanceof Error && error.name === 'AbortError') {
              console.log('[Dashboard Client] Validation request aborted')
              return
            }
            
            console.error('[Dashboard Client] Network error while validating tenant:', error)
            // Don't redirect on network errors - the tenant might be valid, we just can't check right now
            // Allow the user to continue using the app with the selected tenant
            console.log('[Dashboard Client] Continuing with tenant despite validation error (network issue)')
          }
        } else if (!finalSelectedTenantId) {
          console.warn('[Dashboard Client] No tenant selected after initialization, this should not happen')
        }
        
        setIsValidating(false)
        hasInitializedRef.current = true
      } else {
        // No tenants at all - just finish validation
        setIsValidating(false)
        hasInitializedRef.current = true
      }
    }
    
    initializeAndValidate()

    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [initialTenants, setTenants, router, clearTenants])

  // Show loading while validating selected tenant
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Validating tenant...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Fixed Header */}
      <Header />

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Suspense fallback={<div className="w-64 border-r bg-background" />}>
          <Sidebar />
        </Suspense>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
