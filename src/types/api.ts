/**
 * API Types for Agent Studio
 * 
 * This file contains comprehensive type definitions for API routes,
 * ensuring type safety across all server-side operations.
 */

import { NextRequest, NextResponse } from "next/server"
import { Session } from "next-auth"
import { TenantContext } from "@/lib/tenant"

/**
 * Extended API Context with full session information
 */
export interface ApiContext {
  session: Session & {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: string
      hasTenantAccess?: boolean
    }
    accessToken?: string
  }
  tenantContext: TenantContext
  tenantId: string
}

/**
 * Standard API Response Types
 */
export interface ApiSuccessResponse<T = any> {
  data: T
  message?: string
  metadata?: {
    total?: number
    page?: number
    limit?: number
    hasMore?: boolean
  }
}

export interface ApiErrorResponse {
  error: string
  details?: string
  code?: string
  statusCode?: number
}

/**
 * API Handler Types
 */
export type ApiHandler<T = any> = (
  request: NextRequest, 
  context: ApiContext
) => Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>>

export type PublicApiHandler<T = any> = (
  request: NextRequest
) => Promise<NextResponse<ApiSuccessResponse<T> | ApiErrorResponse>>

/**
 * Route Parameter Types
 */
export interface TenantRouteParams {
  tenantId: string
}

export interface AgentRouteParams extends TenantRouteParams {
  agentId: string
  agentName: string
}

export interface ActivationRouteParams extends TenantRouteParams {
  activationId: string
  activationName?: string
}

export interface ConnectionRouteParams extends TenantRouteParams {
  connectionId: string
}

/**
 * Session Type Guards
 */
export function isValidSession(session: any): session is ApiContext['session'] {
  return (
    session &&
    session.user &&
    typeof session.user.id === 'string' &&
    typeof session.user.email === 'string' &&
    typeof session.user.role === 'string'
  )
}

export function hasAccessToken(session: Session): session is Session & { accessToken: string } {
  return !!(session as any).accessToken
}

/**
 * Response Helpers
 */
export function createSuccessResponse<T>(
  data: T, 
  message?: string, 
  metadata?: ApiSuccessResponse<T>['metadata']
): ApiSuccessResponse<T> {
  return {
    data,
    message,
    metadata
  }
}

export function createErrorResponse(
  error: string, 
  details?: string, 
  code?: string, 
  statusCode?: number
): ApiErrorResponse {
  return {
    error,
    details,
    code,
    statusCode
  }
}

/**
 * Common API Request Body Types
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface SearchParams {
  query?: string
  filter?: Record<string, any>
  sort?: {
    field: string
    order: 'asc' | 'desc'
  }
}

export interface ApiRequestBody<T = any> {
  data: T
  metadata?: {
    requestId?: string
    timestamp?: string
  }
}

/**
 * HTTP Method Types for Route Handlers
 */
export interface RouteHandlers {
  GET?: ApiHandler
  POST?: ApiHandler
  PUT?: ApiHandler
  PATCH?: ApiHandler
  DELETE?: ApiHandler
}

/**
 * Tenant-aware route handler context
 */
export interface TenantAwareRouteContext<P = {}> {
  params: Promise<TenantRouteParams & P>
}