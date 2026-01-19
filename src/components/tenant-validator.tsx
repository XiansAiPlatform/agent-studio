'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'

/**
 * TenantValidator Component
 * 
 * Validates that the user's current tenant exists in Xians.
 * If not, redirects to /settings/tenant for tenant creation.
 * 
 * This runs on every page load to ensure tenant still exists in Xians.
 */
export function TenantValidator({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { currentTenant, currentTenantId, isLoading, hasNoTenants, error, validateCurrentTenant } = useTenant()
  const [isValidating, setIsValidating] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Paths that don't require tenant validation
  const publicPaths = ['/login', '/settings/tenant', '/enable-tenant']
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path))

  // First effect: Check if user has any tenants
  useEffect(() => {
    // Skip validation for unauthenticated users or public paths
    if (status === 'loading' || !session || isPublicPath) {
      setIsValidating(false)
      return
    }

    // IMPORTANT: Wait for tenant data to finish loading from Xians
    if (isLoading) {
      console.log('[TenantValidator] Waiting for tenants to load from Xians...')
      setIsValidating(true)
      return
    }

    // If loading is complete and no tenants exist, redirect to settings
    if ((hasNoTenants || error) && !isLoading && !hasRedirected) {
      console.log('[TenantValidator] No valid tenants found in Xians, redirecting to /settings/tenant')
      console.log('[TenantValidator] Reason:', hasNoTenants ? 'No tenants available' : error)
      setHasRedirected(true)
      router.push('/settings/tenant')
      return
    }

    setIsValidating(false)
  }, [session, status, isLoading, hasNoTenants, error, isPublicPath, router, hasRedirected])

  // Second effect: Validate the specific current tenant exists in Xians
  useEffect(() => {
    // Skip if no session, public path, loading, or already redirected
    if (status === 'loading' || !session || isPublicPath || isLoading || hasRedirected) {
      return
    }

    // Skip if no tenants or no current tenant selected
    if (hasNoTenants || !currentTenantId || !currentTenant) {
      return
    }

    // CRITICAL: Validate that the current selected tenant actually exists in Xians
    const validateTenant = async () => {
      setIsValidating(true)
      console.log('[TenantValidator] Validating current tenant in Xians:', currentTenantId)
      
      const isValid = await validateCurrentTenant(currentTenantId)
      
      if (!isValid) {
        console.error('[TenantValidator] Current tenant does not exist in Xians:', currentTenantId)
        setValidationError(`Tenant "${currentTenantId}" does not exist in Xians`)
        setHasRedirected(true)
        router.push('/settings/tenant')
      } else {
        console.log('[TenantValidator] Current tenant validated successfully in Xians:', currentTenantId)
        setIsValidating(false)
        setValidationError(null)
      }
    }
    
    validateTenant()
  }, [session, status, currentTenantId, currentTenant, isLoading, hasNoTenants, isPublicPath, hasRedirected, validateCurrentTenant, router])

  // Show loading state during validation
  if (status === 'loading' || (isValidating && !isPublicPath)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground">Validating tenant with Xians...</p>
        </div>
      </div>
    )
  }

  // Show error if validation failed
  const displayError = validationError || error
  if (displayError && !hasNoTenants && !isPublicPath && !hasRedirected) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 text-center">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">Tenant Validation Error</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{displayError}</p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-2">
              The selected tenant is not configured to use with AI agents. Redirecting to settings...
            </p>
          </div>
          <button
            onClick={() => router.push('/settings/tenant')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Go to Settings
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
