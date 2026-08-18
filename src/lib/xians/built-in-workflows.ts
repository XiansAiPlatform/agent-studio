export const SUPERVISOR_WORKFLOW = 'Supervisor Workflow'
export const TASK_WORKFLOW = 'Task Workflow'

export type WorkflowDefinitionLike = {
  workflowType: string
  name?: string | null
  activable?: boolean
}

export function builtInWorkflowName(
  workflowType: string,
  name?: string | null
): string {
  if (name && name.trim()) return name.trim()
  const idx = workflowType.indexOf(':')
  return idx >= 0 ? workflowType.slice(idx + 1) : workflowType
}

/** Non-activable definitions except Task Workflow. Supervisor first, then A–Z. */
export function listBuiltInWorkflows(
  definitions: WorkflowDefinitionLike[]
): string[] {
  const source = definitions.filter((d) => {
    const n = builtInWorkflowName(d.workflowType, d.name)
    return d.activable !== true && n !== TASK_WORKFLOW
  })

  const unique = Array.from(
    new Set(source.map((d) => builtInWorkflowName(d.workflowType, d.name)))
  )

  unique.sort((a, b) => {
    if (a === SUPERVISOR_WORKFLOW) return -1
    if (b === SUPERVISOR_WORKFLOW) return 1
    return a.localeCompare(b)
  })
  return unique
}

/** Supervisor first, even if it is not in the agent's definition list. */
export function chatWorkflowsForAgent(listed: string[] | undefined): string[] {
  const rest = (listed ?? []).filter((name) => name !== SUPERVISOR_WORKFLOW)
  return [SUPERVISOR_WORKFLOW, ...rest]
}
