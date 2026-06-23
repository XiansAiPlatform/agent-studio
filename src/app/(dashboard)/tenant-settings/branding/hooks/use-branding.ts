import { useCallback, useState } from 'react'
import { TenantBranding, SaveLogoRequest } from '../types'

interface BrandingState {
  branding: TenantBranding | null
  isLoading: boolean
  error: string | null
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return body.error ?? `${fallback} (${res.status})`
}

export function useBranding() {
  const [state, setState] = useState<BrandingState>({
    branding: null,
    isLoading: false,
    error: null,
  })
  const [isMutating, setIsMutating] = useState(false)

  const fetchBranding = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const res = await fetch('/api/settings/branding')
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to load branding'))
      }
      const branding: TenantBranding = await res.json()
      setState({ branding, isLoading: false, error: null })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }))
    }
  }, [])

  const saveTheme = useCallback(async (theme: string): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/branding/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      })
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update theme'))
      }
      setState((prev) => ({
        ...prev,
        branding: prev.branding
          ? { ...prev.branding, theme }
          : { theme, logo: null },
      }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  const clearTheme = useCallback(async (): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/branding/theme', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res, 'Failed to clear theme'))
      }
      setState((prev) => ({
        ...prev,
        branding: prev.branding ? { ...prev.branding, theme: null } : null,
      }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  const saveLogo = useCallback(async (logo: SaveLogoRequest): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/branding/logo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logo),
      })
      if (!res.ok) {
        throw new Error(await parseError(res, 'Failed to update logo'))
      }
      setState((prev) => ({
        ...prev,
        branding: prev.branding
          ? { ...prev.branding, logo: { width: logo.width, height: logo.height } }
          : { theme: null, logo: { width: logo.width, height: logo.height } },
      }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  const removeLogo = useCallback(async (): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch('/api/settings/branding/logo', { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res, 'Failed to remove logo'))
      }
      setState((prev) => ({
        ...prev,
        branding: prev.branding ? { ...prev.branding, logo: null } : null,
      }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  return {
    ...state,
    isMutating,
    fetchBranding,
    saveTheme,
    clearTheme,
    saveLogo,
    removeLogo,
  }
}
