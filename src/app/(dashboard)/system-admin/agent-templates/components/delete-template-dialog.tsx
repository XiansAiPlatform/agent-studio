'use client'

import { useEffect, useState } from 'react'
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
import { AlertTriangle, Building2, Loader2 } from 'lucide-react'
import { AgentTemplate, TemplateDeployments } from '../types'

interface DeleteTemplateDialogProps {
  template: AgentTemplate | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
  /** Loads the tenants that have a deployed instance of the template. */
  fetchDeployments: (templateId: string) => Promise<TemplateDeployments>
  /** Optional map of tenantId → display name for nicer tenant labels. */
  tenantNameById?: Record<string, string>
}

export function DeleteTemplateDialog({
  template,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
  fetchDeployments,
  tenantNameById = {},
}: DeleteTemplateDialogProps) {
  const [deployments, setDeployments] = useState<TemplateDeployments | null>(null)
  const [isLoadingDeployments, setIsLoadingDeployments] = useState(false)
  const [deploymentsError, setDeploymentsError] = useState<string | null>(null)

  // Check for existing deployments whenever the dialog opens so the sys admin
  // gets an explicit warning before deleting a template that is in use.
  useEffect(() => {
    if (!open || !template) {
      setDeployments(null)
      setDeploymentsError(null)
      return
    }
    let cancelled = false
    setIsLoadingDeployments(true)
    fetchDeployments(template.agent.id)
      .then((data) => {
        if (!cancelled) setDeployments(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setDeploymentsError(
            err instanceof Error ? err.message : 'Failed to check deployments'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDeployments(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, template, fetchDeployments])

  const deploymentCount = deployments?.deploymentCount ?? 0
  const hasDeployments = deploymentCount > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete agent template?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the template{' '}
            <span className="font-medium text-foreground">
              {template?.agent.name}
            </span>{' '}
            along with its workflow definitions and system-scoped knowledge.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Deployment check */}
        {isLoadingDeployments ? (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            Checking tenant deployments…
          </div>
        ) : deploymentsError ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            Could not verify deployments: {deploymentsError}
          </div>
        ) : hasDeployments ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                This template is currently deployed in{' '}
                <span className="font-semibold">
                  {deploymentCount} {deploymentCount === 1 ? 'tenant' : 'tenants'}
                </span>
                . Deployed agent instances will keep running, but the template
                will no longer be available for new deployments.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-6">
              {deployments!.deployments.map((d) => (
                <Badge key={d.agentId} variant="outline" className="gap-1 text-xs">
                  <Building2 className="h-3 w-3" />
                  {(d.tenant && tenantNameById[d.tenant]) || d.tenant || 'Unknown tenant'}
                </Badge>
              ))}
            </div>
          </div>
        ) : deployments ? (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            No tenant deployments found for this template.
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDeleting || isLoadingDeployments}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Template
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
