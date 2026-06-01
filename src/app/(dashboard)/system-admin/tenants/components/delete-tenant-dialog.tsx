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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { Tenant } from '../types'

interface DeleteTenantDialogProps {
  tenant: Tenant | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

export function DeleteTenantDialog({
  tenant,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteTenantDialogProps) {
  const [confirmText, setConfirmText] = useState('')

  useEffect(() => {
    if (!open) setConfirmText('')
  }, [open])

  const canDelete = confirmText.trim() === tenant?.tenantId

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete tenant permanently?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes{' '}
            <span className="font-medium text-foreground">{tenant?.name}</span>{' '}
            (<span className="font-mono">{tenant?.tenantId}</span>) and cannot be
            undone. To confirm, type the tenant ID below.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-tenant-id" className="sr-only">
            Tenant ID
          </Label>
          <Input
            id="confirm-tenant-id"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={tenant?.tenantId}
            autoComplete="off"
            disabled={isDeleting}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              if (canDelete) onConfirm()
            }}
            disabled={isDeleting || !canDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
