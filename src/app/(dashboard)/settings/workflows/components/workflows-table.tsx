'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Ban, FileText, Loader2, OctagonX } from 'lucide-react'
import {
  WorkflowExecution,
  isRunningWorkflow,
  toShortWorkflowType,
  workflowLogsHref,
} from '../types'
import { WorkflowStatusBadge } from './workflow-status-badge'

interface WorkflowsTableProps {
  workflows: WorkflowExecution[]
  agentName: string
  activationName: string
  onCancel: (workflow: WorkflowExecution) => void
  onTerminate: (workflow: WorkflowExecution) => void
  actionBusyId: string | null
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WorkflowsTable({
  workflows,
  agentName,
  activationName,
  onCancel,
  onTerminate,
  actionBusyId,
}: WorkflowsTableProps) {
  return (
    <ScrollArea className="w-full rounded-lg border">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Workflow ID</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Start</th>
            <th className="px-4 py-3 font-medium">Close</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((workflow) => {
            const id = workflow.workflowId ?? ''
            const running = isRunningWorkflow(workflow.status)
            const busy = actionBusyId === id
            return (
              <tr key={`${id}-${workflow.runId ?? ''}`} className="border-b last:border-0">
                <td className="max-w-[280px] px-4 py-3">
                  <span className="block truncate font-mono text-xs" title={id}>
                    {id || '—'}
                  </span>
                </td>
                <td
                  className="max-w-[200px] truncate px-4 py-3"
                  title={workflow.workflowType ?? undefined}
                >
                  {toShortWorkflowType(workflow.workflowType, agentName) || '—'}
                </td>
                <td className="px-4 py-3">
                  <WorkflowStatusBadge status={workflow.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateTime(workflow.startTime)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                  {formatDateTime(workflow.closeTime)}
                </td>
                <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                  {workflow.owner || '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {id && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={workflowLogsHref(agentName, activationName, id, workflow.workflowType)}>
                          <FileText className="h-4 w-4" />
                          Logs
                        </Link>
                      </Button>
                    )}
                    {running && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy || !id}
                          onClick={() => onCancel(workflow)}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                          Cancel
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={busy || !id}
                          onClick={() => onTerminate(workflow)}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <OctagonX className="h-4 w-4" />
                          )}
                          Terminate
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
