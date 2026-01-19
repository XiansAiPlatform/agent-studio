'use client'

import { Suspense, useEffect, useState } from 'react'
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

  // Check if we're on the tenant settings page (skip validation)
  const isOnTenantSettings = pathname === '/settings/tenant'

  // Initialize store and validate selected tenant
  useEffect(() => {
    const initializeAndValidate = async () => {
      if (initialTenants && initialTenants.length > 0) {
        console.log('[Dashboard Client] Initializing with', initialTenants.length, 'tenant(s)')
        
        // Always update the tenant list (so user menu can show tenants)
        setTenants(initialTenants)
        
        // If we're on the tenant settings page, skip validation but allow tenants to be displayed
        if (isOnTenantSettings) {
          console.log('[Dashboard Client] On tenant settings page, skipping validation')
          setIsValidating(false)
          return
        }
        
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
          
          try {
            const response = await fetch(`/api/tenants/${finalSelectedTenantId}/validate`, {
              cache: 'no-store',
            })
            
            const data = await response.json()
            const isValid = data.exists && data.enabled
            
            console.log('[Dashboard Client] Tenant', finalSelectedTenantId, 'validation:', 
              isValid ? 'VALID' : 'INVALID')
            
            if (!isValid) {
              console.warn('[Dashboard Client] Tenant not found in Xians:', finalSelectedTenantId)
              console.log('[Dashboard Client] This tenant may have been deleted. Redirecting to tenant settings.')
              
              // Clear tenants and redirect to settings page with reason
              // The user needs to be aware that their selected tenant no longer exists
              clearTenants()
              router.push(`/settings/tenant?reason=invalid&tenant=${encodeURIComponent(finalSelectedTenantId)}`)
              return
            }
          } catch (error) {
            console.error('[Dashboard Client] Network error while validating tenant:', error)
            // Don't redirect on network errors - the tenant might be valid, we just can't check right now
            // Allow the user to continue using the app with the selected tenant
            console.log('[Dashboard Client] Continuing with tenant despite validation error (network issue)')
          }
        } else if (!finalSelectedTenantId) {
          console.warn('[Dashboard Client] No tenant selected after initialization, this should not happen')
        }
        
        setIsValidating(false)
      } else {
        // No tenants at all - just finish validation
        setIsValidating(false)
      }
    }
    
    initializeAndValidate()
  }, [initialTenants, setTenants, router, isOnTenantSettings])

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

  // If on tenant settings page, show simplified layout without sidebar
  if (isOnTenantSettings) {
    return (
      <div className="flex h-screen flex-col">
        {/* Simplified Header for tenant settings */}
        <Header />

        {/* Main Content - Full width without sidebar */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
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
