import { useCallback, useState } from 'react'
import { TemporalConfig } from '../types'

interface TemporalConfigState {
  /** The stored override, or null when the tenant uses the default Temporal server. */
  config: TemporalConfig | null
  isLoading: boolean
  error: string | null
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return body.error ?? `${fallback} (${res.status})`
}

export function useTemporalConfig() {
  const [state, setState] = useState<TemporalConfigState>({
    config: null,
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
      const body: { config: TemporalConfig | null } = await res.json()
      setState({ config: body.config ?? null, isLoading: false, error: null })
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
      const body: { config: TemporalConfig | null } = await res.json()
      setState((prev) => ({ ...prev, config: body.config ?? config, error: null }))
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
      setState((prev) => ({ ...prev, config: null, error: null }))
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
