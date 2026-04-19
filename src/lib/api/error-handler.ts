/**
 * API Error Handler Utility
 * 
 * Centralized error handling for Next.js API routes
 */

import { NextResponse } from 'next/server'

export interface ApiErrorResponse {
  error: string
  code?: string
  traceId?: string
  details?: any
}

/**
 * Handle errors in API routes and return standardized responses.
 *
 * Security note: never leaks internal error details (stack traces, raw
 * upstream response bodies, env-dependent messages) to clients.
 *
 * - 4xx errors with a known shape (XiansApiError or HTTP-status-bearing Error)
 *   are forwarded with their original message, since these are typically
 *   intended to be user-facing (validation / permission / not-found etc).
 * - 5xx and unknown errors return a generic message; the real error is logged
 *   server-side so operators can correlate via the returned `traceId`.
 */
export function handleApiError(
  error: any,
  context?: string,
  options: { fallbackMessage?: string } = {}
): NextResponse<ApiErrorResponse> {
  const fallbackMessage = options.fallbackMessage ?? 'An unexpected error occurred'

  if (context) {
    console.error(`[API Error - ${context}]`, error)
  } else {
    console.error('[API Error]', error)
  }

  let statusCode = 500
  let errorMessage = fallbackMessage
  let errorCode = 'internal_error'
  let traceId: string | undefined

  if (error?.name === 'XiansApiError') {
    statusCode = typeof error.status === 'number' && error.status > 0 ? error.status : 500
    errorCode = error.code || getErrorCode(statusCode)
    if (statusCode >= 400 && statusCode < 500 && typeof error.message === 'string') {
      errorMessage = error.message
    }
    traceId = error.traceId || error.response?.traceId
  } else if (error instanceof Error) {
    if ('status' in error && typeof (error as any).status === 'number') {
      const s = (error as any).status as number
      if (s > 0) statusCode = s
      errorCode = getErrorCode(statusCode)
      if (statusCode >= 400 && statusCode < 500) {
        errorMessage = error.message
      }
    }
  } else if (typeof error === 'object' && error !== null) {
    if (typeof error.status === 'number' && error.status > 0) {
      statusCode = error.status
    }
    errorCode = error.code || getErrorCode(statusCode)
    if (statusCode >= 400 && statusCode < 500 && typeof error.message === 'string') {
      errorMessage = error.message
    }
    traceId = error.traceId
  }

  return NextResponse.json(
    {
      error: errorMessage,
      code: errorCode,
      ...(traceId ? { traceId } : {}),
    },
    { status: statusCode }
  )
}

/**
 * Get error code based on HTTP status code
 */
function getErrorCode(status: number): string {
  const codes: Record<number, string> = {
    400: 'bad_request',
    401: 'unauthorized',
    403: 'forbidden',
    404: 'not_found',
    409: 'conflict',
    422: 'validation_error',
    429: 'rate_limit_exceeded',
    500: 'internal_error',
    502: 'bad_gateway',
    503: 'service_unavailable',
    504: 'gateway_timeout',
  }

  return codes[status] || 'unknown_error'
}

/**
 * Async wrapper for API route handlers with automatic error handling
 */
async function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  try {
    return await handler()
  } catch (error) {
    return handleApiError(error, context)
  }
}

/**
 * Validate required fields in request body
 */
function validateRequired(
  data: any,
  fields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = fields.filter(field => !data[field])
  
  if (missing.length > 0) {
    return { valid: false, missing }
  }
  
  return { valid: true }
}

/**
 * Create a validation error response
 */
export function validationError(
  message: string,
  details?: any
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: 'validation_error',
      details,
    },
    { status: 400 }
  )
}

/**
 * Create a not found error response
 */
function notFoundError(
  resource: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: `${resource} not found`,
      code: 'not_found',
    },
    { status: 404 }
  )
}

/**
 * Create an unauthorized error response
 */
export function unauthorizedError(
  message: string = 'Unauthorized'
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: 'unauthorized',
    },
    { status: 401 }
  )
}

/**
 * Create a forbidden error response
 */
export function forbiddenError(
  message: string = 'Access denied'
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code: 'forbidden',
    },
    { status: 403 }
  )
}
