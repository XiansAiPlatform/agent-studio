'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, FlaskConical, Loader2, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Schedule } from '../../schedules/types'
import {
  AgentEval,
  DEFAULT_FORM_VALUES,
  EVAL_TYPE_DESCRIPTIONS,
  EVAL_TYPE_LABELS,
  EvalFormValues,
  EvalRequest,
  EvalType,
  INTERVAL_PRESETS,
  MAX_ASSERTIONS,
  toEvalRequest,
  toFormValues,
} from '../types'
import { validateEvalForm } from '../validation'
import { WebhookTargetFields } from './webhook-target-fields'

interface EvalFormSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentName: string
  activationName: string
  /** The eval being edited; null to create a new one. */
  evaluation: AgentEval | null
  onSubmit: (request: EvalRequest) => Promise<void>
}

/** Human name for a schedule: its description, else its workflow type. */
function scheduleLabel(schedule: Schedule): string {
  return schedule.description?.trim() || schedule.workflowType
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

export function EvalFormSheet({ open, onOpenChange, agentName, activationName, evaluation, onSubmit }: EvalFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        {/* Mounted per open and per eval, so the form starts from that eval's values. */}
        {open && (
          <EvalForm
            key={evaluation?.id ?? 'new'}
            agentName={agentName}
            activationName={activationName}
            evaluation={evaluation}
            onClose={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function EvalForm({
  agentName,
  activationName,
  evaluation,
  onClose,
  onSubmit,
}: {
  agentName: string
  activationName: string
  evaluation: AgentEval | null
  onClose: () => void
  onSubmit: (request: EvalRequest) => Promise<void>
}) {
  const isEdit = evaluation !== null
  const [values, setValues] = useState<EvalFormValues>(() =>
    evaluation ? toFormValues(evaluation) : DEFAULT_FORM_VALUES
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schedules, setSchedules] = useState<Schedule[] | null>(null)
  const [schedulesFailed, setSchedulesFailed] = useState(false)

  // Schedule evals pick from the agent's existing schedules; fall back to a text box.
  useEffect(() => {
    if (values.type !== 'schedule' || schedules !== null) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/schedules?${new URLSearchParams({ agentName }).toString()}`)
        const data = res.ok ? await res.json() : null
        if (cancelled) return
        if (Array.isArray(data)) setSchedules(data)
        else {
          setSchedules([])
          setSchedulesFailed(true)
        }
      } catch {
        if (!cancelled) {
          setSchedules([])
          setSchedulesFailed(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [values.type, agentName, schedules])

  const set = <K extends keyof EvalFormValues>(key: K, value: EvalFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  const setAssertion = (index: number, patch: Partial<EvalFormValues['assertions'][number]>) =>
    setValues((current) => ({
      ...current,
      assertions: current.assertions.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateEvalForm(values)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    setIsSubmitting(true)
    try {
      await onSubmit(toEvalRequest(values))
      onClose()
    } catch (err) {
      // Surface the backend's validation message next to the form.
      setErrors({ form: err instanceof Error ? err.message : 'Failed to save eval' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedSchedule = schedules?.find((schedule) => schedule.id === values.scheduleId)
  const usesAssertions = values.type !== 'schedule'
  const intervalIsPreset = INTERVAL_PRESETS.some((p) => p.minutes === values.intervalMinutes)

  return (
    <>
      <div className="border-b px-6 pb-4 pt-6">
        <div className="flex items-center gap-3 pr-8">
          <div className="rounded-lg bg-primary/10 p-2">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <SheetTitle className="text-base font-semibold">{isEdit ? 'Edit eval' : 'New eval'}</SheetTitle>
            <SheetDescription className="mt-0.5 text-sm">
              Runs automatically against this activation and records pass / fail.
            </SheetDescription>
          </div>
        </div>
      </div>

      <form id="eval-form" onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {errors.form && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Type */}
        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['chat', 'webhook', 'schedule'] as EvalType[]).map((type) => (
              <button
                key={type}
                type="button"
                disabled={isEdit}
                onClick={() => set('type', type)}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm transition-colors',
                  values.type === type
                    ? 'border-primary bg-primary/10 font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/30',
                  isEdit && 'cursor-not-allowed opacity-60'
                )}
              >
                {EVAL_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <Hint>
            {EVAL_TYPE_DESCRIPTIONS[values.type]}
            {isEdit && ' The type of an existing eval can’t be changed.'}
          </Hint>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="eval-name">Name</Label>
          <Input
            id="eval-name"
            placeholder="e.g. Greets the user"
            value={values.name}
            maxLength={100}
            onChange={(e) => set('name', e.target.value)}
          />
          <FieldError message={errors.name} />
        </div>

        {/* Type-specific fields */}
        {values.type === 'chat' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="eval-chat-message">Message to send</Label>
              <Textarea
                id="eval-chat-message"
                rows={3}
                placeholder="Hello, what can you help me with?"
                value={values.chatMessage}
                onChange={(e) => set('chatMessage', e.target.value)}
              />
              <FieldError message={errors.chatMessage} />
              <Hint>Sent as a real message on every run, so it uses the agent (and its LLM) each time.</Hint>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eval-chat-workflow">
                Workflow <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="eval-chat-workflow"
                placeholder="Defaults to the agent's conversational workflow"
                value={values.chatWorkflowType}
                onChange={(e) => set('chatWorkflowType', e.target.value)}
              />
              <FieldError message={errors.chatWorkflowType} />
            </div>
          </>
        )}

        {values.type === 'webhook' && (
          <>
            <WebhookTargetFields
              agentName={agentName}
              activationName={activationName}
              workflowType={values.webhookWorkflowType}
              methodName={values.webhookMethodName}
              onWorkflowChange={(next) => set('webhookWorkflowType', next)}
              onMethodChange={(next) => set('webhookMethodName', next)}
              workflowError={errors.webhookWorkflowType}
              methodError={errors.webhookMethodName}
            />
            <div className="space-y-2">
              <Label htmlFor="eval-webhook-body">
                Body <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="eval-webhook-body"
                rows={4}
                className="font-mono text-sm"
                placeholder='{"id": "health-check"}'
                value={values.webhookBody}
                onChange={(e) => set('webhookBody', e.target.value)}
              />
              <FieldError message={errors.webhookBody} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eval-webhook-query">
                Query parameters <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="eval-webhook-query"
                rows={2}
                className="font-mono text-sm"
                placeholder="source=health-check"
                value={values.webhookQueryParams}
                onChange={(e) => set('webhookQueryParams', e.target.value)}
              />
              <FieldError message={errors.webhookQueryParams} />
              <Hint>One key=value per line.</Hint>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eval-webhook-status">
                Expected status code <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="eval-webhook-status"
                inputMode="numeric"
                className="w-32"
                value={values.webhookExpectedStatusCode}
                onChange={(e) => set('webhookExpectedStatusCode', e.target.value)}
              />
              <FieldError message={errors.webhookExpectedStatusCode} />
            </div>
            <div className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The webhook method really runs on every check. Point it at something that is safe to repeat.
              </span>
            </div>
          </>
        )}

        {values.type === 'schedule' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="eval-schedule">Schedule</Label>
              {schedules === null ? (
                <div className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading schedules…
                </div>
              ) : schedules.length > 0 ? (
                <Select value={values.scheduleId || undefined} onValueChange={(v) => set('scheduleId', v)}>
                  {/* Schedule ids are long (tenant:agent:activation:name): keep the closed box to
                      the readable name and let the list wrap ids instead of widening the panel. */}
                  <SelectTrigger id="eval-schedule" className="w-full min-w-0 text-left [&>span]:min-w-0 [&>span]:truncate">
                    <SelectValue placeholder="Select a schedule">
                      {selectedSchedule ? scheduleLabel(selectedSchedule) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                    {schedules.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id} className="items-start">
                        <span className="flex min-w-0 flex-col">
                          <span className="break-words">{scheduleLabel(schedule)}</span>
                          <span className="break-all text-xs text-muted-foreground">{schedule.id}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="eval-schedule"
                  placeholder="Schedule id"
                  value={values.scheduleId}
                  onChange={(e) => set('scheduleId', e.target.value)}
                />
              )}
              <FieldError message={errors.scheduleId} />
              {selectedSchedule && <p className="break-all text-xs text-muted-foreground">{selectedSchedule.id}</p>}
              {schedules !== null && schedules.length === 0 && (
                <Hint>
                  {schedulesFailed
                    ? 'Could not load this agent’s schedules; enter the schedule id.'
                    : `No Temporal schedules found for ${agentName}. Agents that create their own schedule do so when their workflow runs, so it can be missing until the activation runs (or after a Temporal reset). You can still enter a schedule id.`}
                </Hint>
              )}
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="eval-schedule-last-run">Require last run to succeed</Label>
                <Hint>Fail the eval when the schedule’s most recent run failed.</Hint>
              </div>
              <Switch
                id="eval-schedule-last-run"
                checked={values.requireLastRunSuccess}
                onCheckedChange={(checked) => set('requireLastRunSuccess', checked)}
              />
            </div>
          </>
        )}

        {/* Assertions */}
        {usesAssertions && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Response must…</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={values.assertions.length >= MAX_ASSERTIONS}
                onClick={() => set('assertions', [...values.assertions, { op: 'contains', value: '' }])}
              >
                <Plus className="h-4 w-4" />
                Add check
              </Button>
            </div>
            {values.assertions.length === 0 && (
              <Hint>No checks: any {values.type === 'chat' ? 'reply' : 'successful response'} passes.</Hint>
            )}
            {values.assertions.map((assertion, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={assertion.op}
                  onValueChange={(op) => setAssertion(index, { op: op as typeof assertion.op })}
                >
                  <SelectTrigger className="w-40 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">contain</SelectItem>
                    <SelectItem value="notContains">not contain</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="text (case-insensitive)"
                  value={assertion.value}
                  onChange={(e) => setAssertion(index, { value: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground"
                  aria-label="Remove check"
                  onClick={() => set('assertions', values.assertions.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <FieldError message={errors.assertions} />
          </div>
        )}

        {/* Schedule */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="eval-interval">Run</Label>
            <Select
              value={intervalIsPreset ? String(values.intervalMinutes) : 'custom'}
              onValueChange={(v) => v !== 'custom' && set('intervalMinutes', Number(v))}
            >
              <SelectTrigger id="eval-interval" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVAL_PRESETS.map((preset) => (
                  <SelectItem key={preset.minutes} value={String(preset.minutes)}>
                    {preset.label}
                  </SelectItem>
                ))}
                {!intervalIsPreset && (
                  <SelectItem value="custom">Every {values.intervalMinutes} minutes</SelectItem>
                )}
              </SelectContent>
            </Select>
            <FieldError message={errors.intervalMinutes} />
          </div>
          {values.type !== 'schedule' && (
            <div className="space-y-2">
              <Label htmlFor="eval-timeout">Timeout (seconds)</Label>
              <Input
                id="eval-timeout"
                type="number"
                min={5}
                max={120}
                value={Number.isNaN(values.timeoutSeconds) ? '' : values.timeoutSeconds}
                onChange={(e) => set('timeoutSeconds', e.target.valueAsNumber)}
              />
              <FieldError message={errors.timeoutSeconds} />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <div>
            <Label htmlFor="eval-enabled">Enabled</Label>
            <Hint>Disabled evals keep their history but don’t run.</Hint>
          </div>
          <Switch id="eval-enabled" checked={values.enabled} onCheckedChange={(checked) => set('enabled', checked)} />
        </div>
      </form>

      <SheetFooter className="flex-row justify-end gap-2 border-t px-6 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" form="eval-form" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create eval'}
        </Button>
      </SheetFooter>
    </>
  )
}
