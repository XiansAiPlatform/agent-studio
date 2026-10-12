/**
 * Evals = automated agent health checks (backend: `health-checks`). Each eval is
 * attached to one agent activation and runs on its own interval; every run is
 * recorded as pass / fail / error.
 */

export type EvalType = 'chat' | 'webhook' | 'schedule'
export type EvalStatus = 'pass' | 'fail' | 'error'
export type AssertionOp = 'contains' | 'notContains'
export type ScheduleState = 'pending' | 'active' | 'paused'
export type ActivationHealth = 'unknown' | 'healthy' | 'degraded' | 'unhealthy'

export interface EvalAssertion {
  op: AssertionOp
  value: string
}

export interface ChatEvalConfig {
  workflowType?: string | null
  message: string
  assertions: EvalAssertion[]
}

export interface WebhookEvalConfig {
  workflowType: string
  methodName: string
  queryParams: Record<string, string>
  body: string
  expectedStatusCode?: number | null
  assertions: EvalAssertion[]
}

export interface ScheduleEvalConfig {
  scheduleId: string
  requireLastRunSuccess: boolean
}

export interface AgentEval {
  id: string
  name: string
  type: EvalType
  enabled: boolean
  intervalMinutes: number
  timeoutSeconds: number
  chat?: ChatEvalConfig | null
  webhook?: WebhookEvalConfig | null
  schedule?: ScheduleEvalConfig | null
  lastRunAt?: string | null
  lastStatus?: EvalStatus | null
  lastDetail?: string | null
  lastSuccessAt?: string | null
  consecutiveFailures: number
  scheduleState: ScheduleState
  createdBy: string
  createdAt: string
  updatedAt?: string | null
}

export interface EvalAssertionResult {
  op: AssertionOp
  value: string
  passed: boolean
}

export interface EvalRun {
  id: string
  status: EvalStatus
  startedAt: string
  durationMs: number
  detail?: string | null
  responseSnippet?: string | null
  assertionResults: EvalAssertionResult[]
}

export interface EvalRunPage {
  items: EvalRun[]
  totalCount: number
  page: number
  pageSize: number
}

export interface EvalSummary {
  status: ActivationHealth
  activationActive: boolean
  totalChecks: number
  enabledChecks: number
  passing: number
  failing: number
  erroring: number
  lastRunAt?: string | null
}

/** A workflow a webhook eval can call, with the update methods it exposes right now. */
export interface WebhookTarget {
  /** Flow name without the agent prefix, as stored on a webhook eval. */
  workflowType: string
  workflowId: string
  activable: boolean
  /** `running`: methods were read from the live workflow; otherwise methods is empty. */
  status: 'running' | 'notRunning' | 'unavailable'
  detail?: string | null
  methods: { name: string; description?: string | null }[]
}

export interface EvalsListResponse {
  activation: { name: string; agentName: string; isActive: boolean }
  checks: AgentEval[]
}

/** Request body for create / replace, matching the backend `HealthCheckRequest`. */
export interface EvalRequest {
  name: string
  type: EvalType
  enabled: boolean
  intervalMinutes: number
  timeoutSeconds?: number
  chat?: { workflowType?: string; message: string; assertions: EvalAssertion[] }
  webhook?: {
    workflowType: string
    methodName: string
    queryParams: Record<string, string>
    body: string
    expectedStatusCode?: number
    assertions: EvalAssertion[]
  }
  schedule?: { scheduleId: string; requireLastRunSuccess: boolean }
}

// ----- Form model -----

export const MIN_INTERVAL_MINUTES = 5
export const MAX_INTERVAL_MINUTES = 1440
export const MIN_TIMEOUT_SECONDS = 5
export const MAX_TIMEOUT_SECONDS = 120
export const MAX_ASSERTIONS = 10

export const INTERVAL_PRESETS: { label: string; minutes: number }[] = [
  { label: 'Every 5 minutes', minutes: 5 },
  { label: 'Every 15 minutes', minutes: 15 },
  { label: 'Every 30 minutes', minutes: 30 },
  { label: 'Every hour', minutes: 60 },
  { label: 'Every 6 hours', minutes: 360 },
  { label: 'Every day', minutes: 1440 },
]

export const EVAL_TYPE_LABELS: Record<EvalType, string> = {
  chat: 'Chat',
  webhook: 'Webhook',
  schedule: 'Schedule',
}

export const EVAL_TYPE_DESCRIPTIONS: Record<EvalType, string> = {
  chat: 'Send a chat message and check the reply.',
  webhook: 'Invoke an inbound webhook method and check the response.',
  schedule: 'Check that a schedule exists, is enabled, and its last run succeeded.',
}

/** Flat, string-friendly shape the form edits. Converted with {@link toEvalRequest}. */
export interface EvalFormValues {
  name: string
  type: EvalType
  enabled: boolean
  intervalMinutes: number
  timeoutSeconds: number
  chatMessage: string
  chatWorkflowType: string
  webhookWorkflowType: string
  webhookMethodName: string
  /** One `key=value` per line. */
  webhookQueryParams: string
  webhookBody: string
  webhookExpectedStatusCode: string
  scheduleId: string
  requireLastRunSuccess: boolean
  assertions: EvalAssertion[]
}

