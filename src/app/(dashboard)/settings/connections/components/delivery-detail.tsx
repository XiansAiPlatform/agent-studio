'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Copy, ExternalLink, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'
import { fetchWebhookDelivery } from '../hooks/use-webhook-deliveries'
import {
  PAYLOAD_PREVIEW_CHARS,
  formatBytes,
  formatHeaders,
  formatPayload,
  payloadBytes,
  workflowLogsHref,
} from '../utils/deliveries'
import type { WebhookDeliveryDetail } from '../types'

interface DeliveryDetailProps {
  integrationId: string
  deliveryId: string
}

/** Headers and payload of one delivery. Loaded when it is first shown, not with the list. */
export function DeliveryDetail({ integrationId, deliveryId }: DeliveryDetailProps) {
  const [attempt, setAttempt] = useState(0)
  const [showFullPayload, setShowFullPayload] = useState(false)
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
          <h4 className="font-semibold">Request headers</h4>
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
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">
            {headersText}
          </pre>
        ) : (
          <p className="rounded-md bg-muted p-3 text-muted-foreground">No headers were recorded.</p>
        )}
      </section>

      <section className="space-y-2">
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
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">
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

      <div className="pt-2 border-t">
        <div className="text-xs text-muted-foreground min-w-0 space-y-1">
          <p>
            Workflow <code className="break-all">{delivery.workflowId}</code>
          </p>
          <Link
            href={workflowLogsHref(delivery.workflowId)}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open workflow
          </Link>
        </div>
      </div>
    </div>
  )
}
