/**
 * Xians Server API Client
 *
 * Centralized HTTP client for all Xians server API calls.
 * Authenticates with the service API key. When a Studio UI user is in scope,
 * also sends `X-On-Behalf-Of` for audit attribution (not authorization).
 */

import { applyOnBehalfOfHeader, getOnBehalfOf } from './on-behalf-of'

const DEFAULT_REQUEST_TIMEOUT_MS = 5_000

function resolveRequestTimeoutMs(): number {
  const raw = process.env.XIANS_REQUEST_TIMEOUT_MS
  if (raw?.trim()) {
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }
  return DEFAULT_REQUEST_TIMEOUT_MS
}

function mergeAbortSignals(signals: AbortSignal[]): AbortSignal {
  const active = signals.filter(Boolean)
  if (active.length === 1) return active[0]
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(active)
  }
  const controller = new AbortController()
  for (const signal of active) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    })
  }
  return controller.signal
}

export class XiansApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message)
    this.name = 'XiansApiError'
  }
}

export interface XiansClientConfig {
  baseUrl: string
  apiKey?: string
  authToken?: string
  /** Studio UI user email for `X-On-Behalf-Of` (used when request scope is unavailable). */
  onBehalfOf?: string
}

export class XiansClient {
  private baseUrl: string
  private authToken?: string
  private apiKey: string
  private onBehalfOf?: string

  constructor(config: XiansClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.authToken = config.authToken
    this.apiKey = config.apiKey || ''
    this.onBehalfOf = config.onBehalfOf
  }

  /**
   * Set or update the auth token
   */
  setAuthToken(token: string | undefined) {
    this.authToken = token
  }

  /**
   * Make an HTTP request to the Xians server
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = new URL(path, this.baseUrl + '/').toString()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Merge existing headers
    if (options.headers) {
      const existingHeaders = new Headers(options.headers)
      existingHeaders.forEach((value, key) => {
        headers[key] = value
      })
    }

    // Add API key (required for all Xians API calls)
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    applyOnBehalfOfHeader(headers, this.onBehalfOf)

    const timeoutSignal = AbortSignal.timeout(resolveRequestTimeoutMs())
    const signal = options.signal
      ? mergeAbortSignals([options.signal, timeoutSignal])
      : timeoutSignal

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal,
      })

      // Handle non-OK responses
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        
        // Extract error message from various formats
        // Priority: error.error > error.error.message > error.message > error.detail (RFC 9110 problem+json) > error.title > default
        let errorMessage = `Request failed with status ${response.status}`
        
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error
        } else if (error.error?.message) {
          errorMessage = error.error.message
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.detail) {
          errorMessage = error.detail
        } else if (error.title) {
          errorMessage = error.title
        }
        
        throw new XiansApiError(
          errorMessage,
          response.status,
          error
        )
      }

      // Handle empty responses: 204 No Content, or any 2xx with no body
      if (response.status === 204) {
        return null as T
      }

      const text = await response.text()
      if (!text.trim()) {
        return null as T
      }
      return JSON.parse(text) as T
    } catch (error) {
      if (error instanceof XiansApiError) {
        throw error
      }
      
      // Network or other errors (status 0 indicates network failure)
      let errorMessage = 'Unknown error'
      
      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          errorMessage =
            'Connection timed out. The backend server is not responding.'
        } else if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the backend server. Please check if the server is running.'
        } else if (error.message.includes('ECONNREFUSED')) {
          errorMessage = 'Connection refused. The backend server is not responding.'
        } else if (error.message.includes('ETIMEDOUT')) {
          errorMessage = 'Connection timed out. The backend server is not responding.'
        } else if (error.message.includes('ENOTFOUND')) {
          errorMessage = 'Backend server not found. Please check your configuration.'
        } else {
          errorMessage = error.message
        }
      }
      
      throw new XiansApiError(
        errorMessage,
        0
      )
    }
  }

  /**
   * GET request
   */
  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PUT request
   */
  async put<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * PATCH request
   */
  async patch<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

/**
 * Headers for Admin API fetches that bypass {@link XiansClient} (SSE, binary).
 * Always sends the service API key; adds `X-On-Behalf-Of` when a UI user is in scope.
 */
export function xiansAdminHeaders(extra?: HeadersInit): Record<string, string> {
  const headers: Record<string, string> = {}

  if (extra) {
    new Headers(extra).forEach((value, key) => {
      headers[key] = value
    })
  }

  if (process.env.XIANS_APIKEY) {
    headers['Authorization'] = `Bearer ${process.env.XIANS_APIKEY}`
  }

  applyOnBehalfOfHeader(headers)
  return headers
}

/**
 * Create a new Xians client instance
 */
export function createXiansClient(authToken?: string, onBehalfOf?: string): XiansClient {
  const baseUrl = process.env.XIANS_SERVER_URL
  const apiKey = process.env.XIANS_APIKEY
  
  if (!baseUrl) {
    throw new Error('XIANS_SERVER_URL environment variable is required')
  }
  
  if (!apiKey) {
    throw new Error('XIANS_APIKEY environment variable is required')
  }
  
  return new XiansClient({
    baseUrl,
    apiKey,
    authToken,
    onBehalfOf: onBehalfOf ?? getOnBehalfOf(),
  })
}
