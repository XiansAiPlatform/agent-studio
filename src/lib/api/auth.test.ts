import { describe, expect, it, vi } from 'vitest'
import type { Session } from 'next-auth'

vi.mock('@/lib/auth/server-capabilities', () => ({
  getCapabilitiesFromSession: vi.fn(),
}))

import { getCapabilities } from '@/lib/auth/capabilities'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'
import { requireDeveloper } from './auth'

const session = { user: { email: 'user@example.com' } } as Session

function asRole(participantRole: Parameters<typeof getCapabilities>[0]['participantRole']) {
  vi.mocked(getCapabilitiesFromSession).mockResolvedValue(getCapabilities({ participantRole }))
}

describe('requireDeveloper', () => {
  it('allows TenantUser and TenantAdmin', async () => {
    asRole('TenantUser')
    expect(await requireDeveloper(session, 'tenant')).toBeNull()
    asRole('TenantAdmin')
    expect(await requireDeveloper(session, 'tenant')).toBeNull()
  })

  it('rejects TenantParticipantAdmin and TenantParticipant with 403', async () => {
    asRole('TenantParticipantAdmin')
    expect((await requireDeveloper(session, 'tenant'))?.status).toBe(403)
    asRole('TenantParticipant')
    expect((await requireDeveloper(session, 'tenant'))?.status).toBe(403)
  })

  it('rejects requests without a session or tenant', async () => {
    expect((await requireDeveloper(null, 'tenant'))?.status).toBe(401)
    expect((await requireDeveloper(session, null))?.status).toBe(403)
  })
})
