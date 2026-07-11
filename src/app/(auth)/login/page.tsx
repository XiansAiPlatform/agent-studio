import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { SignInForm } from "./sign-in-form"
import { useTenantProvider } from "@/lib/tenant"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    // Determine destination based on tenant access. Note: redirect() throws a
    // NEXT_REDIRECT control-flow signal, so it must be called OUTSIDE the
    // try/catch - otherwise the catch swallows it and logs a false error.
    let destination = '/dashboard'
    try {
      const tenantProvider = useTenantProvider()
      const userTenants = await tenantProvider.getUserTenants(
        session.user.id,
        session.accessToken,
        session.user.email ?? undefined
      )

      if (userTenants.length === 0) {
        destination = '/no-access'
      }
    } catch (error) {
      console.error('[Login] Error checking tenant access:', error)
      // Fall back to dashboard and let client-side validation handle it
    }

    redirect(destination)
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignInForm />
    </div>
  )
}
