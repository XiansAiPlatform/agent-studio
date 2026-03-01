import { useState, useEffect } from 'react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ExternalLink, Info, Eye, EyeOff, Plug, Webhook } from 'lucide-react'
import { useIntegrationTypes, IntegrationType } from '../hooks/use-integration-types'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CreateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<{ id: string; webhookUrl: string } | void>
  isSubmitting?: boolean
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

export function CreateConnectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
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

  // Reset failed icons when dialog closes
  useEffect(() => {
    if (!open) {
      setFailedIcons(new Set())
    }
  }, [open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Integration name is required'
    }

    if (!formData.platformId) {
      newErrors.platformId = 'Integration type is required'
    }

    // Validate required configuration fields
    selectedIntegration?.requiredConfigurationFields.forEach(field => {
      if (!formData.configFields[field.fieldName]?.trim()) {
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
    
    setFormData({
      name: `${integration.displayName} Connection`,
      description: integration.description,
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
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light">
              {step === 'select' ? 'Choose Integration' : 'Configure Connection'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {step === 'select' 
                ? 'Select the service you want to integrate with'
                : `Configure your ${selectedIntegration?.displayName} connection`
              }
            </DialogDescription>
          </DialogHeader>

        {loadingTypes ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : typesError ? (
          <div className="text-center py-16 px-6">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Info className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Backend API Required</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Unable to connect to the integration metadata service. Please ensure the backend API endpoint is running:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left">
                <code className="text-xs text-slate-700">
                  GET {process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/admin/integrations/metadata/types
                </code>
              </div>
              <p className="text-xs text-slate-500">
                See <code className="bg-slate-100 px-1 py-0.5 rounded">CONNECTIONS_API_REQUIREMENTS.md</code> for implementation details.
              </p>
            </div>
          </div>
        ) : step === 'select' ? (
          <div className="py-6">
            <div className="flex flex-col gap-4">
              {/* Webhooks - always show as first option */}
              {!integrationTypes.some(t => t.platformId === 'webhook') && (
                <button
                  type="button"
                  onClick={() => handleIntegrationSelect(webhookIntegration)}
                  className="group relative p-6 text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg">
                      <Webhook className="h-8 w-8 text-slate-500" />
                    </div>
                    <div className="flex-1 space-y-1 text-left">
                      <h3 className="text-base font-normal text-slate-900 group-hover:text-slate-950">Webhooks</h3>
                      <p className="text-sm text-slate-500 leading-relaxed">Built-in HTTP webhooks for triggering workflows via POST</p>
                    </div>
                  </div>
                </button>
              )}
              {integrationTypes.map((integration) => (
                <button
                  key={integration.platformId}
                  onClick={() => handleIntegrationSelect(integration)}
                  className="group relative p-6 text-left bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all duration-200 hover:border-slate-300 hover:shadow-sm"
                >
                  <div className="flex items-center gap-6">
                    {/* Icon */}
                    <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center bg-slate-100 rounded-lg">
                      {integration.platformId === 'webhook' ? (
                        <Webhook className="h-8 w-8 text-slate-500" />
                      ) : failedIcons.has(integration.platformId) ? (
                        <Plug className="h-8 w-8 text-slate-500" />
                      ) : (
                        <Image 
                          src={getIconUrl(integration.icon)} 
                          alt={integration.displayName}
                          width={64}
                          height={64}
                          className="object-contain"
                          onError={() => {
                            setFailedIcons(prev => new Set(prev).add(integration.platformId))
                          }}
                        />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-1 text-left">
                      <h3 className="text-base font-normal text-slate-900 group-hover:text-slate-950">
                        {integration.displayName}
                      </h3>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        {integration.description}
                      </p>
                    </div>

                    {/* Documentation link */}
                    {integration.documentationUrl && (
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(integration.documentationUrl!, '_blank')
                          }}
                          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <ScrollArea className="max-h-[55vh] pr-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
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
                  </div>

                  <div>
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

                {/* Configuration Fields */}
                {selectedIntegration && selectedIntegration.requiredConfigurationFields.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Configuration</h4>
                    </div>
                    
                    {selectedIntegration.requiredConfigurationFields.map((field) => (
                      <div key={field.fieldName}>
                        <Label htmlFor={field.fieldName}>
                          {field.displayName} *
                        </Label>
                        <div className="relative">
                          <Input
                            id={field.fieldName}
                            type={field.isSecret && !showSecrets[field.fieldName] ? 'password' : 'text'}
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {field.description}
                        </p>
                        {errors[field.fieldName] && (
                          <p className="text-sm text-destructive mt-1">{errors[field.fieldName]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Documentation Link */}
                {selectedIntegration?.documentationUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      Need help configuring this integration?{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-blue-900 font-semibold"
                        onClick={() => window.open(selectedIntegration.documentationUrl!, '_blank')}
                      >
                        View documentation <ExternalLink className="h-3 w-3 ml-1 inline" />
                      </Button>
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('select')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
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