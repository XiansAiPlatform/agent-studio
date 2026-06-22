'use client'

import { AlertTriangle, RefreshCw, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

type BackendUnavailableVariant = 'connection' | 'configuration'

interface BackendUnavailableProps {
  errorMessage?: string
  onRetry?: () => void
  /**
   * 'connection' (default): the backend could not be reached (network/server down).
   * 'configuration': the backend was reached but rejected Agent Studio's credentials
   * (e.g. an invalid or revoked XIANS_APIKEY) — a deployment config problem.
   */
  variant?: BackendUnavailableVariant
}

const VARIANT_CONTENT: Record<
  BackendUnavailableVariant,
  {
    title: string
    description: string
    alertTitle: string
    checklist: string[]
    devHint: string[]
  }
> = {
  connection: {
    title: 'Backend Service Unavailable',
    description: "We're having trouble connecting to the server",
    alertTitle: 'Connection Error',
    checklist: [
      'Check if the backend server is running',
      'Verify your network connection',
      'Check the XIANS_SERVER_URL configuration',
      'Review the server logs for errors',
    ],
    devHint: [
      'Make sure your .env.local file has the correct XIANS_SERVER_URL',
      'and that the backend service is running.',
    ],
  },
  configuration: {
    title: 'Service Configuration Error',
    description: 'Agent Studio could not authenticate with the backend server',
    alertTitle: 'Authentication Failed',
    checklist: [
      'Verify the XIANS_APIKEY matches a valid backend API key',
      'Confirm the API key has not been revoked or rotated',
      'Check that XIANS_SERVER_URL points to the correct backend',
      'Review the backend server logs for authentication failures',
    ],
    devHint: [
      'Make sure your .env.local file has a valid XIANS_APIKEY',
      'that is registered (and still active) in the backend.',
    ],
  },
}

export function BackendUnavailable({ 
  errorMessage,
  onRetry,
  variant = 'connection',
}: BackendUnavailableProps) {
  const content = VARIANT_CONTENT[variant]
  const Icon = variant === 'configuration' ? KeyRound : AlertTriangle
  const resolvedMessage =
    errorMessage ??
    (variant === 'configuration'
      ? 'The backend server rejected the request credentials'
      : 'Unable to connect to the backend server')

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else {
      // Default retry: reload the page
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">{content.title}</CardTitle>
          <CardDescription>
            {content.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{content.alertTitle}</AlertTitle>
            <AlertDescription className="text-sm">
              {resolvedMessage}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              {content.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md font-mono">
            <p className="font-semibold mb-1">For developers:</p>
            {content.devHint.map((line, index) => (
              <p key={line} className={index === 0 ? undefined : 'mt-1'}>
                {line}
              </p>
            ))}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleRetry} 
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Connection
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            Go to Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
