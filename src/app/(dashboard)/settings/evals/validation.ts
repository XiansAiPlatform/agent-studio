import {
  EvalFormValues,
  MAX_ASSERTIONS,
  MAX_INTERVAL_MINUTES,
  MAX_NOTIFY_CONTACTS,
  MAX_TIMEOUT_SECONDS,
  MIN_INTERVAL_MINUTES,
  MIN_TIMEOUT_SECONDS,
  assertionOpInfo,
  parseQueryParams,
} from './types'

/** The JSON path subset the server accepts: `$`, then `.name` and `[index]` segments. */
const JSON_PATH = /^\$(\.[^.[\]]+|\[\d+\])*$/
const HEADER_NAME = /^[A-Za-z0-9_-]+$/

/**
 * Client-side checks mirroring the backend's HealthCheckValidator, so most
 * mistakes are caught before a round trip. The backend remains authoritative.
 * Returns field path → message; empty when valid.
 */
export function validateEvalForm(values: EvalFormValues): Record<string, string> {
  const errors: Record<string, string> = {}

  const name = values.name.trim()
  if (!name) errors.name = 'Name is required'
  else if (name.length > 100) errors.name = 'Name must be 100 characters or less'
  else if (/[<>"']/.test(name)) errors.name = 'Name must not contain < > " or \''

  if (
    !Number.isInteger(values.intervalMinutes) ||
    values.intervalMinutes < MIN_INTERVAL_MINUTES ||
    values.intervalMinutes > MAX_INTERVAL_MINUTES
  ) {
    errors.intervalMinutes = `Interval must be between ${MIN_INTERVAL_MINUTES} and ${MAX_INTERVAL_MINUTES} minutes`
  }

  if (values.type !== 'schedule') {
    if (
      !Number.isInteger(values.timeoutSeconds) ||
      values.timeoutSeconds < MIN_TIMEOUT_SECONDS ||
      values.timeoutSeconds > MAX_TIMEOUT_SECONDS
    ) {
      errors.timeoutSeconds = `Timeout must be between ${MIN_TIMEOUT_SECONDS} and ${MAX_TIMEOUT_SECONDS} seconds`
    }

    const assertionError = validateAssertions(values)
    if (assertionError) errors.assertions = assertionError
  }

  switch (values.type) {
    case 'chat':
      if (!values.chatMessage.trim()) errors.chatMessage = 'Message is required'
      else if (values.chatMessage.length > 4000) errors.chatMessage = 'Message must be 4000 characters or less'
      if (values.chatWorkflowType.includes(':')) {
        errors.chatWorkflowType = 'Use the flow name only, without the agent prefix'
      }
      break

    case 'webhook': {
      const workflowType = values.webhookWorkflowType.trim()
      if (!workflowType) errors.webhookWorkflowType = 'Workflow is required'
      else if (workflowType.includes(':')) {
        errors.webhookWorkflowType = 'Use the flow name only, without the agent prefix'
      }

      if (values.webhookMode === 'builtin') {
        if (!values.webhookName.trim()) errors.webhookName = 'Webhook name is required'
      } else {
        if (!values.webhookMethodName.trim()) errors.webhookMethodName = 'Method name is required'
        try {
          const params = parseQueryParams(values.webhookQueryParams)
          const credential = Object.keys(params).find((key) =>
            ['apikey', 'access_token'].includes(key.toLowerCase())
          )
          if (credential) errors.webhookQueryParams = `Don't put credentials (${credential}) in query parameters`
          else if (Object.keys(params).length > 20) errors.webhookQueryParams = 'At most 20 query parameters'
        } catch (err) {
          errors.webhookQueryParams = err instanceof Error ? err.message : 'Invalid query parameters'
        }
      }

      if (values.webhookBody.length > 32 * 1024) errors.webhookBody = 'Body must be 32 KB or less'

      const statusCode = values.webhookExpectedStatusCode.trim()
      if (statusCode) {
        const parsed = Number(statusCode)
        if (!Number.isInteger(parsed) || parsed < 100 || parsed > 599) {
          errors.webhookExpectedStatusCode = 'Enter a valid HTTP status code (100-599) or leave empty'
        }
      }

      const maxResponseMs = values.webhookMaxResponseMs.trim()
      if (maxResponseMs) {
        const parsed = Number(maxResponseMs)
        const limit = values.timeoutSeconds * 1000
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > limit) {
          errors.webhookMaxResponseMs = `Enter milliseconds between 1 and the timeout (${limit}), or leave empty`
        }
      }
      break
    }

    case 'schedule':
      if (!values.scheduleId.trim()) errors.scheduleId = 'Choose a schedule'
      break
  }

  if (values.notifyContactIds.length > MAX_NOTIFY_CONTACTS) {
    errors.notifyContactIds = `Choose at most ${MAX_NOTIFY_CONTACTS} contacts`
  }

  return errors
}

function validateAssertions(values: EvalFormValues): string | null {
  const rows = values.assertions.filter((a) => a.value.trim() || (a.path ?? '').trim())
  if (rows.length > MAX_ASSERTIONS) return `At most ${MAX_ASSERTIONS} checks`

  for (const assertion of values.assertions) {
    const info = assertionOpInfo(assertion.op)
    const path = (assertion.path ?? '').trim()
    const value = assertion.value.trim()
    const untouched = !value && !path
    if (untouched) continue

    if (info.webhookOnly && values.type !== 'webhook') return `“${info.label}” checks are only available on webhook evals`
    if (value.length > 500) return 'Check values must be 500 characters or less'

    if (info.pathLabel === 'JSON path') {
      if (!path) return 'Enter a JSON path, e.g. $.status'
      if (!JSON_PATH.test(path)) return `“${path}” isn’t a supported JSON path; use $.field, $.a.b or $.items[0].name`
    }
    if (info.pathLabel === 'Header') {
      if (!path) return 'Enter a header name'
      if (!HEADER_NAME.test(path)) return `“${path}” isn’t a valid header name`
    }
    if (info.needsValue && !value) return `Enter the expected value for “${info.label}”`
  }

  return null
}
