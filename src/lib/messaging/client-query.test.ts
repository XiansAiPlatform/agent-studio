import { describe, expect, it } from 'vitest'
import { appendViewAsParticipantId } from './client-query'
import { VIEW_AS_PARTICIPANT_QUERY_PARAM } from './view-as-constants'

describe('appendViewAsParticipantId', () => {
  it('appends the param when a non-empty value is provided', () => {
    const params = new URLSearchParams({ agentName: 'Support' })
    appendViewAsParticipantId(params, 'user@example.com')
    expect(params.get(VIEW_AS_PARTICIPANT_QUERY_PARAM)).toBe('user@example.com')
    expect(params.get('agentName')).toBe('Support')
  })

  it('trims whitespace', () => {
    const params = new URLSearchParams()
    appendViewAsParticipantId(params, '  user@example.com  ')
    expect(params.get(VIEW_AS_PARTICIPANT_QUERY_PARAM)).toBe('user@example.com')
  })

  it('does nothing when the value is null, undefined, or blank', () => {
    const params = new URLSearchParams({ topic: 'general' })
    appendViewAsParticipantId(params, null)
    appendViewAsParticipantId(params, undefined)
    appendViewAsParticipantId(params, '   ')
    expect(params.has(VIEW_AS_PARTICIPANT_QUERY_PARAM)).toBe(false)
    expect(params.get('topic')).toBe('general')
  })

  it('overwrites an existing param', () => {
    const params = new URLSearchParams({
      [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'old@example.com',
    })
    appendViewAsParticipantId(params, 'new@example.com')
    expect(params.get(VIEW_AS_PARTICIPANT_QUERY_PARAM)).toBe('new@example.com')
  })
})
