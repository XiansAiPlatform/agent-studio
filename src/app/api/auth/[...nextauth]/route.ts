import NextAuth, { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"
import GoogleProvider from "next-auth/providers/google"
import AzureADProvider from "next-auth/providers/azure-ad"
import KeycloakProvider from "next-auth/providers/keycloak"
import CredentialsProvider from "next-auth/providers/credentials"
import { VismaConnectProvider } from "@/lib/auth-providers/visma-connect"
import { AzureADB2CProvider } from "@/lib/auth-providers/azure-ad-b2c"
import { createXiansClient } from "@/lib/xians/client"
import { XiansTenantsApi } from "@/lib/xians/tenants"
import { describeXiansError, isServiceApiKeyError } from "@/lib/xians/errors"

/** Default OpenID scopes when no resource scope is configured. */
const DEFAULT_AZURE_SCOPES = "openid profile email offline_access"

/** Refresh the access token this many seconds before it actually expires. */
const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 60

/**
 * Normalize OAuth scopes from env. Accepts space- or comma-separated lists
 * (Parkly / React apps often use commas: "openid, profile, offline_access, …").
 */
function normalizeOAuthScopes(
  raw: string | undefined,
  fallback: string = DEFAULT_AZURE_SCOPES
): string {
  if (!raw?.trim()) return fallback
  return raw
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ")
}

/** Entra ID (azure-ad) scopes from AZURE_AD_SCOPES. */
function getAzureAdScopes(): string {
  return normalizeOAuthScopes(process.env.AZURE_AD_SCOPES)
}

/**
 * B2C scopes. Prefer AZURE_AD_B2B_SCOPES (Parkly naming for the API resource
 * scope), then AZURE_AD_B2C_SCOPES.
 */
function getAzureAdB2CScopes(): string {
  return normalizeOAuthScopes(
    process.env.AZURE_AD_B2B_SCOPES || process.env.AZURE_AD_B2C_SCOPES
  )
}

type MicrosoftTokenEndpoint = {
  tokenUrl: string
  clientId: string
  clientSecret?: string
  scopes: string
}

function resolveMicrosoftTokenEndpoint(
  provider: string | undefined
): MicrosoftTokenEndpoint | null {
  if (provider === "azure-ad") {
    const clientId = process.env.AZURE_AD_CLIENT_ID
    const clientSecret = process.env.AZURE_AD_CLIENT_SECRET
    if (!clientId || !clientSecret) return null
    const tenantId = process.env.AZURE_AD_TENANT_ID || "common"
    return {
      tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      clientId,
      clientSecret,
      scopes: getAzureAdScopes(),
    }
  }

  if (provider === "azure-ad-b2c") {
    const clientId = process.env.AZURE_AD_B2C_CLIENT_ID
    const authority = process.env.AZURE_AD_B2C_AUTHORITY?.replace(/\/$/, "")
    if (!clientId || !authority) return null
    const clientSecret = process.env.AZURE_AD_B2C_CLIENT_SECRET
    return {
      tokenUrl: `${authority}/oauth2/v2.0/token`,
      clientId,
      // B2C may be configured as a public client (no secret)
      clientSecret:
        typeof clientSecret === "string" && clientSecret.length > 0
          ? clientSecret
          : undefined,
      scopes: getAzureAdB2CScopes(),
    }
  }

  return null
}

/**
 * Exchange a Microsoft (Entra ID or B2C) refresh_token for a fresh
 * access_token audienced for the configured resource scope. Used so messaging
 * can forward a valid user token to the backend.
 */
async function refreshMicrosoftAccessToken(token: JWT): Promise<JWT> {
  const endpoint = resolveMicrosoftTokenEndpoint(token.provider)

  if (!endpoint || !token.refreshToken) {
    console.error(
      "[Auth] Cannot refresh Microsoft access token: missing endpoint config or refresh token",
      { provider: token.provider }
    )
    return { ...token, error: "RefreshAccessTokenError" }
  }

  try {
    const body = new URLSearchParams({
      client_id: endpoint.clientId,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
      scope: endpoint.scopes,
    })
    if (endpoint.clientSecret) {
      body.set("client_secret", endpoint.clientSecret)
    }

    const response = await fetch(endpoint.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })

    const refreshed = await response.json()

    if (!response.ok) {
      console.error(
        "[Auth] Microsoft access token refresh failed:",
        refreshed?.error_description || refreshed?.error || response.statusText
      )
      return { ...token, error: "RefreshAccessTokenError" }
    }

    return {
      ...token,
      accessToken: refreshed.access_token as string,
      // Azure may rotate the refresh token; fall back to the existing one.
      refreshToken:
        (refreshed.refresh_token as string | undefined) ?? token.refreshToken,
      expiresAt:
        Math.floor(Date.now() / 1000) +
        (typeof refreshed.expires_in === "number" ? refreshed.expires_in : 3600),
      error: undefined,
    }
  } catch (error) {
    console.error("[Auth] Microsoft access token refresh threw:", error)
    return { ...token, error: "RefreshAccessTokenError" }
  }
}

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

  // Azure AD B2C custom policies may emit email as a string, emails[], or
  // nested under signInNames.emailAddress.
  const emailsClaim = Array.isArray(profile.emails) ? profile.emails[0] : undefined
  const signInEmail =
    profile.signInNames && typeof profile.signInNames === "object"
      ? profile.signInNames.emailAddress
      : undefined

  const email = profile.email
    ?? emailsClaim
    ?? signInEmail
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

