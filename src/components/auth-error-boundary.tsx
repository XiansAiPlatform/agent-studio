'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { NetworkStatus } from './network-status'

interface Props {
  children: ReactNode
  fallbackComponent?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class AuthErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AuthErrorBoundary] Caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
      hasError: true
    })

    // Report error to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      })
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount >= 3) {
      return // Max retries reached
    }

    this.setState(prevState => ({
      retryCount: prevState.retryCount + 1
    }))

    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Retry after a short delay
    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      })
    }, 1000)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private isNetworkError(error: Error): boolean {
    return (
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('CLIENT_FETCH_ERROR') ||
      error.message.includes('fetch') ||
      error.name === 'TypeError'
    )
  }

  private isAuthError(error: Error): boolean {
    return (
      error.message.includes('auth') ||
      error.message.includes('session') ||
      error.message.includes('NextAuth') ||
      error.stack?.includes('next-auth')
    )
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      const isNetworkErr = this.isNetworkError(this.state.error)
      const isAuthErr = this.isAuthError(this.state.error)
      const canRetry = this.state.retryCount < 3

      // Use custom fallback if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">
                {isNetworkErr ? 'Connection Error' : isAuthErr ? 'Authentication Error' : 'Something Went Wrong'}
              </CardTitle>
              <CardDescription>
                {isNetworkErr 
                  ? 'Unable to connect to the authentication service'
                  : isAuthErr
                  ? 'There was a problem with authentication'
                  : 'An unexpected error occurred while loading the application'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NetworkStatus />

              {isNetworkErr && (
                <Alert>
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    This appears to be a network connectivity issue. Please check your internet connection and try again.
                  </AlertDescription>
                </Alert>
              )}

              {process.env.NODE_ENV === 'development' && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs font-mono">
                    {this.state.error.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col space-y-2">
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry}
                    className="w-full"
                    variant="default"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
                  </Button>
                )}
                
                <Button 
                  onClick={this.handleReload}
                  variant="outline"
                  className="w-full"
                >
                  Refresh Page
                </Button>

                {!canRetry && (
                  <Alert>
                    <AlertDescription className="text-sm">
                      Multiple retry attempts failed. Please refresh the page or contact support if the issue persists.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Error occurred at {new Date().toLocaleTimeString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }

  public componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
  }
}

// Functional wrapper for easier use
export function WithAuthErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <AuthErrorBoundary fallbackComponent={fallback}>
      {children}
    </AuthErrorBoundary>
  )
}