import { useState } from 'react'
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ExternalLink, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { 
  OIDC_PROVIDERS, 
  getProvidersByCategory, 
  PROVIDER_CATEGORIES,
  OIDCProviderConfig 
} from '@/config/oidc-providers'
import { CreateConnectionRequest } from '../types'

interface CreateConnectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateConnectionRequest) => void
  isSubmitting?: boolean
}

interface FormData {
  name: string
  providerId: string
  description: string
  clientId: string
  clientSecret: string
  customScopes: string
  wellKnownUrl: string
}

export function CreateConnectionDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false
}: CreateConnectionDialogProps) {
  const [step, setStep] = useState<'provider' | 'config'>('provider')
  const [selectedProvider, setSelectedProvider] = useState<OIDCProviderConfig | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    providerId: '',
    description: '',
    clientId: '',
    clientSecret: '',
    customScopes: '',
    wellKnownUrl: ''
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const categorizedProviders = getProvidersByCategory()

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Connection name is required'
    }

    if (!formData.providerId) {
      newErrors.providerId = 'Provider selection is required'
    }

    if (!formData.clientId.trim()) {
      newErrors.clientId = 'Client ID is required'
    }

    if (!formData.clientSecret.trim()) {
      newErrors.clientSecret = 'Client Secret is required'
    }

    // Validate custom scopes format if provided
    if (formData.customScopes.trim()) {
      const scopes = formData.customScopes.split(',').map(s => s.trim())
      if (scopes.some(scope => !scope)) {
        newErrors.customScopes = 'Invalid scope format. Use comma-separated values.'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProviderSelect = (provider: OIDCProviderConfig) => {
    setSelectedProvider(provider)
    setFormData(prev => ({
      ...prev,
      providerId: provider.id,
      name: `${provider.displayName} Connection`,
      description: provider.description,
      customScopes: provider.defaultScopes.join(', '),
      wellKnownUrl: provider.wellKnownUrl
    }))
    setStep('config')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const submitData: CreateConnectionRequest = {
      name: formData.name.trim(),
      providerId: formData.providerId,
      description: formData.description.trim() || undefined,
      clientId: formData.clientId.trim(),
      clientSecret: formData.clientSecret.trim(),
      customScopes: formData.customScopes.trim() 
        ? formData.customScopes.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      wellKnownUrl: formData.wellKnownUrl.trim() || undefined
    }

    onSubmit(submitData)
  }

  const handleClose = () => {
    if (isSubmitting) return
    
    setStep('provider')
    setSelectedProvider(null)
    setFormData({
      name: '',
      providerId: '',
      description: '',
      clientId: '',
      clientSecret: '',
      customScopes: '',
      wellKnownUrl: ''
    })
    setShowAdvanced(false)
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>
            {step === 'provider' ? 'Choose a Provider' : 'Configure Connection'}
          </DialogTitle>
          <DialogDescription>
            {step === 'provider' 
              ? 'Select the OIDC service provider you want to connect to'
              : `Configure your ${selectedProvider?.displayName} connection`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'provider' ? (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {Object.entries(categorizedProviders).map(([category, providers]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">
                      {PROVIDER_CATEGORIES[category as keyof typeof PROVIDER_CATEGORIES]?.icon}
                    </span>
                    <h3 className="font-semibold">
                      {PROVIDER_CATEGORIES[category as keyof typeof PROVIDER_CATEGORIES]?.name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {PROVIDER_CATEGORIES[category as keyof typeof PROVIDER_CATEGORIES]?.description}
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {providers.map((provider) => (
                      <Card 
                        key={provider.id}
                        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                        onClick={() => handleProviderSelect(provider)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{provider.icon}</span>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm">{provider.displayName}</CardTitle>
                              <CardDescription className="text-xs line-clamp-2">
                                {provider.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {provider.category}
                            </Badge>
                            {provider.documentation && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(provider.documentation, '_blank')
                                }}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Docs
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-4">
                {/* Basic Configuration */}
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Connection Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Company SharePoint"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description of this connection"
                      rows={2}
                    />
                  </div>
                </div>

                <Separator />

                {/* OAuth Configuration */}
                <div className="space-y-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    OAuth Configuration
                  </h4>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="clientId">Client ID *</Label>
                      <Input
                        id="clientId"
                        value={formData.clientId}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                        placeholder="OAuth Client ID"
                      />
                      {errors.clientId && (
                        <p className="text-sm text-destructive mt-1">{errors.clientId}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="clientSecret">Client Secret *</Label>
                      <Input
                        id="clientSecret"
                        type="password"
                        value={formData.clientSecret}
                        onChange={(e) => setFormData(prev => ({ ...prev, clientSecret: e.target.value }))}
                        placeholder="OAuth Client Secret"
                      />
                      {errors.clientSecret && (
                        <p className="text-sm text-destructive mt-1">{errors.clientSecret}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {selectedProvider?.documentation && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800">
                          Need help getting OAuth credentials?{' '}
                          <Button
                            type="button"
                            variant="link"
                            className="p-0 h-auto text-blue-800"
                            onClick={() => window.open(selectedProvider.documentation, '_blank')}
                          >
                            Check the documentation <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </p>
                      </div>
                    )}
                    
                    <div className="bg-amber-50 border border-amber-200 rounded p-3">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-1">OAuth Authorization Required</p>
                          <p>
                            After clicking "Connect via {selectedProvider?.displayName}", you'll be redirected 
                            to {selectedProvider?.displayName} to authorize access to your account. 
                            You'll be redirected back here once authorization is complete.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Configuration */}
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="p-0 h-auto text-sm"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? (
                      <ChevronDown className="h-4 w-4 mr-1" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-1" />
                    )}
                    Advanced Configuration
                  </Button>

                  {showAdvanced && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-muted">
                      <div>
                        <Label htmlFor="customScopes">Custom Scopes</Label>
                        <Input
                          id="customScopes"
                          value={formData.customScopes}
                          onChange={(e) => setFormData(prev => ({ ...prev, customScopes: e.target.value }))}
                          placeholder="scope1, scope2, scope3"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Comma-separated list of OAuth scopes. Leave empty to use defaults.
                        </p>
                        {errors.customScopes && (
                          <p className="text-sm text-destructive mt-1">{errors.customScopes}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="wellKnownUrl">Well-Known URL</Label>
                        <Input
                          id="wellKnownUrl"
                          value={formData.wellKnownUrl}
                          onChange={(e) => setFormData(prev => ({ ...prev, wellKnownUrl: e.target.value }))}
                          placeholder="https://..."
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Override the default OIDC well-known endpoint URL.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('provider')}
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
                      Redirecting to {selectedProvider?.displayName}...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect via {selectedProvider?.displayName}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}