import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { hasCapability } from '@/lib/auth/capabilities'
import { getCapabilitiesFromSession } from '@/lib/auth/server-capabilities'

export const dynamic = 'force-dynamic'

/**
 * OIDC Providers settings — system administrators only.
 * Nested under tenant-settings (tenant-scoped config) but gated more tightly
 * than Users/Branding because provider acceptance is a platform security control.
 */
export default async function OidcSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  const capabilities = await getCapabilitiesFromSession(session, null)

  if (!hasCapability(capabilities, 'system:admin')) {
    console.log(
      '[OIDC Settings Layout] Access denied - missing system:admin capability, redirecting to dashboard'
    )
    redirect('/dashboard')
  }

  return <>{children}</>
}
