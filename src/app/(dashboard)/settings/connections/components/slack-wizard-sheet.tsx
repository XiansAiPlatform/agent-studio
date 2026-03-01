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
  Check 
} from 'lucide-react'

interface SlackWizardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: any) => Promise<{ id: string; webhookUrl: string } | void>
  isSubmitting?: boolean
  integrationName?: string
  integrationDescription?: string
  onComplete?: () => void
}

type WizardStep = 
  | 'create-app'
  | 'oauth-scopes'
  | 'install-app'
  | 'signing-secret'
  | 'webhook-config'
  | 'configure-connection'
  | 'event-subscriptions'
  | 'enable-dm'
  | 'complete'

export function SlackWizardSheet({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  integrationName = 'Slack Connection',
  integrationDescription = 'Slack integration for my agent',
  onComplete
}: SlackWizardSheetProps) {
  const [wizardStep, setWizardStep] = useState<WizardStep>('create-app')
  const [createdWebhookUrl, setCreatedWebhookUrl] = useState<string>('')
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({})
  const [outgoingOption, setOutgoingOption] = useState<'botToken' | 'webhook' | 'both'>('botToken')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  
  // Collected credentials
  const [botToken, setBotToken] = useState<string>('')
  const [signingSecret, setSigningSecret] = useState<string>('')
  const [incomingWebhookUrl, setIncomingWebhookUrl] = useState<string>('')
  
  // Form data
  const [name, setName] = useState<string>(integrationName)
  const [description, setDescription] = useState<string>(integrationDescription)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const currentStepRef = useRef<HTMLButtonElement>(null)
  const stepsContainerRef = useRef<HTMLDivElement>(null)

  const wizardSteps: { id: WizardStep; title: string }[] = [
    { id: 'create-app', title: 'Create App' },
    { id: 'oauth-scopes', title: 'OAuth Scopes' },
    { id: 'install-app', title: 'Install App' },
    { id: 'signing-secret', title: 'Signing Secret' },
    { id: 'webhook-config', title: 'Webhook Config' },
    { id: 'configure-connection', title: 'Create Integration' },
    { id: 'event-subscriptions', title: 'Event Subscriptions' },
    { id: 'enable-dm', title: 'Enable DM' },
    { id: 'complete', title: 'Complete' }
  ]

  const getCurrentStepIndex = () => wizardSteps.findIndex(s => s.id === wizardStep)

  // Auto-scroll to current step
  useEffect(() => {
    if (currentStepRef.current && stepsContainerRef.current) {
      currentStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      })
    }
  }, [wizardStep])

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

    if (!signingSecret.trim()) {
      newErrors.signingSecret = 'Signing secret is required'
    }

    if ((outgoingOption === 'botToken' || outgoingOption === 'both') && !botToken.trim()) {
      newErrors.botToken = 'Bot token is required'
    }

    if ((outgoingOption === 'webhook' || outgoingOption === 'both') && !incomingWebhookUrl.trim()) {
      newErrors.incomingWebhookUrl = 'Webhook URL is required'
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
      // Build configuration object
      const configuration: any = {
        signingSecret: signingSecret
      }
      
      if (outgoingOption === 'botToken' || outgoingOption === 'both') {
        configuration.botToken = botToken
      }
      
      if ((outgoingOption === 'webhook' || outgoingOption === 'both') && incomingWebhookUrl) {
        configuration.incomingWebhookUrl = incomingWebhookUrl
      }

      const submitData = {
        platformId: 'slack',
        name: name.trim(),
        description: description.trim() || undefined,
        configuration
      }

      console.log('[Slack Wizard] Submitting integration data...')
      
      const result = await onSubmit(submitData)
      
      console.log('[Slack Wizard] Integration created successfully!')
      console.log('[Slack Wizard] Result:', result)
      console.log('[Slack Wizard] Webhook URL from result:', result?.webhookUrl)
      
      // Move to event-subscriptions step - sheet stays open
      if (result?.webhookUrl) {
        console.log('[Slack Wizard] Setting webhook URL and advancing to event-subscriptions step')
        console.log('[Slack Wizard] Webhook URL:', result.webhookUrl)
        
        setCreatedWebhookUrl(result.webhookUrl)
        
        // Use setTimeout to ensure state update happens after current render cycle
        setTimeout(() => {
          console.log('[Slack Wizard] Advancing wizard step to: event-subscriptions')
          setWizardStep('event-subscriptions')
        }, 100)
        
        console.log('[Slack Wizard] State updates queued')
      } else {
        console.warn('[Slack Wizard] No webhookUrl in result, still advancing')
        setCreatedWebhookUrl('Webhook URL not provided by server')
        setWizardStep('event-subscriptions')
      }
    } catch (error) {
      console.error('Error creating integration:', error)
      // Error toast is shown by parent
    }
  }

  const handleClose = () => {
    console.log('[Slack Wizard] handleClose called, isSubmitting:', isSubmitting)
    
    if (isSubmitting) {
      console.log('[Slack Wizard] Ignoring close - submission in progress')
      return
    }
    
    console.log('[Slack Wizard] Closing wizard and resetting state')
    
    // If wizard was completed, notify parent to refetch
    if (wizardStep === 'complete' && createdWebhookUrl) {
      console.log('[Slack Wizard] Wizard completed successfully, calling onComplete')
      onComplete?.()
    }
    
    // Reset state
    setWizardStep('create-app')
    setBotToken('')
    setSigningSecret('')
    setIncomingWebhookUrl('')
    setName(integrationName)
    setDescription(integrationDescription)
    setCreatedWebhookUrl('')
    setCopiedStates({})
    setOutgoingOption('botToken')
    setShowSecrets({})
    setErrors({})
    
    onOpenChange(false)
  }

  const renderStepContent = () => {
    switch (wizardStep) {
      case 'create-app':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Create Your Slack App</h3>
              <p className="text-sm text-slate-600 mb-4">
                First, you'll need to create a new Slack application in your workspace.
              </p>
            </div>
            
            <div className="space-y-3 bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm">Go to <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://api.slack.com/apps</a></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm">Click <strong>"Create New App"</strong> → <strong>"From scratch"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm">Enter an app name (e.g., "Sales Agent")</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-sm">Select your workspace</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  5
                </div>
                <div className="flex-1">
                  <p className="text-sm">Click <strong>"Create App"</strong></p>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You'll need admin access to your Slack workspace to complete this setup.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'oauth-scopes':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configure OAuth Scopes</h3>
              <p className="text-sm text-slate-600 mb-4">
                Add the required permissions for your bot to function properly.
              </p>
            </div>
            
            <div className="space-y-3 bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm">In your app settings, go to <strong>"OAuth & Permissions"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm">Scroll to <strong>"Scopes"</strong> → <strong>"Bot Token Scopes"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2">Click <strong>"Add an OAuth Scope"</strong> and add these scopes:</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      'channels:history',
                      'channels:read',
                      'chat:write',
                      'im:history',
                      'im:read',
                      'im:write',
                      'app_mentions:read',
                      'users:read',
                      'users:read.email'
                    ].map(scope => (
                      <div key={scope} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded text-xs font-mono">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span>{scope}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                These scopes allow the bot to read messages, send responses, and identify users.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'install-app':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Install App to Workspace</h3>
              <p className="text-sm text-slate-600 mb-4">
                Install the app to your Slack workspace to get the Bot OAuth Token.
              </p>
            </div>
            
            <div className="space-y-3 bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm">Scroll up to <strong>"OAuth Tokens"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm">Click <strong>"Install to Workspace"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm">Review permissions and click <strong>"Allow"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2"><strong>Copy the "Bot User OAuth Token"</strong> (starts with <code className="text-xs bg-white px-1 py-0.5 rounded">xoxb-</code>)</p>
                  <p className="text-xs text-slate-500 mb-3">Paste it below:</p>
                  <div className="relative">
                    <Input
                      type={showSecrets.botToken ? 'text' : 'password'}
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="xoxb-your-bot-token"
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(prev => ({ ...prev, botToken: !prev.botToken }))}
                    >
                      {showSecrets.botToken ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Keep this token secure - it provides access to your Slack workspace.
              </AlertDescription>
            </Alert>
          </div>
        )

      case 'signing-secret':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Get Signing Secret</h3>
              <p className="text-sm text-slate-600 mb-4">
                The signing secret is used to verify that requests are coming from Slack.
              </p>
            </div>
            
            <div className="space-y-3 bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm">Go to <strong>"Basic Information"</strong> in the left sidebar</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm">Scroll to <strong>"App Credentials"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2"><strong>Copy the "Signing Secret"</strong></p>
                  <p className="text-xs text-slate-500 mb-3">Paste it below:</p>
                  <div className="relative">
                    <Input
                      type={showSecrets.signingSecret ? 'text' : 'password'}
                      value={signingSecret}
                      onChange={(e) => setSigningSecret(e.target.value)}
                      placeholder="Your signing secret"
                      className="pr-10 font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(prev => ({ ...prev, signingSecret: !prev.signingSecret }))}
                    >
                      {showSecrets.signingSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case 'webhook-config':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Choose Outgoing Message Configuration</h3>
              <p className="text-sm text-slate-600 mb-4">
                Select how you want the agent to send messages back to Slack.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setOutgoingOption('botToken')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  outgoingOption === 'botToken' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    outgoingOption === 'botToken' ? 'border-primary' : 'border-slate-300'
                  }`}>
                    {outgoingOption === 'botToken' && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Bot Token Only (Recommended)</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Uses the Bot OAuth Token to send messages. Supports threading and all Slack features.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">Message Threading</span>
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">Full Features</span>
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">Dynamic Channels</span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOutgoingOption('webhook')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  outgoingOption === 'webhook' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    outgoingOption === 'webhook' ? 'border-primary' : 'border-slate-300'
                  }`}>
                    {outgoingOption === 'webhook' && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Incoming Webhook</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Simple webhook URL for posting messages. Easier setup but limited features.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">Simple Setup</span>
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">No Threading</span>
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">Fixed Channel</span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setOutgoingOption('both')}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  outgoingOption === 'both' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    outgoingOption === 'both' ? 'border-primary' : 'border-slate-300'
                  }`}>
                    {outgoingOption === 'both' && <div className="w-3 h-3 rounded-full bg-primary" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">Both (Maximum Flexibility)</h4>
                    <p className="text-sm text-slate-600 mb-2">
                      Configure both options. System will prefer webhook if available, otherwise use bot token.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">Fallback Support</span>
                      <span className="text-xs bg-amber-100 text-slate-700 px-2 py-1 rounded">Maximum Flexibility</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {(outgoingOption === 'webhook' || outgoingOption === 'both') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-medium mb-2 text-sm">Additional Setup for Webhook</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-700 mt-1">1.</span>
                    <p>Go to <strong>"Incoming Webhooks"</strong> in the left sidebar</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-700 mt-1">2.</span>
                    <p>Toggle <strong>"Activate Incoming Webhooks"</strong> to ON</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-700 mt-1">3.</span>
                    <p>Click <strong>"Add New Webhook to Workspace"</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-700 mt-1">4.</span>
                    <p>Select a default channel</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-blue-700 mt-1">5.</span>
                    <div className="flex-1">
                      <p className="mb-2"><strong>Copy the Webhook URL</strong> (starts with <code className="text-xs bg-white px-1 py-0.5 rounded">https://hooks.slack.com/services/...</code>)</p>
                      <p className="text-xs text-slate-500 mb-3">Paste it below:</p>
                      <Input
                        type="text"
                        value={incomingWebhookUrl}
                        onChange={(e) => setIncomingWebhookUrl(e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'configure-connection':
        return (
          <div className="space-y-6 bg-slate-50 rounded-lg p-6">
            <div className="space-y-4">              
              <div>
                <Label htmlFor="name" className="mb-2">Integration Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., My Slack Bot"
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
                  placeholder="Slack integration for my agent"
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            {/* Collected Credentials - Read Only */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-sm">Collected Credentials</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-600 mb-2">Signing Secret</Label>
                  <div className="relative">
                    <Input
                      type={showSecrets.signingSecret ? 'text' : 'password'}
                      value={signingSecret}
                      readOnly
                      className="bg-white font-mono text-sm pr-10"
                    />
                    <Button 
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecrets(prev => ({ ...prev, signingSecret: !prev.signingSecret }))}
                    >
                      {showSecrets.signingSecret ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {(outgoingOption === 'botToken' || outgoingOption === 'both') && (
                  <div>
                    <Label className="text-xs text-slate-600 mb-2">Bot User OAuth Token</Label>
                    <div className="relative">
                      <Input
                        type={showSecrets.botToken ? 'text' : 'password'}
                        value={botToken}
                        readOnly
                        className="bg-white font-mono text-sm pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowSecrets(prev => ({ ...prev, botToken: !prev.botToken }))}
                      >
                        {showSecrets.botToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {(outgoingOption === 'webhook' || outgoingOption === 'both') && incomingWebhookUrl && (
                  <div>
                    <Label className="text-xs text-slate-600">Incoming Webhook URL</Label>
                    <Input
                      type="text"
                      value={incomingWebhookUrl}
                      readOnly
                      className="bg-white font-mono text-sm"
                    />
                  </div>
                )}
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  These credentials were collected in previous steps. If you need to change them, use the Back button.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )

      case 'event-subscriptions':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Configure Event Subscriptions</h3>
              <p className="text-sm text-slate-600 mb-4">
                Set up Slack to send events to your XiansAI integration using the webhook URL below.
              </p>
            </div>

            {/* Webhook URL - Highlighted */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <Label className="text-sm font-semibold text-green-900">Your Webhook URL</Label>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={createdWebhookUrl}
                  readOnly
                  className="font-mono text-xs bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(createdWebhookUrl, 'webhook')}
                  className="flex-shrink-0"
                >
                  {copiedStates.webhook ? (
                    <><Check className="h-4 w-4 mr-1" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-1" /> Copy</>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-3 bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm">Go to your Slack App → <strong>"Event Subscriptions"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm">Toggle <strong>"Enable Events"</strong> to ON</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2">In <strong>"Request URL"</strong>, paste your webhook URL:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdWebhookUrl}
                      readOnly
                      className="font-mono text-xs bg-white"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(createdWebhookUrl, 'webhook-event')}
                      className="flex-shrink-0"
                    >
                      {copiedStates['webhook-event'] ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-sm">Wait for <strong className="text-green-600">"Verified ✓"</strong> checkmark</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  5
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2">Scroll to <strong>"Subscribe to bot events"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  6
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2">Click <strong>"Add Bot User Event"</strong> and add:</p>
                  <div className="space-y-1 mt-2">
                    {['message.channels', 'message.im', 'app_mention'].map(event => (
                      <div key={event} className="flex items-center gap-2 bg-white px-2 py-1.5 rounded text-xs font-mono">
                        <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span>{event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  7
                </div>
                <div className="flex-1">
                  <p className="text-sm">Click <strong>"Save Changes"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  8
                </div>
                <div className="flex-1">
                  <p className="text-sm">If prompted, click <strong>"Reinstall App"</strong> to apply changes</p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'enable-dm':
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Enable Direct Messages</h3>
              <p className="text-sm text-slate-600 mb-4">
                Allow users to send direct messages to your bot.
              </p>
            </div>
            
            <div className="space-y-3 bg-slate-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="text-sm">Go to <strong>"App Home"</strong> in the left sidebar</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  <p className="text-sm">Scroll to <strong>"Show Tabs"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  <p className="text-sm">Check <strong>"Allow users to send Slash commands and messages from the messages tab"</strong></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5">
                  4
                </div>
                <div className="flex-1">
                  <p className="text-sm">Click <strong>"Save Changes"</strong></p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Setup Complete!</h3>
              <p className="text-sm text-slate-600">
                Your Slack integration is now fully configured and ready to use.
              </p>
            </div>

            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm">What's Next?</h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Invite your bot to channels where you want it to respond</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Test by mentioning your bot or sending it a direct message</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>Monitor conversations from your Agent Studio</span>
                </li>
              </ul>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Sheet 
      open={open} 
      onOpenChange={(newOpen) => {
        console.log('[Slack Wizard] Sheet onOpenChange called with:', newOpen, 'isSubmitting:', isSubmitting)
        if (!newOpen && !isSubmitting) {
          handleClose()
        } else if (!newOpen && isSubmitting) {
          console.log('[Slack Wizard] Prevented close during submission')
        }
      }}
    >
      <SheetContent className="w-[700px] sm:max-w-[700px] overflow-y-auto flex flex-col">
        <SheetHeader>
          <SheetTitle>Setup Slack Integration</SheetTitle>
          <SheetDescription>
            Follow the step-by-step guide to connect your Slack workspace
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto px-6">
          <div className="py-6 space-y-6">
            {/* Progress Steps */}
            <div>
              <div ref={stepsContainerRef} className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {wizardSteps.map((ws, index) => {
                  const isCurrent = ws.id === wizardStep
                  const isPast = index < getCurrentStepIndex()
                  const isAccessible = index <= getCurrentStepIndex()
                  
                  return (
                    <div key={ws.id} className="flex items-center flex-shrink-0">
                      <button
                        ref={isCurrent ? currentStepRef : null}
                        type="button"
                        onClick={() => isAccessible && setWizardStep(ws.id)}
                        disabled={!isAccessible}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                          isCurrent 
                            ? 'bg-primary text-white' 
                            : isPast
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Circle className="h-3 w-3" />
                        )}
                        <span className="whitespace-nowrap">{ws.title}</span>
                      </button>
                      {index < wizardSteps.length - 1 && (
                        <div className={`w-8 h-0.5 mx-1 ${isPast ? 'bg-green-300' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Step Content */}
            <div className="space-y-6">
              {renderStepContent()}
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="border-t p-6 bg-white flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const currentIndex = getCurrentStepIndex()
                if (currentIndex > 0) {
                  setWizardStep(wizardSteps[currentIndex - 1].id)
                } else {
                  handleClose()
                }
              }}
            >
              {getCurrentStepIndex() === 0 ? 'Cancel' : 'Back'}
            </Button>
            
            {wizardStep === 'complete' ? (
              <Button onClick={handleClose}>
                Done
              </Button>
            ) : wizardStep === 'configure-connection' ? (
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Integration'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  const currentIndex = getCurrentStepIndex()
                  if (currentIndex < wizardSteps.length - 1) {
                    setWizardStep(wizardSteps[currentIndex + 1].id)
                  }
                }}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
