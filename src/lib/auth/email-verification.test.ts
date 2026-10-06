import { describe, expect, it } from 'vitest'

import {
  evaluateEmailVerification,
  redactEmail,
  resolveEmailVerificationPolicy,
  type EmailVerificationPolicy,
} from './email-verification'

const required = { AZURE_AD_ALLOW_UNVERIFIED_EMAIL: 'false' }

function policy(overrides: Partial<EmailVerificationPolicy> = {}): EmailVerificationPolicy {
  return { providerId: 'azure-ad', verifyClaims: [], trustedValues: [], ...overrides }
}

describe('resolveEmailVerificationPolicy', () => {
  it('returns null when no switch is set', () => {
    expect(resolveEmailVerificationPolicy('azure-ad', {})).toBeNull()
  })

  it('treats empty switch values as unset', () => {
    expect(
      resolveEmailVerificationPolicy('azure-ad', {
        AZURE_AD_ALLOW_UNVERIFIED_EMAIL: '  ',
        AUTH_ALLOW_UNVERIFIED_EMAIL: '',
      })
    ).toBeNull()
  })

  it('applies the global switch when no per-provider switch is set', () => {
    const result = resolveEmailVerificationPolicy('google', {
      AUTH_ALLOW_UNVERIFIED_EMAIL: 'false',
      GOOGLE_VERIFY_CLAIMS: 'email_verified=true',
    })
    expect(result?.verifyClaims).toEqual([{ claim: 'email_verified', value: 'true' }])
  })

  it('lets the per-provider switch override the global one', () => {
    expect(
      resolveEmailVerificationPolicy('google', {
        AUTH_ALLOW_UNVERIFIED_EMAIL: 'false',
        GOOGLE_ALLOW_UNVERIFIED_EMAIL: 'TRUE',
      })
    ).toBeNull()
    expect(
      resolveEmailVerificationPolicy('google', {
        AUTH_ALLOW_UNVERIFIED_EMAIL: 'true',
        GOOGLE_ALLOW_UNVERIFIED_EMAIL: 'false',
        GOOGLE_VERIFY_CLAIMS: 'email_verified=true',
      })
    ).not.toBeNull()
  })

  it('fails closed on an unparseable switch value', () => {
    const result = resolveEmailVerificationPolicy('azure-ad', { AZURE_AD_ALLOW_UNVERIFIED_EMAIL: 'no' })
    expect(result?.configError).toContain('AZURE_AD_ALLOW_UNVERIFIED_EMAIL')
  })

  it('fails closed on an unparseable global switch value', () => {
    const result = resolveEmailVerificationPolicy('keycloak', { AUTH_ALLOW_UNVERIFIED_EMAIL: '0' })
    expect(result?.configError).toContain('AUTH_ALLOW_UNVERIFIED_EMAIL')
  })

  it('exempts providers without an env prefix', () => {
    expect(resolveEmailVerificationPolicy('local', { AUTH_ALLOW_UNVERIFIED_EMAIL: 'false' })).toBeNull()
  })

  it('splits verify claims on the first = only', () => {
    const result = resolveEmailVerificationPolicy('azure-ad', {
      ...required,
      AZURE_AD_VERIFY_CLAIMS: 'xms_edov=true, acr=a=b',
    })
    expect(result?.verifyClaims).toEqual([
      { claim: 'xms_edov', value: 'true' },
      { claim: 'acr', value: 'a=b' },
    ])
    expect(result?.configError).toBeUndefined()
  })

  it.each(['xms_edov', '=true', 'xms_edov='])('rejects malformed verify claim "%s"', (entry) => {
    const result = resolveEmailVerificationPolicy('azure-ad', { ...required, AZURE_AD_VERIFY_CLAIMS: entry })
    expect(result?.configError).toContain('is not claim=value')
  })

  it('rejects a policy with no checks configured', () => {
    const result = resolveEmailVerificationPolicy('azure-ad', {
      ...required,
      AZURE_AD_TRUSTED_CLAIM: 'tid',
    })
    expect(result?.configError).toContain('neither')
  })

  it('rejects trusted values without a trusted claim', () => {
    const result = resolveEmailVerificationPolicy('azure-ad', {
      ...required,
      AZURE_AD_TRUSTED_VALUES: 'abc-123',
    })
    expect(result?.configError).toContain('neither')
  })

  it('lower-cases trusted values', () => {
    const result = resolveEmailVerificationPolicy('azure-ad', {
      ...required,
      AZURE_AD_TRUSTED_CLAIM: 'tid',
      AZURE_AD_TRUSTED_VALUES: 'ABC-123, def',
    })
    expect(result?.trustedValues).toEqual(['abc-123', 'def'])
  })
})

