import { describe, expect, it } from 'vitest'
import { getCapabilities, hasCapability } from './capabilities'

describe('developer:access grants', () => {
  const canAccess = (ctx: Parameters<typeof getCapabilities>[0]) =>
    hasCapability(getCapabilities(ctx), 'developer:access')

  it('is granted to TenantUser, TenantAdmin and system admins', () => {
    expect(canAccess({ participantRole: 'TenantUser' })).toBe(true)
    expect(canAccess({ participantRole: 'TenantAdmin' })).toBe(true)
    expect(canAccess({ isSystemAdmin: true })).toBe(true)
  })

  it('is not granted to TenantParticipant or TenantParticipantAdmin', () => {
    expect(canAccess({ participantRole: 'TenantParticipant' })).toBe(false)
    expect(canAccess({ participantRole: 'TenantParticipantAdmin' })).toBe(false)
    expect(canAccess({})).toBe(false)
  })
})

describe('webhooks:redeliver grants', () => {
  const canRedeliver = (ctx: Parameters<typeof getCapabilities>[0]) =>
    hasCapability(getCapabilities(ctx), 'webhooks:redeliver')

  it('is granted to Developers (TenantUser), TenantAdmin and system admins', () => {
    expect(canRedeliver({ participantRole: 'TenantUser' })).toBe(true)
    expect(canRedeliver({ participantRole: 'TenantAdmin' })).toBe(true)
    expect(canRedeliver({ isSystemAdmin: true })).toBe(true)
  })

  it('is not granted to Participant Admins, who can only view deliveries', () => {
    expect(canRedeliver({ participantRole: 'TenantParticipantAdmin' })).toBe(false)
    expect(canRedeliver({ participantRole: 'TenantParticipant' })).toBe(false)
    expect(canRedeliver({})).toBe(false)
  })
})
