import { NextRequest, NextResponse } from 'next/server'
import { withTenantFromSession, ApiContext } from '@/lib/api/with-tenant'
import { requireParticipantAdmin } from '@/lib/api/auth'
import { createXiansClient } from '@/lib/xians/client'
import {
  authorizeTaskAccess,
  fetchParticipantMessages,
  fetchTaskById,
  filterTasksOwnedBySession,
  hydrateListedTasks,
  presentTaskForSession,
  sanitizeListedTask,
  storedTaskOwner,
  type XiansTaskRecord,
} from '@/lib/api/task-access'

type XiansTasksListResponse = {
  tasks?: XiansTaskRecord[]
  nextPageToken?: string | null
  pageSize?: number
  hasNextPage?: boolean
  totalCount?: number | null
}

const OWNED_SCAN_PAGE_SIZE = 50
const OWNED_SCAN_MAX_PAGES = 5

/**
 * GET /api/tasks
 * List tasks or fetch a single task by ID. Tenant is injected from session
 * (httpOnly cookie).
 *
 * Ownership is enforced here in the BFF: session participantId must equal
 * the task owner. Xians list `participantId` is often Temporal UserId
 * (`heartbeat`); GetTaskInfo is often empty. `viewType=my` keeps tasks whose
 * stored owner matches the session, or — when that field is unset — whose
 * conversation spawned the task (`participantId = taskOwner`). Sharing an
 * agent/activation is not enough.
 *
 * `viewType=everyone` requires Agent Settings access and is not owner-filtered.
 * Those list rows are still hydrated from GetTaskInfo so completion status
 * (`isCompleted` / `performedAction`) is present for the Admin UI.
 */
export const GET = withTenantFromSession(
  async (request: NextRequest, { tenantContext, session, tenantId: cookieTenantId }: ApiContext) => {
    try {
      const tenantId = tenantContext.tenant.id
      const { searchParams } = new URL(request.url)
      const taskId = searchParams.get('taskId')

      const participantId = session.user?.email
      if (!participantId) {
        return NextResponse.json(
          { error: 'User email not found in session' },
          { status: 401 }
        )
      }

      const agentName = searchParams.get('agentName')
      const activationName = searchParams.get('activationName')
      const status = searchParams.get('status')
      const viewType = searchParams.get('viewType') || 'my'
      const pageSize = clampPageSize(searchParams.get('pageSize'))
      const pageToken = searchParams.get('pageToken') || '1'
      const accessToken = (session as { accessToken?: string }).accessToken

      if (taskId) {
        const task = await fetchTaskById(tenantId, taskId, accessToken)
        const accessError = await authorizeTaskAccess(session, cookieTenantId, task, {
          tenantId,
          accessToken,
        })
        if (accessError) return accessError
        const agent = typeof task.agentName === 'string' ? task.agentName : agentName
        const activation =
          typeof task.activationName === 'string' ? task.activationName : activationName
        const messages =
          !storedTaskOwner(task) && agent && activation
            ? await fetchParticipantMessages(
                tenantId,
                session,
                accessToken,
                agent,
                activation
              ).catch(() => [])
            : []
        return NextResponse.json(presentTaskForSession(task, session, messages))
      }

      if (viewType !== 'my') {
        const authError = await requireParticipantAdmin(session, cookieTenantId)
        if (authError) return authError
      }

      const client = createXiansClient(accessToken)
      const baseParams = new URLSearchParams()
      if (agentName) baseParams.append('agentName', agentName)
      if (activationName) baseParams.append('activationName', activationName)
      if (status) baseParams.append('status', status)

      if (viewType !== 'my') {
        baseParams.set('pageSize', String(pageSize))
        baseParams.set('pageToken', pageToken)
        const response = await client.get<XiansTasksListResponse>(
          `/api/v1/admin/tenants/${tenantId}/tasks?${baseParams.toString()}`
        )
        const listed = Array.isArray(response?.tasks) ? response.tasks : []
        const hydrated = await hydrateListedTasks(tenantId, listed, accessToken)
        return NextResponse.json({
          ...response,
          tasks: hydrated.map(sanitizeListedTask),
        })
      }

      const owned = await listOwnedTasks(
        client,
        tenantId,
        session,
        accessToken,
        baseParams
      )

      const page = Math.max(1, parseInt(pageToken, 10) || 1)
      const start = (page - 1) * pageSize
      const pageTasks = owned.slice(start, start + pageSize)

      return NextResponse.json({
        tasks: pageTasks,
        pageSize,
        nextPageToken: start + pageSize < owned.length ? String(page + 1) : null,
        hasNextPage: start + pageSize < owned.length,
        totalCount: owned.length,
      })
    } catch (error: any) {
      return NextResponse.json(
        {
          error: error.response?.data?.message || error.message || 'Failed to fetch tasks',
          details: error.response?.data?.details || error.response?.data,
        },
        { status: error.response?.status || 500 }
      )
    }
  }
)

function clampPageSize(raw: string | null): number {
  const parsed = raw ? parseInt(raw, 10) : 20
  if (!Number.isFinite(parsed) || parsed <= 0) return 20
  return Math.min(parsed, 100)
}

/**
 * Scan Xians list pages, then keep tasks whose stored owner or spawning
 * conversation is the caller (`participantId = taskOwner`).
 */
async function listOwnedTasks(
  client: ReturnType<typeof createXiansClient>,
  tenantId: string,
  session: Parameters<typeof filterTasksOwnedBySession>[2],
  accessToken: string | undefined,
  baseParams: URLSearchParams
): Promise<XiansTaskRecord[]> {
  const owned: XiansTaskRecord[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= OWNED_SCAN_MAX_PAGES; page++) {
    const params = new URLSearchParams(baseParams)
    params.set('pageSize', String(OWNED_SCAN_PAGE_SIZE))
    params.set('pageToken', String(page))

    const response = await client.get<XiansTasksListResponse>(
      `/api/v1/admin/tenants/${tenantId}/tasks?${params.toString()}`
    )
    const listed = Array.isArray(response?.tasks) ? response.tasks : []
    const mine = await filterTasksOwnedBySession(
      tenantId,
      listed,
      session,
      accessToken
    )

    for (const task of mine) {
      const id = typeof task.workflowId === 'string' ? task.workflowId : null
      if (!id || seen.has(id)) continue
      seen.add(id)
      owned.push(task)
    }

    if (!response?.hasNextPage || listed.length === 0) break
  }

  return owned
}
