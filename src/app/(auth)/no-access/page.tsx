'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react'

/**
 * NoAccessPage
 * Displayed when a user has successfully authenticated but has no tenant access
 * Provides option to retry checking for access or sign out
 */
export default function NoAccessPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    // If no session, redirect to login
    if (!session) {
      router.replace('/login')
    }
  }, [session, router])

  const handleCheckAccess = async () => {
    setIsChecking(true)
    
    try {
      // Call API to check user's tenant access
      const response = await fetch('/api/user/tenants')
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.tenants && data.tenants.length > 0) {
          // User now has access, redirect to dashboard
          router.push('/dashboard')
        } else {
          // Still no access
          setIsChecking(false)
        }
      } else {
        // API error
        setIsChecking(false)
      }
    } catch (error) {
      console.error('Error checking tenant access:', error)
      setIsChecking(false)
    }
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/20 p-3">
              <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            No Tenant Access
          </CardTitle>
          <CardDescription className="text-center">
            You are signed in as <strong>{session?.user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 p-4">
            <p className="text-sm text-foreground">
              Your account does not have access to any tenants. This could be because:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
              <li>You haven&apos;t been granted access to a tenant yet</li>
              <li>Your tenant access is still being provisioned</li>
              <li>Your access has been revoked</li>
            </ul>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold mb-2">What should I do?</h3>
            <p className="text-sm text-muted-foreground">
              Please contact your system administrator to request access to a tenant. 
              Once access has been granted, click the &quot;Check Access&quot; button below to continue.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleCheckAccess}
            disabled={isChecking}
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                Checking Access...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-5 w-5" />
                Check Access
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
