'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Suspense } from 'react'

const RETRY_INTERVAL_MS = 15_000
const RETRY_TIMEOUT_MS = 5_000

function parseMessagingParamsFromReturnUrl(returnUrl: string): { agentName: string; activationName: string } | null {
  const match = returnUrl.match(/^\/conversations\/([^/]+)\/([^/?]+)/)
  if (!match) return null
  return { agentName: decodeURIComponent(match[1]), activationName: decodeURIComponent(match[2]) }
}

function ServerUnavailableContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const returnUrl = searchParams.get('returnUrl') || '/conversations'

  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const checkConnectionAndRedirect = useCallback(async () => {
    const params = parseMessagingParamsFromReturnUrl(returnUrl)
    if (params) {
      try {
        setIsCheckingConnection(true)
        const listenUrl = `/api/messaging/listen?agentName=${encodeURIComponent(params.agentName)}&activationName=${encodeURIComponent(params.activationName)}&heartbeatSeconds=60`
        const eventSource = new EventSource(listenUrl)
        const connected = await new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => {
            eventSource.close()
            resolve(false)
          }, RETRY_TIMEOUT_MS)
          eventSource.onopen = () => {
            clearTimeout(timeout)
            eventSource.close()
            resolve(true)
          }
          eventSource.onerror = () => {
            clearTimeout(timeout)
            eventSource.close()
            resolve(false)
          }
        })
        if (connected) router.replace(returnUrl)
      } catch {
        // Ignore errors, will retry on next interval
      } finally {
        setIsCheckingConnection(false)
      }
    } else {
      const res = await fetch('/api/health')
      if (res.ok) router.replace(returnUrl)
    }
  }, [returnUrl, router])

  useEffect(() => {
    const id = setInterval(checkConnectionAndRedirect, RETRY_INTERVAL_MS)
    intervalRef.current = id
    checkConnectionAndRedirect()
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [checkConnectionAndRedirect])

  const handleRetry = () => {
    checkConnectionAndRedirect()
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
          <CardTitle className="text-2xl">Connection paused</CardTitle>
          <CardDescription>
            We couldn&apos;t reach the chat right now — this usually lasts just a moment.
            {isCheckingConnection ? (
              <span className="mt-2 block text-muted-foreground">
                Trying to reconnect…
              </span>
            ) : (
              <span className="mt-2 block text-muted-foreground">
                We&apos;ll keep trying automatically every few seconds.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">While you wait:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check that you&apos;re connected to the internet</li>
              <li>Give it a moment — we&apos;re trying to reconnect for you</li>
              <li>Use the button below to try again yourself</li>
              <li>Go back to the main page if you&apos;d like to browse elsewhere</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleRetry} 
            className="w-full"
            size="lg"
            disabled={isCheckingConnection}
          >
            <RefreshCw className={cn('mr-2 h-4 w-4', isCheckingConnection && 'animate-spin')} />
            {isCheckingConnection ? 'Checking…' : 'Try Again'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleGoHome}
            className="w-full"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to main page
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
