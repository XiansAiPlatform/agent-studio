/**
 * Centralized Error Handling Utility
 * 
 * Provides consistent error handling across the application with
 * proper error message extraction and user-friendly notifications
 */

import { showToast } from '@/lib/toast'

export interface ApiError {
  status: number
  code?: string
  message: string
  details?: any
  traceId?: string
}

/**
 * Extract error message from various error formats
 * Handles errors from Xians API, Next.js API routes, and general errors
 */
export function extractErrorMessage(error: any): string {
  // If it's already a string, return it
  if (typeof error === 'string') {
    return error
  }

  // Extract from various error formats
  // Priority: error.error > error.message > error.toString()
  if (error?.error) {
    // Server returned { error: "message" }
    if (typeof error.error === 'string') {
      return error.error
    }
    // Server returned { error: { message: "message" } }
    if (error.error.message) {
      return error.error.message
    }
  }

  // Standard error.message
  if (error?.message) {
    return error.message
  }

  // Response data (from fetch or axios)
  if (error?.response?.data) {
    return extractErrorMessage(error.response.data)
  }

  // Fallback
  return 'An unexpected error occurred'
}

/**
 * Create a standardized ApiError object
 */
export function createApiError(error: any): ApiError {
  return {
    status: error?.status || error?.response?.status || 500,
    code: error?.code || error?.errorCode || 'unknown_error',
    message: extractErrorMessage(error),
    details: error?.details || error?.data,
    traceId: error?.traceId || error?.response?.headers?.['x-trace-id'],
  }
}

/**
 * Show error toast notification
 */
export function showErrorToast(error: any, customMessage?: string) {
  const apiError = createApiError(error)
  
  // Use custom message if provided, otherwise use extracted message
  const message = customMessage || apiError.message
  
  // Create description with status code and trace ID
  let description = ''
  if (apiError.status && apiError.status !== 500) {
    description = `Status: ${apiError.status}`
    if (apiError.code && apiError.code !== 'unknown_error') {
      description += ` (${apiError.code})`
    }
  }
  if (apiError.traceId) {
    description += description ? ` • Trace ID: ${apiError.traceId}` : `Trace ID: ${apiError.traceId}`
  }
  
  showToast.error({
    title: message,
    description: description || undefined,
    duration: 8000, // Longer duration for errors
  })

  // Log full error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.group('🔴 [Error Handler] Error Details')
    console.warn('Message:', message)
    console.warn('Status:', apiError.status)
    console.warn('Code:', apiError.code)
    if (apiError.traceId) console.warn('Trace ID:', apiError.traceId)
    console.warn('Original Error:', error)
    console.groupEnd()
  }

  return apiError
}

/**
 * Show success toast notification
 */
export function showSuccessToast(
  message: string, 
  description?: string,
  options?: {
    icon?: string | React.ReactNode
    action?: {
      label: string
      onClick: () => void
    }
  }
) {
  showToast.success({
    title: message,
    description,
    duration: 4000,
    action: options?.action,
  })
}

/**
 * Show info toast notification
 */
export function showInfoToast(message: string, description?: string) {
  showToast.info({
    title: message,
    description,
    duration: 4000,
  })
}

/**
 * Show warning toast notification
 */
export function showWarningToast(message: string, description?: string) {
  showToast.warning({
    title: message,
    description,
    duration: 6000,
  })
}

/**
 * Handle API errors with automatic retry option
 */
export function handleApiError(
  error: any,
  options?: {
    customMessage?: string
    showToast?: boolean
    onRetry?: () => void
  }
): ApiError {
  const apiError = createApiError(error)

  if (options?.showToast !== false) {
    const message = options?.customMessage || apiError.message

    if (options?.onRetry) {
      // Create description with status code and trace ID
      let description = ''
      if (apiError.status && apiError.status !== 500) {
        description = `Status: ${apiError.status}`
        if (apiError.code && apiError.code !== 'unknown_error') {
          description += ` (${apiError.code})`
        }
      }
      if (apiError.traceId) {
        description += description ? ` • Trace ID: ${apiError.traceId}` : `Trace ID: ${apiError.traceId}`
      }
      
      showToast.error({
        title: message,
        description: description || undefined,
        duration: 10000,
        action: {
          label: 'Retry',
          onClick: options.onRetry,
        },
      })
    } else {
      showErrorToast(error, options?.customMessage)
    }
  }

  return apiError
}

/**
 * Map HTTP status codes to user-friendly messages
 */
export function getStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required. Please log in.',
    403: 'Access denied. You don\'t have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'Conflict. The operation cannot be completed.',
    422: 'Validation error. Please check your input.',
    429: 'Too many requests. Please try again later.',
    500: 'Server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Request timeout. Please try again.',
  }

  return messages[status] || 'An unexpected error occurred.'
}

/**
 * Async wrapper that handles errors automatically
 */
export async function withErrorHandling<T>(
  asyncFn: () => Promise<T>,
  options?: {
    customMessage?: string
    showToast?: boolean
    onError?: (error: ApiError) => void
  }
): Promise<T | null> {
  try {
    return await asyncFn()
  } catch (error) {
    const apiError = handleApiError(error, {
      customMessage: options?.customMessage,
      showToast: options?.showToast,
    })

    options?.onError?.(apiError)

    return null
  }
}
