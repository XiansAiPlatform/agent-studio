import { describe, expect, it } from 'vitest'
import { rejectClientViewAsParameter } from './messaging-view-as-guards'
import {
  VIEW_AS_PARTICIPANT_QUERY_PARAM,
  getViewAsParticipantIdFromSearchParams,
} from '@/lib/messaging/view-as-constants'

describe('messaging-view-as', () => {
  it('reads viewAsParticipantId from search params', () => {
    const params = new URLSearchParams({
      [VIEW_AS_PARTICIPANT_QUERY_PARAM]: ' user@example.com ',
    })
    expect(getViewAsParticipantIdFromSearchParams(params)).toBe('user@example.com')
  })

  it('rejects view-as on mutation when present in query', async () => {
    const params = new URLSearchParams({
      [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'other@example.com',
    })
    const res = rejectClientViewAsParameter(params)
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('rejects view-as on mutation when present in body', async () => {
    const params = new URLSearchParams()
    const res = rejectClientViewAsParameter(params, {
      [VIEW_AS_PARTICIPANT_QUERY_PARAM]: 'other@example.com',
    })
    expect(res).not.toBeNull()
    expect(res?.status).toBe(403)
  })

  it('allows mutations without view-as', () => {
    const res = rejectClientViewAsParameter(new URLSearchParams())
    expect(res).toBeNull()
  })
})
