'use client'

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { toast } from "sonner"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      // Retry session fetching on network failures
      refetchOnWindowFocus={true}
      refetchOnReconnect={true}
      
      // Custom error handling for network failures
      onError={(error) => {
        console.warn("[NextAuth] Session error:", error)
        
        // Handle specific fetch errors gracefully
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('NetworkError') ||
            error.message?.includes('CLIENT_FETCH_ERROR')) {
          
          // Show user-friendly message for network issues
          toast.error("Connection issue detected. Please check your internet connection.", {
            id: "auth-network-error",
            duration: 5000
          })
        } else if (error.message?.includes('TIMEOUT')) {
          toast.error("Authentication is taking longer than usual. Please try again.", {
            id: "auth-timeout-error", 
            duration: 5000
          })
        } else {
          // Generic auth error
          toast.error("Authentication issue occurred. Please try refreshing the page.", {
            id: "auth-generic-error",
            duration: 5000
          })
        }
      }}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
