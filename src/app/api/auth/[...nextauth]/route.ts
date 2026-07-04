import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import AzureADProvider from "next-auth/providers/azure-ad"
import KeycloakProvider from "next-auth/providers/keycloak"
import CredentialsProvider from "next-auth/providers/credentials"
import { VismaConnectProvider } from "@/lib/auth-providers/visma-connect"
import { createXiansClient } from "@/lib/xians/client"
import { XiansTenantsApi } from "@/lib/xians/tenants"
import { describeXiansError, isServiceApiKeyError } from "@/lib/xians/errors"

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

// Whether to use "__Secure-"/"__Host-" prefixed, Secure cookies. Keyed off the
// NEXTAUTH_URL scheme to stay consistent with NextAuth's getToken() (used by
// middleware); see the cookies config below for why this matters.
const useSecureCookies = (process.env.NEXTAUTH_URL ?? '').startsWith('https://')

// Build providers array dynamically based on available environment variables
const providers = []

function getEmailFromProfile(profile: any): string | null {
  if (!profile || typeof profile !== "object") {
    return null
  }

  const email = profile.email
    ?? profile.preferred_username
    ?? profile.upn
    ?? profile.unique_name

  return typeof email === "string" && email.length > 0 ? email : null
}

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
      profile(profile) {
        const email = getEmailFromProfile(profile)

        return {
          id: profile.sub ?? profile.oid,
          name: profile.name ?? email ?? "Microsoft User",
          email,
          image: null,
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

// Add Keycloak provider if credentials are available
if (process.env.KEYCLOAK_CLIENT_ID && process.env.KEYCLOAK_CLIENT_SECRET && process.env.KEYCLOAK_ISSUER) {
  providers.push(
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
      issuer: process.env.KEYCLOAK_ISSUER,
      httpOptions: {
        timeout: 10000, // Increase timeout to 10 seconds
      }
    })
  )
}

// Add Visma Connect provider if credentials are available
if (process.env.VISMA_CONNECT_CLIENT_ID && process.env.VISMA_CONNECT_ISSUER) {
  providers.push(
    VismaConnectProvider({
      clientId: process.env.VISMA_CONNECT_CLIENT_ID,
      issuer: process.env.VISMA_CONNECT_ISSUER,
      httpOptions: {
        timeout: 10000, // Increase timeout to 10 seconds
      },
    })
  )
} else {
  console.log('[Auth] Visma Connect SSO disabled - VISMA_CONNECT_CLIENT_ID and/or VISMA_CONNECT_ISSUER not configured')
}

// Local development login (env-gated). Parses LOCAL_AUTH_USERS into an
// email -> password map once at module load. NEVER enable in production.
function parseLocalAuthUsers(raw: string | undefined): Map<string, string> {
  const users = new Map<string, string>()
  for (const entry of (raw ?? '').split(',')) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    const sep = trimmed.indexOf(':')
    if (sep <= 0 || sep === trimmed.length - 1) {
      console.warn('[Auth] Skipping malformed LOCAL_AUTH_USERS entry (expected email:password)')
      continue
    }
    users.set(trimmed.slice(0, sep).trim().toLowerCase(), trimmed.slice(sep + 1))
  }
  return users
}

const localAuthUsers = parseLocalAuthUsers(process.env.LOCAL_AUTH_USERS)

