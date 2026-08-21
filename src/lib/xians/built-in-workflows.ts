/**
 * Legacy default supervisor name.
 * Treat this name as special only for backward compatibility: older deployments
 * shipped it with `isBuiltIn: false`. New workflows set `isBuiltIn: true`.
 */
export const SUPERVISOR_WORKFLOW = 'Supervisor Workflow'

export type WorkflowDefinitionLike = {
  workflowType: string
  name?: string | null
  activable?: boolean
  /** New chat-eligible workflows set this true. */
  isBuiltIn?: boolean
}

export function builtInWorkflowName(
  workflowType: string,
  name?: string | null
): string {
  if (name && name.trim()) return name.trim()
  const idx = workflowType.indexOf(':')
  return idx >= 0 ? workflowType.slice(idx + 1) : workflowType
}

/**
 * Chat picker targets: workflows with `isBuiltIn === true`.
 * Also includes the legacy "Supervisor Workflow" name so older agents that
 * predate the flag still appear. That name match is backward compatibility
 * only — do not add more special-cased names; new workflows must set
 * `isBuiltIn: true`.
 */
export function listBuiltInWorkflows(
  definitions: WorkflowDefinitionLike[]
): string[] {
  const rows = definitions.map((d) => ({
    name: builtInWorkflowName(d.workflowType, d.name),
    isBuiltIn: d.isBuiltIn,
  }))

  const source = rows.filter(
    (d) =>
      d.isBuiltIn === true ||
      // Backward compat only: legacy supervisor predates isBuiltIn.
      d.name === SUPERVISOR_WORKFLOW
  )

  const unique = Array.from(new Set(source.map((d) => d.name).filter(Boolean)))

  // Prefer the legacy supervisor name when both it and other built-ins exist.
  unique.sort((a, b) => {
    if (a === SUPERVISOR_WORKFLOW) return -1
    if (b === SUPERVISOR_WORKFLOW) return 1
    return a.localeCompare(b)
  })
  return unique
}

/**
 * Pick a workflow from the agent's registered list.
 * Uses `requested` when it is in the list; otherwise the first entry
 * (`listBuiltInWorkflows` already prefers Supervisor Workflow when present).
 * Returns null when the list is empty — never invents a name.
 */
export function resolveWorkflowName(
  requested: string | null | undefined,
  available: string[]
): string | null {
  const requestedName = requested?.trim()
  if (requestedName && available.includes(requestedName)) {
    return requestedName
  }
  return available[0] ?? null
}
