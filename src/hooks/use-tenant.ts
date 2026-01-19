'use client'

import { useCallback } from 'react'
import { useTenantStore } from '@/store/tenant-store'

/**
 * Client hook to access tenant data
 * 
 * Tenants are initialized from server-side data,
 * so no need for complex fetching logic here.
 */
export function useTenant() {
  const { 
    tenants, 
    currentTenantId, 
    isLoading,
    error,
    setCurrentTenant,
    getCurrentTenant,
    setError,
    clearError,
  } = useTenantStore()

  const validateTenantExists = useCallback(async (tenantId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/validate`, {
        cache: 'no-store',
      })
      
      const data = await response.json()
      return data.exists && data.enabled
    } catch (error) {
      console.error('[useTenant] Validation error:', error)
      return false
    }
  }, [])

  const switchTenant = (tenantId: string) => {
    console.log('[useTenant] Switching to tenant:', tenantId)
    setCurrentTenant(tenantId)
    // Always redirect to dashboard after switching tenant
    window.location.href = '/dashboard'
  }

  const currentTenant = getCurrentTenant()
  const hasNoTenants = tenants.length === 0

  return {
    tenants,
    currentTenant,
    currentTenantId,
    isLoading,
    error,
    hasNoTenants,
    switchTenant,
    validateTenantExists,
    validateCurrentTenant: validateTenantExists, // Alias for clarity
    setError,
    clearError
  }
}
