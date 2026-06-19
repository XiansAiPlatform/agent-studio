'use client'

import { useEffect, useState } from 'react'
import {
  KeyRound,
  Plus,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  XCircle,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useAdminApiKeys } from '../hooks/use-admin-apikeys'
import { AdminApiKey } from '../types'
import { CreateApiKeyDialog } from './create-apikey-dialog'
import { RotateApiKeyDialog } from './rotate-apikey-dialog'
import { ConfirmDialog } from './confirm-dialog'

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminApiKeysSection() {
  const { keys, isLoading, error, fetchKeys, createKey, revokeKey, rotateKey } = useAdminApiKeys()
  const [showCreate, setShowCreate] = useState(false)
  const [rotateTarget, setRotateTarget] = useState<AdminApiKey | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AdminApiKey | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [fetchKeys])

  const handleCreate = async (name: string) => {
    try {
      const res = await createKey(name)
      toast.success(`API key "${name}" created`)
      fetchKeys()
      return res
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create API key')
      throw err
    }
  }

  const handleRotate = async (id: string) => {
    try {
      const res = await rotateKey(id)
      toast.success('API key rotated successfully')
      fetchKeys()
      return res
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rotate API key')
      throw err
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    setIsRevoking(true)
    try {
      await revokeKey(revokeTarget.id)
      toast.success(`API key "${revokeTarget.name}" revoked`)
      setRevokeTarget(null)
      fetchKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke API key')
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Admin API Keys</h2>
            <p className="text-xs text-muted-foreground">
              Named, revocable tokens for programmatic access to the Admin API
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchKeys()}
            disabled={isLoading}
            title="Refresh"
            className="h-8 w-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Key
          </Button>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-lg border bg-card/60 p-3">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5 shrink-0">
          <ShieldAlert className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs text-muted-foreground">
          API key values are only shown once at creation or rotation. Keys are tied to your account
          and can be rotated or revoked at any time.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && keys.length === 0 ? (
          <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading API keys…
          </div>
        ) : keys.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : (
          keys.map((key) => (
            <div key={key.id} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium text-sm text-foreground truncate">{key.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Created {formatDate(key.createdAt)}
                  </p>
                  {key.lastRotatedAt && (
                    <p className="text-[11px] text-muted-foreground">
                      Last rotated {formatDate(key.lastRotatedAt)}
                    </p>
                  )}
                </div>
                <KeyActions
                  apiKey={key}
                  onRotate={() => setRotateTarget(key)}
                  onRevoke={() => setRevokeTarget(key)}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table (md+) */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                Last Rotated
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && keys.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading API keys…
                </td>
              </tr>
            ) : keys.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12">
                  <EmptyState onCreate={() => setShowCreate(true)} />
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr
                  key={key.id}
                  className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{key.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    <div>{formatDate(key.createdAt)}</div>
                    <div className="text-muted-foreground/60">{key.createdBy}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                    {formatDate(key.lastRotatedAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <KeyActions
                      apiKey={key}
                      onRotate={() => setRotateTarget(key)}
                      onRevoke={() => setRevokeTarget(key)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      <CreateApiKeyDialog
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreate={handleCreate}
      />

      <RotateApiKeyDialog
        apiKey={rotateTarget}
        open={rotateTarget !== null}
        onOpenChange={(open) => { if (!open) setRotateTarget(null) }}
        onRotate={handleRotate}
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null) }}
        title="Revoke API Key"
        description={`Permanently revoke "${revokeTarget?.name}"? This action cannot be undone. Any services using this key will lose access immediately.`}
        confirmLabel="Revoke Key"
        isDestructive
        isLoading={isRevoking}
        onConfirm={handleRevoke}
      />
    </div>
  )
}

function KeyActions({
  apiKey,
  onRotate,
  onRevoke,
}: {
  apiKey: AdminApiKey
  onRotate: () => void
  onRevoke: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
          <MoreHorizontal className="h-3.5 w-3.5" />
          <span className="sr-only">Actions for {apiKey.name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onRotate}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Rotate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onRevoke}
          className="text-destructive focus:text-destructive"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Revoke
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <KeyRound className="h-8 w-8 mx-auto mb-3 opacity-30" />
      <p className="font-medium text-foreground text-sm">No API keys yet</p>
      <p className="text-xs mt-1 mb-4">Create an API key for programmatic access</p>
      <Button size="sm" onClick={onCreate} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        New API Key
      </Button>
    </div>
  )
}