export const DEFAULT_FORM_VALUES: EvalFormValues = {
  name: '',
  type: 'chat',
  enabled: true,
  intervalMinutes: 15,
  timeoutSeconds: 60,
  chatMessage: '',
  chatWorkflowType: '',
  webhookWorkflowType: '',
  webhookMethodName: '',
  webhookQueryParams: '',
  webhookBody: '',
  webhookExpectedStatusCode: '200',
  scheduleId: '',
  requireLastRunSuccess: true,
  assertions: [{ op: 'contains', value: '' }],
}

/** Parses `key=value` lines; blank lines are ignored. Throws on a line without `=`. */
export function parseQueryParams(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    const separator = line.indexOf('=')
    if (separator <= 0) {
      throw new Error(`Query parameter "${line}" must be written as key=value`)
    }
    result[line.slice(0, separator).trim()] = line.slice(separator + 1).trim()
  }
  return result
}

export function formatQueryParams(params: Record<string, string> | undefined | null): string {
  return Object.entries(params ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
}

function cleanAssertions(assertions: EvalAssertion[]): EvalAssertion[] {
  return assertions
    .map((assertion) => ({ op: assertion.op, value: assertion.value.trim() }))
    .filter((assertion) => assertion.value.length > 0)
}

/** Converts form values into the backend request body for the selected type only. */
export function toEvalRequest(values: EvalFormValues): EvalRequest {
  const base: EvalRequest = {
    name: values.name.trim(),
    type: values.type,
    enabled: values.enabled,
    intervalMinutes: values.intervalMinutes,
  }

  switch (values.type) {
    case 'chat':
      return {
        ...base,
        timeoutSeconds: values.timeoutSeconds,
        chat: {
          ...(values.chatWorkflowType.trim() ? { workflowType: values.chatWorkflowType.trim() } : {}),
          message: values.chatMessage,
          assertions: cleanAssertions(values.assertions),
        },
      }
    case 'webhook': {
      const statusCode = values.webhookExpectedStatusCode.trim()
      return {
        ...base,
        timeoutSeconds: values.timeoutSeconds,
        webhook: {
          workflowType: values.webhookWorkflowType.trim(),
          methodName: values.webhookMethodName.trim(),
          queryParams: parseQueryParams(values.webhookQueryParams),
          body: values.webhookBody,
          ...(statusCode ? { expectedStatusCode: Number(statusCode) } : {}),
          assertions: cleanAssertions(values.assertions),
        },
      }
    }
    case 'schedule':
      return {
        ...base,
        schedule: {
          scheduleId: values.scheduleId.trim(),
          requireLastRunSuccess: values.requireLastRunSuccess,
        },
      }
  }
}

/** Populates the form from an existing eval, for editing. */
export function toFormValues(evaluation: AgentEval): EvalFormValues {
  const assertions =
    evaluation.chat?.assertions ?? evaluation.webhook?.assertions ?? []
  return {
    ...DEFAULT_FORM_VALUES,
    name: evaluation.name,
    type: evaluation.type,
    enabled: evaluation.enabled,
    intervalMinutes: evaluation.intervalMinutes,
    timeoutSeconds: evaluation.timeoutSeconds,
    chatMessage: evaluation.chat?.message ?? '',
    chatWorkflowType: evaluation.chat?.workflowType ?? '',
    webhookWorkflowType: evaluation.webhook?.workflowType ?? '',
    webhookMethodName: evaluation.webhook?.methodName ?? '',
    webhookQueryParams: formatQueryParams(evaluation.webhook?.queryParams),
    webhookBody: evaluation.webhook?.body ?? '',
    webhookExpectedStatusCode:
      evaluation.webhook?.expectedStatusCode != null ? String(evaluation.webhook.expectedStatusCode) : '',
    scheduleId: evaluation.schedule?.scheduleId ?? '',
    requireLastRunSuccess: evaluation.schedule?.requireLastRunSuccess ?? true,
    assertions: assertions.length > 0 ? assertions.map((a) => ({ ...a })) : [],
  }
}

/** A short human description of what an eval does, for cards. */
export function describeEval(evaluation: AgentEval): string {
  switch (evaluation.type) {
    case 'chat':
      return `Sends “${truncate(evaluation.chat?.message ?? '', 60)}”`
    case 'webhook':
      return `Calls ${evaluation.webhook?.workflowType ?? '?'} → ${evaluation.webhook?.methodName ?? '?'}`
    case 'schedule':
      return `Watches schedule ${evaluation.schedule?.scheduleId ?? '?'}`
  }
}

export function formatInterval(minutes: number): string {
  const preset = INTERVAL_PRESETS.find((p) => p.minutes === minutes)
  if (preset) return preset.label
  if (minutes % 60 === 0) return `Every ${minutes / 60} hours`
  return `Every ${minutes} minutes`
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}
