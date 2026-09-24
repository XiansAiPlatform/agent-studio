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

/** Built-in short type labels shown in the type filter (without agent prefix). */
export const BUILTIN_WORKFLOW_TYPE_SHORT_NAMES = [
  'Supervisor Workflow',
  'Task Workflow',
] as const

export function isRunningWorkflow(status: string | null | undefined): boolean {
  return (status ?? '').toLowerCase() === 'running'
}

/**
 * Strip `{agentName}:` from a Temporal workflow type for display/filtering UI.
 * e.g. `Support Bot:Supervisor Workflow` → `Supervisor Workflow`
 */
export function toShortWorkflowType(
  fullType: string | null | undefined,
  agentName: string
): string {
  if (!fullType?.trim()) return ''
  const prefix = `${agentName}:`
  if (fullType.startsWith(prefix)) {
    return fullType.slice(prefix.length)
  }
  return fullType
}

/**
 * Client-side type filter. Compares short names so both agent-prefixed types
 * (`Support Bot:Supervisor Workflow`) and custom un-prefixed types match the
 * option shown in the UI. An empty filter matches everything.
 */
export function matchesWorkflowType(
  workflow: WorkflowExecution,
  agentName: string,
  shortType: string | null | undefined
): boolean {
  if (!shortType) return true
  return toShortWorkflowType(workflow.workflowType, agentName) === shortType
}

/** Unique short type options: built-ins first, then any extras from loaded workflows. */
export function collectWorkflowTypeFilterOptions(
  agentName: string,
  workflows: WorkflowExecution[] | undefined
): string[] {
  const seen = new Set<string>(BUILTIN_WORKFLOW_TYPE_SHORT_NAMES)
  for (const workflow of workflows ?? []) {
    const short = toShortWorkflowType(workflow.workflowType, agentName)
    if (short) seen.add(short)
  }
  const builtins = BUILTIN_WORKFLOW_TYPE_SHORT_NAMES.filter((name) => seen.has(name))
  const extras = [...seen]
    .filter((name) => !(BUILTIN_WORKFLOW_TYPE_SHORT_NAMES as readonly string[]).includes(name))
    .sort((a, b) => a.localeCompare(b))
  return [...builtins, ...extras]
}

/**
 * Activity Logs link for one workflow: opens its log stream (`workflowId`) with the
 * Agent → Activation → Workflow filter preselected (`workflowType`, full `Agent:Flow` value),
 * so going back from the stream lands on that workflow type's streams.
 */
export function workflowLogsHref(
  agentName: string,
  activationName: string,
  workflowId: string,
  workflowType?: string | null
): string {
  const params = new URLSearchParams({
    agent: agentName,
    activation: activationName,
    workflowId,
  })
  if (workflowType) params.set('workflowType', workflowType)
  return `/settings/logs?${params.toString()}`
}
