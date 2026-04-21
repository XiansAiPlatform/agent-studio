import { useCallback, useState } from 'react'
import { CreateSecretRequest, TenantSecret } from '../types'

interface SecretsState {
  secrets: TenantSecret[]
  isLoading: boolean
  error: string | null
}

export function useSecrets() {
  const [state, setState] = useState<SecretsState>({
    secrets: [],
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  const fetchSecrets = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch('/api/settings/secrets', { cache: 'no-store' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }
      const data: TenantSecret[] = await res.json()
      setState({ secrets: data ?? [], isLoading: false, error: null })
    } catch (err) {
      setState({
        secrets: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }, [])

  const createSecret = useCallback(
    async (data: CreateSecretRequest): Promise<TenantSecret> => {
      setIsMutating(true)
      try {
        const res = await fetch('/api/settings/secrets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Failed to create secret (${res.status})`)
        }
        return await res.json()
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const deleteSecret = useCallback(async (id: string): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch(`/api/settings/secrets/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Failed to delete secret (${res.status})`)
      }
    } finally {
      setIsMutating(false)
    }
  }, [])

  return {
    ...state,
    isMutating,
    fetchSecrets,
    createSecret,
    deleteSecret,
  }
}
