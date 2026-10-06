import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Loader2, ExternalLink, Info, Eye, EyeOff, Plug, Webhook } from 'lucide-react'
import { useIntegrationTypes, IntegrationType } from '../hooks/use-integration-types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'
import { oauthMcpConnectionKey } from '@/lib/mcp/connection-key'

interface CreateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<{ id: string; webhookUrl: string } | void>
  isSubmitting?: boolean
  existingConnectionKeys?: string[]
  onSlackSelected?: () => void
  onTeamsSelected?: () => void
  onWebhooksSelected?: () => void
}

interface FormData {
  name: string
  description: string
  platformId: string
  configFields: Record<string, string>
}

const webhookIntegration: IntegrationType = {
  platformId: 'webhook',
  displayName: 'Webhooks',
  description: 'Built-in HTTP webhooks for triggering workflows via POST',
  icon: 'webhook',
  requiredConfigurationFields: [],
  capabilities: ['webhook'],
  webhookEndpoint: '',
  documentationUrl: null
}

const oauthMcpIntegration: IntegrationType = {
  platformId: 'oauth-mcp',
  displayName: 'OAuth MCP',
  description: 'Connect an agent activation to an OAuth-protected MCP server.',
  icon: 'oauth-mcp',
  requiredConfigurationFields: [
    {
      fieldName: 'mcpUrl',
      displayName: 'MCP Server URL',
      description: 'https://mcp.example.com',
      isSecret: false,
    },
    {
      fieldName: 'clientId',
      displayName: 'Client ID',
      description: '',
      isSecret: false,
    },
    {
      fieldName: 'clientSecret',
      displayName: 'Client Secret',
      description: '',
      isSecret: true,
    },
  ],
  capabilities: ['mcp', 'oauth'],
  webhookEndpoint: '',
  documentationUrl: null,
}

