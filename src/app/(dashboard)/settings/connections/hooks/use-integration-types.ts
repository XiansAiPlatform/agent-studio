/**
 * Hook for fetching available integration types via Next.js API route
 */

import { useState, useEffect, useRef } from 'react'

export interface IntegrationConfigField {
  fieldName: string
  displayName: string
  description: string
  isSecret: boolean
}

export interface IntegrationType {
  platformId: string
  displayName: string
  description: string
  icon: string
  requiredConfigurationFields: IntegrationConfigField[]
  capabilities: string[]
  webhookEndpoint: string
  documentationUrl: string | null
}

interface UseIntegrationTypesResult {
  integrationTypes: IntegrationType[]
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useIntegrationTypes(): UseIntegrationTypesResult {
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasFetchedRef = useRef(false)

  const fetchIntegrationTypes = async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)
    
    try {
      console.log('[useIntegrationTypes] Fetching from Next.js API route: /api/integrations/types')
      
      // Call Next.js API route instead of backend directly
      const response = await fetch('/api/integrations/types', {
        signal: abortControllerRef.current.signal,
      })
      
      console.log('[useIntegrationTypes] Response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[useIntegrationTypes] Error response:', errorData)
        throw new Error(errorData.error || `API error: ${response.status} ${response.statusText}`)
      }
      
      const data: IntegrationType[] = await response.json()
      console.log('[useIntegrationTypes] ✅ Successfully fetched', data.length, 'integration types:', data)
      setIntegrationTypes(data)
      hasFetchedRef.current = true
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useIntegrationTypes] Request aborted')
        return
      }
      
      const error = err instanceof Error ? err : new Error('Failed to fetch integration types')
      console.error('[useIntegrationTypes] ❌ Error:', error.message)
      setError(error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Skip if already fetched (for React Strict Mode)
    if (hasFetchedRef.current) {
      console.log('[useIntegrationTypes] Skipping fetch - already fetched')
      return
    }

    fetchIntegrationTypes()

    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    integrationTypes,
    isLoading,
    error,
    refetch: fetchIntegrationTypes
  }
}
