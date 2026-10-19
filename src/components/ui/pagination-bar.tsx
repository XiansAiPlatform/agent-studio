'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface PaginationBarProps {
  page: number
  onPageChange: (page: number) => void
  /** Known page count. Omit when the API only reports whether another page exists. */
  totalPages?: number
  hasNext?: boolean
  hasPrevious?: boolean
  totalCount?: number
  /** Singular noun, such as "log". Pluralized in the summary. */
  itemNoun?: string
  loading?: boolean
  /**
   * `bar` puts the page summary on the left and the arrows on the right.
   * `compact` centers the arrows around the page indicator for narrow spaces.
   */
  variant?: 'bar' | 'compact'
  /** Top border and inset padding, for the foot of a card or sidebar. */
  attached?: boolean
  /** Hide the arrows when there is only one page. A `totalCount` still renders on its own. */
  hideSinglePage?: boolean
  className?: string
}

function pluralize(noun: string, count: number) {
  if (count === 1) return noun
  return noun.endsWith('s') ? noun : `${noun}s`
}

function countSummary(totalCount: number, itemNoun?: string) {
  const count = totalCount.toLocaleString()
  return itemNoun ? `${count} ${pluralize(itemNoun, totalCount)}` : `${count} total`
}

function pageSummary({
  page,
  totalPages,
  totalCount,
  itemNoun,
}: Pick<PaginationBarProps, 'page' | 'totalPages' | 'totalCount' | 'itemNoun'>) {
  const pages =
    totalPages != null ? `Page ${page} of ${Math.max(totalPages, 1)}` : `Page ${page}`
  if (totalCount == null) return pages
  return `${pages} · ${countSummary(totalCount, itemNoun)}`
}

export function PaginationBar({
  page,
  onPageChange,
  totalPages,
  hasNext,
  hasPrevious,
  totalCount,
  itemNoun,
  loading = false,
  variant = 'bar',
  attached = false,
  hideSinglePage = true,
  className,
}: PaginationBarProps) {
  const canGoBack = hasPrevious ?? page > 1
  const canGoForward = hasNext ?? (totalPages != null ? page < totalPages : false)
  const singlePage = totalPages != null ? totalPages <= 1 : !canGoBack && !canGoForward

  if (hideSinglePage && singlePage) {
    if (totalCount == null) return null
    return (
      <p
        className={cn(
          'text-xs tabular-nums text-muted-foreground',
          attached && 'border-t border-border/50 px-4 py-2',
          className
        )}
      >
        {countSummary(totalCount, itemNoun)}
      </p>
    )
  }

  const previous = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
      aria-label="Previous page"
      disabled={!canGoBack || loading}
      onClick={() => onPageChange(page - 1)}
    >
      <ChevronLeft />
    </Button>
  )

  const next = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-muted-foreground"
      aria-label="Next page"
      disabled={!canGoForward || loading}
      onClick={() => onPageChange(page + 1)}
    >
      <ChevronRight />
    </Button>
  )

  if (variant === 'compact') {
    return (
      <nav
        aria-label="Pagination"
        className={cn(
          'flex items-center justify-center',
          attached && 'border-t border-border/50 px-2 py-1.5',
          className
        )}
      >
        {previous}
        <span className="min-w-10 text-center text-xs tabular-nums text-muted-foreground">
          {totalPages != null ? `${page} / ${Math.max(totalPages, 1)}` : page}
        </span>
        {next}
      </nav>
    )
  }

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-3 gap-y-1',
        attached && 'border-t border-border/50 px-4 py-2',
        className
      )}
    >
      <p className="text-xs tabular-nums text-muted-foreground">
        {pageSummary({ page, totalPages, totalCount, itemNoun })}
      </p>
      <div className="flex items-center">
        {previous}
        {next}
      </div>
    </nav>
  )
}
