import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { SignInForm } from "./sign-in-form"
import { useTenantProvider } from "@/lib/tenant"

export default async function LoginPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    // Check if user has tenant access
    try {
      const tenantProvider = useTenantProvider()
      const userTenants = await tenantProvider.getUserTenants(
        session.user.id,
        session.accessToken,
        session.user.email ?? undefined
      )
      
      if (userTenants.length === 0) {
        // User has no tenant access, redirect to no-access page
        redirect('/no-access')
      }
      
      // User has tenant access, proceed to dashboard
      redirect('/dashboard')
    } catch (error) {
      console.error('[Login] Error checking tenant access:', error)
      // If error occurs, still redirect to dashboard and let client-side handle it
      redirect('/dashboard')
    }
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SignInForm />
    </div>
  )
}
