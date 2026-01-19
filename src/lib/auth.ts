import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

// Re-export authOptions for use in other files
export { authOptions }

/**
 * Get the current session on the server side
 * Use this in Server Components, Server Actions, and API routes
 */
export async function getCurrentSession() {
  return await getServerSession(authOptions)
}

/**
 * Require authentication - redirects to login if not authenticated
 * Use this in Server Components that require authentication
 */
export async function requireAuth() {
  const session = await getCurrentSession()
  
  if (!session) {
    redirect('/login')
  }
  
  return session
}

/**
 * Check if user is authenticated
 * Returns true if authenticated, false otherwise (no redirect)
 */
export async function isAuthenticated() {
  const session = await getCurrentSession()
  return !!session
}
