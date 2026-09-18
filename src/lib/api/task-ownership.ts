import type { Session } from 'next-auth'
import type { XiansMessage } from '../xians/types'

export type XiansTaskRecord = {
  workflowId?: string
  taskId?: string
  participantId?: string | null
  taskOwner?: string | null
  owner?: string | null
  assignedTo?: string | { id?: string | null } | null
  agentName?: string | null
  activationName?: string | null
  title?: string | null
  description?: string | null
  initialWork?: string | null
  startTime?: string | null
  metadata?: unknown
  [key: string]: unknown
}

const WORKER_IDENTITIES = new Set(['heartbeat', 'system', 'worker', 'temporal'])

/** HITL startTime is typically within milliseconds of the spawning chat message. */
const ATTRIBUTION_WINDOW_MS = 10_000

function normalizeIdentity(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed.toLowerCase() : null
}

function isWorkerIdentity(value: string): boolean {
  return WORKER_IDENTITIES.has(value)
}

function asIdentity(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function parseTimestamp(value?: string | null): number | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/(\.\d{3})\d+/, '$1')
  const ms = Date.parse(normalized)
  return Number.isFinite(ms) ? ms : null
}

function messageTaskIds(message: Pick<XiansMessage, 'taskId' | 'data'>): string[] {
  const ids: string[] = []
  const direct = asIdentity(message.taskId)
  if (direct) ids.push(direct)

  const data = message.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const record = data as Record<string, unknown>
    const nested = asIdentity(record.taskId)
    if (nested) ids.push(nested)
    const draft = record.contentDraft
    if (draft && typeof draft === 'object' && !Array.isArray(draft)) {
      const draftId = asIdentity((draft as Record<string, unknown>).taskId)
      if (draftId) ids.push(draftId)
    }
  }
  return ids
}

function assignedToIdentity(assignedTo: XiansTaskRecord['assignedTo']): string | null {
  if (typeof assignedTo === 'string') return asIdentity(assignedTo)
  if (assignedTo && typeof assignedTo === 'object') return asIdentity(assignedTo.id)
  return null
}

function metadataIdentities(metadata: unknown): Array<string | null> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  const record = metadata as Record<string, unknown>
  return [asIdentity(record.taskOwner), asIdentity(record.owner), asIdentity(record.participantId)]
}

/** Session email and user id. Task owner may be stored as either. */
export function sessionIdentities(session: Session): string[] {
  const values = [session.user?.email, session.user?.id]
    .map(normalizeIdentity)
    .filter((value): value is string => !!value)
  return [...new Set(values)]
}

/**
 * HITL assignee when Xians actually stored a person. Temporal UserId
 * (`heartbeat`) and blank values are not owners.
 */
export function explicitTaskOwner(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const candidate of candidates) {
    const normalized = normalizeIdentity(candidate)
    if (normalized && !isWorkerIdentity(normalized)) {
      return candidate!.trim()
    }
  }
  return null
}

/**
 * Stored HITL owner from Xians fields. Prefers `taskOwner` over memo
 * `participantId`, which is often the Temporal worker id.
 */
export function storedTaskOwner(
  ...tasks: Array<XiansTaskRecord | null | undefined>
): string | null {
  const candidates: Array<string | null | undefined> = []
  for (const task of tasks) {
    if (!task) continue
    candidates.push(
      asIdentity(task.taskOwner),
      asIdentity(task.owner),
      assignedToIdentity(task.assignedTo),
      ...metadataIdentities(task.metadata),
      asIdentity(task.participantId)
    )
  }
  return explicitTaskOwner(...candidates)
}

/**
 * True when the stored HITL owner is this session. Prefer a merged by-id + list
 * record so an empty GetTaskInfo field does not wipe a real list owner.
 */
export function isTaskOwnedBySession(
  task: XiansTaskRecord | null | undefined,
  session: Session
): boolean {
  const owner = normalizeIdentity(storedTaskOwner(task))
  if (!owner) return false
  return sessionIdentities(session).includes(owner)
}

export function taskWorkflowId(task: XiansTaskRecord | null | undefined): string | null {
  if (!task) return null
  const id = task.workflowId || task.taskId
  return typeof id === 'string' && id.trim() ? id : null
}

export function mergeListedAndDetailedTask(
  listed: XiansTaskRecord,
  detailed: XiansTaskRecord
): XiansTaskRecord {
  const owner = storedTaskOwner(detailed, listed)
  return {
    ...listed,
    ...detailed,
    participantId: owner,
    taskOwner: owner,
  }
}

/**
 * When Xians left the HITL assignee blank, this session owns the task only if
 * its own conversation spawned it. Sharing an agent/activation is not enough:
 * admin-created HITL must stay off the participant My list.
 */
export function sessionIsTaskConversationParticipant(
  task: XiansTaskRecord,
  messages: Pick<XiansMessage, 'text' | 'createdAt' | 'taskId' | 'data'>[]
): boolean {
  if (storedTaskOwner(task) || messages.length === 0) return false

  const taskIds = new Set(
    [taskWorkflowId(task), asIdentity(task.taskId)]
      .map((id) => normalizeIdentity(id))
      .filter((id): id is string => !!id)
  )
  if (
    taskIds.size > 0 &&
    messages.some((message) =>
      messageTaskIds(message).some((id) => {
        const normalized = normalizeIdentity(id)
        return !!normalized && taskIds.has(normalized)
      })
    )
  ) {
    return true
  }

  const startedAt = parseTimestamp(task.startTime)
  if (startedAt == null) return false
  return messages.some((message) => {
    const createdAt = parseTimestamp(message.createdAt)
    if (createdAt == null) return false
    return Math.abs(startedAt - createdAt) <= ATTRIBUTION_WINDOW_MS
  })
}

export function resolveTaskOwner(
  task: XiansTaskRecord,
  session: Session,
  messages: Pick<XiansMessage, 'text' | 'createdAt' | 'taskId' | 'data'>[] = []
): string | null {
  const stored = storedTaskOwner(task)
  if (stored) return stored
  if (!sessionIsTaskConversationParticipant(task, messages)) return null
  return asIdentity(session.user?.email) || asIdentity(session.user?.id)
}

/**
 * Normalize the record so `participantId` is the task owner. Worker ids are
 * never returned as the assignee.
 */
export function presentTaskForSession(
  task: XiansTaskRecord,
  session: Session,
  messages: XiansMessage[] = []
): XiansTaskRecord {
  const owner = resolveTaskOwner(task, session, messages)
  return { ...task, participantId: owner, taskOwner: owner }
}

export function sanitizeListedTask(task: XiansTaskRecord): XiansTaskRecord {
  const owner = storedTaskOwner(task)
  return { ...task, participantId: owner, taskOwner: owner }
}

export function isTaskVisibleToSession(
  task: XiansTaskRecord,
  session: Session,
  messages: XiansMessage[]
): boolean {
  if (isTaskOwnedBySession(task, session)) return true
  if (storedTaskOwner(task)) return false
  return sessionIsTaskConversationParticipant(task, messages)
}

/**
 * Participants may only read/act when session participantId equals the task
 * owner (stored, or the conversation that spawned the task when Xians left
 * the assignee unset). Reviewers (`settings:view`) may access any task.
 */
export function canActOnTask(
  task: XiansTaskRecord,
  session: Session,
  messages: XiansMessage[],
  hasSettingsView: boolean
): boolean {
  return isTaskVisibleToSession(task, session, messages) || hasSettingsView
}
