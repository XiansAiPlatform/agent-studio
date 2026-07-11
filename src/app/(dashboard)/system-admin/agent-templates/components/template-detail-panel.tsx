'use client'

import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  Info,
  Loader2,
  MessageSquareQuote,
  Package,
  Trash2,
  Workflow,
} from 'lucide-react'
import { AgentTemplate, TemplateDeployments } from '../types'

interface TemplateDetailPanelProps {
  template: AgentTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Loads the tenants that have a deployed instance of the template. */
  fetchDeployments: (templateId: string) => Promise<TemplateDeployments>
  /** Optional map of tenantId → display name for nicer tenant labels. */
  tenantNameById?: Record<string, string>
  /** Called when the user chooses to delete the template from the panel. */
  onDelete: (template: AgentTemplate) => void
}

function formatDate(value: string | undefined | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium text-foreground min-w-0 break-words">
        {value ?? '—'}
      </span>
    </div>
  )
}

export function TemplateDetailPanel({
  template,
  open,
  onOpenChange,
  fetchDeployments,
  tenantNameById = {},
  onDelete,
}: TemplateDetailPanelProps) {
  const [deployments, setDeployments] = useState<TemplateDeployments | null>(null)
  const [isDeploymentsLoading, setIsDeploymentsLoading] = useState(false)
  const [deploymentsError, setDeploymentsError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !template) {
      setDeployments(null)
      setDeploymentsError(null)
      return
    }
    let cancelled = false
    setIsDeploymentsLoading(true)
    fetchDeployments(template.agent.id)
      .then((data) => {
        if (!cancelled) setDeployments(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setDeploymentsError(
            err instanceof Error ? err.message : 'Failed to load deployments'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsDeploymentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, template, fetchDeployments])

  if (!template) return null

  const { agent, definitions } = template

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg p-0 gap-0">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-6 pt-6 pb-5 border-b">
          <div className="flex items-center gap-4 pr-8">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold truncate">
                {agent.name}
              </SheetTitle>
              <SheetDescription className="text-sm truncate mt-0.5">
                {agent.summary || agent.description || 'System-wide agent template'}
              </SheetDescription>
            </div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {agent.category && (
                <Badge variant="secondary" className="text-xs">{agent.category}</Badge>
              )}
              {agent.version && (
                <Badge variant="outline" className="text-xs">v{agent.version}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Overview */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Overview</h3>
            </div>
            {agent.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {agent.description}
              </p>
            )}
            <div className="rounded-lg border p-3 space-y-2">
              <InfoRow label="Author" value={agent.author || '—'} />
              <InfoRow label="Created by" value={agent.createdBy || '—'} />
              <InfoRow label="Created" value={formatDate(agent.createdAt)} />
              <InfoRow label="Version" value={agent.version || '—'} />
              <InfoRow label="Category" value={agent.category || '—'} />
            </div>
          </div>

          <Separator />

          {/* Workflows */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Workflow className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Workflows</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {definitions.length}{' '}
                {definitions.length === 1 ? 'workflow' : 'workflows'}
              </Badge>
            </div>
            {definitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No workflow definitions.
              </p>
            ) : (
              <div className="space-y-2">
                {definitions.map((def) => (
                  <div key={def.id ?? def.workflowType} className="rounded-lg border p-3">
                    <p className="text-sm font-medium truncate">
                      {def.name || def.workflowType}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                      {def.workflowType}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sample prompts */}
          {agent.samplePrompts && agent.samplePrompts.length > 0 && (
            <>
              <Separator />
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquareQuote className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Sample Prompts</h3>
                </div>
                <ul className="space-y-2">
                  {agent.samplePrompts.map((prompt, i) => (
                    <li
                      key={i}
                      className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground"
                    >
                      {prompt}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <Separator />

          {/* Deployments */}
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Tenant Deployments</h3>
              </div>
              {deployments && (
                <Badge variant="secondary" className="text-xs">
                  {deployments.deploymentCount}{' '}
                  {deployments.deploymentCount === 1 ? 'tenant' : 'tenants'}
                </Badge>
              )}
            </div>

            {isDeploymentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading deployments…
              </div>
            ) : deploymentsError ? (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {deploymentsError}
              </div>
            ) : !deployments || deployments.deploymentCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                This template is not deployed in any tenant.
              </p>
            ) : (
              <div className="space-y-2">
                {deployments.deployments.map((d) => (
                  <div
                    key={d.agentId}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(d.tenant && tenantNameById[d.tenant]) || d.tenant || 'Unknown tenant'}
                        </p>
                        {d.tenant && tenantNameById[d.tenant] && (
                          <p className="text-xs text-muted-foreground truncate font-mono">
                            {d.tenant}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs text-muted-foreground">
                        {formatDate(d.createdAt)}
                      </p>
                      {d.createdBy && (
                        <p className="text-xs text-muted-foreground truncate max-w-[10rem]">
                          by {d.createdBy}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="border-t px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(template)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete Template
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
