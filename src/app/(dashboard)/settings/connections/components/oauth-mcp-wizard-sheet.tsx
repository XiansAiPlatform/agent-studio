import { useEffect, useMemo, useState } from 'react'
import { Copy, Eye, EyeOff, Info, Loader2, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { oauthMcpConnectionKey } from '@/lib/mcp/connection-key'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'

interface OAuthMcpWizardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    description?: string
    platformId: 'oauth-mcp'
    configuration: { mcpUrl: string; clientId: string; clientSecret: string }
  }) => Promise<unknown>
  isSubmitting?: boolean
  existingConnectionKeys?: string[]
}

const emptyForm = {
  name: '',
  description: '',
  mcpUrl: '',
  clientId: '',
  clientSecret: '',
}

export function OAuthMcpWizardSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  existingConnectionKeys = [],
}: OAuthMcpWizardSheetProps) {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showSecret, setShowSecret] = useState(false)
  const [callbackUrl, setCallbackUrl] = useState('')
  const [callbackUrlError, setCallbackUrlError] = useState('')
  const connectionKey = useMemo(
    () => form.name.trim() ? oauthMcpConnectionKey(form.name) : '',
    [form.name],
  )
  const connectionKeyExists = connectionKey !== '' && existingConnectionKeys.includes(connectionKey)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    fetch('/api/connections/initiate', { signal: controller.signal })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Failed to load OAuth callback URL')
        setCallbackUrl(body.callbackUrl)
        setCallbackUrlError('')
      })
      .catch(error => {
        if (error instanceof Error && error.name === 'AbortError') return
        setCallbackUrlError('OAuth callback URL is unavailable')
      })
    return () => controller.abort()
  }, [open])

  const close = () => {
    if (isSubmitting) return
    setForm(emptyForm)
    setErrors({})
    setShowSecret(false)
    setCallbackUrl('')
    setCallbackUrlError('')
    onOpenChange(false)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!form.name.trim()) nextErrors.name = 'Connection name is required'
    else if (connectionKeyExists) nextErrors.name = 'This connection name is already in use for this activation'
    if (!form.mcpUrl.trim()) nextErrors.mcpUrl = 'MCP Server URL is required'
    if (!form.clientId.trim()) nextErrors.clientId = 'Client ID is required'
    if (!form.clientSecret.trim()) nextErrors.clientSecret = 'Client Secret is required'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    await onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      platformId: 'oauth-mcp',
      configuration: {
        mcpUrl: form.mcpUrl.trim(),
        clientId: form.clientId.trim(),
        clientSecret: form.clientSecret,
      },
    })
  }

  const copyCallbackUrl = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl)
      showSuccessToast('OAuth callback URL copied')
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error('Failed to copy callback URL'))
    }
  }

  const field = (name: keyof typeof emptyForm, value: string) => {
    setForm(current => ({ ...current, [name]: value }))
    if (errors[name]) setErrors(current => ({ ...current, [name]: '' }))
  }

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 overflow-x-hidden">
        <SheetHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4">
          <SheetTitle className="flex items-center gap-2 text-lg sm:text-2xl font-light">
            <Plug className="h-5 w-5" />
            Configure OAuth MCP
          </SheetTitle>
          <SheetDescription>Connect this agent activation to an OAuth-protected MCP server.</SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="oauth-mcp-name">Connection Name *</Label>
              <Input id="oauth-mcp-name" autoComplete="off" value={form.name} onChange={event => field('name', event.target.value)} placeholder="e.g., HubSpot Production" />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              {connectionKey && (
                <div className={connectionKeyExists ? 'rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive' : 'rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground'}>
                  Connection key: <code>{connectionKey}</code> {connectionKeyExists ? '(already in use in this activation)' : '(must be unique in this activation)'}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="oauth-mcp-description">Description (optional)</Label>
              <Textarea id="oauth-mcp-description" value={form.description} onChange={event => field('description', event.target.value)} placeholder="Describe the purpose of this connection" rows={2} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oauth-mcp-callback">OAuth callback URL</Label>
              <div className="flex gap-2">
                <Input id="oauth-mcp-callback" value={callbackUrl} placeholder="Loading callback URL..." readOnly />
                <Button type="button" variant="outline" size="icon" title="Copy OAuth callback URL" aria-label="Copy OAuth callback URL" disabled={!callbackUrl} onClick={copyCallbackUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {callbackUrlError && <p className="text-sm text-destructive">{callbackUrlError}</p>}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /><h4 className="font-medium">Configuration</h4></div>
              <div className="space-y-2">
                <Label htmlFor="oauth-mcp-url">MCP Server URL *</Label>
                <Input id="oauth-mcp-url" autoComplete="off" value={form.mcpUrl} onChange={event => field('mcpUrl', event.target.value)} placeholder="https://mcp.example.com" />
                <p className="text-xs text-muted-foreground">https://mcp.example.com</p>
                {errors.mcpUrl && <p className="text-sm text-destructive">{errors.mcpUrl}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="oauth-mcp-client-id">Client ID *</Label>
                <Input id="oauth-mcp-client-id" autoComplete="off" value={form.clientId} onChange={event => field('clientId', event.target.value)} />
                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="oauth-mcp-client-secret">Client Secret *</Label>
                <div className="relative">
                  <Input id="oauth-mcp-client-secret" type={showSecret ? 'text' : 'password'} autoComplete="new-password" value={form.clientSecret} onChange={event => field('clientSecret', event.target.value)} className="pr-10" />
                  <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3" aria-label={showSecret ? 'Hide client secret' : 'Show client secret'} onClick={() => setShowSecret(value => !value)}>
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.clientSecret && <p className="text-sm text-destructive">{errors.clientSecret}</p>}
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-6 py-4 border-t shrink-0 bg-background">
            <Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || connectionKeyExists}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSubmitting ? 'Creating...' : 'Create Connection'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
