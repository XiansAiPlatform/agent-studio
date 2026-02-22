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
 * Handle errors in API routes and return standardized responses
 */
export function handleApiError(
  error: any,
  context?: string
): NextResponse<ApiErrorResponse> {
  // Log the error with context
  if (context) {
    console.error(`[API Error - ${context}]`, error)
  } else {
    console.error('[API Error]', error)
  }

  // Extract error message from various formats
  let errorMessage = 'An unexpected error occurred'
  let errorCode = 'unknown_error'
  let statusCode = 500

  // Handle XiansApiError
  if (error.name === 'XiansApiError') {
    errorMessage = error.message
    statusCode = error.status || 500
    errorCode = error.code || getErrorCode(statusCode)
  }
  // Handle standard Error
  else if (error instanceof Error) {
    errorMessage = error.message
    // Try to extract status if it exists
    if ('status' in error && typeof error.status === 'number') {
      statusCode = error.status
      errorCode = getErrorCode(statusCode)
    }
  }
  // Handle plain objects
  else if (typeof error === 'object' && error !== null) {
    if (error.message) {
      errorMessage = error.message
    }
    if (error.status) {
      statusCode = error.status
    }
    if (error.code) {
      errorCode = error.code
    } else {
      errorCode = getErrorCode(statusCode)
    }
  }

  return NextResponse.json(
    {
      error: errorMessage,
      code: errorCode,
      traceId: error.traceId || error.response?.traceId,
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
