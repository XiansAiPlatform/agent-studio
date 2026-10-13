'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import type { WebhookMode, WebhookTarget } from '../types'

interface WebhookTargetFieldsProps {
  mode: WebhookMode
  agentName: string
  activationName: string
  workflowType: string
  methodName: string
  webhookName: string
  onWorkflowChange: (workflowType: string) => void
  onMethodChange: (methodName: string) => void
  onWebhookNameChange: (webhookName: string) => void
  workflowError?: string
  /** Error for the second field: the method (update mode) or the webhook name (builtin mode). */
  methodError?: string
}

const STATUS_SUFFIX: Record<WebhookTarget['status'], string> = {
  running: '',
  notRunning: ' (not running)',
  unavailable: ' (no answer)',
}

const TRIGGER_CLASS = 'w-full min-w-0 text-left [&>span]:min-w-0 [&>span]:truncate'
const CONTENT_CLASS = 'max-w-[var(--radix-select-trigger-width)]'

function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null
}

/**
 * Workflow + method / webhook-name pickers for webhook evals.
 * - Update mode: the agent's workflows, and the update handlers the activation's running workflow reports.
 * - Builtin mode: the agent's built-in workflows, and the webhook names registered for the activation
 *   in Connections → Webhooks (an agent's OnWebhook handler can accept other names too, so typing is allowed).
 * Falls back to free text when nothing can be listed or the user prefers to type.
 */
export function WebhookTargetFields({
  mode,
  agentName,
  activationName,
  workflowType,
  methodName,
  webhookName,
  onWorkflowChange,
  onMethodChange,
  onWebhookNameChange,
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

  const builtin = mode === 'builtin'
  const builtinTargets = targets.filter((t) => t.isBuiltIn)
  // Older servers don't report isBuiltIn; then offer every workflow.
  const workflows = builtin && builtinTargets.length > 0 ? builtinTargets : targets
  const selected = workflows.find((t) => t.workflowType === workflowType)
  const secondValue = builtin ? webhookName : methodName
  const setSecond = builtin ? onWebhookNameChange : onMethodChange
  const options = builtin
    ? (selected?.webhooks ?? []).map((name) => ({ name, description: null as string | null }))
    : (selected?.methods ?? []).map((m) => ({ name: m.name, description: m.description ?? null }))
  const secondListed = options.some((o) => o.name === secondValue)
  const secondLabel = builtin ? 'Webhook name' : 'Method'

  const pickWorkflow = (next: string) => {
    onWorkflowChange(next)
    // Keep the second value only if the new workflow lists it; preselect when there's exactly one.
    const target = workflows.find((t) => t.workflowType === next)
    const names = builtin ? (target?.webhooks ?? []) : (target?.methods ?? []).map((m) => m.name)
    if (!names.includes(secondValue)) {
      setSecond(names.length === 1 ? names[0] : '')
    }
  }

  if (manual || workflows.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="eval-webhook-workflow">Workflow</Label>
          <Input
            id="eval-webhook-workflow"
            placeholder={builtin ? 'Flow name, e.g. Integrator Workflow' : 'Flow name, e.g. Git Events Workflow'}
            value={workflowType}
            onChange={(e) => onWorkflowChange(e.target.value)}
          />
          <FieldError message={workflowError} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eval-webhook-second">{secondLabel}</Label>
          <Input
            id="eval-webhook-second"
            placeholder={builtin ? 'Webhook name, e.g. ticket-created' : 'Update method name, e.g. health-ping'}
            value={secondValue}
            onChange={(e) => setSecond(e.target.value)}
          />
          <FieldError message={methodError} />
        </div>
        {workflows.length > 0 ? (
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
          <SelectTrigger id="eval-webhook-workflow" className={TRIGGER_CLASS}>
            <SelectValue placeholder="Select a workflow" />
          </SelectTrigger>
          <SelectContent className={CONTENT_CLASS}>
            {workflows.map((target) => (
              <SelectItem key={target.workflowType} value={target.workflowType} className="items-start">
                <span className="break-words">
                  {target.workflowType}
                  {!builtin && <span className="text-muted-foreground">{STATUS_SUFFIX[target.status]}</span>}
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
        <Label htmlFor="eval-webhook-second">{secondLabel}</Label>
        {options.length > 0 ? (
          <Select value={secondValue || undefined} onValueChange={setSecond}>
            <SelectTrigger id="eval-webhook-second" className={TRIGGER_CLASS}>
              <SelectValue placeholder={builtin ? 'Select a webhook' : 'Select a method'} />
            </SelectTrigger>
            <SelectContent className={CONTENT_CLASS}>
              {options.map((option) => (
                <SelectItem key={option.name} value={option.name} className="items-start">
                  <span className="flex min-w-0 flex-col">
                    <span className="break-all">{option.name}</span>
                    {option.description && (
                      <span className="break-words text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
              {secondValue && !secondListed && (
                <SelectItem value={secondValue}>
                  <span className="break-all">
                    {secondValue}
                    <span className="text-muted-foreground"> (not listed)</span>
                  </span>
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="eval-webhook-second"
            placeholder={
              !workflowType ? 'Select a workflow first' : builtin ? 'Webhook name, e.g. ticket-created' : 'Update method name'
            }
            disabled={!workflowType}
            value={secondValue}
            onChange={(e) => setSecond(e.target.value)}
          />
        )}
        <FieldError message={methodError} />
        {builtin && selected && options.length === 0 && (
          <FieldHint>
            No webhooks are registered for this workflow in Connections. Type the name the agent’s OnWebhook
            handler expects.
          </FieldHint>
        )}
        {!builtin && selected?.detail && <FieldHint>{selected.detail}</FieldHint>}
      </div>

      <button type="button" className="text-xs text-primary hover:underline" onClick={() => setManual(true)}>
        Enter workflow and {builtin ? 'webhook name' : 'method'} manually
      </button>
    </div>
  )
}
