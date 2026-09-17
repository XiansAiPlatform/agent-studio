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

export function mapXiansTaskToTask(xiansTask: XiansTaskLike): Task {
  const workflowId = (xiansTask.workflowId || xiansTask.taskId || '').trim()
  let status: Task['status'] = 'pending'
  if (xiansTask.isCompleted) {
    status = xiansTask.performedAction?.toLowerCase().includes('reject')
      ? 'rejected'
      : 'approved'
  }

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
  if (task.content?.data?.isCompleted) return false
  if (task.status === 'pending') return true
  return task.content?.data?.workflowStatus === 'Running'
}

export async function fetchTaskByIdClient(taskId: string): Promise<Task | null> {
  const response = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`)
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
