import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isPendingTask,
  mapXiansTaskToTask,
  resolveXiansTaskStatus,
  type XiansTaskLike,
} from './task-mapper.ts'

function makeXiansTask(overrides: Partial<XiansTaskLike> = {}): XiansTaskLike {
  return {
    workflowId: 'wf-1',
    taskId: 'wf-1',
    title: 'Approve email to Customer',
    description: 'Review the draft email before it is sent',
    status: 'Running',
    isCompleted: false,
    performedAction: null,
    ...overrides,
  }
}

describe('resolveXiansTaskStatus', () => {
  it('keeps running HITL tasks pending', () => {
    assert.equal(resolveXiansTaskStatus(makeXiansTask()), 'pending')
  })

  it('maps approved tasks from GetTaskInfo completion fields', () => {
    assert.equal(
      resolveXiansTaskStatus(
        makeXiansTask({
          status: 'Completed',
          isCompleted: true,
          performedAction: 'approve',
        })
      ),
      'approved'
    )
  })

  it('maps rejected tasks from performedAction', () => {
    assert.equal(
      resolveXiansTaskStatus(
        makeXiansTask({
          status: 'Completed',
          isCompleted: true,
          performedAction: 'reject',
        })
      ),
      'rejected'
    )
  })

  it('does not treat admin list rows as pending when only workflow status is Completed', () => {
    assert.equal(
      resolveXiansTaskStatus(
        makeXiansTask({
          status: 'Completed',
          isCompleted: undefined,
          performedAction: null,
        })
      ),
      'approved'
    )
  })

  it('uses performedAction even when the list omitted isCompleted', () => {
    assert.equal(
      resolveXiansTaskStatus(
        makeXiansTask({
          isCompleted: undefined,
          performedAction: 'reject',
        })
      ),
      'rejected'
    )
  })
})

describe('mapXiansTaskToTask', () => {
  it('surfaces approved status on hydrated admin list rows', () => {
    const task = mapXiansTaskToTask(
      makeXiansTask({
        status: 'Completed',
        isCompleted: true,
        performedAction: 'approve',
        closeTime: '2026-09-17T08:10:00.000Z',
      })
    )
    assert.equal(task.status, 'approved')
    assert.equal(task.content.data?.isCompleted, true)
    assert.equal(task.content.data?.performedAction, 'approve')
    assert.equal(isPendingTask(task), false)
  })
})
