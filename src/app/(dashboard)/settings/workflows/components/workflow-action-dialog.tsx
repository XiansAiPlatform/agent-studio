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

interface WorkflowActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'cancel' | 'terminate'
  workflowId: string | null
  onConfirm: () => Promise<void>
  isWorking: boolean
}

export function WorkflowActionDialog({
  open,
  onOpenChange,
  mode,
  workflowId,
  onConfirm,
  isWorking,
}: WorkflowActionDialogProps) {
  const isTerminate = mode === 'terminate'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isTerminate ? 'Terminate this workflow?' : 'Cancel this workflow?'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                {isTerminate
                  ? 'Termination stops the workflow immediately. In-flight work may be left incomplete. This cannot be undone.'
                  : 'Cancel requests a graceful stop. The workflow may still run cleanup activities before closing.'}
              </p>
              {workflowId && (
                <p className="font-mono text-xs text-foreground break-all">{workflowId}</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isWorking}>Keep running</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={isWorking}
            className={
              isTerminate
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : undefined
            }
          >
            {isWorking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isTerminate ? 'Terminate' : 'Cancel workflow'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
