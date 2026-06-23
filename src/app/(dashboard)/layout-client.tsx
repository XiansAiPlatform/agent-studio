'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useTenantStore } from '@/store/tenant-store'
import { Tenant } from '@/types/tenant'
import type { Capability } from '@/lib/auth/capabilities'
import { cn } from '@/lib/utils'
import { ParticipantLayoutProvider } from '@/contexts/participant-layout-context'
import { ParticipantLayoutShell } from '@/app/(dashboard)/participant/_components/participant-layout-shell'
import { ParticipantChatPage } from '@/app/(dashboard)/participant/_components/participant-chat-page'

interface Props {
  children: React.ReactNode
  initialTenants: Array<{
    tenant: Tenant
    role: 'owner' | 'admin' | 'member' | 'viewer'
    capabilities: Capability[]
    roleLabel: string | null
  }>
  /** Server-determined: show sidebar (admin layout) vs single panel (participant layout) */
  showSidebar: boolean
  /** When false, user cannot change theme (tenant has set theme and user is not admin) */
  canCustomizeTheme?: boolean
}

/**
 * Client Component - Dashboard Layout UI
 * 
 * Receives validated tenant data from server component.
 * Validates the currently selected tenant exists in the list.
 */
export function DashboardLayoutClient({
  children,
  initialTenants,
  showSidebar,
  canCustomizeTheme = true,
}: Props) {
  const { setTenants, setCanCustomizeTheme, clearTenants, setTenantLogo } = useTenantStore()
  const router = useRouter()
  const pathname = usePathname()
  const [isValidating, setIsValidating] = useState(true)
  const [participantMenuOpen, setParticipantMenuOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
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
        setCanCustomizeTheme(canCustomizeTheme)
        
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
            const response = await fetch('/api/tenants/validate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tenantId: finalSelectedTenantId }),
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

            // Lazily hydrate the current tenant's logo (the list is built from a
            // single call without per-tenant logos). Validate already fetched the
            // full tenant server-side, so we just merge the logo into the store.
            if (data.tenant?.logo) {
              setTenantLogo(finalSelectedTenantId, data.tenant.logo)
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
  }, [initialTenants, setTenants, setCanCustomizeTheme, canCustomizeTheme, router, clearTenants, setTenantLogo])

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

  const isParticipantMode = !showSidebar

  const mainContent = isParticipantMode ? (
    <ParticipantLayoutShell
      menuOpen={participantMenuOpen}
      onMenuOpenChange={setParticipantMenuOpen}
    >
      {pathname === '/dashboard' ? (
        <ParticipantChatPage />
      ) : (
        children
      )}
    </ParticipantLayoutShell>
  ) : (
    children
  )

  return (
    <ParticipantLayoutProvider
      isParticipantMode={isParticipantMode}
      onOpenMenu={isParticipantMode ? () => setParticipantMenuOpen(true) : undefined}
      canCustomizeTheme={canCustomizeTheme}
    >
      <div className="flex h-screen flex-col">
        {/* Fixed Header - hamburger toggles admin sidebar drawer or participant menu */}
        <Header
          onOpenSidebar={
            showSidebar ? () => setMobileSidebarOpen(true) : undefined
          }
        />

        {/* Mobile sidebar drawer - admin mode only, < md */}
        {showSidebar && (
          <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
            <SheetContent
              side="left"
              className="w-[85%] max-w-[320px] p-0 md:hidden flex flex-col safe-pb"
            >
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <Suspense fallback={<div className="flex-1 bg-background" />}>
                <Sidebar
                  mobile
                  onNavigate={() => setMobileSidebarOpen(false)}
                />
              </Suspense>
            </SheetContent>
          </Sheet>
        )}

        {/* Main Container - admin layout (sidebar) or participant layout (single panel) */}
        <div className="flex flex-1 overflow-hidden">
          {showSidebar && (
            <Suspense fallback={<div className="hidden md:block h-full w-64 border-r bg-background" />}>
              <div className="hidden md:block h-full">
                <Sidebar />
              </div>
            </Suspense>
          )}

          {/* Main Content - single panel under header for participant, or beside sidebar for admin */}
          <main className={cn(
            'flex-1 flex flex-col bg-background min-w-0 min-h-0',
            isParticipantMode ? 'overflow-hidden' : 'overflow-y-auto'
          )}>
            {mainContent}
          </main>
        </div>
      </div>
    </ParticipantLayoutProvider>
  )
}
