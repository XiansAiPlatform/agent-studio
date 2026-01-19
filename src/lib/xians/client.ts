/**
 * Xians Server API Client
 * 
 * Centralized HTTP client for all Xians server API calls
 */

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
}

export class XiansClient {
  private baseUrl: string
  private authToken?: string
  private apiKey: string

  constructor(config: XiansClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.authToken = config.authToken
    this.apiKey = config.apiKey || ''
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
    const url = `${this.baseUrl}${path}`
    
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

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      // Handle non-OK responses
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        
        // Extract error message from various formats
        // Priority: error.error > error.message > default message
        let errorMessage = `Request failed with status ${response.status}`
        
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error
        } else if (error.error?.message) {
          errorMessage = error.error.message
        } else if (error.message) {
          errorMessage = error.message
        }
        
        throw new XiansApiError(
          errorMessage,
          response.status,
          error
        )
      }

      // Handle empty responses (204 No Content)
      if (response.status === 204) {
        return null as T
      }

      return response.json()
    } catch (error) {
      if (error instanceof XiansApiError) {
        throw error
      }
      
      // Network or other errors (status 0 indicates network failure)
      let errorMessage = 'Unknown error'
      
      if (error instanceof Error) {
        // Provide more helpful error messages for common network issues
        if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
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
 * Create a new Xians client instance
 */
export function createXiansClient(authToken?: string): XiansClient {
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
  })
}
