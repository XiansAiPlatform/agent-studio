'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ChevronDown, ChevronRight, History, Loader2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/page-loader'
import { useWebhookDeliveries } from '../../hooks/use-webhook-deliveries'
import { DeliveryDetail } from '../../components/delivery-detail'
import { ReceivedAt } from '../../components/received-at'

interface ConnectionSummary {
  name: string
  agentName?: string
  activationName?: string
}

function connectionsHref(connection: ConnectionSummary | null): string {
  if (!connection?.agentName || !connection.activationName) return '/settings/connections'
  const query = new URLSearchParams({
    agentName: connection.agentName,
    activationName: connection.activationName,
  })
  return `/settings/connections?${query}`
}

export default function WebhookDeliveriesPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading deliveries..." className="py-24" />}>
      <WebhookDeliveriesContent />
    </Suspense>
  )
}

function WebhookDeliveriesContent() {
  const { integrationId } = useParams<{ integrationId: string }>()
  const searchParams = useSearchParams()
  const [connection, setConnection] = useState<ConnectionSummary | null>(null)
  // `?delivery=<id>` (from the details sheet) opens that delivery and scrolls to it once it is listed.
  const [expandedId, setExpandedId] = useState<string | null>(() => searchParams.get('delivery'))
  const scrollTarget = useRef<string | null>(searchParams.get('delivery'))

  const { items, hasMore, isLoading, isLoadingMore, error, reload, loadMore } = useWebhookDeliveries(integrationId)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/integrations/${encodeURIComponent(integrationId)}`, { signal: controller.signal })
      .then(response => (response.ok ? response.json() : null))
      .then(data => data && setConnection(data))
      .catch(() => {
        // The header falls back to a generic title; the list shows its own error.
      })
    return () => controller.abort()
  }, [integrationId])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-4 sm:p-6 space-y-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground min-w-0">
            <Link href={connectionsHref(connection)} className="hover:text-foreground">
              Connections
            </Link>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="truncate">{connection?.name ?? 'Webhook'}</span>
            <ChevronRight className="h-3 w-3 shrink-0" />
            <span className="text-foreground">Deliveries</span>
          </nav>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 sm:gap-3">
              <History className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              Deliveries
            </h1>
            {connection && (
              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs sm:text-sm">
                <span className="font-medium truncate">{connection.name}</span>
                {connection.agentName && <Badge variant="secondary">{connection.agentName}</Badge>}
                {connection.activationName && <Badge variant="outline">{connection.activationName}</Badge>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 sm:p-6 space-y-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Only the latest 100 deliveries are kept; older ones are removed automatically.
        </p>

        {isLoading ? (
          <PageLoader label="Loading deliveries..." className="py-24" />
        ) : error && items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
              <XCircle className="h-10 w-10 text-red-500" />
              <p>{error}</p>
              <Button variant="outline" onClick={reload}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No deliveries yet. Calls that trigger this webhook connection will appear here.
            </CardContent>
          </Card>
        ) : (
          <Card className="py-0">
            <ul className="divide-y">
              {items.map(item => {
                const expanded = expandedId === item.id
                return (
                  <li
                    key={item.id}
                    className="scroll-mt-40"
                    ref={element => {
                      if (element && scrollTarget.current === item.id) {
                        scrollTarget.current = null
                        element.scrollIntoView({ block: 'start' })
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                      aria-expanded={expanded}
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                    >
                      {expanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <code className="rounded bg-muted px-2 py-0.5 text-xs truncate min-w-0" title={item.requestId}>
                        {item.requestId}
                      </code>
                      {(item.bodyTruncated || item.headersTruncated) && (
                        <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                          Truncated
                        </Badge>
                      )}
                      <span className="ml-auto">
                        <ReceivedAt value={item.receivedAt} />
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 sm:pl-11">
                        <DeliveryDetail integrationId={integrationId} deliveryId={item.id} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        {items.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {hasMore && (
              <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Showing {items.length} {items.length === 1 ? 'delivery' : 'deliveries'}
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
