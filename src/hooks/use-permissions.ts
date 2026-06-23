'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useTenant } from '@/hooks/use-tenant'
import {
  ALL_CAPABILITIES,
  hasCapability,
  type Capability,
} from '@/lib/auth/capabilities'

/**
 * Client hook exposing the current user's effective capabilities for the
 * selected tenant.
 *
 * Capabilities are resolved server-side and hydrated into the tenant store. As
 * a safety net we also union in every capability when the session marks the
 * user as a system admin, so global checks (e.g. `system:admin`) work even when
 * no tenant is selected.
 *
 * Authorization is always enforced server-side; these checks are for UX only.
 */
export function usePermissions() {
  const { data: session } = useSession()
  const { currentTenant } = useTenant()

  const capabilities = useMemo<Capability[]>(() => {
    const isSystemAdmin = session?.user?.isSystemAdmin === true
    if (isSystemAdmin) {
      return [...ALL_CAPABILITIES]
    }
    return currentTenant?.capabilities ?? []
  }, [session?.user?.isSystemAdmin, currentTenant?.capabilities])

  const can = useMemo(
    () => (capability: Capability) => hasCapability(capabilities, capability),
    [capabilities]
  )

  return { capabilities, can }
}

/** Convenience hook returning whether the current user has a single capability. */
export function useCan(capability: Capability): boolean {
  const { can } = usePermissions()
  return can(capability)
}
