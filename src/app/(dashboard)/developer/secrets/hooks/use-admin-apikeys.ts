import { useCallback, useState } from 'react'
import { AdminApiKey, CreateAdminApiKeyResponse, RotateAdminApiKeyResponse } from '../types'

interface ApiKeysState {
  keys: AdminApiKey[]
  isLoading: boolean
  error: string | null
}

export function useAdminApiKeys() {
  const [state, setState] = useState<ApiKeysState>({
    keys: [],
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  const fetchKeys = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch('/api/developer/admin-apikeys', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data: AdminApiKey[] = await res.json()
      setState({ keys: data ?? [], isLoading: false, error: null })
    } catch (err) {
      setState({
        keys: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [])

  const createKey = useCallback(
    async (name: string): Promise<CreateAdminApiKeyResponse> => {
      setIsMutating(true)
      try {
        const res = await fetch('/api/developer/admin-apikeys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to create API key (${res.status})`)
        }
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const revokeKey = useCallback(async (id: string): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch(`/api/developer/admin-apikeys/${encodeURIComponent(id)}/revoke`, {
        method: 'POST',
      })
      if (!res.ok && res.status !== 200) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to revoke API key (${res.status})`)
      }
    } finally {
      setIsMutating(false)
    }
  }, [])

  const rotateKey = useCallback(
    async (id: string): Promise<RotateAdminApiKeyResponse> => {
      setIsMutating(true)
      try {
        const res = await fetch(`/api/developer/admin-apikeys/${encodeURIComponent(id)}/rotate`, {
          method: 'POST',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to rotate API key (${res.status})`)
        }
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  return {
    ...state,
    isMutating,
    fetchKeys,
    createKey,
    revokeKey,
    rotateKey,
  }
}
