import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const { createXiansClient } = vi.hoisted(() => ({ createXiansClient: vi.fn() }))

vi.mock('@/lib/api/with-tenant', () => ({
  withParticipantAdmin: (
    handler: (request: NextRequest, context: unknown) => Promise<Response>
  ) => (request: NextRequest) => handler(request, {
    tenantContext: { tenant: { id: 'tenant-1' }, permissions: ['write'] },
  }),
}))

vi.mock('@/lib/xians/client', () => ({ createXiansClient }))

import { DELETE } from './route'

const connectionId = '507f1f77bcf86cd799439011'

describe('DELETE /api/connections/[connectionId] for OAuth MCP', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

  it('deletes a tenant-owned OAuth MCP secret', async () => {
    const deleteSecret = vi.fn().mockResolvedValue(undefined)
    createXiansClient.mockReturnValue({
      get: vi.fn().mockResolvedValue({
        tenantId: 'tenant-1',
        additionalData: { purpose: 'mcp-oauth' },
      }),
      delete: deleteSecret,
    })

    const response = await DELETE(new NextRequest(`http://localhost/api/connections/${connectionId}`, {
      method: 'DELETE',
    }))
    expect(response.status).toBe(204)
    expect(deleteSecret).toHaveBeenCalledOnce()
  })

  it.each([
    { tenantId: 'tenant-2', purpose: 'mcp-oauth' },
    { tenantId: 'tenant-1', purpose: 'other' },
  ])('rejects a secret outside the expected scope', async ({ tenantId, purpose }) => {
    const deleteSecret = vi.fn()
    createXiansClient.mockReturnValue({
      get: vi.fn().mockResolvedValue({ tenantId, additionalData: { purpose } }),
      delete: deleteSecret,
    })

    const response = await DELETE(new NextRequest(`http://localhost/api/connections/${connectionId}`, {
      method: 'DELETE',
    }))
    expect(response.status).toBe(404)
    expect(deleteSecret).not.toHaveBeenCalled()
  })
})
