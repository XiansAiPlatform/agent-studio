import { useCallback, useState } from 'react'
import { OidcConfig } from '../types'

interface OidcConfigState {
  /** The stored configuration, or null when none is configured. */
  config: OidcConfig | null
  isLoading: boolean
  error: string | null
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return body.error ?? `${fallback} (${res.status})`
}

/**
 * The backend authoritatively scopes the configuration to the route tenant, and
 * the cookie-only tenant guard rejects any client-supplied `tenantId`. Strip it
 * before sending so saves never trip that guard.
 */
function stripTenantId(config: OidcConfig): OidcConfig {
  if (!('tenantId' in config)) return config
  const { tenantId: _tenantId, ...rest } = config
  return rest
}

export function useOidcConfig() {
  const [state, setState] = useState<OidcConfigState>({
    config: null,
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  const fetchConfig = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch('/api/settings/oidc')
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load OIDC configuration'))
      }
      const body: { config: OidcConfig | null } = await res.json()
      setState({ config: body.config ?? null, isLoading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  const fetchTemplate = useCallback(async (): Promise<OidcConfig> => {
    const res = await fetch('/api/settings/oidc/template')
    if (!res.ok) {
      throw new Error(await parseError(res, 'Failed to load template'))
    }
    const body: { config: OidcConfig | null } = await res.json()
    return body.config ?? {}
  }, [])

  const saveConfig = useCallback(async (config: OidcConfig): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/oidc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stripTenantId(config)),
      })
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to save OIDC configuration'))
      }
      const body: { config: OidcConfig | null } = await res.json()
      setState((prev) => ({ ...prev, config: body.config ?? config, error: null }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  const deleteConfig = useCallback(async (): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/oidc', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res, 'Failed to delete OIDC configuration'))
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
    fetchTemplate,
    saveConfig,
    deleteConfig,
  }
}
