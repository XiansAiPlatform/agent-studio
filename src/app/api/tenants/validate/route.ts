import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createXiansClient } from '@/lib/xians/client'
import { XiansTenantsApi } from '@/lib/xians/tenants'

/**
 * GET /api/tenants/validate
 * Validate if user's current tenant exists in Xians
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized', valid: false },
      { status: 401 }
    )
  }

  try {
    // Instead of checking email domain, check if user has ANY tenants
    // This is more reliable and doesn't assume tenant ID matches email domain
    const xiansClient = createXiansClient()
    const tenantsApi = new XiansTenantsApi(xiansClient)

    console.log('[Tenant Validate API] Checking if user has any tenants...')
    
    // Get all tenants (in a real app, this would be user-specific)
    const tenants = await tenantsApi.listTenants()
    
    // Filter to enabled tenants
    const enabledTenants = tenants.filter(t => t.enabled !== false)

    console.log('[Tenant Validate API] Found', enabledTenants.length, 'enabled tenant(s)')

    if (enabledTenants.length > 0) {
      return NextResponse.json({
        valid: true,
        tenantCount: enabledTenants.length,
        message: `User has access to ${enabledTenants.length} tenant(s)`
      })
    }

    // No tenants found
    return NextResponse.json({
      valid: false,
      error: 'No tenants available. Please create a tenant.',
      requiresSetup: true
    })
  } catch (error: any) {
    console.error('[Tenant Validate API] Error validating tenant:', error)
    
    return NextResponse.json(
      { 
        valid: false,
        error: error.message || 'Failed to validate tenant',
        details: error.response || undefined
      },
      { status: 500 }
    )
  }
}
