import { Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { requireParticipantAdmin } from '@/lib/api/auth'
import { createXiansClient } from '@/lib/xians/client'
import type { XiansMessage } from '@/lib/xians/types'
import {
  canActOnTask,
  isTaskOwnedBySession,
  isTaskVisibleToSession,
  mergeListedAndDetailedTask,
  presentTaskForSession,
  storedTaskOwner,
  taskWorkflowId,
  type XiansTaskRecord,
} from './task-ownership'

export type { XiansTaskRecord } from './task-ownership'
export {
  canActOnTask,
  explicitTaskOwner,
  isTaskOwnedBySession,
  isTaskVisibleToSession,
  mergeListedAndDetailedTask,
  presentTaskForSession,
  sanitizeListedTask,
  sessionIdentities,
  storedTaskOwner,
  taskWorkflowId,
} from './task-ownership'

const HISTORY_PAGE_SIZE = 50
const HISTORY_MAX_PAGES = 3

export async function fetchTaskById(
  tenantId: string,
  taskId: string,
  accessToken?: string
): Promise<XiansTaskRecord> {
  const client = createXiansClient(accessToken)
  return client.get<XiansTaskRecord>(
    `/api/v1/admin/tenants/${tenantId}/tasks/by-id?taskId=${encodeURIComponent(taskId)}`
  )
}

export async function fetchParticipantMessages(
  tenantId: string,
  session: Session,
  accessToken: string | undefined,
  agentName: string,
  activationName: string
): Promise<XiansMessage[]> {
  const participantId = session.user?.email
  if (!participantId || !agentName || !activationName) return []

  const client = createXiansClient(accessToken)
  const messages: XiansMessage[] = []

  for (let page = 1; page <= HISTORY_MAX_PAGES; page++) {
    const params = new URLSearchParams({
      agentName,
      activationName,
      participantId,
      page: String(page),
      pageSize: String(HISTORY_PAGE_SIZE),
      chatOnly: 'false',
      sortOrder: 'desc',
    })
    const response = await client.get<XiansMessage[] | { messages?: XiansMessage[] }>(
      `/api/v1/admin/tenants/${tenantId}/messaging/history?${params.toString()}`
    )
    const pageMessages = Array.isArray(response)
      ? response
      : Array.isArray(response?.messages)
        ? response.messages
        : []
    messages.push(...pageMessages)
    if (pageMessages.length < HISTORY_PAGE_SIZE) break
  }

  return messages
}

async function messagesForActivation(
  tenantId: string,
  session: Session,
  accessToken: string | undefined,
  task: XiansTaskRecord,
  cache: Map<string, XiansMessage[]>
): Promise<XiansMessage[]> {
  const agentName = typeof task.agentName === 'string' ? task.agentName : ''
  const activationName = typeof task.activationName === 'string' ? task.activationName : ''
  if (!agentName || !activationName) return []
  const key = `${agentName}\0${activationName}`
  const cached = cache.get(key)
  if (cached) return cached
  try {
    const messages = await fetchParticipantMessages(
      tenantId,
      session,
      accessToken,
      agentName,
      activationName
    )
    cache.set(key, messages)
    return messages
  } catch (error) {
    console.warn('[Tasks] Failed to load participant messages for task owner', error)
    cache.set(key, [])
    return []
  }
}

/**
 * Resolve each listed workflow to GetTaskInfo, recover a stored owner, then
 * keep tasks whose owner is this session (`participantId = taskOwner`). When
 * Xians stored heartbeat/blank, only the conversation that spawned the task
 * is treated as the owner — not every participant on that activation.
 * Runs in the BFF — never in the client.
 */
export async function filterTasksOwnedBySession(
  tenantId: string,
  tasks: XiansTaskRecord[],
  session: Session,
  accessToken?: string
): Promise<XiansTaskRecord[]> {
  const cache = new Map<string, XiansMessage[]>()
  const detailed = await Promise.all(
    tasks.map(async (listed) => {
      const id = taskWorkflowId(listed)
      if (!id) return null
      try {
        const byId = await fetchTaskById(tenantId, id, accessToken)
        return mergeListedAndDetailedTask(listed, byId)
      } catch {
        return storedTaskOwner(listed) || listed.agentName ? listed : null
      }
    })
  )

  const visible: XiansTaskRecord[] = []
  for (const task of detailed) {
    if (!task) continue
    const messages = storedTaskOwner(task)
      ? []
      : await messagesForActivation(tenantId, session, accessToken, task, cache)
    if (!isTaskVisibleToSession(task, session, messages)) continue
    visible.push(presentTaskForSession(task, session, messages))
  }
  return visible
}

/**
 * Participants may only read/act when session participantId equals the task
 * owner. Reviewers (`settings:view`) may access any task in the tenant.
 */
export async function authorizeTaskAccess(
  session: Session,
  cookieTenantId: string | null,
  task: XiansTaskRecord,
  options?: {
    tenantId?: string
    accessToken?: string
  }
): Promise<NextResponse | null> {
  if (isTaskOwnedBySession(task, session)) {
    return null
  }

  const tenantId =
    options?.tenantId ||
    (typeof task.tenantId === 'string' ? task.tenantId : null) ||
    cookieTenantId
  const accessToken =
    options?.accessToken || (session as { accessToken?: string }).accessToken

  let messages: XiansMessage[] = []
  if (!storedTaskOwner(task) && tenantId) {
    messages = await messagesForActivation(
      tenantId,
      session,
      accessToken,
      task,
      new Map()
    )
    if (canActOnTask(task, session, messages, false)) {
      return null
    }
  }

  return requireParticipantAdmin(session, cookieTenantId)
}
