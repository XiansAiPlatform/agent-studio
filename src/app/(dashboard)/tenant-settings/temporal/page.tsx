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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Workflow } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTemporalConfig } from './hooks/use-temporal-config'
import { TemporalConfig } from './types'

const EMPTY_FORM: TemporalConfig = {
  serverUrl: '',
  namespace: '',
  certificate: '',
  privateKey: '',
}

export default function TemporalSettingsPage() {
  const {
    status,
    isLoading,
    error,
    isMutating,
    isTesting,
    fetchConfig,
    saveConfig,
    deleteConfig,
    testConnection,
  } = useTemporalConfig()

  const [form, setForm] = useState<TemporalConfig>(EMPTY_FORM)
  const [revertOpen, setRevertOpen] = useState(false)
  // Whether the dedicated-connection form is shown. Mirrors hasOverride once
  // status loads, but can be flipped on locally (before saving) to let an
  // admin start configuring an override without one existing yet.
  const [useCustom, setUseCustom] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    setForm(
      status
        ? { serverUrl: status.serverUrl, namespace: status.namespace }
        : { serverUrl: '', namespace: '', certificate: '', privateKey: '' }
    )
    setUseCustom(status != null)
  }, [status])

  const hasOverride = status != null

  const canSave =
    form.serverUrl.trim() !== '' &&
    form.namespace.trim() !== '' &&
    Boolean(form.certificate?.trim()) === Boolean(form.privateKey?.trim())

  const handleSave = async () => {
    if (!canSave) {
      toast.error(
        'Server URL and namespace are required, and certificate/private key must be provided together.'
      )
      return
    }
    try {
      await saveConfig({
        serverUrl: form.serverUrl.trim(),
        namespace: form.namespace.trim(),
        certificate: form.certificate?.trim() || undefined,
        privateKey: form.privateKey?.trim() || undefined,
      })
      toast.success('Temporal configuration saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save Temporal configuration')
    }
  }

  const handleTestConnection = async () => {
    if (!canSave) {
      toast.error(
        'Server URL and namespace are required, and certificate/private key must be provided together.'
      )
      return
    }
    try {
      await testConnection({
        serverUrl: form.serverUrl.trim(),
        namespace: form.namespace.trim(),
        certificate: form.certificate?.trim() || undefined,
        privateKey: form.privateKey?.trim() || undefined,
      })
      toast.success('Connected successfully')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not connect to Temporal')
    }
  }

  const handleRevert = async () => {
    try {
      await deleteConfig()
      toast.success('Reverted to the default Temporal configuration')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to revert to the default Temporal configuration'
      )
    } finally {
      setRevertOpen(false)
    }
  }

  const handleToggleCustom = (checked: boolean) => {
    if (checked) {
      // No API call yet — just reveals the form so the admin can fill it in and Save.
      setUseCustom(true)
      return
    }

    if (hasOverride) {
      // An override already exists: confirm before reverting. The switch stays "on"
      // until the revert actually succeeds and status refreshes.
      setRevertOpen(true)
      return
    }

    // Nothing saved yet — just hide the form again.
    setUseCustom(false)
  }

  return (
    <DashboardPage width="narrow">
      <DashboardPageHeader
        title="Temporal Connectivity"
        description="Give this tenant its own Temporal server connection, or leave it unset to use the default."
        icon={<Workflow className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />}
      />

      <DashboardPageBody className="space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Temporal connection</CardTitle>
            <CardDescription>
              {hasOverride
                ? 'This tenant connects to a dedicated Temporal server.'
                : 'This tenant is currently using the default/shared Temporal server.'}
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
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="temporal-use-custom">Use a dedicated Temporal connection</Label>
                    <p className="text-xs text-muted-foreground">
                      {useCustom
                        ? 'Configured below — this tenant does not use the default Temporal server.'
                        : 'Off — this tenant uses the platform’s default Temporal server.'}
                    </p>
                  </div>
                  <Switch
                    id="temporal-use-custom"
                    checked={useCustom}
                    onCheckedChange={handleToggleCustom}
                    disabled={isMutating}
                  />
                </div>

                {useCustom && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="temporal-server-url">Server URL</Label>
                      <Input
                        id="temporal-server-url"
                        placeholder="your-namespace.tmprl.cloud:7233"
                        value={form.serverUrl}
                        onChange={(e) => setForm((f) => ({ ...f, serverUrl: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="temporal-namespace">Namespace</Label>
                      <Input
                        id="temporal-namespace"
                        placeholder="your-namespace"
                        value={form.namespace}
                        onChange={(e) => setForm((f) => ({ ...f, namespace: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="temporal-certificate">
                        Client certificate (base64) — optional
                      </Label>
                      <Textarea
                        id="temporal-certificate"
                        placeholder={
                          hasOverride
                            ? 'Leave unchanged to keep the existing certificate, or paste a new one to replace it'
                            : 'Paste base64-encoded certificate'
                        }
                        className="font-mono text-xs min-h-24"
                        value={form.certificate ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, certificate: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="temporal-private-key">
                        Client private key (base64) — optional
                      </Label>
                      <Textarea
                        id="temporal-private-key"
                        placeholder={
                          hasOverride
                            ? 'Leave unchanged to keep the existing private key, or paste a new one to replace it'
                            : 'Paste base64-encoded private key'
                        }
                        className="font-mono text-xs min-h-24"
                        value={form.privateKey ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, privateKey: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
          {useCustom && (
            <CardFooter className="gap-2 border-t">
              <Button onClick={handleSave} disabled={!canSave || isMutating || isTesting} className="gap-2">
                {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={!canSave || isMutating || isTesting}
                className="gap-2"
              >
                {isTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                Test connection
              </Button>
            </CardFooter>
          )}
        </Card>
      </DashboardPageBody>

      <AlertDialog open={revertOpen} onOpenChange={setRevertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to the default Temporal server?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the tenant&apos;s dedicated Temporal connection. Workflows for this
              tenant will start connecting to the platform&apos;s default Temporal server instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevert}
              disabled={isMutating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isMutating ? 'Reverting…' : 'Revert to default'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPage>
  )
}
