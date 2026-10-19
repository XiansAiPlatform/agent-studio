import { useCallback, useState } from 'react'
import { TenantBranding, SaveImageRequest, BrandingImageKind } from '../types'

interface BrandingState {
  branding: TenantBranding | null
  isLoading: boolean
  error: string | null
}

const EMPTY_BRANDING: TenantBranding = { theme: null, logo: null, favicon: null }

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
      setState({ branding: { ...EMPTY_BRANDING, ...branding }, isLoading: false, error: null })
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
        branding: { ...(prev.branding ?? EMPTY_BRANDING), theme },
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

  const saveImage = useCallback(
    async (kind: BrandingImageKind, image: SaveImageRequest): Promise<void> => {
      setIsMutating(true)
      try {
        const res = await fetch(`/api/settings/branding/${kind}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(image),
        })
        if (!res.ok) {
          throw new Error(await parseError(res, `Failed to update ${kind}`))
        }
        setState((prev) => ({
          ...prev,
          branding: {
            ...(prev.branding ?? EMPTY_BRANDING),
            [kind]: { width: image.width, height: image.height },
          },
        }))
      } finally {
        setIsMutating(false)
      }
    },
    []
  )

  const removeImage = useCallback(async (kind: BrandingImageKind): Promise<void> => {
    setIsMutating(true)
    try {
      const res = await fetch(`/api/settings/branding/${kind}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        throw new Error(await parseError(res, `Failed to remove ${kind}`))
      }
      setState((prev) => ({
        ...prev,
        branding: prev.branding ? { ...prev.branding, [kind]: null } : null,
      }))
    } finally {
      setIsMutating(false)
    }
  }, [])

  const saveLogo = useCallback((logo: SaveImageRequest) => saveImage('logo', logo), [saveImage])
  const removeLogo = useCallback(() => removeImage('logo'), [removeImage])
  const saveFavicon = useCallback(
    (favicon: SaveImageRequest) => saveImage('favicon', favicon),
    [saveImage]
  )
  const removeFavicon = useCallback(() => removeImage('favicon'), [removeImage])

  return {
    ...state,
    isMutating,
    fetchBranding,
    saveTheme,
    clearTheme,
    saveLogo,
    removeLogo,
    saveFavicon,
    removeFavicon,
  }
}
