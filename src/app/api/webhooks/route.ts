import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { createXiansClient } from '@/lib/xians/client'
import { handleApiError } from '@/lib/api/error-handler'

/**
 * GET /api/webhooks
 * Lists webhook API keys. Tenant is injected from session (httpOnly cookie).
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)

      const params = new URLSearchParams()
      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      if (agentName) params.set('agentName', agentName)
      if (activationName) params.set('activationName', activationName)

      const queryString = params.toString()
      const backendPath = `/api/v1/admin/tenants/${tenantId}/webhooks${queryString ? `?${queryString}` : ''}`

      const client = createXiansClient()
      const data = await client.get<{ webhooks: unknown[] }>(backendPath)

      const baseUrl = process.env.XIANS_SERVER_URL
      const webhooks = Array.isArray(data?.webhooks)
        ? data.webhooks.map((w: any) => {
            if (w.webhookUrl?.startsWith('/') && baseUrl) {
              return { ...w, webhookUrl: `${baseUrl}${w.webhookUrl}` }
            }
            return w
          })
        : []

      return NextResponse.json({ webhooks })
    } catch (error) {
      return handleApiError(error, 'webhooks GET', {
        fallbackMessage: 'Failed to fetch webhooks',
      })
    }
  }
)

/**
 * POST /api/webhooks
 * Creates a builtin webhook. Tenant is injected from session (httpOnly cookie).
 */
export const POST = withTenantFromSession(
  async (request: NextRequest, { tenantContext }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const body = await request.json()

      const backendPath = `/api/v1/admin/tenants/${tenantId}/webhooks`
      const client = createXiansClient()
      const data = await client.post<any>(backendPath, body)

      if (data?.webhookUrl?.startsWith('/')) {
        const baseUrl = process.env.XIANS_SERVER_URL
        if (baseUrl) data.webhookUrl = `${baseUrl}${data.webhookUrl}`
      }

      return NextResponse.json(data)
    } catch (error) {
      return handleApiError(error, 'webhooks POST', {
        fallbackMessage: 'Failed to create webhook',
      })
    }
  }
)
