# Authentication & Authorization

**Version:** 1.0  
**Last Updated:** 2026-01-15  
**Status:** Approved

---

## Overview

Agent Studio uses **NextAuth.js (Auth.js)** for authentication, providing flexible, provider-agnostic authentication with support for multiple authentication methods.

**Key Features:**
- OAuth 2.0 / OIDC support
- Multiple authentication providers
- Session management
- Server and client-side authentication
- Middleware-based route protection
- TypeScript support

---

## Requirements

**Authentication Methods (from requirements.md AUTH-001):**
- ✅ OAuth 2.0 / OIDC (Google, Microsoft, GitHub)
- ✅ SAML/SSO for enterprise
- 📝 Email/password (future enhancement)
- 📝 Multi-factor authentication (TOTP, SMS) (future enhancement)
- 📝 API key authentication for programmatic access (future enhancement)

**Authorization:**
- Role-based access control (RBAC)
  - Admin
  - Agent Developer
  - Operator/Monitor
  - End User
  - Read-only
- Resource-level permissions (per agent, knowledge base, etc.)
- Organization/tenant isolation (multi-tenancy)

---

## Technology Stack

- **Library:** NextAuth.js v5 (Auth.js)
- **Session Strategy:** JWT (JSON Web Tokens)
- **Storage:** Encrypted cookies
- **Middleware:** Next.js middleware for route protection

**Why NextAuth.js:**
- ✅ Built for Next.js 14+ with App Router support
- ✅ Provider-agnostic (supports any OAuth/OIDC provider)
- ✅ Secure by default (encrypted tokens, CSRF protection)
- ✅ TypeScript support
- ✅ Active development and community
- ✅ Easy to extend with custom providers

---

## Installation

```bash
npm install next-auth
```

---

## Configuration

### 1. Environment Variables

Create `.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32

# OIDC Provider (SSO)
OIDC_WELL_KNOWN_URL=https://your-provider.com/.well-known/openid-configuration
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret

# Optional: Additional providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

### 2. Auth Configuration

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth, { NextAuthOptions } from "next-auth"
import type { JWT } from "next-auth/jwt"

export const authOptions: NextAuthOptions = {
  providers: [
    // OIDC Provider (SSO)
    {
      id: "oidc-provider",
      name: "SSO",
      type: "oauth",
      wellKnown: process.env.OIDC_WELL_KNOWN_URL,
      clientId: process.env.OIDC_CLIENT_ID,
      clientSecret: process.env.OIDC_CLIENT_SECRET,
      authorization: { 
        params: { 
          scope: "openid email profile" 
        } 
      },
      idToken: true,
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    },
    
    // Google OAuth (optional)
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // }),
    
    // GitHub OAuth (optional)
    // GitHubProvider({
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // }),
    
    // Microsoft OAuth (optional)
    // AzureADProvider({
    //   clientId: process.env.MICROSOFT_CLIENT_ID!,
    //   clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
    //   tenantId: process.env.MICROSOFT_TENANT_ID,
    // }),
  ],
  
  callbacks: {
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
      }
      
      return token
    },
    
    async session({ session, token }) {
      // Send properties to the client
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.accessToken = token.accessToken as string
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
    signIn: '/auth/signin',    // Custom sign-in page
    signOut: '/auth/signout',  // Custom sign-out page
    error: '/auth/error',      // Error page
    // verifyRequest: '/auth/verify-request', // Email verification
    // newUser: '/auth/new-user' // New users
  },
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  // Enable debug messages in development
  debug: process.env.NODE_ENV === 'development',
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 3. TypeScript Types

Extend NextAuth types in `types/next-auth.d.ts`:

```typescript
// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
    accessToken?: string
  }

  interface User extends DefaultUser {
    role?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    accessToken?: string
    idToken?: string
    provider?: string
  }
}
```

---

## Usage

### Server Components

Use `getServerSession` in Server Components and API routes:

```typescript
// app/dashboard/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/api/auth/signin')
  }
  
  return (
    <div>
      <h1>Welcome, {session.user?.name}</h1>
      <p>Email: {session.user?.email}</p>
      <p>Role: {session.user?.role}</p>
    </div>
  )
}
```

### Client Components

Use `useSession` hook in Client Components:

```typescript
// components/user-button.tsx
'use client'

import { useSession, signIn, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Settings, LogOut } from "lucide-react"

