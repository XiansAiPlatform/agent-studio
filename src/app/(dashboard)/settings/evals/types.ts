/**
 * Evals = automated agent health checks (backend: `health-checks`). Each eval is
 * attached to one agent activation and runs on its own interval; every run is
 * recorded as pass / fail / error.
 */

export type EvalType = 'chat' | 'webhook' | 'schedule'
export type EvalStatus = 'pass' | 'fail' | 'error'
export type ScheduleState = 'pending' | 'active' | 'paused'
export type ActivationHealth = 'unknown' | 'healthy' | 'degraded' | 'unhealthy'

/**
 * Text ops check the whole body (case-insensitive). JSON ops read one value at `path`
 * (`$.data.status`); header ops read the header named by `path`. Chat evals use text ops only.
 */
export type AssertionOp = 'contains' | 'notContains' | 'jsonEquals' | 'jsonExists' | 'headerEquals' | 'headerExists'

/** How a webhook eval calls the agent: a Temporal Update method, or the agent's builtin `OnWebhook` handler. */
export type WebhookMode = 'update' | 'builtin'

export interface EvalAssertion {
  op: AssertionOp
  /** JSON path for JSON ops, header name for header ops. */
  path?: string | null
  value: string
}

export interface AssertionOpInfo {
  op: AssertionOp
  label: string
  /** What `path` holds, when the op uses one. */
  pathLabel?: 'JSON path' | 'Header'
  needsValue: boolean
  webhookOnly: boolean
}

export const ASSERTION_OPS: AssertionOpInfo[] = [
  { op: 'contains', label: 'contain', needsValue: true, webhookOnly: false },
  { op: 'notContains', label: 'not contain', needsValue: true, webhookOnly: false },
  { op: 'jsonEquals', label: 'have JSON field equal to', pathLabel: 'JSON path', needsValue: true, webhookOnly: true },
  { op: 'jsonExists', label: 'have JSON field', pathLabel: 'JSON path', needsValue: false, webhookOnly: true },
  { op: 'headerEquals', label: 'have header equal to', pathLabel: 'Header', needsValue: true, webhookOnly: true },
  { op: 'headerExists', label: 'have header', pathLabel: 'Header', needsValue: false, webhookOnly: true },
]

export function assertionOpInfo(op: AssertionOp): AssertionOpInfo {
  return ASSERTION_OPS.find((o) => o.op === op) ?? ASSERTION_OPS[0]
}

export interface ChatEvalConfig {
  workflowType?: string | null
  message: string
  assertions: EvalAssertion[]
}

