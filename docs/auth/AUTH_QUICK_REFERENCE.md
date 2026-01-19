# Authentication Quick Reference

## 🔑 Common Patterns

### Sign In Button

```tsx
'use client'
import { signIn } from 'next-auth/react'

<button onClick={() => signIn('google', { callbackUrl: '/dashboard' })}>
  Sign in with Google
</button>
```

### Sign Out Button

```tsx
'use client'
import { signOut } from 'next-auth/react'

<button onClick={() => signOut({ callbackUrl: '/login' })}>
  Sign Out
</button>
```

### Client Component - Check Auth Status

```tsx
'use client'
import { useAuth } from '@/hooks/use-auth'

export function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) return <div>Loading...</div>
  if (!isAuthenticated) return <div>Please sign in</div>
  
  return <div>Hello {user?.name}</div>
}
```

### Server Component - Require Auth

```tsx
import { requireAuth } from '@/lib/auth'

export default async function ProtectedPage() {
  const session = await requireAuth() // Auto-redirects if not logged in
  
  return <div>Protected content for {session.user.name}</div>
}
```

### Server Component - Optional Auth

```tsx
import { getCurrentSession } from '@/lib/auth'

export default async function PublicPage() {
  const session = await getCurrentSession() // null if not logged in
  
  return (
    <div>
      {session ? `Welcome back, ${session.user.name}` : 'Welcome, guest'}
    </div>
  )
}
```

### API Route Protection

```tsx
import { getCurrentSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getCurrentSession()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return NextResponse.json({ data: 'Protected data' })
}
```

### Server Action Protection

```tsx
'use server'

import { requireAuth } from '@/lib/auth'

export async function deleteAgent(agentId: string) {
  const session = await requireAuth()
  
  // Your logic here
  console.log(`User ${session.user.email} deleting agent ${agentId}`)
}
```

### Conditional Rendering by Auth

```tsx
'use client'
import { useAuth } from '@/hooks/use-auth'

export function NavBar() {
  const { isAuthenticated } = useAuth()
  
  return (
    <nav>
      {isAuthenticated ? (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/profile">Profile</Link>
        </>
      ) : (
        <Link href="/login">Sign In</Link>
      )}
    </nav>
  )
}
```

### Get User Email/Name in Component

```tsx
'use client'
import { useSession } from 'next-auth/react'

export function UserGreeting() {
  const { data: session } = useSession()
  
  return <h1>Hello, {session?.user?.name || 'Guest'}!</h1>
}
```

### Server-side User Data

```tsx
import { getCurrentSession } from '@/lib/auth'

export default async function ProfilePage() {
  const session = await getCurrentSession()
  
  return (
    <div>
      <p>Name: {session?.user?.name}</p>
      <p>Email: {session?.user?.email}</p>
      <img src={session?.user?.image || ''} alt="Avatar" />
    </div>
  )
}
```

---

## 📂 File Locations

- **Auth API**: `src/app/api/auth/[...nextauth]/route.ts`
- **Login Page**: `src/app/(auth)/login/page.tsx`
- **Middleware**: `middleware.ts` (root)
- **Types**: `src/types/next-auth.d.ts`
- **Helpers**: `src/lib/auth.ts`
- **Hook**: `src/hooks/use-auth.ts`

---

## 🔧 Environment Variables

```env
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=<generated-secret>
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>
```

---

## 🛡️ Protected Routes (via Middleware)

Routes automatically requiring authentication:
- `/dashboard/*`
- `/agents/*`
- `/conversations/*`
- `/tasks/*`
- `/knowledge/*`

Update in `middleware.ts` to protect more routes.
