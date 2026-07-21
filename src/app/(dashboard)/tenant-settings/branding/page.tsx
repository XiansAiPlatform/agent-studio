'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Palette, Check, Loader2, Upload, Link2, Trash2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { COLOR_THEMES, type ColorThemeId } from '@/lib/themes'
import { useTenantStore } from '@/store/tenant-store'
import {
  DashboardPage,
  DashboardPageBody,
  DashboardPageHeader,
} from '@/components/layout/dashboard-page'
import { useBranding } from './hooks/use-branding'
import { tenantLogoProxyUrl } from '@/lib/tenant/logo'

const THEME_OPTIONS = Object.values(COLOR_THEMES)

// Keep base64 uploads comfortably under the backend's ~1,000,000 char limit.
const MAX_LOGO_BYTES = 700 * 1024

/** Load an image source and resolve its natural pixel dimensions. */
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not load the image'))
    img.src = src
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

type LogoSource = 'upload' | 'url'

interface PendingUpload {
  dataUrl: string
  width: number
  height: number
}

export default function BrandingPage() {
  const currentTenantId = useTenantStore((s) => s.currentTenantId)
  const setTenantTheme = useTenantStore((s) => s.setTenantTheme)

  const {
    branding,
    isLoading,
    error,
    isMutating,
    fetchBranding,
    saveTheme,
    clearTheme,
    saveLogo,
    removeLogo,
  } = useBranding()

  const [selectedTheme, setSelectedTheme] = useState<ColorThemeId | null>(null)

  const [logoSource, setLogoSource] = useState<LogoSource>('upload')
  const [logoUrl, setLogoUrl] = useState('')
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)
  // Bumped after a successful logo change to bust the proxy image cache.
  const [logoVersion, setLogoVersion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  // Sync the selected theme with the loaded branding (only the known app themes
  // are selectable; an unknown stored value leaves the picker unselected).
  useEffect(() => {
    const theme = branding?.theme
    setSelectedTheme(theme && theme in COLOR_THEMES ? (theme as ColorThemeId) : null)
  }, [branding?.theme])

  const hasExistingLogo = Boolean(branding?.logo)

  const currentThemeId =
    branding?.theme && branding.theme in COLOR_THEMES
      ? (branding.theme as ColorThemeId)
      : null

  const themeDirty = selectedTheme !== null && selectedTheme !== currentThemeId

  const logoPreviewSrc = useMemo(() => {
    if (pendingUpload) return pendingUpload.dataUrl
    if (hasExistingLogo && currentTenantId) {
      return `${tenantLogoProxyUrl(currentTenantId)}?v=${logoVersion}`
    }
    return null
  }, [pendingUpload, hasExistingLogo, currentTenantId, logoVersion])

  // ── Theme ────────────────────────────────────────────────────────────────
  const handleSaveTheme = async () => {
    if (!selectedTheme) return
    try {
      await saveTheme(selectedTheme)
      // Update the live tenant store so the new theme is applied immediately and
      // persists across tenant switches (the ColorThemeProvider reacts to this).
      if (currentTenantId) setTenantTheme(currentTenantId, selectedTheme)
      toast.success(`Theme set to ${COLOR_THEMES[selectedTheme].name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update theme')
    }
  }

  const handleClearTheme = async () => {
    try {
      await clearTheme()
      setSelectedTheme(null)
      if (currentTenantId) setTenantTheme(currentTenantId, undefined)
      toast.success('Theme reset to the application default')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear theme')
    }
  }

  // ── Logo ───────────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error('Image is too large. Please use an image under 700KB.')
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const { width, height } = await getImageDimensions(dataUrl)
      setPendingUpload({ dataUrl, width, height })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read the image')
    } finally {
      // Allow re-selecting the same file.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveLogo = async () => {
    try {
      if (logoSource === 'upload') {
        if (!pendingUpload) {
          toast.error('Please choose an image first')
          return
        }
        await saveLogo({
          imgBase64: pendingUpload.dataUrl,
          width: pendingUpload.width,
          height: pendingUpload.height,
        })
        setPendingUpload(null)
      } else {
        const url = logoUrl.trim()
        if (!url) {
          toast.error('Please enter an image URL')
          return
        }
        let dimensions: { width: number; height: number }
        try {
          dimensions = await getImageDimensions(url)
        } catch {
          toast.error('Could not load an image from that URL')
          return
        }
        await saveLogo({ url, width: dimensions.width, height: dimensions.height })
        setLogoUrl('')
      }
      setLogoVersion((v) => v + 1)
      toast.success('Logo updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update logo')
    }
  }

  const handleRemoveLogo = async () => {
    try {
      await removeLogo()
      setPendingUpload(null)
      setLogoUrl('')
      setLogoVersion((v) => v + 1)
      toast.success('Logo removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove logo')
    }
  }

  const canSaveLogo =
    logoSource === 'upload' ? pendingUpload !== null : logoUrl.trim() !== ''

  return (
    <DashboardPage width="narrow">
      <DashboardPageHeader
        title="Branding"
        description="Customize the theme and logo for this tenant"
        icon={<Palette className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />}
      />

      <DashboardPageBody className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Color theme</CardTitle>
            <CardDescription>
              The default color theme applied for everyone in this tenant.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && !branding ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {THEME_OPTIONS.map((theme) => {
                  const isSelected = selectedTheme === theme.id
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSelectedTheme(theme.id)}
                      className={cn(
                        'relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:bg-accent/30',
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-border'
                      )}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="h-8 w-8 shrink-0 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: theme.primarySwatch }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground truncate">
                          {theme.name}
                        </span>
                        {currentThemeId === theme.id && (
                          <span className="block text-xs text-muted-foreground">
                            Current
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2 border-t">
            <Button
              onClick={handleSaveTheme}
              disabled={!themeDirty || isMutating}
              className="gap-2"
            >
              {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
              Save theme
            </Button>
            <Button
              variant="ghost"
              onClick={handleClearTheme}
              disabled={isMutating || !currentThemeId}
            >
              Reset to default
            </Button>
          </CardFooter>
        </Card>

        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Logo</CardTitle>
            <CardDescription>
              Upload an image or link to one. Recommended: a square or wide PNG/SVG
              under 700KB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview */}
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                {logoPreviewSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreviewSrc}
                    alt="Tenant logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {pendingUpload
                  ? 'New image ready to save'
                  : hasExistingLogo
                    ? 'Current logo'
                    : 'No logo set'}
              </div>
            </div>

            {/* Source toggle */}
            <div className="inline-flex rounded-lg border p-1">
              <button
                type="button"
                onClick={() => setLogoSource('upload')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  logoSource === 'upload'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
              <button
                type="button"
                onClick={() => setLogoSource('url')}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  logoSource === 'url'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Link2 className="h-4 w-4" />
                Image URL
              </button>
            </div>

            {logoSource === 'upload' ? (
              <div className="space-y-2">
                <Label htmlFor="logo-file">Choose an image</Label>
                <Input
                  id="logo-file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {pendingUpload && (
                  <p className="text-xs text-muted-foreground">
                    {pendingUpload.width}×{pendingUpload.height}px selected
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="logo-url">Image URL</Label>
                <Input
                  id="logo-url"
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2 border-t">
            <Button
              onClick={handleSaveLogo}
              disabled={!canSaveLogo || isMutating}
              className="gap-2"
            >
              {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
              Save logo
            </Button>
            <Button
              variant="ghost"
              onClick={handleRemoveLogo}
              disabled={isMutating || !hasExistingLogo}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </Button>
          </CardFooter>
        </Card>
      </DashboardPageBody>
    </DashboardPage>
  )
}
