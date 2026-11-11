'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Copy, Loader2, RotateCcw, ScrollText, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'
import { RedeliveryError, fetchWebhookDelivery, redeliverWebhookDelivery } from '../hooks/use-webhook-deliveries'
import {
  PAYLOAD_PREVIEW_CHARS,
  canBeRedelivered,
  formatBytes,
  formatDuration,
  formatHeaders,
  formatPayload,
  payloadBytes,
  workflowLogsHref,
} from '../utils/deliveries'
import { RedeliverDialog } from './redeliver-dialog'
import type { WebhookDeliveryDetail, WebhookRedeliveryResult } from '../types'

interface DeliveryDetailProps {
  integrationId: string
  deliveryId: string
  /** Whether the user holds `webhooks:redeliver`. The server checks it again. */
  canRedeliver?: boolean
  /** Called after a redelivery the webhook recorded, with the new delivery. */
  onRedelivered?: (result: WebhookRedeliveryResult) => void
  /** Called when a redelivery failed in a way that may still have sent the call, so the list can be refreshed. */
  onRedeliveryUncertain?: () => void
}

/** Headers and payload of one delivery. Loaded when it is first shown, not with the list. */
export function DeliveryDetail({
  integrationId,
  deliveryId,
  canRedeliver = false,
  onRedelivered,
  onRedeliveryUncertain,
}: DeliveryDetailProps) {
  const [attempt, setAttempt] = useState(0)
  const [showFullPayload, setShowFullPayload] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isRedelivering, setIsRedelivering] = useState(false)
  const requestKey = `${integrationId}:${deliveryId}:${attempt}`
  // Each result remembers which request it answers, so a stale one is never shown.
  const [result, setResult] = useState<{
    key: string
    delivery: WebhookDeliveryDetail | null
    error: string | null
  } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchWebhookDelivery(integrationId, deliveryId, controller.signal)
      .then(delivery => setResult({ key: requestKey, delivery, error: null }))
      .catch(err => {
        if (controller.signal.aborted) return
        const message = err instanceof Error ? err.message : 'Failed to load delivery'
        setResult({ key: requestKey, delivery: null, error: message })
      })
    return () => controller.abort()
  }, [integrationId, deliveryId, requestKey])

  const current = result?.key === requestKey ? result : null
  const delivery = current?.delivery ?? null
  const error = current?.error ?? null

  // Everything derived from the body is computed once per delivery, not on every render.
  const view = useMemo(
    () =>
      delivery
        ? {
            payload: formatPayload(delivery.body, delivery.contentType),
            bytes: payloadBytes(delivery.body),
            headersText: formatHeaders(delivery.headers),
            hiddenCount: delivery.headers.filter(header => header.masked).length,
          }
        : null,
    [delivery]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
        <XCircle className="h-6 w-6 text-red-500" />
        <p>{error}</p>
        <Button variant="outline" size="sm" onClick={() => setAttempt(n => n + 1)}>
          Retry
        </Button>
      </div>
    )
  }

  if (!delivery || !view) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading delivery" />
      </div>
    )
  }

  const { payload, bytes, headersText, hiddenCount } = view
  const payloadCut = !showFullPayload && payload.text.length > PAYLOAD_PREVIEW_CHARS
  const shownPayload = payloadCut ? payload.text.slice(0, PAYLOAD_PREVIEW_CHARS) : payload.text

  const redeliver = async () => {
    setIsRedelivering(true)
    try {
      const result = await redeliverWebhookDelivery(integrationId, delivery.id)
      setConfirmOpen(false)
      const answer = `answered ${result.statusCode} in ${formatDuration(result.durationMs)}`
      if (result.deliveryId) {
        showSuccessToast(`Redelivered · ${answer}`)
        onRedelivered?.(result)
      } else {
        // Turned away before it was recorded, e.g. the webhook's API key was revoked.
        showErrorToast(new Error(`The webhook ${answer} and did not accept the call.`), 'Redelivery was rejected')
      }
    } catch (err) {
      if (err instanceof RedeliveryError && err.outcomeUnknown) {
        // The call may have run the agent already; a blind retry would run it again.
        setConfirmOpen(false)
        showErrorToast(
          new Error('It may still have been sent. Check the list for a new delivery before trying again.'),
          'Could not confirm the redelivery'
        )
        onRedeliveryUncertain?.()
      } else {
        showErrorToast(err, 'Could not redeliver')
      }
    } finally {
      setIsRedelivering(false)
    }
  }

  // The clipboard is unavailable on non-secure origins and can be denied, so report a failed copy.
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showSuccessToast(`${what} copied to clipboard`)
    } catch (err) {
      showErrorToast(err, `Could not copy the ${what.toLowerCase()}`)
    }
  }

  return (
    <div className="space-y-5 text-sm">
      {delivery.redeliveryOf && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md border p-3 text-xs">
          <dt className="text-muted-foreground">Redelivery of</dt>
          <dd className="font-mono [overflow-wrap:anywhere]">{delivery.redeliveryOfRequestId || delivery.redeliveryOf}</dd>
          <dt className="text-muted-foreground">Triggered by</dt>
          <dd className="[overflow-wrap:anywhere]">{delivery.triggeredBy || 'Unknown'}</dd>
          <dt className="text-muted-foreground">Request ID</dt>
          <dd className="font-mono [overflow-wrap:anywhere]">{delivery.requestId}</dd>
        </dl>
      )}

      {delivery.bodyTruncated && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>This payload was over 16 MB and was stored truncated. It can&apos;t be redelivered.</p>
        </div>
      )}

      {delivery.headersTruncated && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>The headers were over 16 KB and the longest values were cut. This call can&apos;t be redelivered.</p>
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold">Headers</h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {hiddenCount > 0 && <span>{hiddenCount} hidden</span>}
            <span>
              {delivery.headers.length} {delivery.headers.length === 1 ? 'header' : 'headers'}
            </span>
            <Button variant="ghost" size="sm" onClick={() => copy(headersText, 'Headers')} disabled={delivery.headers.length === 0}>
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>
        </div>
        {delivery.headers.length > 0 ? (
          // Five lines tall (1rem each) plus the padding; the rest scrolls.
          <pre className="max-h-[6.5rem] overflow-auto rounded-md bg-muted p-3 text-xs leading-4 whitespace-pre-wrap break-all">
            {headersText}
          </pre>
        ) : (
          <p className="rounded-md bg-muted p-3 text-muted-foreground">No headers were recorded.</p>
        )}
      </section>

      <section className="space-y-2 pt-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold">Payload</h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{delivery.contentType || 'No content type'}</span>
            <span>{formatBytes(bytes)}</span>
            <Button variant="ghost" size="sm" onClick={() => copy(delivery.body, 'Payload')} disabled={!delivery.body}>
              <Copy className="h-3 w-3" />
              Copy
            </Button>
          </div>
        </div>
        {delivery.body ? (
          <>
            <pre className="max-h-[11.5rem] overflow-auto rounded-md bg-muted p-3 text-xs leading-4 whitespace-pre-wrap break-all">
              {shownPayload}
            </pre>
            {payloadCut && (
              <Button variant="link" size="sm" className="px-0" onClick={() => setShowFullPayload(true)}>
                Show full payload ({formatBytes(bytes)})
              </Button>
            )}
          </>
        ) : (
          <p className="rounded-md bg-muted p-3 text-muted-foreground">Empty payload.</p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" asChild>
          <Link href={workflowLogsHref(delivery.workflowId)} title={delivery.workflowId}>
            <ScrollText className="h-3.5 w-3.5" />
            Logs
          </Link>
        </Button>
        {canRedeliver && (
          <Button
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={!canBeRedelivered(delivery) || isRedelivering}
            title={canBeRedelivered(delivery) ? undefined : 'Stored truncated, so it cannot be redelivered'}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Redeliver
          </Button>
        )}
      </div>

      {canRedeliver && (
        <RedeliverDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          delivery={delivery}
          onConfirm={redeliver}
          isSending={isRedelivering}
        />
      )}
    </div>
  )
}
