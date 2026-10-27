import { describe, expect, it } from 'vitest'
import {
  buildAdminSecretCreatePayload,
  getSecretDescription,
  getSecretScopeDetail,
  type TenantSecret,
} from './types'

const base = { key: 'API_KEY', value: 'shh' }

describe('buildAdminSecretCreatePayload', () => {
  it('builds a tenant payload without scope or ids', () => {
    const result = buildAdminSecretCreatePayload('t1', { ...base, scope: 'tenant' })
    expect(result).toEqual({ ok: true, payload: { key: 'API_KEY', value: 'shh', tenantId: 't1' } })
  })

  it('builds a user payload with a lowercased participant id', () => {
    const result = buildAdminSecretCreatePayload('t1', {
      ...base,
      scope: 'user',
      userId: 'Jane@Example.com',
    })
    expect(result).toMatchObject({ ok: true, payload: { userId: 'jane@example.com' } })
  })

  it('builds an agent payload with the agent object id', () => {
    const result = buildAdminSecretCreatePayload('t1', { ...base, scope: 'agent', agentId: 'abc123' })
    expect(result).toEqual({
      ok: true,
      payload: { key: 'API_KEY', value: 'shh', tenantId: 't1', agentId: 'abc123' },
    })
  })

  it('builds an activation payload with agentId and activationName', () => {
    const result = buildAdminSecretCreatePayload('t1', {
      ...base,
      scope: 'activation',
      agentId: 'abc123',
      activationName: 'prod-eu',
    })
    expect(result).toMatchObject({
      ok: true,
      payload: { agentId: 'abc123', activationName: 'prod-eu' },
    })
  })

  it('sends additionalData as a JSON string', () => {
    const result = buildAdminSecretCreatePayload('t1', { ...base, description: ' note ' })
    expect(result).toMatchObject({ ok: true, payload: { additionalData: '{"description":"note"}' } })
  })

  it('never forwards scope', () => {
    const result = buildAdminSecretCreatePayload('t1', { ...base, scope: 'agent', agentId: 'a' })
    expect(result.ok && 'scope' in result.payload).toBe(false)
  })

  it.each([
    [{ scope: 'agent' }, 'Agent is required'],
    [{ scope: 'activation', agentId: 'a' }, 'Activation is required'],
    [{ scope: 'activation', activationName: 'x' }, 'Agent is required'],
    [{ scope: 'user' }, 'Participant id is required'],
    [{ scope: 'agent', agentId: 'a', activationName: 'x' }, 'Activation is not allowed'],
    [{ scope: 'tenant', agentId: 'a' }, 'not allowed'],
    [{ scope: 'agent', agentId: 'a', userId: 'u@x.com' }, 'User id is not allowed'],
    [{ scope: 'bogus' }, 'Scope must be'],
  ])('rejects %j', (extra, message) => {
    const result = buildAdminSecretCreatePayload('t1', { ...base, ...extra })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain(message)
  })
})

describe('secret display helpers', () => {
  const secret = (over: Partial<TenantSecret>): TenantSecret => ({
    id: '1',
    key: 'k',
    tenantId: 't1',
    agentId: null,
    userId: null,
    activationName: null,
    createdAt: '',
    createdBy: '',
    ...over,
  })

  it('shows the agent name for an agent id, falling back to the id', () => {
    expect(getSecretScopeDetail(secret({ agentId: 'abc' }), { abc: 'compello' })).toBe('compello')
    expect(getSecretScopeDetail(secret({ agentId: 'abc' }), {})).toBe('abc')
  })

  it('shows agent / activation for activation scope', () => {
    expect(
      getSecretScopeDetail(secret({ agentId: 'abc', activationName: 'prod' }), { abc: 'compello' })
    ).toBe('compello / prod')
  })

  it('parses a JSON-string additionalData description', () => {
    expect(getSecretDescription(secret({ additionalData: '{"description":"hello"}' }))).toBe('hello')
    expect(getSecretDescription(secret({ additionalData: 'not json' }))).toBeUndefined()
  })
})
