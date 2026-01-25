import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createXiansClient } from '@/lib/xians/client'
import { XiansTenantsApi } from '@/lib/xians/tenants'

/**
 * GET /api/tenants/[tenantId]/validate
 * Validate if a specific tenant exists and is enabled in Xians
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user?.email) {
    return NextResponse.json(
      { error: 'Unauthorized', exists: false, enabled: false },
      { status: 401 }
    )
  }

  const { tenantId } = await params

  if (!tenantId) {
    return NextResponse.json(
      { error: 'Tenant ID is required', exists: false, enabled: false },
      { status: 400 }
    )
  }

  try {
    console.log(`[Tenant Validate API] Validating tenant in Xians: ${tenantId}`)
    
    const xiansClient = createXiansClient()
    const tenantsApi = new XiansTenantsApi(xiansClient)

    // Try to fetch the specific tenant from Xians
    // API only returns enabled tenants (404 if disabled or not found)
    const tenant = await tenantsApi.getTenant(tenantId)
    
    console.log(`[Tenant Validate API] Tenant "${tenantId}" found in Xians:`, {
      exists: true,
      enabled: true,
      name: tenant.name
    })

    return NextResponse.json({
      exists: true,
      enabled: true, // API only returns enabled tenants
      tenant: {
        id: tenant.tenantId,
        name: tenant.name
      }
    })
  } catch (error: any) {
    // If tenant is not found (404) or any other error
    const isNotFound = error.status === 404
    
    console.warn(`[Tenant Validate API] Tenant "${tenantId}" validation failed:`, {
      exists: !isNotFound,
      error: error.message,
      status: error.status
    })
    
    return NextResponse.json({
      exists: false,
      enabled: false,
      error: isNotFound 
        ? `Tenant "${tenantId}" does not exist or is disabled in Xians` 
        : error.message || 'Failed to validate tenant'
    })
  }
}
