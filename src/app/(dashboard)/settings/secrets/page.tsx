'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Loader2,
  ShieldCheck,
  MoreHorizontal,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useSecrets } from './hooks/use-secrets'
import { CreateSecretRequest, TenantSecret, getSecretDescription } from './types'
import { AddSecretDialog } from './components/add-secret-dialog'
import { DeleteSecretDialog } from './components/delete-secret-dialog'

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

export default function SecretsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<TenantSecret | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { secrets, isLoading, error, fetchSecrets, createSecret, deleteSecret } =
    useSecrets()

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  const filteredSecrets = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? secrets.filter((s) => {
          if (s.key.toLowerCase().includes(q)) return true
          const desc = getSecretDescription(s)
          return desc ? desc.toLowerCase().includes(q) : false
        })
      : secrets
    return [...list].sort((a, b) =>
      a.key.localeCompare(b.key, undefined, { sensitivity: 'base' })
    )
  }, [secrets, search])

  const handleAdd = async (data: CreateSecretRequest) => {
    try {
      await createSecret(data)
      toast.success(`Secret "${data.key}" added`)
      fetchSecrets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add secret')
      throw err
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteSecret(deleteTarget.id)
      toast.success(`Secret "${deleteTarget.key}" deleted`)
      setDeleteTarget(null)
      fetchSecrets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete secret')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCopyKey = async (secret: TenantSecret) => {
    try {
      await navigator.clipboard.writeText(secret.key)
      setCopiedId(secret.id)
      toast.success('Key copied to clipboard')
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === secret.id ? null : prev))
      }, 1500)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
                <KeyRound className="h-6 w-6 text-primary" />
                Secrets
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage tenant-scoped secrets used by your agents and integrations
              </p>
            </div>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Secret
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6 space-y-4">
        {/* Security notice */}
        <div className="flex items-start gap-3 rounded-lg border bg-card/60 p-4">
          <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">Values are write-only</p>
            <p className="text-muted-foreground mt-0.5">
              For your security, secret values are never displayed after they are saved.
              Only the keys are visible here. To rotate a secret, delete it and create a
              new one with the same key.
            </p>
          </div>
        </div>

        {/* Search + refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by key or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchSecrets()}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {secrets.length > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">
              {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'}
            </span>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Key
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Created
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Created by
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading && secrets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading secrets…
                  </td>
                </tr>
              ) : filteredSecrets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground">
                    <KeyRound className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium text-foreground">
                      {search ? 'No matching secrets' : 'No secrets yet'}
                    </p>
                    <p className="text-xs mt-1">
                      {search
                        ? 'Try a different search term'
                        : 'Add your first secret to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSecrets.map((secret) => {
                  const copied = copiedId === secret.id
                  const description = getSecretDescription(secret)
                  return (
                    <tr
                      key={secret.id}
                      className="border-b last:border-b-0 hover:bg-muted/30 transition-colors align-top"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-foreground bg-muted/60 rounded px-1.5 py-0.5 text-xs">
                            {secret.key}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(secret)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy key"
                            aria-label={`Copy key ${secret.key}`}
                          >
                            {copied ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 max-w-md">
                            {description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 md:hidden">
                          {formatDate(secret.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {formatDate(secret.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {secret.createdBy || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions for {secret.key}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyKey(secret)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy key
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(secret)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <AddSecretDialog open={showAdd} onOpenChange={setShowAdd} onSubmit={handleAdd} />

      <DeleteSecretDialog
        secret={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  )
}
