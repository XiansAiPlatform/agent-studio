import { useEffect, useState } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Copy, CheckCircle, XCircle, Bot, Workflow, Link2, Settings, Key, MapPin, Trash2, AlertTriangle } from 'lucide-react'
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
  onDeleted?: () => void
}

export function IntegrationDetailsSheet({ 
  open, 
  onOpenChange, 
  integrationId,
  onDeleted
}: IntegrationDetailsSheetProps) {
  const { currentTenantId } = useTenant()
  const [integration, setIntegration] = useState<IntegrationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (open && integrationId && currentTenantId) {
      fetchIntegrationDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, integrationId, currentTenantId])

  const fetchIntegrationDetails = async () => {
    if (!integrationId || !currentTenantId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/integrations/${integrationId}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch integration details')
      }

      const data = await response.json()
      setIntegration(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integration')
      showErrorToast(err as Error)
    } finally {
      setIsLoading(false)
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
        `/api/tenants/${currentTenantId}/integrations/${integrationId}/webhook-url`
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

  const handleDelete = async () => {
    if (!integrationId || !currentTenantId) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/tenants/${currentTenantId}/integrations/${integrationId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to delete integration')
      }

      showSuccessToast('Integration deleted successfully')
      setShowDeleteDialog(false)
      onOpenChange(false)
      onDeleted?.()
    } catch (err) {
      showErrorToast(err as Error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-4">
          {isLoading ? (
            <>
              <SheetTitle>Loading...</SheetTitle>
              <SheetDescription>Fetching integration details</SheetDescription>
            </>
          ) : error ? (
            <>
              <SheetTitle>Error</SheetTitle>
              <SheetDescription>{error}</SheetDescription>
            </>
          ) : integration ? (
            <>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <SheetTitle className="text-2xl">{integration.name}</SheetTitle>
                  <SheetDescription className="mt-2">
                    {integration.description}
                  </SheetDescription>
                </div>
                <Badge variant={integration.isEnabled ? "default" : "secondary"}>
                  {integration.isEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {integration.platformId}
                </Badge>
              </div>
            </>
          ) : (
            <>
              <SheetTitle>Integration Details</SheetTitle>
              <SheetDescription>No integration data available</SheetDescription>
            </>
          )}
        </SheetHeader>

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
          <div className="p-6 pt-8 space-y-6">
              {/* Webhook URL */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Full Webhook URL
                </h3>
                <div className="pl-6">
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
                  <div className="pl-6 space-y-2">
                    {Object.entries(integration.configuration).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <div className="col-span-2 flex items-center justify-between gap-2">
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
                <div className="pl-6 space-y-2">
                  {Object.entries(integration.mappingConfig)
                    .filter(([_, value]) => value !== null)
                    .map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2 text-sm">
                        <span className="text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                        </span>
                        <span className="col-span-2 font-medium">{String(value)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-semibold">Metadata</h3>
                <div className="pl-6 space-y-2 text-sm">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="col-span-2">{formatDate(integration.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Created By:</span>
                    <span className="col-span-2">{integration.createdBy}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="col-span-2">{formatDate(integration.updatedAt)}</span>
                  </div>
                  {integration.updatedBy && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Updated By:</span>
                      <span className="col-span-2">{integration.updatedBy}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Integration ID:</span>
                    <div className="col-span-2 flex items-center justify-between gap-2">
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
                <div className="pl-6">
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Integration
                  </Button>
                </div>
              </div>
            </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete Integration
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-4">
                  <div>
                    Are you sure you want to delete{' '}
                    <span className="font-semibold">"{integration?.name}"</span>?
                  </div>

                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg space-y-2">
                    <div className="text-sm font-semibold text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warning: This action cannot be undone
                    </div>
                    <ul className="text-sm text-destructive/90 space-y-1 list-disc list-inside">
                      <li>The external platform will no longer be able to communicate with the agent</li>
                      <li>All webhook configurations will be permanently removed</li>
                      <li>Integration history and logs will be deleted</li>
                    </ul>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                    <div className="text-sm text-amber-900 font-medium mb-2">
                      📋 Before deleting, please clean up external resources:
                    </div>
                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                      <li>Remove webhook URLs from the external platform ({integration?.platformId})</li>
                      <li>Revoke any API tokens or credentials configured externally</li>
                      <li>Disable the app/bot integration in the external platform</li>
                      <li>Delete or uninstall the app from your workspace if applicable</li>
                    </ul>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Integration
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  )
}
