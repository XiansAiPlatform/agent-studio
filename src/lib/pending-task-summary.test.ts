import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  parsePendingTaskSummary,
  pendingTaskActivationKey,
  summarizePendingTasks,
} from './pending-task-summary.ts'

describe('pending-task-summary', () => {
  it('groups pending tasks by activation and keeps the total', () => {
    const summary = summarizePendingTasks([
      { agentName: 'Sales', activationName: 'eu' },
      { agentName: 'Sales', activationName: 'eu' },
      { agentName: 'Support', activationName: 'main' },
      { agentName: 'Support' },
    ])

    assert.equal(summary.totalCount, 4)
    assert.deepEqual(summary.countsByActivation, {
      [pendingTaskActivationKey('Sales', 'eu')]: 2,
      [pendingTaskActivationKey('Support', 'main')]: 1,
    })
  })

  it('keys composed and decomposed agent names the same way', () => {
    assert.equal(
      pendingTaskActivationKey('Kj\u00f8psassistent', 'a\u0300'),
      pendingTaskActivationKey('Kj\u00f8psassistent', '\u00e0')
    )
  })

  it('drops malformed fields from an API response', () => {
    assert.deepEqual(
      parsePendingTaskSummary({ totalCount: 'x', countsByActivation: { ok: 2, bad: 'y', zero: 0 } }),
      { totalCount: 0, countsByActivation: { ok: 2 } }
    )
    assert.deepEqual(parsePendingTaskSummary(null), { totalCount: 0, countsByActivation: {} })
  })
})
