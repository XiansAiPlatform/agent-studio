'use client'

import { Lock, LogOut, Mail } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface AccountLockedProps {
  errorMessage?: string
}

export function AccountLocked({
  errorMessage = 'Your account has been locked out.',
}: AccountLockedProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Account Locked</CardTitle>
          <CardDescription>
            Your account has been locked and cannot be accessed right now
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <Lock className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription className="text-sm">
              {errorMessage}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Contact your system administrator to unlock your account</li>
              <li>Sign out and try a different account</li>
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
            <Mail className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              If you believe this is a mistake, please reach out to your
              administrator with the error details above.
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
