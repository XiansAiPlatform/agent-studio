'use client'

import { useEffect, useState } from 'react'
import {
  ShieldCheck,
  Plus,
  RefreshCw,
  Loader2,
  MoreHorizontal,
  XCircle,
  FileKey2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useAgentCertificates } from '../hooks/use-agent-certificates'
import { AgentCertificate } from '../types'
import { GenerateCertificateDialog } from './generate-certificate-dialog'
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

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}

function certStatusBadge(cert: AgentCertificate): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (isExpired(cert.expiresAt)) return { label: 'Expired', variant: 'secondary' }
  return { label: 'Active', variant: 'default' }
}

export function AgentCertificatesSection() {
  const { certificates, isLoading, error, fetchCertificates, generateCertificate, revokeCertificate } =
    useAgentCertificates()
  const [showGenerate, setShowGenerate] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<AgentCertificate | null>(null)
  const [isRevoking, setIsRevoking] = useState(false)

  useEffect(() => {
    fetchCertificates()
  }, [fetchCertificates])

  const handleGenerate = async (name: string, revokePrevious: boolean): Promise<string> => {
    try {
      const cert = await generateCertificate(name, revokePrevious)
      toast.success(`Certificate "${name}" generated`)
      fetchCertificates()
      return cert
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate certificate')
      throw err
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    // Capture before any async gap so the value is safe after state resets
    const target = revokeTarget
    setIsRevoking(true)
    try {
      await revokeCertificate(target.thumbprint, 'Revoked by user')
      setRevokeTarget(null)
      await fetchCertificates()
      toast.success(`Certificate "${target.friendlyName ?? target.thumbprint.slice(0, 12) + '…'}" revoked`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke certificate')
    } finally {
      setIsRevoking(false)
    }
  }

  const activeCerts = certificates.filter((c) => !isExpired(c.expiresAt))

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Agent Certificates</h2>
            <p className="text-xs text-muted-foreground">
              X.509 certificates for agents to authenticate with the server
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchCertificates()}
            disabled={isLoading}
            title="Refresh"
            className="h-8 w-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowGenerate(true)} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Generate
          </Button>
        </div>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-3 rounded-lg border bg-card/60 p-3">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5 shrink-0">
          <FileKey2 className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs text-muted-foreground">
          Certificates are downloaded once at generation time. Revoking a certificate permanently
          removes it.
          {activeCerts.length > 0 && (
            <> You have <span className="font-medium text-foreground">{activeCerts.length}</span> active
            {' '}certificate{activeCerts.length !== 1 ? 's' : ''}.</>
          )}
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
        {isLoading && certificates.length === 0 ? (
          <div className="rounded-xl border bg-card px-4 py-10 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Loading certificates…
          </div>
        ) : certificates.length === 0 ? (
          <EmptyState onGenerate={() => setShowGenerate(true)} />
        ) : (
          certificates.map((cert) => {
            const { label, variant } = certStatusBadge(cert)
            return (
              <div key={cert.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-foreground truncate">
                        {cert.friendlyName ?? <span className="text-muted-foreground italic">Unnamed</span>}
                      </span>
                      <Badge variant={variant} className="text-[10px] h-4 px-1.5 shrink-0">{label}</Badge>
                    </div>
                    <code className="font-mono text-[11px] text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5 truncate block">
                      {cert.thumbprint.slice(0, 24)}…
                    </code>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setRevokeTarget(cert)}
                        className="text-destructive focus:text-destructive"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Revoke
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid grid-cols-2 gap-x-4 text-[11px] text-muted-foreground/80">
                  <span>Issued: {formatDate(cert.issuedAt)}</span>
                  <span>Expires: {formatDate(cert.expiresAt)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Table (md+) */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                Thumbprint
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && certificates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading certificates…
                </td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12">
                  <EmptyState onGenerate={() => setShowGenerate(true)} />
                </td>
              </tr>
            ) : (
              certificates.map((cert) => {
                const { label, variant } = certStatusBadge(cert)
                return (
                  <tr
                    key={cert.id}
                    className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">
                        {cert.friendlyName ?? <span className="text-muted-foreground italic text-xs">Unnamed</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <code className="font-mono text-xs text-muted-foreground bg-muted/60 rounded px-1.5 py-0.5">
                        {cert.thumbprint.slice(0, 24)}…
                      </code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(cert.issuedAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(cert.expiresAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={variant} className="text-[10px] h-4 px-1.5">{label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setRevokeTarget(cert)}
                            className="text-destructive focus:text-destructive"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Revoke
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

      {/* Dialogs */}
      <GenerateCertificateDialog
        open={showGenerate}
        onOpenChange={setShowGenerate}
        onGenerate={handleGenerate}
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => { if (!open) setRevokeTarget(null) }}
        title="Revoke Certificate"
        description={`Revoke "${revokeTarget?.friendlyName ?? revokeTarget?.thumbprint.slice(0, 16) + '…'}"? This permanently removes the certificate — any agent using it will lose access immediately.`}
        confirmLabel="Revoke"
        isDestructive
        isLoading={isRevoking}
        onConfirm={handleRevoke}
      />
    </div>
  )
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <ShieldCheck className="h-8 w-8 mx-auto mb-3 opacity-30" />
      <p className="font-medium text-foreground text-sm">No certificates yet</p>
      <p className="text-xs mt-1 mb-4">Generate a certificate to authenticate your agents</p>
      <Button size="sm" onClick={onGenerate} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Generate Certificate
      </Button>
    </div>
  )
}
