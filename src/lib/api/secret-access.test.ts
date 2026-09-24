import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/server-capabilities', () => ({
  getCapabilitiesFromSession: vi.fn(),
}))

import { getCapabilities } from '@/lib/auth/capabilities'
import { canManageSecretOwner, type SecretAccess } from './secret-access'

const tenantUser: SecretAccess = { selfUserId: 'me@example.com', canManageOtherUsers: false }
const participantAdmin: SecretAccess = { selfUserId: 'admin@example.com', canManageOtherUsers: true }

describe('canManageSecretOwner', () => {
  it('allows tenant-scoped secrets for everyone', () => {
    expect(canManageSecretOwner(tenantUser, null)).toBe(true)
    expect(canManageSecretOwner(tenantUser, '  ')).toBe(true)
  })

  it('allows a caller to manage their own user-scoped secret, case-insensitively', () => {
    expect(canManageSecretOwner(tenantUser, 'Me@Example.com ')).toBe(true)
  })

  it("blocks another member's secret without secrets:manage-user-scoped", () => {
    expect(canManageSecretOwner(tenantUser, 'someone@example.com')).toBe(false)
  })

  it("allows another member's secret with secrets:manage-user-scoped", () => {
    expect(canManageSecretOwner(participantAdmin, 'someone@example.com')).toBe(true)
  })

  it('fails closed when the caller identity is unknown', () => {
    expect(
      canManageSecretOwner({ selfUserId: null, canManageOtherUsers: false }, 'x@example.com')
    ).toBe(false)
  })
})

describe('secrets:manage-user-scoped grants', () => {
  it('is granted to TenantParticipantAdmin and system admins only', () => {
    const has = (caps: string[]) => caps.includes('secrets:manage-user-scoped')
    expect(has(getCapabilities({ participantRole: 'TenantParticipantAdmin' }))).toBe(true)
    expect(has(getCapabilities({ isSystemAdmin: true }))).toBe(true)
    expect(has(getCapabilities({ participantRole: 'TenantUser' }))).toBe(false)
    expect(has(getCapabilities({ participantRole: 'TenantAdmin' }))).toBe(false)
    expect(has(getCapabilities({ participantRole: 'TenantParticipant' }))).toBe(false)
  })
})