export interface WebhookEvalConfig {
  /** Absent on evals created before modes existed: those are `update`. */
  mode?: WebhookMode | null
  workflowType: string
  methodName: string
  webhookName?: string | null
  queryParams: Record<string, string>
  body: string
  expectedStatusCode?: number | null
  maxResponseMs?: number | null
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
  path?: string | null
  value: string
  passed: boolean
  /** What the response held, for JSON and header ops. */
  actual?: string | null
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

/** A workflow a webhook eval can call. */
export interface WebhookTarget {
  /** Flow name without the agent prefix, as stored on a webhook eval. */
  workflowType: string
  workflowId: string
  activable: boolean
  /** `running`: methods were read from the live workflow; otherwise methods is empty. */
  status: 'running' | 'notRunning' | 'unavailable'
  detail?: string | null
  /** Update mode: the workflow's Temporal Update methods. */
  methods: { name: string; description?: string | null }[]
  /** Builtin mode: whether the workflow is a built-in (OnWebhook-capable) one. */
  isBuiltIn?: boolean
  /** Builtin mode: webhook names registered for this activation in Connections. */
  webhooks?: string[]
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
    mode: WebhookMode
    workflowType: string
    methodName?: string
    webhookName?: string
    queryParams: Record<string, string>
    body: string
    expectedStatusCode?: number
    maxResponseMs?: number
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
  webhook: 'Call one of the agent’s webhooks and check the response.',
  schedule: 'Check that a schedule exists, is enabled, and its last run succeeded.',
}

export const WEBHOOK_MODE_LABELS: Record<WebhookMode, string> = {
  builtin: 'Built-in webhook',
  update: 'Update method',
}

export const WEBHOOK_MODE_DESCRIPTIONS: Record<WebhookMode, string> = {
  builtin: 'The agent’s OnWebhook handler, as called by /api/user/webhooks/builtin (webhooks created in Connections).',
  update: 'A Temporal Update method on the workflow, as called by /api/user/webhooks/{workflow}/{method}.',
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
  webhookMode: WebhookMode
  webhookWorkflowType: string
  webhookMethodName: string
  webhookName: string
  /** One `key=value` per line (update mode only). */
  webhookQueryParams: string
  webhookBody: string
  webhookExpectedStatusCode: string
  webhookMaxResponseMs: string
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
  webhookMode: 'builtin',
  webhookWorkflowType: '',
  webhookMethodName: '',
  webhookName: '',
  webhookQueryParams: '',
  webhookBody: '',
  webhookExpectedStatusCode: '200',
  webhookMaxResponseMs: '',
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

/**
 * Drops untouched rows (no value, and no path for path ops) and sends only the fields each op uses.
 */
function cleanAssertions(assertions: EvalAssertion[]): EvalAssertion[] {
  return assertions
    .map((assertion) => {
      const info = assertionOpInfo(assertion.op)
      return {
        op: assertion.op,
        ...(info.pathLabel ? { path: (assertion.path ?? '').trim() } : {}),
        value: info.needsValue ? assertion.value.trim() : '',
      }
    })
    .filter((assertion) => {
      const info = assertionOpInfo(assertion.op)
      return info.pathLabel ? (assertion.path ?? '').length > 0 || assertion.value.length > 0 : assertion.value.length > 0
    })
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
      const maxResponseMs = values.webhookMaxResponseMs.trim()
      const builtin = values.webhookMode === 'builtin'
      return {
        ...base,
        timeoutSeconds: values.timeoutSeconds,
        webhook: {
          mode: values.webhookMode,
          workflowType: values.webhookWorkflowType.trim(),
          ...(builtin
            ? { webhookName: values.webhookName.trim() }
            : { methodName: values.webhookMethodName.trim() }),
          queryParams: builtin ? {} : parseQueryParams(values.webhookQueryParams),
          body: values.webhookBody,
          ...(statusCode ? { expectedStatusCode: Number(statusCode) } : {}),
          ...(maxResponseMs ? { maxResponseMs: Number(maxResponseMs) } : {}),
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
  const assertions = evaluation.chat?.assertions ?? evaluation.webhook?.assertions ?? []
  const webhook = evaluation.webhook
  return {
    ...DEFAULT_FORM_VALUES,
    name: evaluation.name,
    type: evaluation.type,
    enabled: evaluation.enabled,
    intervalMinutes: evaluation.intervalMinutes,
    timeoutSeconds: evaluation.timeoutSeconds,
    chatMessage: evaluation.chat?.message ?? '',
    chatWorkflowType: evaluation.chat?.workflowType ?? '',
    // Evals stored before modes existed have no mode: they are update-method evals.
    webhookMode: webhook ? (webhook.mode ?? 'update') : DEFAULT_FORM_VALUES.webhookMode,
    webhookWorkflowType: webhook?.workflowType ?? '',
    webhookMethodName: webhook?.methodName ?? '',
    webhookName: webhook?.webhookName ?? '',
    webhookQueryParams: formatQueryParams(webhook?.queryParams),
    webhookBody: webhook?.body ?? '',
    webhookExpectedStatusCode: webhook?.expectedStatusCode != null ? String(webhook.expectedStatusCode) : '',
    webhookMaxResponseMs: webhook?.maxResponseMs != null ? String(webhook.maxResponseMs) : '',
    scheduleId: evaluation.schedule?.scheduleId ?? '',
    requireLastRunSuccess: evaluation.schedule?.requireLastRunSuccess ?? true,
    assertions: assertions.length > 0 ? assertions.map((a) => ({ ...a, path: a.path ?? '' })) : [],
  }
}

/** A short human description of what an eval does, for cards. */
export function describeEval(evaluation: AgentEval): string {
  switch (evaluation.type) {
    case 'chat':
      return `Sends “${truncate(evaluation.chat?.message ?? '', 60)}”`
    case 'webhook': {
      const webhook = evaluation.webhook
      return webhook?.mode === 'builtin'
        ? `Calls webhook “${webhook.webhookName ?? '?'}” on ${webhook.workflowType}`
        : `Calls ${webhook?.workflowType ?? '?'} → ${webhook?.methodName ?? '?'}`
    }
    case 'schedule':
      return `Watches schedule ${evaluation.schedule?.scheduleId ?? '?'}`
  }
}

/** One line describing an assertion and its result, for run details. */
export function describeAssertion(result: EvalAssertionResult): string {
  switch (result.op) {
    case 'contains':
      return `contains “${result.value}”`
    case 'notContains':
      return `does not contain “${result.value}”`
    case 'jsonEquals':
      return `${result.path} = “${result.value}”`
    case 'jsonExists':
      return `${result.path} exists`
    case 'headerEquals':
      return `header ${result.path} = “${result.value}”`
    case 'headerExists':
      return `header ${result.path} present`
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