describe('evaluateEmailVerification', () => {
  const verified = policy({ verifyClaims: [{ claim: 'email_verified', value: 'true' }] })

  it('refuses every sign-in when the policy has a config error', () => {
    const result = evaluateEmailVerification(policy({ configError: 'bad' }), {
      email: 'a@example.com',
      email_verified: true,
    })
    expect(result.admitted).toBe(false)
    expect(result.reason).toContain('invalid configuration')
  })

  it('admits a verified email and returns it lower-cased', () => {
    const result = evaluateEmailVerification(verified, { email: ' A@Example.COM ', email_verified: true })
    expect(result).toMatchObject({ admitted: true, email: 'a@example.com' })
  })

  it.each([true, 'true', 'True', 1, '1'])('accepts boolean claim value %j', (value) => {
    expect(evaluateEmailVerification(verified, { email: 'a@example.com', email_verified: value }).admitted).toBe(true)
  })

  it.each([false, 'false', 0, undefined, 'yes'])('rejects boolean claim value %j', (value) => {
    expect(evaluateEmailVerification(verified, { email: 'a@example.com', email_verified: value }).admitted).toBe(false)
  })

  it('matches array claims when any element matches', () => {
    const amr = policy({ verifyClaims: [{ claim: 'amr', value: 'mfa' }] })
    expect(evaluateEmailVerification(amr, { email: 'a@example.com', amr: ['pwd', 'mfa'] }).admitted).toBe(true)
    expect(evaluateEmailVerification(amr, { email: 'a@example.com', amr: ['pwd'] }).admitted).toBe(false)
  })

  it('reads the B2C emails[] claim', () => {
    const result = evaluateEmailVerification(verified, { emails: ['B2C@Example.com'], email_verified: true })
    expect(result).toMatchObject({ admitted: true, email: 'b2c@example.com' })
  })

  it('reads the B2C signInNames.emailAddress claim', () => {
    const result = evaluateEmailVerification(verified, {
      signInNames: { emailAddress: 'nested@example.com' },
      email_verified: true,
    })
    expect(result).toMatchObject({ admitted: true, email: 'nested@example.com' })
  })

  it('does not treat preferred_username as an email claim', () => {
    const result = evaluateEmailVerification(verified, { preferred_username: 'a@example.com', email_verified: true })
    expect(result).toEqual({ admitted: false, reason: 'no email claim in token' })
  })

  it('names the failed claims', () => {
    const result = evaluateEmailVerification(verified, { email: 'a@example.com', email_verified: false })
    expect(result).toEqual({ admitted: false, reason: 'claim check failed: email_verified' })
  })

  it('names every failed claim', () => {
    const two = policy({
      verifyClaims: [
        { claim: 'email_verified', value: 'true' },
        { claim: 'xms_edov', value: 'true' },
      ],
    })
    const result = evaluateEmailVerification(two, { email: 'a@example.com' })
    expect(result).toEqual({ admitted: false, reason: 'claim check failed: email_verified, xms_edov' })
  })

  it('refuses null claims when verify claims are configured', () => {
    expect(evaluateEmailVerification(verified, null)).toEqual({
      admitted: false,
      reason: 'no email claim in token',
    })
  })

  it('falls back to the trusted claim when the verify claims fail', () => {
    const both = policy({
      verifyClaims: [{ claim: 'xms_edov', value: 'true' }],
      trustedClaim: 'tid',
      trustedValues: ['abc-123'],
    })
    const result = evaluateEmailVerification(both, { email: 'a@example.com', tid: 'ABC-123' })
    expect(result).toEqual({ admitted: true, reason: 'trusted tid' })
  })

  it('admits a trusted-claim-only policy when the value matches', () => {
    const trusted = policy({ trustedClaim: 'hd', trustedValues: ['example.com'] })
    expect(evaluateEmailVerification(trusted, { hd: 'example.com' })).toEqual({
      admitted: true,
      reason: 'trusted hd',
    })
  })

  it('refuses an untrusted claim value', () => {
    const trusted = policy({ trustedClaim: 'hd', trustedValues: ['example.com'] })
    expect(evaluateEmailVerification(trusted, { hd: 'evil.com' })).toEqual({
      admitted: false,
      reason: 'hd not trusted',
    })
    expect(evaluateEmailVerification(trusted, null).admitted).toBe(false)
  })

  it('mentions email verification when verify claims were also checked', () => {
    const both = policy({
      verifyClaims: [{ claim: 'xms_edov', value: 'true' }],
      trustedClaim: 'tid',
      trustedValues: ['abc-123'],
    })
    expect(evaluateEmailVerification(both, { email: 'a@example.com', tid: 'other' }).reason).toBe(
      'email not verified and tid not trusted'
    )
  })
})

describe('redactEmail', () => {
  it.each([
    [null, '(none)'],
    ['', '(none)'],
    ['no-at-sign', '***'],
    ['@example.com', '***'],
    ['alice@example.com', 'a***@example.com'],
  ])('redacts %j as %j', (input, expected) => {
    expect(redactEmail(input)).toBe(expected)
  })
})