export function CreateConnectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  existingConnectionKeys = [],
  onSlackSelected,
  onTeamsSelected,
  onWebhooksSelected
}: CreateConnectionDialogProps) {
  const { integrationTypes, isLoading: loadingTypes, error: typesError } = useIntegrationTypes()
  const [step, setStep] = useState<'select' | 'configure'>('select')
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationType | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    platformId: '',
    configFields: {}
  })
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [failedIcons, setFailedIcons] = useState<Set<string>>(new Set())
  const [callbackUrl, setCallbackUrl] = useState('')
  const [callbackUrlError, setCallbackUrlError] = useState('')
  const connectionKey = useMemo(() => {
    if (selectedIntegration?.platformId !== 'oauth-mcp' || !formData.name.trim()) return ''
    return oauthMcpConnectionKey(formData.name)
  }, [formData.name, selectedIntegration?.platformId])
  const connectionKeyExists = connectionKey !== '' && existingConnectionKeys.includes(connectionKey)

  // Reset failed icons when dialog closes
  useEffect(() => {
    if (!open) {
      setFailedIcons(new Set())
    }
  }, [open])

  useEffect(() => {
    if (selectedIntegration?.platformId !== 'oauth-mcp') return

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
  }, [selectedIntegration?.platformId])

  const copyCallbackUrl = async () => {
    try {
      await navigator.clipboard.writeText(callbackUrl)
      showSuccessToast('OAuth callback URL copied')
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error('Failed to copy callback URL'))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Integration name is required'
    } else if (connectionKeyExists) {
      newErrors.name = 'This connection name is already in use for this activation'
    }

    if (!formData.platformId) {
      newErrors.platformId = 'Integration type is required'
    }

    // Validate required configuration fields
    selectedIntegration?.requiredConfigurationFields.forEach(field => {
      if (field.isRequired !== false && !formData.configFields[field.fieldName]?.trim()) {
        newErrors[field.fieldName] = `${field.displayName} is required`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleIntegrationSelect = (integration: IntegrationType) => {
    // For Slack, close dialog and notify parent to open wizard sheet
    if (integration.platformId === 'slack') {
      onOpenChange(false) // Close the dialog
      onSlackSelected?.() // Notify parent to open Slack wizard
      return
    }
    
    // For Teams, close dialog and notify parent to open wizard sheet
    if (integration.platformId === 'msteams' || integration.platformId === 'teams') {
      onOpenChange(false) // Close the dialog
      onTeamsSelected?.() // Notify parent to open Teams wizard
      return
    }

    // For Webhooks, close dialog and notify parent to open webhooks sheet
    if (integration.platformId === 'webhook') {
      onOpenChange(false) // Close the dialog
      onWebhooksSelected?.() // Notify parent to open Webhooks sheet
      return
    }
    
    // For other integrations, continue with normal flow
    setSelectedIntegration(integration)
    const initialConfigFields: Record<string, string> = {}
    integration.requiredConfigurationFields.forEach(field => {
      initialConfigFields[field.fieldName] = ''
    })
    let name = `${integration.displayName} Connection`
    let description = integration.description
    if (integration.platformId === 'oauth-mcp') {
      name = ''
      description = ''
    }
    
    setFormData({
      name,
      description,
      platformId: integration.platformId,
      configFields: initialConfigFields
    })
    
    setStep('configure')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        platformId: formData.platformId,
        configuration: formData.configFields
      }

      await onSubmit(submitData)
      
      // Reset form and close dialog on success
      handleClose()
    } catch (error) {
      // Error is handled by parent component's showErrorToast
      console.error('Error creating integration:', error)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    
    setStep('select')
    setSelectedIntegration(null)
    setFormData({
      name: '',
      description: '',
      platformId: '',
      configFields: {}
    })
    setShowSecrets({})
    setErrors({})
    onOpenChange(false)
  }

  const getIconUrl = (icon: string): string => {
    const iconMap: Record<string, string> = {
      'slack': '/slack.png',
      'teams': '/microsoft_teams.png',
      'msteams': '/microsoft_teams.png',
      'outlook': '/outlook.png',
      'webhook': '/webhook.png'
    }
    // Return mapped icon or a non-existent path to trigger fallback
    return iconMap[icon?.toLowerCase()] || '/_non_existent_icon.png'
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-5xl max-h-[calc(100dvh-2rem)] sm:max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b shrink-0 pr-12">
            <DialogTitle className="text-xl sm:text-2xl font-light">
              {step === 'select' ? 'Choose Integration' : 'Configure Connection'}
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {step === 'select'
                ? 'Select the service you want to integrate with'
                : `Configure your ${selectedIntegration?.displayName} connection`
              }
            </DialogDescription>
          </DialogHeader>

          {loadingTypes ? (
            <div className="flex items-center justify-center py-12 flex-1 min-h-0">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : typesError ? (
            <div className="text-center py-12 sm:py-16 px-4 sm:px-6 overflow-y-auto flex-1 min-h-0">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Info className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Backend API Required</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Unable to connect to the integration metadata service. Please ensure the backend API endpoint is running:
                </p>
                <div className="bg-muted border border-border rounded-lg p-3 text-left">
                  <code className="text-xs text-foreground break-all">
                    GET {process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/integrations/metadata/types
                  </code>
                </div>
                <p className="text-xs text-muted-foreground">
                  See <code className="bg-muted px-1 py-0.5 rounded">CONNECTIONS_API_REQUIREMENTS.md</code> for implementation details.
                </p>
              </div>
            </div>
          ) : step === 'select' ? (
            <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1 min-h-0">
              <div className="flex flex-col gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => handleIntegrationSelect(oauthMcpIntegration)}
                  className="group relative p-3 sm:p-6 text-left bg-card hover:bg-muted border border-border rounded-lg transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="flex items-center gap-3 sm:gap-6">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center bg-muted rounded-lg">
                      <Plug className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1 text-left">
                      <h3 className="text-sm sm:text-base font-normal text-foreground">OAuth MCP</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">Connect an agent activation to an OAuth-protected MCP server.</p>
                    </div>
                  </div>
                </button>
                {/* Webhooks - always show as first option */}
                {!integrationTypes.some(t => t.platformId === 'webhook') && (
                  <button
                    type="button"
                    onClick={() => handleIntegrationSelect(webhookIntegration)}
                    className="group relative p-3 sm:p-6 text-left bg-card hover:bg-muted border border-border rounded-lg transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 sm:gap-6">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center bg-muted rounded-lg">
                        <Webhook className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1 text-left">
                        <h3 className="text-sm sm:text-base font-normal text-foreground">Webhooks</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">Built-in HTTP webhooks for triggering workflows via POST</p>
                      </div>
                    </div>
                  </button>
                )}
                {integrationTypes.map((integration) => (
                  <button
                    key={integration.platformId}
                    onClick={() => handleIntegrationSelect(integration)}
                    className="group relative p-3 sm:p-6 text-left bg-card hover:bg-muted border border-border rounded-lg transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 sm:gap-6">
                      {/* Icon */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 flex items-center justify-center bg-muted rounded-lg">
                        {integration.platformId === 'webhook' ? (
                          <Webhook className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                        ) : failedIcons.has(integration.platformId) ? (
                          <Plug className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                        ) : (
                          <Image
                            src={getIconUrl(integration.icon)}
                            alt={integration.displayName}
                            width={64}
                            height={64}
                            className="object-contain w-10 h-10 sm:w-16 sm:h-16"
                            onError={() => {
                              setFailedIcons(prev => new Set(prev).add(integration.platformId))
                            }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1 text-left">
                        <h3 className="text-sm sm:text-base font-normal text-foreground truncate">
                          {integration.displayName}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 sm:line-clamp-none">
                          {integration.description}
                        </p>
                      </div>

                      {/* Documentation link */}
                      {integration.documentationUrl && (
                        <div className="flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(integration.documentationUrl!, '_blank')
                            }}
                            className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
                <div className="space-y-6 pr-1 sm:pr-3">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Connection Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder={`e.g., ${selectedIntegration?.displayName} Integration`}
                      />
                      {errors.name && (
                        <p className="text-sm text-destructive mt-1">{errors.name}</p>
                      )}
                      {connectionKey && (
                        <div className={connectionKeyExists
                          ? 'rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive'
                          : 'rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground'}>
                          Connection key: <code>{connectionKey}</code>
                          <span className="ml-1">
                            {connectionKeyExists
                              ? '(already in use in this activation)'
                              : '(must be unique in this activation)'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description (optional)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe the purpose of this connection"
                        rows={2}
                      />
                    </div>
                  </div>

                  {selectedIntegration?.platformId === 'oauth-mcp' && (
                    <div className="space-y-2">
                      <Label htmlFor="oauth-callback-url">OAuth callback URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="oauth-callback-url"
                          value={callbackUrl}
                          placeholder="Loading callback URL..."
                          readOnly
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Copy OAuth callback URL"
                          aria-label="Copy OAuth callback URL"
                          disabled={!callbackUrl}
                          onClick={copyCallbackUrl}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      {callbackUrlError && (
                        <p className="text-sm text-destructive">{callbackUrlError}</p>
                      )}
                    </div>
                  )}

                  {/* Configuration Fields */}
                  {selectedIntegration && selectedIntegration.requiredConfigurationFields.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">Configuration</h4>
                      </div>

                      {selectedIntegration.requiredConfigurationFields.map((field) => (
                        <div key={field.fieldName} className="space-y-2">
                          <Label htmlFor={field.fieldName}>
                            {field.displayName}{field.isRequired === false ? ' (optional)' : ' *'}
                          </Label>
                          <div className="relative">
                            <Input
                              id={field.fieldName}
                              type={field.isSecret && !showSecrets[field.fieldName] ? 'password' : 'text'}
                              autoComplete={field.isSecret ? 'new-password' : 'off'}
                              value={formData.configFields[field.fieldName] || ''}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                configFields: {
                                  ...prev.configFields,
                                  [field.fieldName]: e.target.value
                                }
                              }))}
                              placeholder={field.description}
                              className={field.isSecret ? 'pr-10' : ''}
                            />
                            {field.isSecret && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowSecrets(prev => ({
                                  ...prev,
                                  [field.fieldName]: !prev[field.fieldName]
                                }))}
                              >
                                {showSecrets[field.fieldName] ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          {field.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {field.description}
                            </p>
                          )}
                          {errors[field.fieldName] && (
                            <p className="text-sm text-destructive mt-1">{errors[field.fieldName]}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Documentation Link */}
                  {selectedIntegration?.documentationUrl && (
                    <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        Need help configuring this integration?{' '}
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-blue-900 dark:text-blue-100 font-semibold"
                          onClick={() => window.open(selectedIntegration.documentationUrl!, '_blank')}
                        >
                          View documentation <ExternalLink className="h-3 w-3 ml-1 inline" />
                        </Button>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-6 pt-3 sm:pt-4 pb-[max(env(safe-area-inset-bottom),0.875rem)] sm:pb-[max(env(safe-area-inset-bottom),1rem)] border-t shrink-0 bg-background">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('select')}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || connectionKeyExists} className="w-full sm:w-auto">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Connection'
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
