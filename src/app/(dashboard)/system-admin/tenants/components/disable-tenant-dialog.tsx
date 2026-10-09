'use client'

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
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Tenant } from '../types'

interface DisableTenantDialogProps {
  tenant: Tenant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDisabling: boolean
  /** Active agent activations in the tenant; null while loading or when the count failed. */
  activeAgentCount: number | null
  isLoadingCount: boolean
}

function describeAgents(count: number | null, isLoading: boolean) {
  if (isLoading) return 'all of its running agents'
  if (count === null) return 'all of its running agents'
  if (count === 0) return 'any agents that are running'
  return `all ${count} running agent${count === 1 ? '' : 's'}`
}

export function DisableTenantDialog({
  tenant,
  open,
  onOpenChange,
  onConfirm,
  isDisabling,
  activeAgentCount,
  isLoadingCount,
}: DisableTenantDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable tenant?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Disabling{' '}
                <span className="font-medium text-foreground">{tenant?.name}</span>{' '}
                (<span className="font-mono">{tenant?.tenantId}</span>) will block its
                users and deactivate{' '}
                <span className="font-medium text-foreground">
                  {describeAgents(activeAgentCount, isLoadingCount)}
                </span>
                {isLoadingCount && (
                  <Loader2 className="ml-1 inline h-3 w-3 animate-spin" aria-label="Counting agents" />
                )}
                {' '}(workflows cancelled, schedules deleted).
              </p>
              <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Re-enabling the tenant will <span className="font-semibold">not</span>{' '}
                  reactivate these agents. They must be activated again manually.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabling}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDisabling}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Disable tenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
