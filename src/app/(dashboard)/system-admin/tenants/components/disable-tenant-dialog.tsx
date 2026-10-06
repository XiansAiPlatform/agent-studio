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
import { Loader2 } from 'lucide-react'
import { Tenant } from '../types'

interface DisableTenantDialogProps {
  tenant: Tenant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDisabling: boolean
}

export function DisableTenantDialog({
  tenant,
  open,
  onOpenChange,
  onConfirm,
  isDisabling,
}: DisableTenantDialogProps) {
  // Keyed by tenant so a result for a previous tenant reads as still loading. count null = failed.
  const [result, setResult] = useState<{ tenantId: string; count: number | null } | null>(null)
  const tenantId = tenant?.tenantId

  useEffect(() => {
    if (!open || !tenantId) return
    let cancelled = false
    fetch(`/api/system-admin/tenants/${encodeURIComponent(tenantId)}/active-agents`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const body: { count: number } = await res.json()
        if (!cancelled) setResult({ tenantId, count: body.count })
      })
      .catch(() => {
        if (!cancelled) setResult({ tenantId, count: null })
      })
    return () => {
      cancelled = true
      setResult(null)
    }
  }, [open, tenantId])

  // undefined = loading, null = failed to load
  const activeCount = result && result.tenantId === tenantId ? result.count : undefined

  const agentsLine =
    activeCount === undefined ? (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Counting active agents…
      </span>
    ) : activeCount === null ? (
      'All of its active agents will be deactivated (the count could not be loaded).'
    ) : activeCount === 0 ? (
      'It has no active agents.'
    ) : (
      <>
        <span className="font-medium text-foreground">
          {activeCount} active {activeCount === 1 ? 'agent' : 'agents'}
        </span>{' '}
        will be deactivated in the background.
      </>
    )

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disable tenant?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Users will lose access to{' '}
                <span className="font-medium text-foreground">{tenant?.name}</span>{' '}
                (<span className="font-mono">{tenant?.tenantId}</span>).
              </p>
              <p>{agentsLine}</p>
              <p>Re-enabling the tenant does not reactivate its agents.</p>
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
            Disable
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
