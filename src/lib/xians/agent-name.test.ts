import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  encodeAgentNamePath,
  InvalidAgentNamePathError,
  isDotPathSegment,
  isValidAgentName,
} from './agent-name.ts'

describe('isDotPathSegment', () => {
  it('rejects only the WHATWG special segments', () => {
    assert.equal(isDotPathSegment('.'), true)
    assert.equal(isDotPathSegment('..'), true)
    assert.equal(isDotPathSegment('...'), false)
    assert.equal(isDotPathSegment('My.Agent'), false)
  })
})

describe('isValidAgentName', () => {
  it('accepts normal and dotted names', () => {
    assert.equal(isValidAgentName('EmailDraftAgent'), true)
    assert.equal(isValidAgentName('My.Agent'), true)
    assert.equal(isValidAgentName('Kjøpsassistent'), true)
  })

  it('rejects . and .. even though dots are otherwise legal', () => {
    assert.equal(isValidAgentName('.'), false)
    assert.equal(isValidAgentName('..'), false)
  })
})

describe('encodeAgentNamePath', () => {
  it('encodes Unicode names as a single path segment', () => {
    assert.equal(encodeAgentNamePath('Kjøpsassistent'), 'Kj%C3%B8psassistent')
    assert.equal(encodeAgentNamePath('My.Agent'), 'My.Agent')
  })

  it('throws on . / .. and their percent-encoded forms', () => {
    assert.throws(() => encodeAgentNamePath('.'), InvalidAgentNamePathError)
    assert.throws(() => encodeAgentNamePath('..'), InvalidAgentNamePathError)
    assert.throws(() => encodeAgentNamePath('%2e%2e'), InvalidAgentNamePathError)
    assert.throws(() => encodeAgentNamePath('%2E%2E'), InvalidAgentNamePathError)
    assert.throws(() => encodeAgentNamePath(''), InvalidAgentNamePathError)
  })

  it('prevents new URL from resolving .. out of a tenant-scoped path', () => {
    assert.throws(() => {
      const agentName = encodeAgentNamePath('..')
      void new URL(
        `/api/v1/admin/tenants/t1/messaging/agents/${agentName}/activation/x`,
        'https://admin.example.com/'
      )
    }, InvalidAgentNamePathError)

    const escaped = new URL(
      `/api/v1/admin/tenants/t1/messaging/agents/${'..'}/activation/x`,
      'https://admin.example.com/'
    )
    assert.equal(escaped.pathname, '/api/v1/admin/tenants/t1/messaging/activation/x')
  })
})
