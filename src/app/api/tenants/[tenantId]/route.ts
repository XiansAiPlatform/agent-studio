import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createXiansClient } from '@/lib/xians/client'
import { XiansTenantsApi } from '@/lib/xians/tenants'
import { UpdateTenantRequest } from '@/lib/xians/types'
import { handleApiError, unauthorizedError } from '@/lib/api/error-handler'

/**
 * GET /api/tenants/[tenantId]
 * Get tenant details from Xians
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return unauthorizedError()
  }

  try {
    const { tenantId } = await params
    
    // Create Xians client
    const xiansClient = createXiansClient()
    const tenantsApi = new XiansTenantsApi(xiansClient)

    // Get tenant details
    const tenant = await tenantsApi.getTenant(tenantId)

    return NextResponse.json({
      success: true,
      tenant
    })
  } catch (error: any) {
    return handleApiError(error, 'Get Tenant')
  }
}

/**
 * PATCH /api/tenants/[tenantId]
 * Update tenant in Xians (including enable/disable)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return unauthorizedError()
  }

  try {
    const { tenantId } = await params
    const body = await request.json()
    
    // Create Xians client
    const xiansClient = createXiansClient()
    const tenantsApi = new XiansTenantsApi(xiansClient)

    // Update tenant
    const updateData: UpdateTenantRequest = {}
    
    if (body.enabled !== undefined) updateData.enabled = body.enabled
    if (body.name) updateData.name = body.name
    if (body.domain) updateData.domain = body.domain
    if (body.description !== undefined) updateData.description = body.description
    
    const updatedTenant = await tenantsApi.updateTenant(tenantId, updateData)

    return NextResponse.json({
      success: true,
      tenant: updatedTenant,
      message: 'Tenant updated successfully'
    })
  } catch (error: any) {
    return handleApiError(error, 'Update Tenant')
  }
}
