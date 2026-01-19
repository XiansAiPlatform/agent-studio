import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createXiansClient } from '@/lib/xians/client'
import { XiansTenantsApi } from '@/lib/xians/tenants'
import { CreateTenantRequest } from '@/lib/xians/types'

/**
 * POST /api/tenants/enable
 * Create/enable a tenant in Xians for the current user
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { tenantId, name, domain, description } = body

    // Validate required fields
    if (!tenantId || !name || !domain) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, name, and domain are required' },
        { status: 400 }
      )
    }

    // Create Xians client
    const xiansClient = createXiansClient()
    const tenantsApi = new XiansTenantsApi(xiansClient)

    // Check if tenant already exists
    try {
      const existingTenant = await tenantsApi.getTenant(tenantId)
      
      // If tenant exists but is disabled, enable it
      if (existingTenant.enabled === false) {
        const updatedTenant = await tenantsApi.updateTenant(tenantId, {
          enabled: true
        })
        
        return NextResponse.json({
          success: true,
          tenant: updatedTenant,
          message: 'Tenant enabled successfully'
        })
      }
      
      // Tenant already exists and is enabled
      return NextResponse.json({
        success: true,
        tenant: existingTenant,
        message: 'Tenant already exists and is enabled'
      })
    } catch (error: any) {
      // If tenant doesn't exist (404), create it
      if (error.status === 404) {
        const createRequest: CreateTenantRequest = {
          tenantId,
          name,
          domain,
          description,
        }

        const newTenant = await tenantsApi.createTenant(createRequest)

        return NextResponse.json({
          success: true,
          tenant: newTenant,
          message: 'Tenant created successfully'
        }, { status: 201 })
      }
      
      // Other errors
      throw error
    }
  } catch (error: any) {
    console.error('Error enabling tenant:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to enable tenant',
        details: error.response || undefined
      },
      { status: error.status || 500 }
    )
  }
}
