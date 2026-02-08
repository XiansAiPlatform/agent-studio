/**
 * Hook for managing OIDC connections
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

// API client functions
async function fetchConnections(
  tenantId: string, 
  options?: UseConnectionsOptions
): Promise<OIDCConnection[]> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  // If agentName and activationName are provided, fetch from integrations endpoint
  if (options?.agentName && options?.activationName) {
    const params = new URLSearchParams()
    params.set('agentName', options.agentName)
    params.set('activationName', options.activationName)
    
    const queryString = params.toString()
    const url = `/api/tenants/${tenantId}/integrations${queryString ? `?${queryString}` : ''}`
    
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
  const url = `/api/tenants/${tenantId}/connections${queryString ? `?${queryString}` : ''}`
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch connections: ${response.statusText}`)
  }
  
  const data: ConnectionsListResponse = await response.json()
  return data.connections
}

async function createConnection(
  tenantId: string, 
  data: CreateConnectionRequest
): Promise<OIDCConnection> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  const response = await fetch(`/api/tenants/${tenantId}/connections`, {
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
  tenantId: string, 
  data: InitiateConnectionRequest
): Promise<InitiateConnectionResponse> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  const response = await fetch(`/api/tenants/${tenantId}/connections/initiate`, {
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
  tenantId: string, 
  connectionId: string, 
  data: UpdateConnectionRequest
): Promise<OIDCConnection> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  const response = await fetch(`/api/tenants/${tenantId}/connections/${connectionId}`, {
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

async function deleteConnection(tenantId: string, connectionId: string): Promise<void> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  const response = await fetch(`/api/tenants/${tenantId}/connections/${connectionId}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Failed to delete connection: ${response.statusText}`)
  }
}

async function testConnection(tenantId: string, connectionId: string): Promise<ConnectionTestResult> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  const response = await fetch(`/api/tenants/${tenantId}/connections/${connectionId}/test`, {
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
  tenantId: string, 
  connectionId: string
): Promise<AuthorizeConnectionResponse> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  const response = await fetch(`/api/tenants/${tenantId}/connections/${connectionId}/authorize`, {
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
  tenantId: string,
  data: any
): Promise<{ id: string; webhookUrl: string }> {
  if (!tenantId) throw new Error('Tenant ID is required')
  
  const response = await fetch(`/api/tenants/${tenantId}/integrations`, {
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
export function useConnections(tenantId?: string, options?: UseConnectionsOptions) {
  const [connections, setConnections] = useState<OIDCConnection[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastFetchKeyRef = useRef<string | null>(null)
  
  // Create stable string key using useMemo
  const optionsKey = useMemo(() => JSON.stringify({
    tenantId,
    search: options?.search,
    status: options?.status,
    providerId: options?.providerId,
    onlyActive: options?.onlyActive,
    agentName: options?.agentName,
    activationName: options?.activationName,
  }), [
    tenantId,
    options?.search,
    options?.status,
    options?.providerId,
    options?.onlyActive,
    options?.agentName,
    options?.activationName,
  ])

  useEffect(() => {
    if (!tenantId) return
    
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
        const data = await fetchConnections(tenantId, options)
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
  }, [tenantId, optionsKey, options])

  const refetch = useCallback(async () => {
    // Reset the last fetch key to force a new fetch
    lastFetchKeyRef.current = null
    
    if (!tenantId) return
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchConnections(tenantId, options)
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
  }, [tenantId, optionsKey, options])

  // Mutations
  const createConnectionMutation = createMutationState<CreateConnectionRequest>(
    (data) => createConnection(tenantId!, data),
    refetch
  )

  const initiateConnectionMutation = createMutationState<InitiateConnectionRequest>(
    (data) => initiateConnection(tenantId!, data),
    refetch
  )

  const updateConnectionMutation = createMutationState<{ id: string; data: UpdateConnectionRequest }>(
    ({ id, data }) => updateConnection(tenantId!, id, data),
    refetch
  )

  const deleteConnectionMutation = createMutationState<string>(
    (connectionId) => deleteConnection(tenantId!, connectionId),
    refetch
  )

  const testConnectionMutation = createMutationState<string>(
    (connectionId) => testConnection(tenantId!, connectionId),
    refetch
  )

  const authorizeConnectionMutation = createMutationState<string>(
    (connectionId) => authorizeConnection(tenantId!, connectionId),
    refetch
  )

  const createIntegrationMutation = createMutationState<any>(
    (data) => createIntegration(tenantId!, data),
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
    testConnection: testConnectionMutation,
    authorizeConnection: authorizeConnectionMutation,
    createIntegration: createIntegrationMutation,
  }
}

// Individual connection hook
export function useConnection(tenantId?: string, connectionId?: string) {
  const [connection, setConnection] = useState<OIDCConnection | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!tenantId || !connectionId) return
    
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/tenants/${tenantId}/connections/${connectionId}`)
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
  }, [tenantId, connectionId])

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