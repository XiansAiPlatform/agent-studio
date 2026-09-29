import { describe, expect, it } from 'vitest'
import { isViewAsTopicMutationBlocked } from './view-as-constants'

describe('isViewAsTopicMutationBlocked', () => {
  it('blocks topic create/delete while view-as is active', () => {
    expect(isViewAsTopicMutationBlocked(true)).toBe(true)
  })

  it('allows topic create/delete when viewing own conversations', () => {
    expect(isViewAsTopicMutationBlocked(false)).toBe(false)
  })
})
