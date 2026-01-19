'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface BackendUnavailableProps {
  errorMessage?: string
  onRetry?: () => void
}

export function BackendUnavailable({ 
  errorMessage = 'Unable to connect to the backend server',
  onRetry 
}: BackendUnavailableProps) {
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
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Backend Service Unavailable</CardTitle>
          <CardDescription>
            We're having trouble connecting to the server
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="text-sm">
              {errorMessage}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check if the backend server is running</li>
              <li>Verify your network connection</li>
              <li>Check the XIANS_SERVER_URL configuration</li>
              <li>Review the server logs for errors</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md font-mono">
            <p className="font-semibold mb-1">For developers:</p>
            <p>Make sure your .env.local file has the correct XIANS_SERVER_URL</p>
            <p className="mt-1">and that the backend service is running.</p>
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