export function UserButton() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
  }
  
  if (!session) {
    return (
      <Button onClick={() => signIn()}>
        Sign in
      </Button>
    )
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user?.image || ''} alt={session.user?.name || ''} />
            <AvatarFallback>
              {session.user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{session.user?.name}</p>
            <p className="text-xs text-muted-foreground">{session.user?.email}</p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### Session Provider

Wrap your app with `SessionProvider` in the root layout:

```typescript
// app/layout.tsx
import { SessionProvider } from "@/components/session-provider"

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}

// components/session-provider.tsx
'use client'

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>
}
```

---

## Route Protection

### Middleware-Based Protection

Protect entire route groups with middleware:

```typescript
// middleware.ts
export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/conversations/:path*",
    "/tasks/:path*",
    "/settings/:path*",
  ]
}
```

### Advanced Middleware with Role-Based Access

```typescript
// middleware.ts
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    
    // Admin-only routes
    if (path.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
    
    // Agent developer routes
    if (path.startsWith("/agents/create") && 
        !["admin", "agent-developer"].includes(token?.role as string)) {
      return NextResponse.redirect(new URL("/unauthorized", req.url))
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agents/:path*",
    "/admin/:path*",
  ]
}
```

### API Route Protection

```typescript
// app/api/agents/route.ts
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }
  
  // Check role-based permissions
  if (!["admin", "agent-developer"].includes(session.user.role)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    )
  }
  
  // Proceed with API logic
  const agents = await getAgents()
  return NextResponse.json({ success: true, data: agents })
}
```

---

## Role-Based Access Control (RBAC)

### Role Definitions

```typescript
// types/roles.ts
export const ROLES = {
  ADMIN: 'admin',
  AGENT_DEVELOPER: 'agent-developer',
  OPERATOR: 'operator',
  END_USER: 'user',
  READ_ONLY: 'read-only',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'agents:create',
    'agents:read',
    'agents:update',
    'agents:delete',
    'templates:create',
    'templates:read',
    'templates:update',
    'templates:delete',
    'tasks:approve',
    'tasks:reject',
    'users:manage',
    'settings:manage',
  ],
  [ROLES.AGENT_DEVELOPER]: [
    'agents:create',
    'agents:read',
    'agents:update',
    'templates:create',
    'templates:read',
    'templates:update',
    'tasks:approve',
    'tasks:reject',
  ],
  [ROLES.OPERATOR]: [
    'agents:read',
    'tasks:approve',
    'tasks:reject',
    'conversations:read',
  ],
  [ROLES.END_USER]: [
    'conversations:create',
    'conversations:read',
    'agents:read',
  ],
  [ROLES.READ_ONLY]: [
    'agents:read',
    'tasks:read',
    'conversations:read',
  ],
} as const

export function hasPermission(role: Role, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}
```

### Permission Checks

```typescript
// lib/auth/permissions.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { hasPermission, Role } from "@/types/roles"

export async function requirePermission(permission: string) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    throw new Error("Unauthorized")
  }
  
  if (!hasPermission(session.user.role as Role, permission)) {
    throw new Error("Forbidden")
  }
  
  return session
}

// Usage in Server Actions
'use server'

import { requirePermission } from "@/lib/auth/permissions"

export async function createAgent(data: CreateAgentInput) {
  await requirePermission('agents:create')
  
  // Create agent logic
  const agent = await db.agents.create(data)
  return agent
}
```

### Client-Side Permission Checks

```typescript
// hooks/use-permissions.ts
'use client'

import { useSession } from "next-auth/react"
import { hasPermission, Role } from "@/types/roles"

export function usePermissions() {
  const { data: session } = useSession()
  
  const checkPermission = (permission: string) => {
    if (!session?.user?.role) return false
    return hasPermission(session.user.role as Role, permission)
  }
  
  const hasRole = (role: Role) => {
    return session?.user?.role === role
  }
  
  return {
    checkPermission,
    hasRole,
    isAdmin: hasRole('admin'),
    isAgentDeveloper: hasRole('agent-developer'),
    isOperator: hasRole('operator'),
  }
}

// Usage in components
import { usePermissions } from "@/hooks/use-permissions"

export function AgentActions() {
  const { checkPermission } = usePermissions()
  
  return (
    <div>
      {checkPermission('agents:create') && (
        <Button>Create Agent</Button>
      )}
      {checkPermission('agents:delete') && (
        <Button variant="destructive">Delete Agent</Button>
      )}
    </div>
  )
}
```

---

## Custom Sign-In Page

```typescript
// app/auth/signin/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { SignInForm } from "@/components/auth/signin-form"

export default async function SignInPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/dashboard')
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignInForm />
    </div>
  )
}

// components/auth/signin-form.tsx
'use client'

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export function SignInForm() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in to Agent Studio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          className="w-full" 
          onClick={() => signIn('oidc-provider', { callbackUrl: '/dashboard' })}
        >
          Sign in with SSO
        </Button>
        
        {/* Add more providers as needed */}
      </CardContent>
    </Card>
  )
}
```

---

## Multi-Tenancy / Organization Support

### Database Schema

```typescript
// types/organization.ts
export interface Organization {
  id: string
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  userId: string
  organizationId: string
  role: Role
  joinedAt: string
}
```

### Session with Organization

```typescript
// Extend JWT callback to include organization
async jwt({ token, account, profile }) {
  if (account) {
    // Get user's organizations
    const orgs = await getUserOrganizations(token.id)
    token.organizations = orgs
    token.currentOrganization = orgs[0]?.id // Default to first org
  }
  return token
}

// Switch organization
export async function switchOrganization(organizationId: string) {
  'use server'
  
  const session = await getServerSession(authOptions)
  // Update session with new current organization
  // This would require a custom session store
}
```

---

## Security Best Practices

### 1. Secret Management

```env
# Generate strong secret
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Never commit secrets to git
# Use environment variables or secret management service
```

### 2. CSRF Protection

NextAuth.js includes CSRF protection by default. Ensure it's enabled:

```typescript
export const authOptions = {
  // CSRF protection enabled by default
  // Uses SameSite cookies and CSRF tokens
}
```

### 3. Secure Cookies

```typescript
export const authOptions = {
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
}
```

### 4. Token Expiration

```typescript
export const authOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // 24 hours - update session on activity
  },
}
```

### 5. Rate Limiting

Implement rate limiting on auth endpoints:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 h"), // 5 requests per hour
})

