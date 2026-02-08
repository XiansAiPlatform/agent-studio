import { useState, useRef, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Info, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Circle, 
  Copy, 
  Check,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'

interface TeamsWizardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<{ id: string; webhookUrl: string } | void>
  isSubmitting?: boolean
  integrationName?: string
  integrationDescription?: string
  onComplete?: () => void
}

type WizardStep = 
  | 'create-azure-bot'
  | 'get-credentials'
  | 'api-permissions'
  | 'create-integration'
  | 'configure-messaging-endpoint'
  | 'add-teams-channel'
  | 'install-bot'
  | 'test-integration'
  | 'complete'

export function TeamsWizardSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  integrationName = 'Teams Bot',
  integrationDescription = 'Microsoft Teams integration for my agent',
  onComplete
}: TeamsWizardSheetProps) {
  const [wizardStep, setWizardStep] = useState<WizardStep>('create-azure-bot')
  const [createdWebhookUrl, setCreatedWebhookUrl] = useState<string>('')
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  // Collected credentials
  const [appId, setAppId] = useState<string>('')
  const [appPassword, setAppPassword] = useState<string>('')
  const [appTenantId, setAppTenantId] = useState<string>('')
  
  // Form data
  const [name, setName] = useState<string>(integrationName)
  const [description, setDescription] = useState<string>(integrationDescription)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const currentStepRef = useRef<HTMLButtonElement>(null)
  const stepsContainerRef = useRef<HTMLDivElement>(null)

  const wizardSteps: { id: WizardStep; title: string }[] = [
    { id: 'create-azure-bot', title: 'Create Azure Bot' },
    { id: 'get-credentials', title: 'Get Credentials' },
    { id: 'api-permissions', title: 'API Permissions' },
    { id: 'create-integration', title: 'Create Integration' },
    { id: 'configure-messaging-endpoint', title: 'Messaging Endpoint' },
    { id: 'add-teams-channel', title: 'Add Teams Channel' },
    { id: 'install-bot', title: 'Install Bot' },
    { id: 'test-integration', title: 'Test' },
    { id: 'complete', title: 'Complete' }
  ]

  const getCurrentStepIndex = () => wizardSteps.findIndex(s => s.id === wizardStep)

  // Auto-scroll to current step within the breadcrumb container
  useEffect(() => {
    if (currentStepRef.current && stepsContainerRef.current) {
      const button = currentStepRef.current
      const container = stepsContainerRef.current
      
      // Calculate scroll position to center the button
      const buttonLeft = button.offsetLeft
      const buttonWidth = button.offsetWidth
      const containerWidth = container.offsetWidth
      const scrollLeft = buttonLeft - (containerWidth / 2) + (buttonWidth / 2)
      
      // Scroll the container smoothly
      container.scrollTo({
        left: scrollLeft,
        behavior: 'smooth'
      })
    }
  }, [wizardStep])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setWizardStep('create-azure-bot')
      setCreatedWebhookUrl('')
      setAppId('')
      setAppPassword('')
      setAppTenantId('')
      setName(integrationName)
      setDescription(integrationDescription)
      setErrors({})
      setCopiedStates({})
      setShowSecrets({})
    }
  }, [open, integrationName, integrationDescription])

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedStates(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Integration name is required'
    }

    if (!appId.trim()) {
      newErrors.appId = 'Microsoft App ID is required'
    }

    if (!appPassword.trim()) {
      newErrors.appPassword = 'App Password is required'
    }

    if (!appTenantId.trim()) {
      newErrors.appTenantId = 'App Tenant ID is required for single tenant bots'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      const integrationData = {
        platformId: 'msteams',
        name,
        description,
        configuration: {
          appId,
          appPassword,
          appTenantId
        },
        mappingConfig: {
          participantIdSource: 'userEmail',
          scopeSource: null,
          defaultScope: 'Microsoft Teams'
        }
      }

      const result = await onSubmit(integrationData)
      
      if (result && result.webhookUrl) {
        setCreatedWebhookUrl(result.webhookUrl)
        setWizardStep('configure-messaging-endpoint')
      }
    } catch (error) {
      console.error('Failed to create integration:', error)
    }
  }

  const renderStepContent = () => {
    switch (wizardStep) {
      case 'create-azure-bot':
        return (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You'll need an Azure account to create a bot. This wizard will guide you through the setup process.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Step 1: Create Azure Bot Resource
              </h3>
              
              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li>
                  Go to{' '}
                  <Button
                    variant="link"
                    className="h-auto p-0 text-primary"
                    onClick={() => window.open('https://portal.azure.com', '_blank')}
                  >
                    Azure Portal
                    <ExternalLink className="h-3 w-3 ml-1 inline" />
                  </Button>
                </li>
                <li>Click <strong>"Create a resource"</strong></li>
                <li>Search for <strong>"Azure Bot"</strong> and click Create</li>
                <li>
                  Fill in the details:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Bot handle:</strong> Unique name (e.g., "Sales Agent Bot")</li>
                    <li><strong>Subscription:</strong> Select your subscription</li>
                    <li><strong>Resource group:</strong> Create new or use existing</li>
                    <li><strong>Pricing tier:</strong> Free (F0) for testing</li>
                    <li><strong>Type of App:</strong> "Single Tenant" (recommended)</li>
                    <li><strong>Microsoft App ID:</strong> "Create new Microsoft App ID"</li>
                  </ul>
                </li>
                <li>Click <strong>"Create"</strong> and wait for deployment</li>
              </ol>
            </div>
          </div>
        )

      case 'get-credentials':
        return (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You need three credentials from Azure: App ID, App Password (secret), and App Tenant ID.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Get Microsoft App ID & App Tenant ID
              </h3>
              
              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li>In Azure Portal, go to your newly created Azure Bot resource</li>
                <li>Navigate to <strong>"Configuration"</strong> in the left sidebar</li>
                <li>
                  Copy these values:
                  <div className="space-y-3 mt-3">
                    <div>
                      <Label htmlFor="appId" className="text-sm font-semibold">
                        Microsoft App ID (Application/Client ID) *
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="appId"
                          value={appId}
                          onChange={(e) => setAppId(e.target.value)}
                          placeholder="e.g., 5d29f94e-55e5-4f66-8f8d-e96ed1493650"
                          className={errors.appId ? 'border-destructive' : ''}
                        />
                      </div>
                      {errors.appId && (
                        <p className="text-sm text-destructive mt-1">{errors.appId}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="appTenantId" className="text-sm font-semibold">
                        App Tenant ID (Directory/Tenant ID) *
                      </Label>
                      <div className="relative mt-1">
                        <Input
                          id="appTenantId"
                          value={appTenantId}
                          onChange={(e) => setAppTenantId(e.target.value)}
                          placeholder="e.g., d607b82b-6bff-400d-af64-8e7ab2e8a004"
                          className={errors.appTenantId ? 'border-destructive' : ''}
                        />
                      </div>
                      {errors.appTenantId && (
                        <p className="text-sm text-destructive mt-1">{errors.appTenantId}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Critical for Single Tenant bots!
                      </p>
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Create App Password (Client Secret)
              </h3>
              
              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li>Click on the <strong>Microsoft App ID (Manage Password) link</strong> to go to App Registrations</li>
                <li>Click <strong>"Certificates & secrets"</strong></li>
                <li>Click <strong>"New client secret"</strong></li>
                <li>Add description and set expiration (24 months recommended)</li>
                <li>
                  <strong>Copy the secret VALUE immediately</strong> (you can only see it once!)
                  <div className="mt-3">
                    <Label htmlFor="appPassword" className="text-sm font-semibold">
                      App Password (Client Secret) *
                    </Label>
                    <div className="relative mt-1">
                      <Input
                        id="appPassword"
                        type={showSecrets['appPassword'] ? 'text' : 'password'}
                        value={appPassword}
                        onChange={(e) => setAppPassword(e.target.value)}
                        placeholder="Paste your client secret value here"
                        className={errors.appPassword ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSecrets(prev => ({
                          ...prev,
                          appPassword: !prev['appPassword']
                        }))}
                      >
                        {showSecrets['appPassword'] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.appPassword && (
                      <p className="text-sm text-destructive mt-1">{errors.appPassword}</p>
                    )}
                  </div>
                </li>
              </ol>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <strong>Important:</strong> Set a calendar reminder to rotate the secret before it expires.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      case 'api-permissions':
        return (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Optional: Add permissions to use user emails as participant IDs. Skip if you only need user IDs.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Add Graph API Permissions (Optional)
              </h3>
              
              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li>In the App Registration, go to <strong>"API permissions"</strong></li>
                <li>Click <strong>"Add a permission"</strong></li>
                <li>Select <strong>"Microsoft Graph"</strong> → <strong>"Application permissions"</strong></li>
                <li>Search and add: <strong>User.Read.All</strong></li>
                <li>Click <strong>"Grant admin consent for [Your Organization]"</strong> ✅</li>
                <li>Wait a few minutes for permissions to propagate</li>
              </ol>

              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Benefits:</strong> With this permission, the bot can fetch user email addresses for better participant identification. Without it, the bot will use Azure AD user IDs instead.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      case 'create-integration':
        return (
          <div className="space-y-6">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Configure your integration details and create it. You'll receive a webhook URL to configure in Azure.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="mb-2">Integration Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Teams Support Bot"
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description" className="mb-2">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the purpose of this integration"
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium">Configuration Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div>
                    <h4 className="font-medium text-xs text-slate-600 mb-2">Azure Credentials</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">App ID:</span>
                        <span className="col-span-2 font-mono text-xs break-all">{appId}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">App Password:</span>
                        <span className="col-span-2 font-mono text-xs text-muted-foreground">
                          {appPassword ? '••••••••••••••••••••' : 'Not set'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">Tenant ID:</span>
                        <span className="col-span-2 font-mono text-xs break-all">{appTenantId}</span>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium text-xs text-slate-600 mb-2">Mapping Configuration</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">Participant ID:</span>
                        <span className="col-span-2">User Email</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <span className="text-muted-foreground">Scope:</span>
                        <span className="col-span-2">Microsoft Teams</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Integration...
                  </>
                ) : (
                  'Create Integration'
                )}
              </Button>
            </form>
          </div>
        )

      case 'configure-messaging-endpoint':
        return (
          <div className="space-y-6">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Integration created successfully! Now configure the messaging endpoint in Azure.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Configure Messaging Endpoint in Azure
              </h3>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Webhook URL</Label>
                <div className="flex items-center gap-2 text-sm bg-slate-100 p-3 rounded-md border">
                  <code className="text-xs break-all flex-1">{createdWebhookUrl}</code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(createdWebhookUrl, 'webhook')}
                  >
                    {copiedStates['webhook'] ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <ol className="space-y-3 text-sm list-decimal list-inside mt-4">
                <li>Go back to your Azure Bot resource in Azure Portal</li>
                <li>Navigate to <strong>"Configuration"</strong></li>
                <li>In <strong>"Messaging endpoint"</strong>, paste the webhook URL above</li>
                <li>Click <strong>"Apply"</strong></li>
              </ol>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  The messaging endpoint must be accessible from the internet. For local testing, use ngrok.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      case 'add-teams-channel':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Add Microsoft Teams Channel
              </h3>

              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li>In your Azure Bot, navigate to <strong>"Channels"</strong></li>
                <li>Click on the <strong>"Microsoft Teams"</strong> icon</li>
                <li>Click <strong>"Apply"</strong></li>
                <li>Teams channel will be added and enabled automatically</li>
              </ol>

              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  The Teams channel connects your Azure Bot to Microsoft Teams, allowing users to interact with your bot.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      case 'install-bot':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Install Bot to Microsoft Teams
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Option A: Via App Studio / Developer Portal (Recommended)</h4>
                  <ol className="space-y-2 text-sm list-decimal list-inside ml-2">
                    <li>Open Microsoft Teams</li>
                    <li>Go to <strong>Apps</strong> → Search for <strong>"Developer Portal"</strong></li>
                    <li>Install if not already installed</li>
                    <li>Open Developer Portal and click <strong>"Apps"</strong></li>
                    <li>Click <strong>"New app"</strong></li>
                    <li>Fill in app details and use your App ID from earlier</li>
                    <li>Go to <strong>"Capabilities"</strong> → <strong>"Bot"</strong></li>
                    <li>Select <strong>"Existing bot"</strong> and enter your App ID</li>
                    <li>Select scopes: Personal, Team, Group Chat</li>
                    <li>Click <strong>"Save"</strong></li>
                    <li>Go to <strong>"Publish"</strong> → <strong>"Publish to org"</strong></li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-sm mb-2">Option B: Direct Installation Link</h4>
                  <p className="text-sm text-muted-foreground">
                    Use the Teams channel installation link provided in the Azure Portal under Channels → Teams.
                  </p>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  You may need admin approval to install the bot to your organization. Contact your Teams admin if needed.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      case 'test-integration':
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                Test Your Teams Bot
              </h3>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Send a Test Message</h4>
                  <ol className="space-y-2 text-sm list-decimal list-inside ml-2">
                    <li>Open Microsoft Teams</li>
                    <li>Go to <strong>Chat</strong> and find your bot</li>
                    <li>Send a message like: <code className="bg-slate-100 px-2 py-1 rounded">Hello!</code></li>
                    <li>Wait for the agent's response</li>
                  </ol>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium text-sm mb-2">Test in a Team Channel</h4>
                  <ol className="space-y-2 text-sm list-decimal list-inside ml-2">
                    <li>Add the bot to a team channel</li>
                    <li>Mention the bot: <code className="bg-slate-100 px-2 py-1 rounded">@YourBot help me</code></li>
                    <li>The bot should respond to your message</li>
                  </ol>
                </div>
              </div>

              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  If you receive a response, your integration is working correctly!
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Setup Complete!</h3>
              <p className="text-center text-muted-foreground max-w-md">
                Your Microsoft Teams integration is now configured and ready to use. Users can now interact with your agent through Teams.
              </p>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-sm">What's Next?</h4>
              <ul className="space-y-2 text-sm list-disc list-inside text-muted-foreground">
                <li>Test the bot in different conversation types (personal, channel)</li>
                <li>Monitor message history in Agent Studio</li>
                <li>Set calendar reminders to rotate your app password before it expires</li>
                <li>Review Azure Bot analytics for usage insights</li>
              </ul>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You can view and manage this integration in the Connections settings page.
              </AlertDescription>
            </Alert>

            <Button 
              className="w-full" 
              onClick={() => {
                onOpenChange(false)
                onComplete?.()
              }}
            >
              Done
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto overflow-x-hidden">
        <SheetHeader>
          <SheetTitle className="text-2xl font-light">
            Microsoft Teams Integration Setup
          </SheetTitle>
          <SheetDescription>
            Follow these steps to connect Microsoft Teams to your XiansAI agent
          </SheetDescription>
        </SheetHeader>

        {/* Progress indicator */}
        <div className="px-6 pt-6">
          <div 
            ref={stepsContainerRef}
            className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide"
          >
            {wizardSteps.map((step, index) => {
              const currentIndex = getCurrentStepIndex()
              const isActive = step.id === wizardStep
              const isCompleted = index < currentIndex
              
              return (
                <Button
                  key={step.id}
                  ref={isActive ? currentStepRef : null}
                  variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    if (index <= currentIndex) {
                      setWizardStep(step.id)
                    }
                  }}
                  disabled={index > currentIndex}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <Circle className="h-3 w-3 mr-1" />
                  )}
                  {step.title}
                </Button>
              )
            })}
          </div>
        </div>

        <div className="px-6 pb-6">
          {renderStepContent()}
        </div>

        {/* Navigation buttons */}
        {wizardStep !== 'complete' && wizardStep !== 'create-integration' && (
          <div className="flex items-center justify-between px-6 py-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentIndex = getCurrentStepIndex()
                if (currentIndex > 0) {
                  setWizardStep(wizardSteps[currentIndex - 1].id)
                }
              }}
              disabled={getCurrentStepIndex() === 0}
            >
              Previous
            </Button>
            <Button
              type="button"
              onClick={() => {
                const currentIndex = getCurrentStepIndex()
                if (currentIndex < wizardSteps.length - 1) {
                  setWizardStep(wizardSteps[currentIndex + 1].id)
                }
              }}
            >
              {getCurrentStepIndex() === wizardSteps.length - 1 ? 'Finish' : 'Next'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
