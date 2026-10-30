import { useLayoutEffect, useRef, useState } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Copy, XCircle, Link2, Settings, MapPin, Trash2 } from 'lucide-react'
import { showSuccessToast, showErrorToast } from '@/lib/utils/error-handler'
import { useTenant } from '@/hooks/use-tenant'

interface IntegrationDetails {
  id: string
  tenantId: string
  platformId: string
  name: string
  description: string
  agentName: string
  activationName: string
  workflowId: string
  webhookUrl: string
  configuration: Record<string, any>
  secrets: {
    webhookSecret?: string | null
    slackSigningSecret?: string | null
    slackBotToken?: string | null
    slackIncomingWebhookUrl?: string | null
    teamsAppPassword?: string | null
    outlookClientSecret?: string | null
    genericWebhookSecret?: string | null
    customSecrets?: Record<string, any>
  }
  mappingConfig: {
    participantIdSource?: string
    participantIdCustomField?: string | null
    scopeSource?: string | null
    scopeCustomField?: string | null
    defaultParticipantId?: string | null
    defaultScope?: string | null
  }
  isEnabled: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy: string
}

interface IntegrationDetailsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  integrationId: string | null
  // The page owns the shared delete confirmation dialog.
  onDeleteRequest?: (integrationId: string) => void
}

export function IntegrationDetailsSheet({ 
  open, 
  onOpenChange, 
  integrationId,
  onDeleteRequest
}: IntegrationDetailsSheetProps) {
  const { currentTenantId } = useTenant()
  const [integration, setIntegration] = useState<IntegrationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const latestRequest = useRef(0)

  // The page reuses this sheet for every card. A layout effect shows the loading
  // state before paint, so the previous card's details never flash on open.
  useLayoutEffect(() => {
    if (open && integrationId && currentTenantId) {
      fetchIntegrationDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, integrationId, currentTenantId])

  const fetchIntegrationDetails = async () => {
    if (!integrationId || !currentTenantId) return

    // A slow response for an earlier card must not overwrite the current one
    const requestId = ++latestRequest.current
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/integrations/${integrationId}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch integration details')
      }

      const data = await response.json()
      if (requestId !== latestRequest.current) return
      setIntegration(data)
    } catch (err) {
      if (requestId !== latestRequest.current) return
      setError(err instanceof Error ? err.message : 'Failed to load integration')
      showErrorToast(err as Error)
    } finally {
      if (requestId === latestRequest.current) setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    showSuccessToast(`${label} copied to clipboard`)
  }

  const copyWebhookUrl = async () => {
    if (!integrationId || !currentTenantId) return
    try {
      const res = await fetch(
        `/api/integrations/${integrationId}/webhook-url`
      )
      if (!res.ok) throw new Error('Failed to fetch webhook URL')
      const { webhookUrl } = await res.json()
      if (webhookUrl) {
        navigator.clipboard.writeText(webhookUrl)
        showSuccessToast('Webhook URL copied to clipboard')
      }
    } catch (err) {
      showErrorToast(err as Error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Scroll the body, not SheetContent, so the absolute expand/close buttons stay pinned.
          overflow-hidden keeps long unbroken header text from spilling past the sheet edge. */}
      <SheetContent
        className="w-full sm:max-w-2xl overflow-hidden"
        headerActions={integration && !isLoading && !error ? (
          <Badge variant={integration.isEnabled ? "default" : "secondary"} className="h-6">
            {integration.isEnabled ? 'Enabled' : 'Disabled'}
          </Badge>
        ) : null}
      >
        {/* pr reserves room for the Enabled badge + expand/close cluster;
            min-w-0 on SheetHeader's inner wrappers lets long names truncate instead of overflowing */}
        <SheetHeader className="space-y-3 sm:space-y-4 pl-4 sm:pl-6 pr-36 sm:pr-40 pt-5 sm:pt-6 pb-3 sm:pb-4 [&>div]:min-w-0 [&>div>div]:min-w-0">
          {isLoading ? (
            <>
              <SheetTitle className="text-base sm:text-lg">Loading...</SheetTitle>
              <SheetDescription className="text-xs sm:text-sm">Fetching integration details</SheetDescription>
            </>
          ) : error ? (
            <>
              <SheetTitle className="text-base sm:text-lg">Error</SheetTitle>
              <SheetDescription className="text-xs sm:text-sm">{error}</SheetDescription>
            </>
          ) : integration ? (
            <>
              <div className="min-w-0">
                <SheetTitle className="text-lg sm:text-2xl truncate" title={integration.name}>{integration.name}</SheetTitle>
                <SheetDescription className="mt-1 sm:mt-2 text-xs sm:text-sm">
                  {integration.description}
                </SheetDescription>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {integration.platformId}
                </Badge>
              </div>
            </>
          ) : (
            <>
              <SheetTitle className="text-base sm:text-lg">Integration Details</SheetTitle>
              <SheetDescription className="text-xs sm:text-sm">No integration data available</SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <XCircle className="h-12 w-12 text-red-500" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={fetchIntegrationDetails} variant="outline">
              Retry
            </Button>
          </div>
        ) : integration && (
          <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
              {/* Webhook URL */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Full Webhook URL
                </h3>
                <div className="pl-0 sm:pl-6">
                  <div className="flex items-center justify-between gap-2 text-sm bg-muted p-3 rounded-md">
                    <code className="text-xs break-all">{integration.webhookUrl}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyWebhookUrl}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Configuration */}
              {Object.keys(integration.configuration).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuration
                  </h3>
                  <div className="pl-0 sm:pl-6 space-y-2">
                    {Object.entries(integration.configuration).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <div className="sm:col-span-2 flex items-center justify-between gap-2">
                          <code className="text-xs break-all">{String(value)}</code>
                          {value && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(String(value), key)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapping Config */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Mapping Configuration
                </h3>
                <div className="pl-0 sm:pl-6 space-y-2">
                  {Object.entries(integration.mappingConfig)
                    .filter(([_, value]) => value !== null)
                    .map(([key, value]) => (
                      <div key={key} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2 text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="sm:col-span-2 font-medium break-words">{String(value)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-semibold">Metadata</h3>
                <div className="pl-0 sm:pl-6 space-y-2 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="sm:col-span-2">{formatDate(integration.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Created By:</span>
                    <span className="sm:col-span-2 break-words">{integration.createdBy}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="sm:col-span-2">{formatDate(integration.updatedAt)}</span>
                  </div>
                  {integration.updatedBy && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                      <span className="text-muted-foreground">Updated By:</span>
                      <span className="sm:col-span-2 break-words">{integration.updatedBy}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-2">
                    <span className="text-muted-foreground">Integration ID:</span>
                    <div className="sm:col-span-2 flex items-center justify-between gap-2">
                      <code className="text-xs break-all">{integration.id}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(integration.id, 'Integration ID')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="space-y-3 pt-6 border-t border-destructive/20">
                <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
                <Button
                  variant="destructive"
                  onClick={() => onDeleteRequest?.(integration.id)}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Integration
                </Button>
              </div>
            </div>
        )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
