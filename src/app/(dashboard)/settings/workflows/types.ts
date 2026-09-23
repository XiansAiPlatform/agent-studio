/** Mirrors Features.WebApi.Models.WorkflowResponse (camelCase JSON). */
export interface WorkflowExecution {
  agent: string
  tenantId?: string | null
  owner?: string | null
  workflowId?: string | null
  runId?: string | null
  workflowType?: string | null
  status?: string | null
  startTime?: string | null
  closeTime?: string | null
  executionTime?: string | null
  taskQueue?: string | null
  historyLength?: number
}

/** Mirrors Features.WebApi.Models.PaginatedWorkflowsResponse. */
export interface PaginatedWorkflows {
  workflows: WorkflowExecution[]
  nextPageToken?: string | null
  pageSize: number
  hasNextPage: boolean
  totalCount?: number | null
}

/** Status values accepted by Admin list API (lowercased query). */
export type WorkflowStatusFilter =
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'terminated'
  | 'continuedasnew'
  | 'timedout'

export const WORKFLOW_STATUS_OPTIONS: { value: WorkflowStatusFilter; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'continuedasnew', label: 'Continued As New' },
  { value: 'timedout', label: 'Timed Out' },
]

export function isRunningWorkflow(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'running'
}

export function workflowLogsHref(
  agentName: string,
  activationName: string,
  workflowId: string
): string {
  const params = new URLSearchParams({
    agent: agentName,
    activation: activationName,
    workflowId,
  })
  return `/settings/logs?${params.toString()}`
}
