import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { encodeSafePathSegment, isSafePathSegment } from './path-segment.ts'

describe('isSafePathSegment', () => {
  it('accepts typical identifiers', () => {
    assert.equal(isSafePathSegment('abc'), true)
    assert.equal(isSafePathSegment('thread_123'), true)
    assert.equal(isSafePathSegment('550e8400-e29b-41d4-a716-446655440000'), true)
    assert.equal(isSafePathSegment('507f1f77bcf86cd799439011'), true)
  })

  it('rejects path traversal and encoded separators', () => {
    assert.equal(isSafePathSegment(''), false)
    assert.equal(isSafePathSegment(undefined), false)
    assert.equal(isSafePathSegment('.'), false)
    assert.equal(isSafePathSegment('..'), false)
    assert.equal(isSafePathSegment('../secret'), false)
    assert.equal(isSafePathSegment('..%2F..%2Fadmin'), false)
    assert.equal(isSafePathSegment('foo/bar'), false)
    assert.equal(isSafePathSegment('foo%2Fbar'), false)
    assert.equal(isSafePathSegment('x'.repeat(129)), false)
    assert.equal(isSafePathSegment('%2e'), false)
    assert.equal(isSafePathSegment('%2e%2e'), false)
  })
})

describe('encodeSafePathSegment', () => {
  it('encodes a valid identifier', () => {
    assert.equal(encodeSafePathSegment('thread-1'), 'thread-1')
  })

  it('returns null when the value could alter an upstream path', () => {
    assert.equal(encodeSafePathSegment('../admin'), null)
    assert.equal(encodeSafePathSegment(undefined), null)
  })
})

describe('Admin API path interpolation', () => {
  it('new URL resolves unvalidated ../ out of the tenant-scoped path', () => {
    const tenantId = 'tenant-1'
    const threadId = '../../../other'
    const path = `/api/v1/admin/tenants/${tenantId}/messaging/threads/${threadId}/read`
    const url = new URL(path, 'https://admin.example.com/')
    // Three `../` segments pop `threads`, `messaging`, and `{tenantId}`.
    assert.equal(url.pathname, '/api/v1/admin/tenants/other/read')
    assert.equal(isSafePathSegment(threadId), false)
  })

  it('encodeURIComponent alone does not neutralize . or ..', () => {
    assert.equal(encodeURIComponent('..'), '..')
    assert.equal(encodeURIComponent('.'), '.')
  })
})
