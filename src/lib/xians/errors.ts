/**
 * Xians API error classification helpers.
 *
 * These centralize how we interpret failures from the Xians admin API so that
 * logs and user-facing screens stay consistent across call sites.
 *
 * Important: every admin API call authenticates with the service credential
 * (XIANS_APIKEY) — see `XiansClient.request`, which only ever sends that key as
 * the Bearer token. An end-user token is never used for these calls. Therefore a
 * 401 from the backend always means the *service credential* was rejected (e.g.
 * the key is wrong, revoked, rotated, or not registered), which is a deployment
 * configuration problem rather than an end-user authentication or connectivity
 * issue.
 */

import { XiansApiError } from './client'

/** Operator-facing hint shown in server logs when the service API key is rejected. */
export const SERVICE_API_KEY_ERROR_HINT =
  'The backend rejected the Agent Studio service credential. Verify XIANS_APIKEY ' +
  'matches a valid, active backend API key and that XIANS_SERVER_URL points to the ' +
  'correct backend.'

/** The backend could not be reached at all (network failure / server down). */
export function isBackendUnreachableError(error: unknown): error is XiansApiError {
  return error instanceof XiansApiError && error.status === 0
}

/** The backend rejected the service credential (misconfigured XIANS_APIKEY). */
export function isServiceApiKeyError(error: unknown): error is XiansApiError {
  return error instanceof XiansApiError && error.status === 401
}

/**
 * Produce a concise, operator-actionable description of a Xians API error for
 * server-side logging. Distinguishes connectivity vs. credential vs. other
 * failures instead of emitting a bare "Unauthorized".
 */
export function describeXiansError(error: unknown): string {
  if (isBackendUnreachableError(error)) {
    return `Backend unreachable: ${error.message}`
  }
  if (isServiceApiKeyError(error)) {
    return `Service API key rejected (401) — "${error.message}". ${SERVICE_API_KEY_ERROR_HINT}`
  }
  if (error instanceof XiansApiError) {
    return `Backend error (${error.status}): ${error.message}`
  }
  return error instanceof Error ? error.message : 'Unknown error'
}
