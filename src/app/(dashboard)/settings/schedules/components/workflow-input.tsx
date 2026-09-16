'use client'

import { useEffect, useState } from 'react'
import { Schedule } from '../types'

export function WorkflowInput({ agentName, scheduleId }: { agentName: string; scheduleId: string }) {
  const [state, setState] = useState<{ input?: unknown[] | null; error?: string }>({})

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ agentName, scheduleId })
    fetch(`/api/schedules/by-id?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load workflow input.')
        return response.json() as Promise<Schedule>
      })
      .then((schedule) => {
        if (!controller.signal.aborted) setState({ input: schedule.workflowInput ?? [] })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ error: 'Unable to load workflow input.' })
      })
    return () => controller.abort()
  }, [agentName, scheduleId])

  return (
    <section className="space-y-3" aria-label="Workflow input">
      <h3 className="text-sm font-semibold text-foreground">Workflow input</h3>
      <p className="text-xs text-muted-foreground">Read-only arguments stored in Temporal. Prompts and parameters appear here.</p>
      {state.input?.length ? (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border/60 p-4 text-xs">
          {JSON.stringify(state.input, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground" role="status">
          {state.error ?? (state.input ? 'No workflow input.' : 'Loading workflow input…')}
        </p>
      )}
    </section>
  )
}
