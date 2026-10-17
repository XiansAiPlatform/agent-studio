export type PendingTaskSummary = {
  totalCount: number
  /** Keyed by `pendingTaskActivationKey(agentName, activationName)`. */
  countsByActivation: Record<string, number>
}

export const EMPTY_PENDING_TASK_SUMMARY: PendingTaskSummary = {
  totalCount: 0,
  countsByActivation: {},
}

/** Agent names reach us both percent-decoded and decomposed, so normalize before keying. */
export function pendingTaskActivationKey(agentName: string, activationName: string): string {
  return `${agentName.normalize('NFC')}|${activationName.normalize('NFC')}`
}

export function summarizePendingTasks(
  tasks: ReadonlyArray<{ agentName?: unknown; activationName?: unknown }>
): PendingTaskSummary {
  const countsByActivation: Record<string, number> = {}
  for (const task of tasks) {
    if (typeof task.agentName !== 'string' || typeof task.activationName !== 'string') continue
    const key = pendingTaskActivationKey(task.agentName, task.activationName)
    countsByActivation[key] = (countsByActivation[key] ?? 0) + 1
  }
  return { totalCount: tasks.length, countsByActivation }
}

export function parsePendingTaskSummary(data: unknown): PendingTaskSummary {
  if (!data || typeof data !== 'object') return EMPTY_PENDING_TASK_SUMMARY
  const { totalCount, countsByActivation } = data as Partial<PendingTaskSummary>
  const counts: Record<string, number> = {}
  if (countsByActivation && typeof countsByActivation === 'object') {
    for (const [key, value] of Object.entries(countsByActivation)) {
      if (typeof value === 'number' && value > 0) counts[key] = value
    }
  }
  return {
    totalCount: typeof totalCount === 'number' && totalCount > 0 ? totalCount : 0,
    countsByActivation: counts,
  }
}
