import {
  EvalFormValues,
  MAX_ASSERTIONS,
  MAX_INTERVAL_MINUTES,
  MAX_TIMEOUT_SECONDS,
  MIN_INTERVAL_MINUTES,
  MIN_TIMEOUT_SECONDS,
  parseQueryParams,
} from './types'

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

    const filled = values.assertions.filter((a) => a.value.trim())
    if (filled.length > MAX_ASSERTIONS) {
      errors.assertions = `At most ${MAX_ASSERTIONS} assertions`
    }
    if (values.assertions.some((a) => a.value.trim().length > 500)) {
      errors.assertions = 'Assertion text must be 500 characters or less'
    }
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

      if (values.webhookBody.length > 32 * 1024) errors.webhookBody = 'Body must be 32 KB or less'

      const statusCode = values.webhookExpectedStatusCode.trim()
      if (statusCode) {
        const parsed = Number(statusCode)
        if (!Number.isInteger(parsed) || parsed < 100 || parsed > 599) {
          errors.webhookExpectedStatusCode = 'Enter a valid HTTP status code (100-599) or leave empty'
        }
      }
      break
    }

    case 'schedule':
      if (!values.scheduleId.trim()) errors.scheduleId = 'Choose a schedule'
      break
  }

  return errors
}
