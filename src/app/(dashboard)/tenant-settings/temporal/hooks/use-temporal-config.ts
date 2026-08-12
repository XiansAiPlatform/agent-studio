import { useCallback, useState } from 'react'
import { TemporalConfig, TemporalConfigStatus } from '../types'

interface TemporalConfigState {
  status: TemporalConfigStatus
  isLoading: boolean
  error: string | null
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return body.error ?? `${fallback} (${res.status})`
}

export function useTemporalConfig() {
  const [state, setState] = useState<TemporalConfigState>({
    status: null,
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  const fetchConfig = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch('/api/settings/temporal')
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load Temporal configuration'))
      }
      const status: TemporalConfigStatus = await res.json()
      setState({ status, isLoading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  const saveConfig = useCallback(async (config: TemporalConfig): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/temporal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save Temporal configuration'))
      }
      const status: TemporalConfigStatus = await res.json()
      setState((prev) => ({ ...prev, status, error: null }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  const deleteConfig = useCallback(async (): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/temporal', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res, 'Failed to revert to the default Temporal configuration'))
      }
      setState((prev) => ({ ...prev, status: null, error: null }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  return {
    ...state,
    isMutating,
    fetchConfig,
    saveConfig,
    deleteConfig,
  }
}
