'use client'

import Link from 'next/link'
import { ExternalLink, History, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useWebhookDeliveries } from '../hooks/use-webhook-deliveries'
import { deliveriesPageHref, deliveryLabel } from '../utils/deliveries'
import { ReceivedAt } from './received-at'

const LATEST_COUNT = 5

/** The latest calls a builtin webhook received, shown in the connection details sheet. */
export function DeliveriesCard({ integrationId }: { integrationId: string }) {
  const { items, isLoading, error, reload } = useWebhookDeliveries(integrationId, { pageSize: LATEST_COUNT })

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <History className="h-4 w-4" />
        Deliveries
      </h3>
      <div className="pl-0 sm:pl-6 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-label="Loading deliveries" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={reload}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No deliveries yet. Calls that trigger this webhook connection will appear here.
          </p>
        ) : (
          <>
            <ul className="rounded-md border divide-y">
              {items.map(item => (
                <li key={item.id}>
                  <Link
                    href={deliveriesPageHref(integrationId, item.id)}
                    className="group flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
                    title="Open this delivery"
                  >
                    <code className="text-xs truncate min-w-0">{deliveryLabel(item)}</code>
                    {item.redeliveryOf && (
                      <Badge variant="secondary" className="shrink-0">
                        Redelivery
                      </Badge>
                    )}
                    <span className="ml-auto shrink-0">
                      <ReceivedAt value={item.receivedAt} />
                    </span>
                    <ExternalLink
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <Button variant="outline" size="sm" asChild>
              <Link href={deliveriesPageHref(integrationId)}>
                View all deliveries
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
