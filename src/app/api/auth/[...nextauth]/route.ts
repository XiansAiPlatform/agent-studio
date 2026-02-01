import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AzureADProvider from "next-auth/providers/azure-ad"
import type { JWT } from "next-auth/jwt"
import { createXiansClient } from "@/lib/xians/client"
import { XiansTenantsApi } from "@/lib/xians/tenants"

/**
 * Note: Tenant validation is now handled client-side by TenantValidator component
 * This allows validation to update dynamically when tenants are created/modified
 * without requiring re-authentication
 */

// Verify NEXTAUTH_SECRET is set in production
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET environment variable must be set in production. ' +
    'Generate one with: openssl rand -base64 32'
  )
}

// Build providers array dynamically based on available environment variables
const providers = []

// Add Google provider if credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      httpOptions: {
        timeout: 10000, // Increase timeout to 10 seconds
      }
    })
  )
} else {
  console.log('[Auth] Google SSO disabled - GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET not configured')
}

// Add Azure AD provider if credentials are available
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email User.Read"
        }
      },
      httpOptions: {
        timeout: 10000, // Increase timeout to 10 seconds
      }
    })
  )
} else {
  console.log('[Auth] Microsoft SSO disabled - AZURE_AD_CLIENT_ID and/or AZURE_AD_CLIENT_SECRET not configured')
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  
  providers,
  
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user has tenant access
      if (user.email) {
        try {
          const client = createXiansClient()
          const tenantsApi = new XiansTenantsApi(client)
          const tenantNames = await tenantsApi.getParticipantTenants(user.email)
          
          // Store tenant check result in user object (temporary)
          user.hasTenantAccess = tenantNames.length > 0
          
          console.log(`[Auth] User ${user.email} has access to ${tenantNames.length} tenant(s)`)
        } catch (error) {
          console.error('[Auth] Error checking tenant access during sign-in:', error)
          // Allow sign in even if check fails - we'll validate again on redirect
          user.hasTenantAccess = true
        }
      }
      
      return true
    },
    
    async jwt({ token, account, profile, user }) {
      // Persist the OAuth access_token and/or the user id to the token
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token
        token.provider = account.provider
      }
      
      // Add custom claims
      if (user) {
        token.id = user.id
        token.role = user.role || 'user' // Default role
        token.email = user.email
        token.hasTenantAccess = user.hasTenantAccess
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.accessToken = token.accessToken as string
        session.user.hasTenantAccess = token.hasTenantAccess as boolean
      }
      
      return session
    },
    
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },
  
  pages: {
    signIn: '/login',    // Custom sign-in page
    error: '/login',     // Error page redirects to login
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Secure cookie configuration
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
