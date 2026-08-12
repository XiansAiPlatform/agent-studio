'use client'

import { useEffect, useState } from 'react'
import { Workflow, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
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
import {
  DashboardPage,
  DashboardPageBody,
  DashboardPageHeader,
} from '@/components/layout/dashboard-page'
import { useTemporalConfig } from './hooks/use-temporal-config'
import { TemporalConfig } from './types'

const EMPTY_FORM: TemporalConfig = {
  serverUrl: '',
  namespace: '',
  certificateBase64: '',
  privateKeyBase64: '',
}

export default function TemporalSettingsPage() {
  const {
    config,
    isLoading,
    error,
    isMutating,
    fetchConfig,
    saveConfig,
    deleteConfig,
  } = useTemporalConfig()

  const [form, setForm] = useState<TemporalConfig>(EMPTY_FORM)
  const [revertOpen, setRevertOpen] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  useEffect(() => {
    setForm(
      config ?? {
        serverUrl: '',
        namespace: '',
        certificateBase64: '',
        privateKeyBase64: '',
      }
    )
  }, [config])

  const hasOverride = config !== null

  const canSave =
    form.serverUrl.trim() !== '' &&
    form.namespace.trim() !== '' &&
    Boolean(form.certificateBase64?.trim()) === Boolean(form.privateKeyBase64?.trim())

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
        certificateBase64: form.certificateBase64?.trim() || undefined,
        privateKeyBase64: form.privateKeyBase64?.trim() || undefined,
      })
      toast.success('Temporal configuration saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save Temporal configuration')
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

  return (
    <DashboardPage width="narrow">
      <DashboardPageHeader
        title="Temporal"
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
                : 'This tenant is currently using the default/shared Temporal server. Fill in the fields below to override it.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && !config ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : (
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
                    Client certificate (base64) — optional, required for Temporal Cloud
                  </Label>
                  <Textarea
                    id="temporal-certificate"
                    placeholder={
                      hasOverride
                        ? 'Leave unchanged to keep the existing certificate, or paste a new one to replace it'
                        : 'Paste base64-encoded certificate'
                    }
                    className="font-mono text-xs min-h-24"
                    value={form.certificateBase64 ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, certificateBase64: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temporal-private-key">
                    Client private key (base64) — optional, required for Temporal Cloud
                  </Label>
                  <Textarea
                    id="temporal-private-key"
                    placeholder={
                      hasOverride
                        ? 'Leave unchanged to keep the existing private key, or paste a new one to replace it'
                        : 'Paste base64-encoded private key'
                    }
                    className="font-mono text-xs min-h-24"
                    value={form.privateKeyBase64 ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, privateKeyBase64: e.target.value }))}
                  />
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="gap-2 border-t">
            <Button onClick={handleSave} disabled={!canSave || isMutating} className="gap-2">
              {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
            <Button
              variant="ghost"
              onClick={() => setRevertOpen(true)}
              disabled={isMutating || !hasOverride}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Revert to default
            </Button>
          </CardFooter>
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