// Add Azure AD (Entra ID) provider if credentials are available
if (process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET) {
  providers.push(
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          // Include offline_access for refresh tokens, plus a resource scope
          // (via AZURE_AD_SCOPES) so the access_token is audienced for the
          // backend API rather than Microsoft Graph.
          scope: getAzureAdScopes(),
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

// Add Azure AD B2C provider (custom-domain authority + policy) if configured
if (process.env.AZURE_AD_B2C_CLIENT_ID && process.env.AZURE_AD_B2C_AUTHORITY) {
  providers.push(
    AzureADB2CProvider({
      clientId: process.env.AZURE_AD_B2C_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_B2C_CLIENT_SECRET,
      authority: process.env.AZURE_AD_B2C_AUTHORITY,
      // AZURE_AD_B2B_SCOPES (Parkly) takes precedence over AZURE_AD_B2C_SCOPES.
      // Comma- or space-separated lists are accepted.
      scopes: getAzureAdB2CScopes(),
      displayName: process.env.AZURE_AD_B2C_DISPLAY_NAME,
      httpOptions: {
        timeout: 10000,
      },
    })
  )
} else {
  console.log('[Auth] Azure AD B2C SSO disabled - AZURE_AD_B2C_CLIENT_ID and/or AZURE_AD_B2C_AUTHORITY not configured')
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
          // Fail closed: if we cannot confirm tenant access, do not grant it.
          // Access is re-validated on the next JWT refresh and by every tenant-
          // scoped API route, so a transient backend issue means the user must
          // retry rather than being optimistically let in.
          user.hasTenantAccess = false
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
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        // Clear any previous refresh error on a fresh sign-in
        delete token.error
      }

      // Add custom claims (only present on initial sign-in)
      if (user) {
        const resolvedEmail = user.email || getEmailFromProfile(profile)

        token.id = user.id
        token.email = resolvedEmail ?? token.email
        token.hasTenantAccess = user.hasTenantAccess
        token.isSystemAdmin = user.isSystemAdmin
        token.tenantAccessCheckedAt = Date.now()
      }

      // Refresh the Microsoft (Entra ID or B2C) access token before it expires
      // so messaging can forward a valid user token to the backend.
      if (
        (token.provider === "azure-ad" || token.provider === "azure-ad-b2c") &&
        token.refreshToken &&
        typeof token.expiresAt === "number" &&
        Date.now() / 1000 >= token.expiresAt - ACCESS_TOKEN_REFRESH_BUFFER_SECONDS
      ) {
        token = await refreshMicrosoftAccessToken(token)
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
        session.user.email = (token.email as string | null | undefined) ?? session.user.email
        session.accessToken = token.accessToken as string
        session.user.hasTenantAccess = token.hasTenantAccess as boolean
        session.user.isSystemAdmin = token.isSystemAdmin as boolean
      }
      // Surface refresh failures so the client can prompt re-auth
      session.error = token.error
      
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
