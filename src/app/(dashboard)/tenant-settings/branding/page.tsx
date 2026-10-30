'use client'

import { useEffect, useState } from 'react'
import { Palette, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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
import { BrandingImageCard } from './components/branding-image-card'
import { tenantLogoProxyUrl } from '@/lib/tenant/logo'
import { DEFAULT_FAVICON, tenantFaviconProxyUrl } from '@/lib/tenant/favicon'
import type { SaveImageRequest } from './types'

const THEME_OPTIONS = Object.values(COLOR_THEMES)

// Keeps uploads safely below the backend's size limit.
const MAX_LOGO_BYTES = 700 * 1024
// Favicons are small, and every page loads one, so the limit is lower.
const MAX_FAVICON_BYTES = 256 * 1024
const MIN_FAVICON_SIZE = 32

// Any size can be saved. These notes only explain how the icon will look.
function getFaviconWarning({ width, height }: { width: number; height: number }) {
  if (width !== height) {
    return `This image is ${width}×${height}px. Browser tabs show icons in a square, so a non-square image will look smaller.`
  }
  if (width < MIN_FAVICON_SIZE) {
    return `This image is ${width}×${height}px. Use at least ${MIN_FAVICON_SIZE}×${MIN_FAVICON_SIZE}px for a sharp icon.`
  }
  return null
}

export default function BrandingPage() {
  const currentTenantId = useTenantStore((s) => s.currentTenantId)
  const setTenantTheme = useTenantStore((s) => s.setTenantTheme)
  const setTenantLogo = useTenantStore((s) => s.setTenantLogo)
  const brandingVersion = useTenantStore((s) => s.brandingVersion)
  const bumpBrandingVersion = useTenantStore((s) => s.bumpBrandingVersion)

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
    saveFavicon,
    removeFavicon,
  } = useBranding()

  const [selectedTheme, setSelectedTheme] = useState<ColorThemeId | null>(null)

  // Load the branding again when the user switches tenant. Otherwise the page
  // would keep showing the previous tenant's theme and images.
  useEffect(() => {
    fetchBranding()
  }, [currentTenantId, fetchBranding])

  // Select the tenant's saved theme in the picker. If the saved theme is not
  // one we know, nothing is selected.
  useEffect(() => {
    const theme = branding?.theme
    setSelectedTheme(theme && theme in COLOR_THEMES ? (theme as ColorThemeId) : null)
  }, [branding?.theme])

  const hasExistingLogo = Boolean(branding?.logo)
  const hasExistingFavicon = Boolean(branding?.favicon)

  const currentThemeId =
    branding?.theme && branding.theme in COLOR_THEMES
      ? (branding.theme as ColorThemeId)
      : null

  const themeDirty = selectedTheme !== null && selectedTheme !== currentThemeId

  const logoSrc = currentTenantId
    ? `${tenantLogoProxyUrl(currentTenantId)}?v=${brandingVersion}`
    : null
  const faviconSrc = currentTenantId
    ? tenantFaviconProxyUrl(currentTenantId, { version: brandingVersion })
    : null

  // ── Theme ────────────────────────────────────────────────────────────────
  const handleSaveTheme = async () => {
    if (!selectedTheme) return
    try {
      await saveTheme(selectedTheme)
      // Update the tenant store too, so the new theme shows straight away and
      // stays after switching tenants.
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

  // ── Logo / favicon ─────────────────────────────────────────────────────────
  // Update the tenant store too, so the header logo and the tab icon change
  // without reloading the page. (The tab icon uses the logo when there is no
  // favicon.)
  const handleSaveLogo = async (logo: SaveImageRequest) => {
    await saveLogo(logo)
    if (currentTenantId) {
      setTenantLogo(currentTenantId, {
        // A new URL each time, so every place that shows the logo loads the
        // new image instead of reusing the old one.
        url: `${tenantLogoProxyUrl(currentTenantId)}?v=${Date.now()}`,
        width: logo.width,
        height: logo.height,
      })
    }
    bumpBrandingVersion()
  }

  const handleRemoveLogo = async () => {
    await removeLogo()
    if (currentTenantId) setTenantLogo(currentTenantId, null)
    bumpBrandingVersion()
  }

  const handleSaveFavicon = async (favicon: SaveImageRequest) => {
    await saveFavicon(favicon)
    bumpBrandingVersion()
  }

  const handleRemoveFavicon = async () => {
    await removeFavicon()
    bumpBrandingVersion()
  }

  // What the browser tab shows when nothing new is chosen. The favicon URL
  // already falls back to the logo, then the default icon, on the server.
  const tabIconSrc = faviconSrc ?? DEFAULT_FAVICON

  return (
    <DashboardPage width="narrow">
      <DashboardPageHeader
        title="Branding"
        description="Customize the theme, logo, and favicon for this tenant"
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

        {/* The key makes the cards start fresh when the tenant changes, so an
            unsaved upload is never carried over to another tenant. */}
        <BrandingImageCard
          key={`logo-${currentTenantId}`}
          kind="logo"
          title="Logo"
          description="Upload an image or link to one. Recommended: a square or wide PNG/SVG under 700KB."
          fileHint="PNG, SVG, or JPG under 700KB"
          maxBytes={MAX_LOGO_BYTES}
          urlPlaceholder="https://example.com/logo.png"
          hasExisting={hasExistingLogo}
          existingSrc={logoSrc}
          emptyLabel="No logo set"
          isMutating={isMutating}
          onSave={handleSaveLogo}
          onRemove={handleRemoveLogo}
        />

        <BrandingImageCard
          key={`favicon-${currentTenantId}`}
          kind="favicon"
          title="Favicon"
          description="The icon shown in browser tabs and bookmarks. Any size works; a square PNG, SVG, or ICO of at least 32×32px looks best. Without one, the logo is used, or the default Agent Studio icon."
          fileHint="PNG, SVG, or ICO under 256KB"
          maxBytes={MAX_FAVICON_BYTES}
          accept="image/*,.ico"
          urlPlaceholder="https://example.com/favicon.png"
          hasExisting={hasExistingFavicon}
          existingSrc={faviconSrc}
          emptyLabel={hasExistingLogo ? 'No favicon set · using the logo' : 'No favicon set · using the default icon'}
          isMutating={isMutating}
          onSave={handleSaveFavicon}
          onRemove={handleRemoveFavicon}
          getWarning={getFaviconWarning}
          renderPreview={(src) => (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Browser tab preview</p>
              <div className="rounded-lg border bg-muted/40 px-3 pt-2">
                <div className="flex max-w-[240px] items-center gap-2 rounded-t-md border border-b-0 bg-background px-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src ?? tabIconSrc}
                    alt=""
                    className="h-4 w-4 shrink-0 object-contain"
                  />
                  <span className="truncate text-xs text-foreground">Agent Studio</span>
                </div>
              </div>
            </div>
          )}
        />
      </DashboardPageBody>
    </DashboardPage>
  )
}
