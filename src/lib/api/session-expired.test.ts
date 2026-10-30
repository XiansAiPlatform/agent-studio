import { describe, expect, it } from 'vitest'
import { SESSION_EXPIRED_HEADER, sessionExpiredResponse } from './session-expired'
import { unauthorizedError } from './error-handler'

describe('sessionExpiredResponse', () => {
  it('returns a 401 marked as session expired with the default body', async () => {
    const res = sessionExpiredResponse()
    expect(res.status).toBe(401)
    expect(res.headers.get(SESSION_EXPIRED_HEADER)).toBe('1')
    expect(await res.json()).toEqual({ error: 'Unauthorized' })
  })

  it('uses a custom body when given', async () => {
    const res = sessionExpiredResponse({ error: 'Unauthorized', exists: false })
    expect(await res.json()).toEqual({ error: 'Unauthorized', exists: false })
  })

  it('uses the header name SessionGuard reads', () => {
    expect(SESSION_EXPIRED_HEADER).toBe('x-session-expired')
  })
})

describe('unauthorizedError', () => {
  it('marks the 401 as session expired', () => {
    const res = unauthorizedError('Authentication required')
    expect(res.status).toBe(401)
    expect(res.headers.get(SESSION_EXPIRED_HEADER)).toBe('1')
  })
})
