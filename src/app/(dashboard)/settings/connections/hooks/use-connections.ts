/**
 * Hook for managing OIDC connections
 */

import { useState, useEffect, useCallback } from 'react'
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

// Main hook
export function useConnections(tenantId?: string, options?: UseConnectionsOptions) {
  const [connections, setConnections] = useState<OIDCConnection[] | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!tenantId) return
    
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchConnections(tenantId, options)
      setConnections(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch connections'))
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, options])

  useEffect(() => {
    refetch()
  }, [refetch])

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