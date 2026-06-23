'use client'

import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Loader2,
  Trash2,
  Save,
  FileJson,
  Wand2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useOidcConfig } from './hooks/use-oidc-config'
import { OidcConfig } from './types'

function formatJson(config: OidcConfig): string {
  return JSON.stringify(config, null, 2)
}

/** Parse the editor text into an OIDC config object, returning a helpful error. */
function parseEditor(text: string): { config?: OidcConfig; error?: string } {
  if (text.trim() === '') {
    return { error: 'The configuration is empty' }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (err) {
    return {
      error: err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid JSON',
    }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { error: 'The configuration must be a JSON object' }
  }
  return { config: parsed as OidcConfig }
}

export default function OidcPage() {
  const {
    config,
    isLoading,
    error,
    isMutating,
    fetchConfig,
    fetchTemplate,
    saveConfig,
    deleteConfig,
  } = useOidcConfig()

  const [draft, setDraft] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [loadingTemplate, setLoadingTemplate] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // Hydrate the editor whenever the stored config changes (initial load / save).
  useEffect(() => {
    setDraft(config ? formatJson(config) : '')
    setJsonError(null)
  }, [config])

  const hasExistingConfig = config !== null

  const handleFormat = () => {
    const { config: parsed, error: parseErr } = parseEditor(draft)
    if (!parsed) {
      setJsonError(parseErr ?? 'Invalid JSON')
      return
    }
    setDraft(formatJson(parsed))
    setJsonError(null)
  }

  const handleLoadTemplate = async () => {
    setLoadingTemplate(true)
    try {
      const template = await fetchTemplate()
      setDraft(formatJson(template))
      setJsonError(null)
      toast.success('Loaded the example configuration')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load template')
    } finally {
      setLoadingTemplate(false)
    }
  }

  const handleSave = async () => {
    const { config: parsed, error: parseErr } = parseEditor(draft)
    if (!parsed) {
      setJsonError(parseErr ?? 'Invalid JSON')
      toast.error(parseErr ?? 'Invalid JSON')
      return
    }
    setJsonError(null)
    try {
      await saveConfig(parsed)
      toast.success('OIDC configuration saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteConfig()
      setDraft('')
      setJsonError(null)
      toast.success('OIDC configuration removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete configuration')
    }
  }

  const handleReset = () => {
    setDraft(config ? formatJson(config) : '')
    setJsonError(null)
  }

  const isDirty = draft !== (config ? formatJson(config) : '')

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-4 sm:p-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 sm:gap-3">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              OIDC Providers
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Configure which external OIDC providers are accepted when
              authenticating User API requests for this tenant.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-3xl">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2">
                  <FileJson className="h-4 w-4 text-primary" />
                  Configuration
                </CardTitle>
                <CardDescription className="mt-1">
                  Provide the OIDC rules as a JSON block. Use the template as a
                  starting point, then customize the providers, issuers and
                  audiences for your tenant.
                </CardDescription>
              </div>
              <Badge variant={hasExistingConfig ? 'default' : 'secondary'} className="shrink-0">
                {hasExistingConfig ? 'Configured' : 'Not configured'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading && !config ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadTemplate}
                    disabled={loadingTemplate || isMutating}
                    className="gap-2"
                  >
                    {loadingTemplate ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Load template
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFormat}
                    disabled={isMutating || draft.trim() === ''}
                    className="gap-2"
                  >
                    <FileJson className="h-4 w-4" />
                    Format
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    disabled={isMutating || !isDirty}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>

                <Textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    if (jsonError) setJsonError(null)
                  }}
                  spellCheck={false}
                  placeholder='{\n  "allowedProviders": ["google"],\n  "providers": { }\n}'
                  className={cn(
                    'min-h-[420px] font-mono text-xs leading-relaxed resize-y',
                    jsonError && 'border-destructive focus-visible:ring-destructive'
                  )}
                />

                {jsonError ? (
                  <p className="text-xs text-destructive">{jsonError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The configuration is automatically scoped to this tenant; any
                    <code className="mx-1 rounded bg-muted px-1 py-0.5">tenantId</code>
                    field is managed for you and ignored on save.
                  </p>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="gap-2 border-t">
            <Button
              onClick={handleSave}
              disabled={isMutating || isLoading || draft.trim() === '' || !isDirty}
              className="gap-2"
            >
              {isMutating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save configuration
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  disabled={isMutating || !hasExistingConfig}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete OIDC configuration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the OIDC provider configuration for this tenant.
                    User API requests authenticated via these providers will no
                    longer be accepted. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
