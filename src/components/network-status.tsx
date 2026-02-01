'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { WifiOff, Wifi, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface NetworkStatusProps {
  showAlways?: boolean
  className?: string
}

export function NetworkStatus({ showAlways = false, className }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (wasOffline) {
        toast.success('Connection restored! You are back online.', {
          id: 'network-restored'
        })
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      toast.error('Connection lost. You are now offline.', {
        id: 'network-lost',
        duration: Infinity
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [wasOffline])

  const handleRetry = () => {
    // Attempt to refresh the page or retry operations
    if (navigator.onLine) {
      window.location.reload()
    } else {
      toast.error('Still offline. Please check your internet connection.')
    }
  }

  // Don't show anything if online and not set to show always
  if (isOnline && !showAlways) {
    return null
  }

  return (
    <div className={className}>
      {!isOnline ? (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>
              No internet connection. Some features may not work properly.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : showAlways ? (
        <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
          <Wifi className="mr-1 h-3 w-3" />
          Connected
        </div>
      ) : null}
    </div>
  )
}

// Hook for network status
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionType, setConnectionType] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    // Get connection type if available (modern browsers)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setConnectionType(connection.effectiveType || connection.type || null)
      
      const handleConnectionChange = () => {
        setConnectionType(connection.effectiveType || connection.type || null)
      }
      
      connection.addEventListener('change', handleConnectionChange)
      
      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
        connection.removeEventListener('change', handleConnectionChange)
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return {
    isOnline,
    isOffline: !isOnline,
    connectionType,
    isSlowConnection: connectionType === 'slow-2g' || connectionType === '2g'
  }
}