// Use in sign-in route
const { success } = await ratelimit.limit(ip)
if (!success) {
  return new Response("Too Many Requests", { status: 429 })
}
```

---

## Future Implementation

### Email/Password Authentication

```typescript
// TODO: Implement email/password provider
import CredentialsProvider from "next-auth/providers/credentials"
import { compare } from "bcrypt"

CredentialsProvider({
  name: "Email",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" }
  },
  async authorize(credentials) {
    const user = await getUserByEmail(credentials.email)
    if (!user) return null
    
    const isValid = await compare(credentials.password, user.password)
    if (!isValid) return null
    
    return user
  }
})
```

### Multi-Factor Authentication (MFA)

```typescript
// TODO: Implement MFA
// - TOTP (Time-based One-Time Password) using libraries like `otplib`
// - SMS verification using services like Twilio
// - Add MFA step after initial authentication
```

### API Key Authentication

```typescript
// TODO: Implement API key auth
// app/api/agents/route.ts
export async function GET(request: Request) {
  const apiKey = request.headers.get('X-API-Key')
  
  if (apiKey) {
    const user = await validateApiKey(apiKey)
    if (user) {
      // Proceed with API key auth
    }
  }
  
  // Fall back to session auth
  const session = await getServerSession(authOptions)
  // ...
}
```

---

## Testing

### Test Authentication in Development

```typescript
// Create test users for each role
export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    role: 'admin',
  },
  developer: {
    email: 'developer@test.com',
    role: 'agent-developer',
  },
  operator: {
    email: 'operator@test.com',
    role: 'operator',
  },
}
```

### Mock Session for Testing

```typescript
// __tests__/helpers/auth.ts
import { Session } from "next-auth"

export function mockSession(role: string = 'user'): Session {
  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}
```

---

## Resources

- **NextAuth.js Documentation**: https://next-auth.js.org
- **NextAuth.js with App Router**: https://next-auth.js.org/configuration/nextjs#in-app-router
- **OIDC Provider Setup**: https://next-auth.js.org/providers/generic-oauth
- **Security Best Practices**: https://next-auth.js.org/configuration/options#security

---

**Status:** ✅ Complete  
**Next Review:** After MVP implementation  
**Future Enhancements:** Email/password, MFA, API key authentication (documented in Future Implementation section)
