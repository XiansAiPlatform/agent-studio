import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { useTenantProvider } from "@/lib/tenant"
import { handleApiError, unauthorizedError } from "@/lib/api/error-handler"

/**
 * GET /api/user/tenants
 * Get all tenants the current user has access to from Xians
 * This endpoint is called on every page refresh to validate tenant existence
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    console.log('[User Tenants API] Unauthorized request')
    return unauthorizedError()
  }
  
  try {
    console.log('[User Tenants API] Fetching tenants from Xians for user:', session.user.id)
    
    const tenantProvider = useTenantProvider()
    const userTenants = await tenantProvider.getUserTenants(
      session.user.id,
      session.accessToken
    )
    
    console.log('[User Tenants API] Found', userTenants.length, 'tenant(s) in Xians')
    
    if (userTenants.length === 0) {
      console.warn('[User Tenants API] No tenants found for user - they need to create a tenant')
    }
    
    return NextResponse.json({
      tenants: userTenants,
      userId: session.user.id,
      count: userTenants.length
    })
  } catch (error) {
    return handleApiError(error, 'Get User Tenants')
  }
}
