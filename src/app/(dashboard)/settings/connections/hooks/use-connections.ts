/**
 * Hook for managing OIDC connections
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { 
  OIDCConnection, 
  CreateConnectionRequest, 
  InitiateConnectionRequest,
  InitiateConnectionResponse,
  UpdateConnectionRequest,
  ConnectionTestResult,
  AuthorizeConnectionResponse,
  ConnectionsListResponse,
  ConnectionResponse,
  ConnectionTestResponse
} from '../types'

interface UseConnectionsOptions {
  search?: string
  status?: string
  providerId?: string
  onlyActive?: boolean
  agentName?: string
  activationName?: string
}

interface MutationState {
  isPending: boolean
  error: Error | null
  mutateAsync: (data: any) => Promise<any>
  mutate: (data: any) => void
}

function createMutationState<T>(
  fn: (data: T) => Promise<any>,
  onSuccess?: () => void
): MutationState {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutateAsync = useCallback(async (data: T) => {
    setIsPending(true)
    setError(null)
    try {
      const result = await fn(data)
      onSuccess?.()
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      throw error
    } finally {
      setIsPending(false)
    }
  }, [fn, onSuccess])

  const mutate = useCallback((data: T) => {
    mutateAsync(data).catch(() => {}) // Error handling done in mutateAsync
  }, [mutateAsync])

  return { isPending, error, mutateAsync, mutate }
}

// API client functions.
// NOTE: None of these send a tenant id — the backend resolves the tenant
// server-side from the session cookie. Callers only gate on tenant presence.
async function fetchConnections(
  options?: UseConnectionsOptions
): Promise<OIDCConnection[]> {
  // If agentName and activationName are provided, fetch from integrations endpoint
  if (options?.agentName && options?.activationName) {
    const params = new URLSearchParams()
    params.set('agentName', options.agentName)
    params.set('activationName', options.activationName)
    
    const queryString = params.toString()
    const url = `/api/integrations${queryString ? `?${queryString}` : ''}`
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch integrations: ${response.statusText}`)
    }
    
    // Map integration response to OIDCConnection format
    const integrations = await response.json()
    
    // Transform integration data to match OIDCConnection interface
    return integrations.map((integration: any): OIDCConnection => ({
      id: integration.id,
      tenantId: integration.tenantId,
      userId: integration.createdBy || 'system',
      name: integration.name,
      providerId: integration.platformId,
      clientId: integration.configuration?.appId || integration.configuration?.botToken || '',
      status: integration.isEnabled ? 'connected' : 'disabled',
      createdAt: integration.createdAt,
      updatedAt: integration.updatedAt,
      createdBy: integration.createdBy,
      hasValidToken: integration.isEnabled,
      description: integration.description,
      isActive: integration.isEnabled,
      usageCount: 0,
      // Additional integration-specific fields
      platformId: integration.platformId,
      agentName: integration.agentName,
      activationName: integration.activationName,
      workflowId: integration.workflowId,
      webhookUrl: integration.webhookUrl,
      configuration: integration.configuration,
      mappingConfig: integration.mappingConfig,
    }))
  }
  
  // Otherwise, fetch from connections endpoint
  const params = new URLSearchParams()
  if (options?.search) params.set('search', options.search)
  if (options?.status) params.set('status', options.status)
  if (options?.providerId) params.set('providerId', options.providerId)
  if (options?.onlyActive) params.set('onlyActive', 'true')
  
  const queryString = params.toString()
  const url = `/api/connections${queryString ? `?${queryString}` : ''}`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch connections: ${response.statusText}`)
  }
  
  const data: ConnectionsListResponse = await response.json()
  return data.connections
}

async function createConnection(
  data: CreateConnectionRequest
): Promise<OIDCConnection> {
  const response = await fetch(`/api/connections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to create connection: ${response.statusText}`)
  }
  
  const result: ConnectionResponse = await response.json()
  return result.connection
}

async function initiateConnection(
  data: InitiateConnectionRequest
): Promise<InitiateConnectionResponse> {
  const response = await fetch(`/api/connections/initiate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to initiate connection: ${response.statusText}`)
  }
  
  return response.json()
}

async function updateConnection(
  connectionId: string, 
  data: UpdateConnectionRequest
): Promise<OIDCConnection> {
  const response = await fetch(`/api/connections/${connectionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to update connection: ${response.statusText}`)
  }
  
  const result: ConnectionResponse = await response.json()
  return result.connection
}

async function deleteConnection(connectionId: string): Promise<void> {
  const response = await fetch(`/api/connections/${connectionId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to delete connection: ${response.statusText}`)
  }
}

async function deleteIntegration(integrationId: string): Promise<void> {
  const response = await fetch(`/api/integrations/${integrationId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to delete integration: ${response.statusText}`)
  }
}

async function testConnection(connectionId: string): Promise<ConnectionTestResult> {
  const response = await fetch(`/api/connections/${connectionId}/test`, {
    method: 'POST',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to test connection: ${response.statusText}`)
  }
  
  const result: ConnectionTestResponse = await response.json()
  return result.result
}

async function authorizeConnection(
  connectionId: string
): Promise<AuthorizeConnectionResponse> {
  const response = await fetch(`/api/connections/${connectionId}/authorize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to authorize connection: ${response.statusText}`)
  }
  
  return response.json()
}

async function createIntegration(
  data: any
): Promise<{ id: string; webhookUrl: string }> {
  const response = await fetch(`/api/integrations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to create integration: ${response.statusText}`)
  }
  
  return response.json()
}

// Main hook
export function useConnections(options?: UseConnectionsOptions) {
  // Tenant is resolved server-side from the session cookie; the current
  // selection only gates fetching and keys the cache.
  const { currentTenantId } = useTenant()
  const [connections, setConnections] = useState<OIDCConnection[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchKeyRef = useRef<string | null>(null)
  
  // Create stable string key using useMemo
  const optionsKey = useMemo(() => JSON.stringify({
    tenantId: currentTenantId,
    search: options?.search,
    status: options?.status,
    providerId: options?.providerId,
    onlyActive: options?.onlyActive,
    agentName: options?.agentName,
    activationName: options?.activationName,
  }), [
    currentTenantId,
    options?.search,
    options?.status,
    options?.providerId,
    options?.onlyActive,
    options?.agentName,
    options?.activationName,
  ])

  useEffect(() => {
    if (!currentTenantId) return
    
    // Skip if already fetched with these exact parameters
    if (lastFetchKeyRef.current === optionsKey) {
      console.log('[useConnections] Skipping fetch - already fetched with these params:', optionsKey)
      return
    }
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchConnections(options)
        setConnections(data)
        
        // Mark these parameters as fetched
        lastFetchKeyRef.current = optionsKey
        console.log('[useConnections] ✅ Fetched successfully, marked params:', optionsKey)
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[useConnections] Request aborted')
          return
        }
        
        setError(err instanceof Error ? err : new Error('Failed to fetch connections'))
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()

    // Cleanup function to abort request if component unmounts or dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [currentTenantId, optionsKey, options])

  const refetch = useCallback(async () => {
    // Reset the last fetch key to force a new fetch
    lastFetchKeyRef.current = null
    
    if (!currentTenantId) return
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchConnections(options)
      setConnections(data)
      lastFetchKeyRef.current = optionsKey
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useConnections] Request aborted')
        return
      }
      
      setError(err instanceof Error ? err : new Error('Failed to fetch connections'))
    } finally {
      setIsLoading(false)
    }
  }, [currentTenantId, optionsKey, options])

  // Mutations
  const createConnectionMutation = createMutationState<CreateConnectionRequest>(
    (data) => createConnection(data),
    refetch
  )

  const initiateConnectionMutation = createMutationState<InitiateConnectionRequest>(
    (data) => initiateConnection(data),
    refetch
  )

  const updateConnectionMutation = createMutationState<{ id: string; data: UpdateConnectionRequest }>(
    ({ id, data }) => updateConnection(id, data),
    refetch
  )

  const deleteConnectionMutation = createMutationState<string>(
    (connectionId) => deleteConnection(connectionId),
    refetch
  )

  const deleteIntegrationMutation = createMutationState<string>(
    (integrationId) => deleteIntegration(integrationId),
    refetch
  )

  const testConnectionMutation = createMutationState<string>(
    (connectionId) => testConnection(connectionId),
    refetch
  )

  const authorizeConnectionMutation = createMutationState<string>(
    (connectionId) => authorizeConnection(connectionId),
    refetch
  )

  const createIntegrationMutation = createMutationState<any>(
    (data) => createIntegration(data),
    refetch
  )

  return {
    connections,
    isLoading,
    error,
    refetch,
    createConnection: createConnectionMutation,
    initiateConnection: initiateConnectionMutation,
    updateConnection: updateConnectionMutation,
    deleteConnection: deleteConnectionMutation,
    deleteIntegration: deleteIntegrationMutation,
    testConnection: testConnectionMutation,
    authorizeConnection: authorizeConnectionMutation,
    createIntegration: createIntegrationMutation,
  }
}

// Individual connection hook
export function useConnection(connectionId?: string) {
  const { currentTenantId } = useTenant()
  const [connection, setConnection] = useState<OIDCConnection | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!currentTenantId || !connectionId) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/connections/${connectionId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch connection: ${response.statusText}`)
      }
      
      const data: ConnectionResponse = await response.json()
      setConnection(data.connection)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch connection'))
    } finally {
      setIsLoading(false)
    }
  }, [currentTenantId, connectionId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return {
    connection,
    isLoading,
    error,
    refetch,
  }
}