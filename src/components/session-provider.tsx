'use client'

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

/**
 * Session Provider Wrapper
 * 
 * Wraps NextAuth SessionProvider with app-specific configuration
 * Enables session management throughout the application
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      // Automatically refetch session when window regains focus
      refetchOnWindowFocus={true}
      // Refetch interval to keep session fresh (5 minutes)
      refetchInterval={5 * 60}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
