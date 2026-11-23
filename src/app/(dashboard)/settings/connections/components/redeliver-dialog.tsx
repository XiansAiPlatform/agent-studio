'use client'

import { AlertTriangle, Loader2, RotateCcw } from 'lucide-react'
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
import { deliveryLabel } from '../utils/deliveries'
import type { WebhookDeliveryDetail } from '../types'

interface RedeliverDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  delivery: WebhookDeliveryDetail
  onConfirm: () => void
  isSending: boolean
}

/** Confirms a redelivery, which sends a real call and runs the agent again. */
export function RedeliverDialog({ open, onOpenChange, delivery, onConfirm, isSending }: RedeliverDialogProps) {
  return (
    // Stays open while sending, so the result is not lost behind a closed dialog.
    <AlertDialog open={open} onOpenChange={next => !isSending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <Badge variant="outline" className="w-fit">
            Developer only
          </Badge>
          <AlertDialogTitle>Redeliver this webhook?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                The original payload and headers are sent again as a real POST to this webhook&apos;s live URL.
              </p>

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-muted p-3 text-xs">
                <dt className="text-muted-foreground">Original delivery</dt>
                <dd className="font-mono [overflow-wrap:anywhere]">{deliveryLabel(delivery)}</dd>
                <dt className="text-muted-foreground">Received</dt>
                <dd>{new Date(delivery.receivedAt).toLocaleString()}</dd>
                <dt className="text-muted-foreground">Added header</dt>
                <dd className="font-mono [overflow-wrap:anywhere]">
                  X-Xians-Redelivery-Of: {delivery.redeliveryOf || delivery.id}
                </dd>
              </dl>

              <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>The agent runs again and may repeat its side effects, for example posting a second PR comment.</p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSending}
            onClick={event => {
              // Closing is left to the caller, once the webhook has answered.
              event.preventDefault()
              onConfirm()
            }}
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {isSending ? 'Redelivering…' : 'Redeliver now'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
