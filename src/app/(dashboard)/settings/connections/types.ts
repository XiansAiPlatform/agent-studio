/**
 * Types for OIDC Connections management
 */

export interface OIDCConnection {
  id: string
  tenantId: string
  userId: string                  // User who owns this connection
  name: string                   // User-defined name like "Company SharePoint"
  providerId: string            // Reference to OIDC_PROVIDERS config
  
  // OIDC Configuration
  clientId: string
  clientSecret?: string         // Never exposed in API responses
  customScopes?: string[]       // Override default scopes if needed
  wellKnownUrl?: string        // Override default well-known URL
  
  // Connection metadata
  status: ConnectionStatus
  createdAt: string
  updatedAt: string
  lastUsed?: string
  createdBy: string            // User who created the connection
  
  // OAuth token information (never include actual tokens in responses)
  hasValidToken: boolean
  tokenExpiresAt?: string
  lastTokenRefresh?: string
  authorizedAt?: string        // When user completed OAuth flow
  
  // User's identity at the provider (from OAuth)
  externalUserId?: string      // e.g., user's email or ID from the provider
  externalUserName?: string    // e.g., display name from the provider
  
  // Additional configuration
  description?: string
  isActive: boolean
  
  // Usage statistics
  usageCount?: number
  lastError?: string
  lastErrorAt?: string
}

export type ConnectionStatus = 
  | 'pending'         // Connection initiated, waiting for OAuth completion
  | 'authorizing'     // OAuth flow in progress
  | 'connected'       // Successfully connected with valid tokens
  | 'expired'         // Tokens expired, needs refresh
  | 'error'           // Connection has errors
  | 'disabled'        // Manually disabled by user
  | 'draft'           // Connection in draft state

export interface CreateConnectionRequest {
  name: string
  providerId: string
  description?: string
  clientId: string
  clientSecret: string
  customScopes?: string[]
  wellKnownUrl?: string
}

export interface InitiateConnectionRequest {
  name: string
  providerId: string
  description?: string
  clientId: string
  clientSecret: string
  customScopes?: string[]
  wellKnownUrl?: string
  returnUrl?: string  // Where to redirect user after OAuth completion
}

export interface InitiateConnectionResponse {
  connectionId: string  // Temporary connection ID for the OAuth flow
  authUrl: string      // OAuth authorization URL
  state: string        // OAuth state parameter
}

export interface CompleteConnectionRequest {
  connectionId: string
  code: string
  state: string
}

export interface UserTokenInfo {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
  tokenType: string
  // User information from OAuth provider
  externalUserId?: string
  externalUserName?: string
  externalUserEmail?: string
}

export interface UpdateConnectionRequest {
  name?: string
  providerId?: string
  description?: string
  clientId?: string
  clientSecret?: string
  customScopes?: string[]
  wellKnownUrl?: string
  isActive?: boolean
}

export interface ConnectionTestResult {
  success: boolean
  error?: string
  details?: {
    wellKnownEndpoint?: boolean
    clientCredentials?: boolean
    tokenExchange?: boolean
    apiAccess?: boolean
  }
  responseTime?: number
  testedAt: string
}

export interface ConnectionUsageStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastUsed?: string
  usageByDay: Array<{
    date: string
    requests: number
    errors: number
  }>
}

export interface AuthorizeConnectionRequest {
  connectionId: string
  returnUrl?: string
}

export interface AuthorizeConnectionResponse {
  authUrl: string
  state: string
}

export interface ConnectionCallbackRequest {
  connectionId: string
  code: string
  state: string
}

export interface ConnectionToken {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  scope: string
  tokenType: string
}

// API Response types
export interface ConnectionsListResponse {
  connections: OIDCConnection[]
  total: number
  hasMore: boolean
}

export interface ConnectionResponse {
  connection: OIDCConnection
}

export interface ConnectionTestResponse {
  result: ConnectionTestResult
}

export interface ConnectionUsageResponse {
  usage: ConnectionUsageStats
}

// UI-specific types
export interface ConnectionFormData {
  name: string
  providerId: string
  description: string
  clientId: string
  clientSecret: string
  customScopes: string
  wellKnownUrl: string
}

export interface ConnectionCardProps {
  connection: OIDCConnection
  onEdit: (connection: OIDCConnection) => void
  onDelete: (connectionId: string) => void
  onTest: (connectionId: string) => void
  onToggleActive: (connectionId: string, active: boolean) => void
  onViewUsage: (connectionId: string) => void
}

// Filter and sort options
export interface ConnectionsFilter {
  status?: ConnectionStatus[]
  providerId?: string[]
  search?: string
  onlyActive?: boolean
}

export type ConnectionsSortBy = 
  | 'name'
  | 'createdAt'
  | 'lastUsed'
  | 'status'
  | 'providerId'

export interface ConnectionsSortOptions {
  sortBy: ConnectionsSortBy
  sortOrder: 'asc' | 'desc'
}

// Error types
export interface ConnectionError {
  code: string
  message: string
  details?: Record<string, any>
}

export const CONNECTION_ERROR_CODES = {
  INVALID_CLIENT: 'invalid_client',
  INVALID_CREDENTIALS: 'invalid_credentials',
  SCOPE_NOT_SUPPORTED: 'scope_not_supported',
  NETWORK_ERROR: 'network_error',
  TOKEN_EXPIRED: 'token_expired',
  REFRESH_FAILED: 'refresh_failed',
  API_ERROR: 'api_error',
  UNKNOWN_ERROR: 'unknown_error',
} as const

export type ConnectionErrorCode = typeof CONNECTION_ERROR_CODES[keyof typeof CONNECTION_ERROR_CODES]