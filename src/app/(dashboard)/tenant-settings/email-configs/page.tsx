'use client'

import {
  DashboardPage,
  DashboardPageBody,
  DashboardPageHeader,
} from '@/components/layout/dashboard-page'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useEmailConfig } from './hooks/use-email-config'
import { EmailConfigForm, SmtpSecurity } from './types'
import {
  SECURITY_OPTIONS,
  describeStatus,
  toForm,
  usingLabel,
  validateSmtp,
} from './utils'

export default function EmailConfigsPage() {
  const {
    status,
    isLoading,
    error,
    isMutating,
    isTesting,
    fetchConfig,
    saveConfig,
    deleteConfig,
    sendTestEmail,
  } = useEmailConfig()

  const [form, setForm] = useState<EmailConfigForm>(toForm(null))
  const [resetOpen, setResetOpen] = useState(false)

  // Reset the form whenever a new status arrives (load, save, reset).
  const [formStatus, setFormStatus] = useState(status)
  if (formStatus !== status) {
    setFormStatus(status)
    setForm(toForm(status))
  }

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const update = <K extends keyof EmailConfigForm>(key: K, value: EmailConfigForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSecurityChange = (value: string) => {
    const security = value as SmtpSecurity
    const option = SECURITY_OPTIONS.find((o) => o.value === security)
    // Suggest the usual port for the chosen security, unless a custom port was typed.
    setForm((f) => {
      const usualPorts = SECURITY_OPTIONS.map((o) => String(o.port))
      const port = option && usualPorts.includes(f.port) ? String(option.port) : f.port
      return { ...f, security, port }
    })
  }

  const isTenantOverride = status?.source === 'Tenant'
  const formError = validateSmtp(form)
  const busy = isMutating || isTesting

  const handleSave = async () => {
    if (formError) {
      toast.error(formError)
      return
    }
    try {
      await saveConfig(form)
      toast.success('Email configuration saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save email configuration')
    }
  }

  const handleSendTest = async () => {
    if (formError) {
      toast.error(formError)
      return
    }
    try {
      const to = await sendTestEmail(form)
      toast.success(`Test email sent to ${to}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send test email')
    }
  }

  const handleReset = async () => {
    try {
      await deleteConfig()
      toast.success('Reset to the server default')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset to the server default')
    } finally {
      setResetOpen(false)
    }
  }

  return (
    <DashboardPage width="narrow">
      <DashboardPageHeader
        title="Email"
        description="The email server used to send notifications to this tenant's users and admins."
        icon={<Mail className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />}
      />

      <DashboardPageBody className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>Email server (SMTP)</CardTitle>
              {status && (
                <Badge variant={status.source === 'None' ? 'outline' : 'secondary'}>
                  Using: {usingLabel(status)}
                </Badge>
              )}
            </div>
            <CardDescription>
              {status
                ? describeStatus(status)
                : "Use the platform's default email server, or set your own SMTP server for this tenant."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && !status ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
                  <div className="space-y-2">
                    <Label htmlFor="email-host">Host</Label>
                    <Input
                      id="email-host"
                      placeholder="smtp.example.com"
                      value={form.host}
                      onChange={(e) => update('host', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-port">Port</Label>
                    <Input
                      id="email-port"
                      inputMode="numeric"
                      value={form.port}
                      onChange={(e) => update('port', e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-security">Security</Label>
                  <Select value={form.security} onValueChange={handleSecurityChange}>
                    <SelectTrigger id="email-security" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECURITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email-username">Username</Label>
                    <Input
                      id="email-username"
                      autoComplete="off"
                      placeholder="user@example.com"
                      value={form.username}
                      onChange={(e) => update('username', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-password">Password</Label>
                    <Input
                      id="email-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder={
                        isTenantOverride && status?.hasPassword
                          ? 'Leave blank to keep the saved password'
                          : ''
                      }
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email-sender-email">Sender email</Label>
                    <Input
                      id="email-sender-email"
                      type="email"
                      placeholder="noreply@example.com"
                      value={form.senderEmail}
                      onChange={(e) => update('senderEmail', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-sender-name">Sender name — optional</Label>
                    <Input
                      id="email-sender-name"
                      placeholder="Xians"
                      value={form.senderName}
                      onChange={(e) => update('senderName', e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
          {status && (
            <CardFooter className="flex-wrap gap-2 border-t">
              <Button onClick={handleSave} disabled={formError !== null || busy} className="gap-2">
                {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleSendTest}
                disabled={formError !== null || busy}
                className="gap-2"
              >
                {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                Send test email
              </Button>
              {isTenantOverride && (
                <Button
                  variant="ghost"
                  onClick={() => setResetOpen(true)}
                  disabled={busy}
                  className="sm:ml-auto"
                >
                  Reset to server default
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      </DashboardPageBody>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to the server default?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the tenant&apos;s SMTP settings. Emails will be sent through the
              platform&apos;s default email server, or not at all if the platform has none.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              disabled={isMutating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isMutating ? 'Resetting…' : 'Reset to default'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPage>
  )
}
