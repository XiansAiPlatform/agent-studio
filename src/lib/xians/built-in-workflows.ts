export const SUPERVISOR_WORKFLOW = 'Supervisor Workflow'

export type WorkflowDefinitionLike = {
  workflowType: string
  name?: string | null
  activable?: boolean
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
 * Chat picker targets: every DefineBuiltIn / DefineSupervisor workflow.
 * DefineCustom is never listed (`isBuiltIn === false`).
 *
 * `isBuiltIn === true`
 * non-activable workflows cannot include into the picker.
 */
export function listBuiltInWorkflows(
  definitions: WorkflowDefinitionLike[]
): string[] {
  const rows = definitions.map((d) => ({
    name: builtInWorkflowName(d.workflowType, d.name),
    isBuiltIn: d.isBuiltIn,
  }))

  const flagged = rows.filter((d) => d.isBuiltIn === true)
  const source =
    flagged.length > 0
      ? flagged
      : rows.filter(
          (d) => d.isBuiltIn !== false && d.name === SUPERVISOR_WORKFLOW
        )

  const unique = Array.from(new Set(source.map((d) => d.name)))

  // Sort the workflows by name, with Supervisor first
  unique.sort((a, b) => {
    if (a === SUPERVISOR_WORKFLOW) return -1
    if (b === SUPERVISOR_WORKFLOW) return 1
    return a.localeCompare(b)
  })
  return unique
}
