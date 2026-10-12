'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { WebhookTarget } from '../types'

interface WebhookTargetFieldsProps {
  agentName: string
  activationName: string
  workflowType: string
  methodName: string
  onWorkflowChange: (workflowType: string) => void
  onMethodChange: (methodName: string) => void
  workflowError?: string
  methodError?: string
}

const STATUS_SUFFIX: Record<WebhookTarget['status'], string> = {
  running: '',
  notRunning: ' (not running)',
  unavailable: ' (no answer)',
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null
}

/**
 * Workflow + Method pickers for webhook evals. Workflows are the agent's registered ones; methods
 * are the update handlers the activation's running workflow reports. Falls back to free text when
 * the list can't be loaded, the workflow isn't running, or the user prefers to type.
 */
export function WebhookTargetFields({
  agentName,
  activationName,
  workflowType,
  methodName,
  onWorkflowChange,
  onMethodChange,
  workflowError,
  methodError,
}: WebhookTargetFieldsProps) {
  const [targets, setTargets] = useState<WebhookTarget[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [manual, setManual] = useState(false)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams({ agentName, activationName })
    fetch(`/api/evals/webhook-targets?${params.toString()}`)
      .then(async (res) => (res.ok ? ((await res.json()) as WebhookTarget[]) : null))
      .then((data) => {
        if (cancelled) return
        setTargets(Array.isArray(data) ? data : [])
        setLoadFailed(!Array.isArray(data))
      })
      .catch(() => {
        if (cancelled) return
        setTargets([])
        setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [agentName, activationName])

  if (targets === null) {
    return (
      <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading the agent’s workflows…
      </div>
    )
  }

  const useLists = !manual && targets.length > 0
  const selected = targets.find((t) => t.workflowType === workflowType)
  const methods = selected?.methods ?? []
  const methodListed = methods.some((m) => m.name === methodName)

  const pickWorkflow = (next: string) => {
    onWorkflowChange(next)
    // Keep the method only if the new workflow has it; preselect when there's exactly one.
    const nextMethods = targets.find((t) => t.workflowType === next)?.methods ?? []
    if (!nextMethods.some((m) => m.name === methodName)) {
      onMethodChange(nextMethods.length === 1 ? nextMethods[0].name : '')
    }
  }

  if (!useLists) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="eval-webhook-workflow">Workflow</Label>
          <Input
            id="eval-webhook-workflow"
            placeholder="Flow name, e.g. Git Events Workflow"
            value={workflowType}
            onChange={(e) => onWorkflowChange(e.target.value)}
          />
          <FieldError message={workflowError} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eval-webhook-method">Method</Label>
          <Input
            id="eval-webhook-method"
            placeholder="Update method name, e.g. health-ping"
            value={methodName}
            onChange={(e) => onMethodChange(e.target.value)}
          />
          <FieldError message={methodError} />
        </div>
        {targets.length > 0 ? (
          <button type="button" className="text-xs text-primary hover:underline" onClick={() => setManual(false)}>
            Choose from the agent’s workflows instead
          </button>
        ) : (
          <FieldHint>
            {loadFailed
              ? 'Could not load the agent’s workflows; enter them manually.'
              : 'This agent has no registered workflows; enter them manually.'}
          </FieldHint>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="eval-webhook-workflow">Workflow</Label>
        <Select value={workflowType || undefined} onValueChange={pickWorkflow}>
          <SelectTrigger id="eval-webhook-workflow" className="w-full min-w-0 text-left [&>span]:min-w-0 [&>span]:truncate">
            <SelectValue placeholder="Select a workflow" />
          </SelectTrigger>
          <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
            {targets.map((target) => (
              <SelectItem key={target.workflowType} value={target.workflowType} className="items-start">
                <span className="break-words">
                  {target.workflowType}
                  <span className="text-muted-foreground">{STATUS_SUFFIX[target.status]}</span>
                </span>
              </SelectItem>
            ))}
            {workflowType && !selected && (
              <SelectItem value={workflowType}>
                <span className="break-words">
                  {workflowType}
                  <span className="text-muted-foreground"> (not registered)</span>
                </span>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <FieldError message={workflowError} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="eval-webhook-method">Method</Label>
        {methods.length > 0 ? (
          <Select value={methodName || undefined} onValueChange={onMethodChange}>
            <SelectTrigger id="eval-webhook-method" className="w-full min-w-0 text-left [&>span]:min-w-0 [&>span]:truncate">
              <SelectValue placeholder="Select a method" />
            </SelectTrigger>
            <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
              {methods.map((method) => (
                <SelectItem key={method.name} value={method.name} className="items-start">
                  <span className="flex min-w-0 flex-col">
                    <span className="break-all">{method.name}</span>
                    {method.description && (
                      <span className="break-words text-xs text-muted-foreground">{method.description}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
              {methodName && !methodListed && (
                <SelectItem value={methodName}>
                  <span className="break-all">
                    {methodName}
                    <span className="text-muted-foreground"> (not found)</span>
                  </span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="eval-webhook-method"
            placeholder={workflowType ? 'Update method name' : 'Select a workflow first'}
            disabled={!workflowType}
            value={methodName}
            onChange={(e) => onMethodChange(e.target.value)}
          />
        )}
        <FieldError message={methodError} />
        {selected?.detail && <FieldHint>{selected.detail}</FieldHint>}
        {selected && methods.length > 0 && methodName && !methodListed && (
          <FieldHint>This workflow doesn’t currently expose “{methodName}”.</FieldHint>
        )}
      </div>

      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setManual(true)}>
        Enter workflow and method manually
      </button>
    </div>
  )
}
