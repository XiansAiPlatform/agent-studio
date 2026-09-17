import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Session } from 'next-auth'
import type { XiansMessage } from '../xians/types'
import {
  canActOnTask,
  isTaskOwnedBySession,
  isTaskVisibleToSession,
  presentTaskForSession,
  sanitizeListedTask,
  sessionIsTaskConversationParticipant,
  storedTaskOwner,
  type XiansTaskRecord,
} from './task-ownership.ts'

function makeSession(email = 'participant@localhost.local'): Session {
  return {
    expires: '2099-01-01T00:00:00.000Z',
    user: { email, id: email },
  } as Session
}

function makeTask(overrides: Partial<XiansTaskRecord> = {}): XiansTaskRecord {
  return {
    workflowId: 'wf-anna',
    title: 'Approve email to Customer',
    description: 'Purpose: Draft an email to Anna about the event',
    startTime: '2026-09-17T08:02:50.1117507Z',
    agentName: 'EmailDraftAgent',
    activationName: 'EmailDraftAgent - Productive Basilisk',
    participantId: 'heartbeat',
    ...overrides,
  }
}

function makeMessage(
  overrides: Partial<Pick<XiansMessage, 'text' | 'createdAt' | 'taskId' | 'data'>> = {}
): Pick<XiansMessage, 'text' | 'createdAt' | 'taskId' | 'data'> {
  return {
    text: 'Draft an email to Anna about the event',
    createdAt: '2026-09-17T08:02:49.968Z',
    taskId: null,
    data: null,
    ...overrides,
  }
}

describe('task ownership', () => {
  it('does not treat heartbeat as a stored owner', () => {
    assert.equal(storedTaskOwner(makeTask()), null)
    assert.equal(isTaskOwnedBySession(makeTask(), makeSession()), false)
  })

  it('keeps a stored person as the owner', () => {
    const task = makeTask({ participantId: 'participant@localhost.local' })
    assert.equal(storedTaskOwner(task), 'participant@localhost.local')
    assert.equal(isTaskOwnedBySession(task, makeSession()), true)
    assert.equal(isTaskOwnedBySession(task, makeSession('admin@localhost.local')), false)
  })

  it('does not give every chatter on an activation an unowned task', () => {
    const adminTask = makeTask({
      workflowId: 'wf-markus',
      description: 'Purpose: Draft an email to Markus about the pastries',
      startTime: '2026-09-17T08:00:57.30591Z',
    })
    const participantHistory = [
      makeMessage(),
      makeMessage({
        text: 'Write a follow-up to Jordan about the renewal',
        createdAt: '2026-09-16T04:03:25.848Z',
      }),
    ]

    assert.equal(
      sessionIsTaskConversationParticipant(adminTask, participantHistory),
      false
    )
    assert.equal(
      isTaskVisibleToSession(adminTask, makeSession(), participantHistory as XiansMessage[]),
      false
    )
  })

  it('attributes an unowned task to the conversation that spawned it', () => {
    const task = makeTask()
    const messages = [makeMessage()]
    assert.equal(sessionIsTaskConversationParticipant(task, messages), true)

    const presented = presentTaskForSession(task, makeSession(), messages as XiansMessage[])
    assert.equal(presented.participantId, 'participant@localhost.local')
    assert.equal(presented.taskOwner, 'participant@localhost.local')
  })

  it('matches a spawning message by taskId even without a nearby timestamp', () => {
    const task = makeTask({ startTime: null })
    const messages = [
      makeMessage({
        createdAt: '2026-09-01T00:00:00.000Z',
        taskId: 'wf-anna',
      }),
    ]
    assert.equal(sessionIsTaskConversationParticipant(task, messages), true)
  })

  it('does not match the same prompt from another day', () => {
    const adminJordanTask = makeTask({
      workflowId: 'wf-jordan',
      description: 'Purpose: Write a follow-up to Jordan about the renewal',
      startTime: '2026-09-17T07:38:18.501539Z',
    })
    const oldParticipantPrompt = [
      makeMessage({
        text: 'Write a follow-up to Jordan about the renewal',
        createdAt: '2026-09-16T04:03:25.848Z',
      }),
    ]
    assert.equal(
      sessionIsTaskConversationParticipant(adminJordanTask, oldParticipantPrompt),
      false
    )
  })

  it('lets reviewers act on tasks they do not own', () => {
    const task = makeTask({ participantId: 'someone-else@example.com' })
    assert.equal(canActOnTask(task, makeSession(), [], false), false)
    assert.equal(canActOnTask(task, makeSession(), [], true), true)
  })

  it('strips heartbeat from Everyone listings without stamping a session', () => {
    const sanitized = sanitizeListedTask(makeTask())
    assert.equal(sanitized.participantId, null)
    assert.equal(sanitized.taskOwner, null)
  })
})
