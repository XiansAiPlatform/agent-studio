import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { useTenantProvider } from '@/lib/tenant'
import { XiansApiError } from '@/lib/xians/client'

export type UserTenantsResult = 
  | { success: true; tenants: any[]; session: any }
  | { success: false; error: 'no_session' }
  | { success: false; error: 'backend_unavailable'; message: string }
  | { success: false; error: 'unknown'; message: string }

/**
 * Server-side function to get user's tenants
 * Use this in Server Components and Server Actions
 */
export async function getUserTenants(): Promise<UserTenantsResult> {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return { success: false, error: 'no_session' }
  }

  try {
    const tenantProvider = useTenantProvider()
    const userTenants = await tenantProvider.getUserTenants(
      session.user.id,
      session.accessToken,
      session.user.email
    )
    
    console.log('[Server] Fetched', userTenants.length, 'tenant(s) for user:', session.user.email)
    
    return {
      success: true,
      tenants: userTenants,
      session
    }
  } catch (error) {
    console.error('[Server] Error fetching tenants:', error)
    
    // Check if it's a network/backend unavailable error
    if (error instanceof XiansApiError && error.status === 0) {
      return {
        success: false,
        error: 'backend_unavailable',
        message: error.message
      }
    }
    
    // Other errors
    return {
      success: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}
