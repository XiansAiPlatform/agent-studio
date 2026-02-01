'use client'

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

export function useAuth() {
  const { data: session, status } = useSession()
  const [hasNetworkError, setHasNetworkError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  // Track network connectivity
  useEffect(() => {
    const handleOnline = () => {
      setHasNetworkError(false)
      setRetryCount(0)
    }
    
    const handleOffline = () => {
      setHasNetworkError(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setHasNetworkError(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Handle session loading errors
  useEffect(() => {
    if (status === 'loading' && retryCount > 3) {
      console.warn('[Auth] Session loading is taking unusually long, possible network issue')
      setHasNetworkError(true)
    }
  }, [status, retryCount])

  const isError = status === 'unauthenticated' && hasNetworkError
  const isNetworkIssue = hasNetworkError || !navigator.onLine
  
  return {
    user: session?.user,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    isError,
    isNetworkIssue,
    hasNetworkError,
    retryCount,
    session,
    
    // Helper functions
    isOffline: !navigator.onLine,
    canRetry: retryCount < 3 && !isNetworkIssue,
    
    // Retry session fetch
    retry: () => {
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1)
        window.location.reload()
      }
    }
  }
}