if (process.env.LOCAL_AUTH_ENABLED === 'true' && localAuthUsers.size > 0) {
  console.warn(`[Auth] WARNING: Local credentials login is ENABLED for ${localAuthUsers.size} user(s). Never use this in production.`)
  providers.push(
    CredentialsProvider({
      id: 'local',
      name: 'Local Development',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        if (!email || !credentials?.password) {
          return null
        }
        const expected = localAuthUsers.get(email)
        if (expected && expected === credentials.password) {
          return { id: email, name: email.split('@')[0], email }
        }
        return null
      },
    })
  )
} else if (process.env.LOCAL_AUTH_ENABLED === 'true') {
  console.warn('[Auth] LOCAL_AUTH_ENABLED is true but LOCAL_AUTH_USERS is empty or invalid - local login disabled')
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  
  providers,
  
  callbacks: {
    async signIn({ user, account, profile }) {
      const resolvedEmail = user.email || getEmailFromProfile(profile)

      if (resolvedEmail && user.email !== resolvedEmail) {
        user.email = resolvedEmail
      }

      // Check if user has tenant access
      if (user.email) {
        try {
          const client = createXiansClient()
          const tenantsApi = new XiansTenantsApi(client)
          const response = await tenantsApi.getParticipantTenants(user.email)
          
          // Store tenant check result and system admin flag in user object (temporary)
          user.hasTenantAccess = response.tenants.length > 0
          user.isSystemAdmin = response.isSystemAdmin
          
          console.log(`[Auth] User ${user.email} has access to ${response.tenants.length} tenant(s), isSystemAdmin: ${response.isSystemAdmin}`)
        } catch (error) {
          if (isServiceApiKeyError(error)) {
            console.error(
              '[Auth] Cannot check tenant access during sign-in - backend rejected the service credential:',
              describeXiansError(error)
            )
          } else {
            console.error('[Auth] Error checking tenant access during sign-in:', describeXiansError(error))
          }
          // Allow sign in even if check fails - we'll validate again on redirect
          user.hasTenantAccess = true
          user.isSystemAdmin = false
        }
      }
      
      return true
    },
    
    async jwt({ token, account, profile, user, trigger }) {
      // Persist the OAuth access_token and/or the user id to the token
      if (account) {
        token.accessToken = account.access_token
        token.idToken = account.id_token
        token.provider = account.provider
      }

      // Add custom claims (only present on initial sign-in)
      if (user) {
        const resolvedEmail = user.email || getEmailFromProfile(profile)

        token.id = user.id
        token.role = user.role || 'user' // Default role
        token.email = resolvedEmail ?? token.email
        token.hasTenantAccess = user.hasTenantAccess
        token.isSystemAdmin = user.isSystemAdmin
        token.tenantAccessCheckedAt = Date.now()
      }

      // Periodically re-validate tenant membership so that admin role / tenant
      // removals take effect within the revalidation window instead of waiting
      // for the JWT to expire. Also re-validate on explicit `update()` calls
      // from the client.
      const REVALIDATE_AFTER_MS = 30 * 60 * 1000 // 30 minutes
      const lastChecked =
        typeof token.tenantAccessCheckedAt === 'number'
          ? token.tenantAccessCheckedAt
          : 0
      const isStale = Date.now() - lastChecked > REVALIDATE_AFTER_MS

      if ((trigger === 'update' || isStale) && token.email) {
        try {
          const client = createXiansClient()
          const tenantsApi = new XiansTenantsApi(client)
          const response = await tenantsApi.getParticipantTenants(
            token.email as string
          )
          token.hasTenantAccess = response.tenants.length > 0
          token.isSystemAdmin = response.isSystemAdmin
          token.tenantAccessCheckedAt = Date.now()
        } catch (error) {
          // Don't fail the request on a transient backend issue; just keep the
          // existing claims and try again on the next refresh cycle.
          console.error(
            '[Auth] Failed to re-validate tenant access during jwt refresh:',
            describeXiansError(error)
          )
        }
      }

      return token
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = (token.email as string | null | undefined) ?? session.user.email
        session.accessToken = token.accessToken as string
        session.user.hasTenantAccess = token.hasTenantAccess as boolean
        session.user.isSystemAdmin = token.isSystemAdmin as boolean
      }
      
      return session
    },
    
    async redirect({ url, baseUrl }) {
      try {
        // Allow only relative paths (reject protocol-relative "//" and
        // backslash tricks that some browsers normalize to an external host)
        if (url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\")) {
          return `${baseUrl}${url}`
        }
        // Allow callback URLs on the same origin only
        if (new URL(url).origin === baseUrl) return url
      } catch {
        // Malformed callbackUrl - fall through to the safe default
      }
      return baseUrl
    },
  },
  
  pages: {
    signIn: '/login',    // Custom sign-in page
    error: '/login',     // Error page redirects to login
  },
  
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 30 * 60, // refresh JWT (and re-run tenant check) every 30 min
  },
  
  // Secure cookie configuration.
  //
  // IMPORTANT: derive cookie security from the NEXTAUTH_URL scheme, NOT from
  // NODE_ENV. NextAuth's getToken() (used by middleware) picks the cookie name
  // based on whether NEXTAUTH_URL starts with "https://". If we keyed the
  // cookie name off NODE_ENV instead, a production build served over plain
  // http (e.g. a local Docker deployment on http://localhost) would write a
  // "__Secure-" prefixed cookie while middleware looked for the unprefixed
  // name - causing an infinite /login <-> /dashboard redirect loop.
  cookies: {
    sessionToken: {
      name: useSecureCookies
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    },
    callbackUrl: {
      name: useSecureCookies
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    },
    csrfToken: {
      name: useSecureCookies
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies
      }
    }
  },
  
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
