/**
 * Route Helpers for API Route Migration
 * 
 * This file provides utility functions to help migrate existing API routes
 * to use the new comprehensive type system.
 */

import { NextRequest, NextResponse } from "next/server"
import { 
  ApiContext, 
  ApiSuccessResponse, 
  ApiErrorResponse,
  createSuccessResponse,
  createErrorResponse
} from "@/types/api"

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function createApiRoute<T = any>(
  handler: (request: NextRequest, context: ApiContext) => Promise<T>
) {
  return async (request: NextRequest, context: ApiContext): Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>> => {
    try {
      const result = await handler(request, context)
      return NextResponse.json(createSuccessResponse(result))
    } catch (error) {
      console.error('API Route Error:', error)
      
      if (error instanceof ApiError) {
        return NextResponse.json(
          createErrorResponse(error.message, error.details, error.code),
          { status: error.statusCode }
        )
      }
      
      return NextResponse.json(
        createErrorResponse(
          'Internal server error',
          error instanceof Error ? error.message : 'Unknown error'
        ),
        { status: 500 }
      )
    }
  }
}

/**
 * Custom API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static badRequest(message: string, details?: string): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST', details)
  }

  static unauthorized(message: string = 'Unauthorized', details?: string): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED', details)
  }

  static forbidden(message: string = 'Forbidden', details?: string): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN', details)
  }

  static notFound(message: string = 'Not found', details?: string): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND', details)
  }

  static conflict(message: string, details?: string): ApiError {
    return new ApiError(message, 409, 'CONFLICT', details)
  }

  static internalError(message: string = 'Internal server error', details?: string): ApiError {
    return new ApiError(message, 500, 'INTERNAL_ERROR', details)
  }
}

/**
 * Extract and validate route parameters
 */
export async function getRouteParams<T extends Record<string, string>>(
  context: { params: Promise<T> }
): Promise<T> {
  try {
    return await context.params
  } catch (error) {
    throw ApiError.badRequest('Invalid route parameters')
  }
}

/**
 * Parse and validate JSON request body
 */
export async function parseRequestBody<T = any>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json()
    return body
  } catch (error) {
    throw ApiError.badRequest('Invalid JSON body', 'Request body must be valid JSON')
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  )
  
  if (missingFields.length > 0) {
    throw ApiError.badRequest(
      'Missing required fields',
      `Required fields: ${missingFields.join(', ')}`
    )
  }
}

/**
 * Extract query parameters with type safety
 */
export function getQueryParams(request: NextRequest) {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  return {
    getString: (key: string, defaultValue?: string): string | undefined => {
      return searchParams.get(key) || defaultValue
    },
    getNumber: (key: string, defaultValue?: number): number | undefined => {
      const value = searchParams.get(key)
      if (!value) return defaultValue
      const num = parseInt(value, 10)
      return isNaN(num) ? defaultValue : num
    },
    getBoolean: (key: string, defaultValue?: boolean): boolean | undefined => {
      const value = searchParams.get(key)
      if (!value) return defaultValue
      return value.toLowerCase() === 'true'
    },
    getArray: (key: string): string[] => {
      return searchParams.getAll(key)
    }
  }
}

/**
 * Session access helpers with proper typing
 */
export function getUserId(context: ApiContext): string {
  return context.session.user.id
}

export function getUserEmail(context: ApiContext): string {
  return context.session.user.email
}

export function getAccessToken(context: ApiContext): string | undefined {
  return context.session.accessToken
}

export function getTenantId(context: ApiContext): string {
  return context.tenantId
}

/**
 * Response helpers with consistent formatting
 */
export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json(createSuccessResponse(data, message))
}

export function errorResponse(
  message: string, 
  statusCode: number = 500, 
  details?: string,
  code?: string
) {
  return NextResponse.json(
    createErrorResponse(message, details, code),
    { status: statusCode }
  )
}