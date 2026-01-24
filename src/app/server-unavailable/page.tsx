'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Suspense } from 'react'

function ServerUnavailableContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const errorMessage = searchParams.get('error') || 'Unable to connect to the server'
  const returnUrl = searchParams.get('returnUrl') || '/conversations'

  const handleRetry = () => {
    // Navigate back to the page that had the error
    router.push(returnUrl)
  }

  const handleGoHome = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Server Connection Lost</CardTitle>
          <CardDescription>
            We're having trouble connecting to the real-time messaging server
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
            <p className="font-medium">What happened?</p>
            <p>The application attempted to reconnect 5 times but was unable to establish a stable connection to the server.</p>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check your internet connection</li>
              <li>Verify the backend server is running</li>
              <li>Wait a moment and try again</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <p className="font-semibold mb-1">Technical Details:</p>
            <p>The Server-Sent Events (SSE) connection failed after multiple reconnection attempts.</p>
            <p className="mt-1">This may indicate the backend service is unavailable or experiencing issues.</p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleRetry} 
            className="w-full"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGoHome}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function ServerUnavailablePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    }>
      <ServerUnavailableContent />
    </Suspense>
  )
}
