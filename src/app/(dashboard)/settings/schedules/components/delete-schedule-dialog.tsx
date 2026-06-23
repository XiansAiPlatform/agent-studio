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
import { Loader2 } from 'lucide-react'

interface DeleteScheduleDialogProps {
  /** When set, deletes a single schedule; when null and `deleteAll`, deletes all. */
  scheduleLabel?: string | null
  /** Whether this confirms deleting every schedule for the agent. */
  deleteAll?: boolean
  agentName?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
}

export function DeleteScheduleDialog({
  scheduleLabel,
  deleteAll = false,
  agentName,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteScheduleDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deleteAll ? 'Delete all schedules?' : 'Delete this schedule?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteAll ? (
              <>
                Every schedule for{' '}
                <span className="font-medium text-foreground">{agentName}</span>{' '}
                will be permanently removed. Any recurring workflows tied to these
                schedules will stop running. This action cannot be undone.
              </>
            ) : (
              <>
                The schedule{' '}
                <span className="font-medium text-foreground">{scheduleLabel}</span>{' '}
                will be permanently removed and will no longer trigger its workflow.
                This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isDeleting}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleteAll ? 'Delete All' : 'Delete Schedule'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
