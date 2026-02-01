'use client'

import { signIn, getProviders } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import type { ClientSafeProvider } from "next-auth/react"

export function SignInForm() {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [providers, setProviders] = useState<Record<string, ClientSafeProvider> | null>(null)

  // Fetch available providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const availableProviders = await getProviders()
        setProviders(availableProviders)
      } catch (error) {
        console.error('[Auth] Error fetching providers:', error)
        setProviders({}) // Set to empty object to indicate loading is complete
      }
    }

    fetchProviders()
  }, [])

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleSignIn = async (provider: 'google' | 'azure-ad') => {
    // Check network status first
    if (!navigator.onLine) {
      setError("No internet connection. Please check your network and try again.")
      toast.error("No internet connection detected")
      return
    }

    setIsLoading(provider)
    setError(null)

    try {
      const result = await signIn(provider, { 
        callbackUrl: '/dashboard',
        redirect: false // Don't redirect immediately, handle result
      })

      if (result?.error) {
        let errorMessage = "Sign in failed. Please try again."
        
        if (result.error.includes('Fetch') || result.error.includes('network')) {
          errorMessage = "Network error occurred. Please check your connection and try again."
        } else if (result.error.includes('timeout')) {
          errorMessage = "Sign in is taking longer than usual. Please try again."
        } else if (result.error.includes('OAuthCallback')) {
          errorMessage = "Authentication service error. Please try again in a moment."
        }
        
        setError(errorMessage)
        toast.error(errorMessage)
      } else if (result?.url) {
        // Success - redirect to dashboard
        window.location.href = result.url
      }
    } catch (err: any) {
      console.error(`[Auth] ${provider} sign-in error:`, err)
      
      let errorMessage = "An unexpected error occurred. Please try again."
      
      if (err.message?.includes('Failed to fetch') || 
          err.message?.includes('NetworkError') ||
          err.name === 'TypeError') {
        errorMessage = "Connection failed. Please check your internet connection and try again."
      } else if (err.message?.includes('timeout')) {
        errorMessage = "Sign in timed out. Please try again."
      }
      
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(null)
    }
  }
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Welcome to Agent Studio
        </CardTitle>
        <CardDescription className="text-center">
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network status indicator */}
        {!isOnline && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              No internet connection. Please check your network connection.
            </AlertDescription>
          </Alert>
        )}

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading state while fetching providers */}
        {providers === null && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2 text-muted-foreground">Loading sign-in options...</span>
          </div>
        )}

        {/* Show providers dynamically */}
        {providers && Object.keys(providers).length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No sign-in providers are currently configured. Please contact your administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* Google Provider */}
        {providers?.google && (
          <Button 
            className="w-full" 
            size="lg"
            onClick={() => handleSignIn('google')}
            disabled={isLoading !== null || !isOnline}
          >
            {isLoading === 'google' ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {isLoading === 'google' ? 'Signing in...' : 'Sign in with Google'}
          </Button>
        )}

        {/* Azure AD Provider */}
        {providers?.['azure-ad'] && (
          <Button 
            className="w-full" 
            size="lg"
            variant="outline"
            onClick={() => handleSignIn('azure-ad')}
            disabled={isLoading !== null || !isOnline}
          >
            {isLoading === 'azure-ad' ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <svg
                className="mr-2 h-5 w-5"
                viewBox="0 0 23 23"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.5 0L0 2.042v8.625c0 7.058 4.812 13.646 11.5 15.333 6.688-1.687 11.5-8.275 11.5-15.333V2.042L11.5 0z"
                  fill="#00A4EF"
                />
                <path
                  d="M11.5 1.5L1.5 3.375v7.292c0 6.208 4.229 12.02 10 13.833 5.771-1.812 10-7.625 10-13.833V3.375L11.5 1.5z"
                  fill="#50E6FF"
                />
              </svg>
            )}
            {isLoading === 'azure-ad' ? 'Signing in...' : 'Sign in with Microsoft'}
          </Button>
        )}
        
        {/* Connection status for better UX */}
        <div className="flex items-center justify-center text-xs text-muted-foreground">
          {isOnline ? (
            <div className="flex items-center">
              <Wifi className="mr-1 h-3 w-3 text-green-500" />
              Connected
            </div>
          ) : (
            <div className="flex items-center">
              <WifiOff className="mr-1 h-3 w-3 text-red-500" />
              Offline
            </div>
          )}
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </div>
      </CardContent>
    </Card>
  )
}
