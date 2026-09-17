import type { Task } from '@/types/task'

export type XiansTaskLike = {
  taskId?: string | null
  workflowId?: string | null
  runId?: string | null
  title?: string | null
  description?: string | null
  initialWork?: string | null
  finalWork?: string | null
  participantId?: string | null
  status?: string | null
  isCompleted?: boolean
  availableActions?: string[]
  performedAction?: string | null
  comment?: string | null
  startTime?: string | null
  closeTime?: string | null
  metadata?: unknown
  agentName?: string | null
  activationName?: string | null
}

const TERMINAL_WORKFLOW_STATUSES = new Set([
  'completed',
  'failed',
  'canceled',
  'cancelled',
  'terminated',
  'timedout',
])

export function resolveXiansTaskStatus(
  xiansTask: Pick<XiansTaskLike, 'status' | 'isCompleted' | 'performedAction' | 'closeTime'>
): Task['status'] {
  const action = (xiansTask.performedAction || '').toLowerCase()
  if (action.includes('reject')) return 'rejected'
  if (action.includes('approve')) return 'approved'

  const workflow = (xiansTask.status || '').toLowerCase()
  const completed =
    xiansTask.isCompleted === true ||
    !!xiansTask.closeTime ||
    TERMINAL_WORKFLOW_STATUSES.has(workflow)

  if (!completed) return 'pending'
  return 'approved'
}

export function mapXiansTaskToTask(xiansTask: XiansTaskLike): Task {
  const workflowId = (xiansTask.workflowId || xiansTask.taskId || '').trim()
  const status = resolveXiansTaskStatus(xiansTask)

  return {
    id: workflowId,
    title: xiansTask.title || 'Untitled request',
    description: xiansTask.description || 'No description available',
    status,
    priority: 'medium',
    createdBy: {
      id: xiansTask.activationName || 'Unknown agent',
      name: xiansTask.activationName || 'Unknown agent',
    },
    assignedTo: xiansTask.participantId
      ? {
          id: xiansTask.participantId,
          name: xiansTask.participantId,
        }
      : undefined,
    createdAt: xiansTask.startTime || new Date().toISOString(),
    updatedAt: xiansTask.closeTime || xiansTask.startTime || new Date().toISOString(),
    conversationId: undefined,
    topicId: undefined,
    content: {
      originalRequest: xiansTask.initialWork || undefined,
      proposedAction: xiansTask.finalWork || undefined,
      reasoning: xiansTask.description || undefined,
      data: {
        taskId: xiansTask.taskId || workflowId,
        workflowId,
        runId: xiansTask.runId,
        workflowStatus: xiansTask.status,
        isCompleted: xiansTask.isCompleted,
        availableActions: xiansTask.availableActions || [],
        performedAction: xiansTask.performedAction || null,
        comment: xiansTask.comment || null,
        metadata: xiansTask.metadata || null,
        activationName: xiansTask.activationName,
        agentName: xiansTask.agentName,
      },
    },
  }
}

export function taskMatchesId(task: Task, id: string): boolean {
  if (!id) return false
  if (task.id === id) return true
  const data = task.content?.data
  return data?.workflowId === id || data?.taskId === id
}

export function isPendingTask(task: Task | null | undefined): boolean {
  if (!task) return false
  if (task.status === 'approved' || task.status === 'rejected' || task.status === 'obsolete') {
    return false
  }
  if (task.content?.data?.isCompleted) return false
  if (task.content?.data?.performedAction) return false
  if (task.status === 'pending') return true
  return task.content?.data?.workflowStatus === 'Running'
}

export async function fetchTaskByIdClient(taskId: string): Promise<Task | null> {
  const response = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`, {
    cache: 'no-store',
  })
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  if (!data || typeof data !== 'object' || data.error) return null
  return mapXiansTaskToTask(data)
}

export async function performTaskAction(
  taskId: string,
  action: string,
  comment?: string
): Promise<void> {
  const response = await fetch(
    `/api/tasks/actions?taskId=${encodeURIComponent(taskId)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        comment: comment?.trim() || undefined,
      }),
    }
  )
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      (typeof error.error === 'string' && error.error) ||
        'Failed to update this request'
    )
  }
}

export function formatTaskActionLabel(action: string): string {
  const lower = action.toLowerCase()
  if (lower === 'approve') return 'Approve'
  if (lower === 'reject') return 'Reject'
  return action.charAt(0).toUpperCase() + action.slice(1)
}
