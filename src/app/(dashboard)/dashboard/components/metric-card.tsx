import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  value: number
  label: string
  description: string
  href?: string
  /** Optional caption, e.g. period scope for message stats */
  caption?: string
}

export function MetricCard({ value, label, description, href, caption }: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-baseline gap-3 mb-1.5 min-w-0">
        <div
          className={cn(
            'text-4xl sm:text-5xl font-light tabular-nums tracking-tight text-foreground truncate',
            href && 'group-hover:text-foreground/70 transition-colors'
          )}
        >
          {value}
        </div>
        <div className="h-7 w-px shrink-0 bg-border" />
      </div>
      <div className="space-y-0.5 min-w-0">
        <div
          className={cn(
            'text-sm font-medium text-foreground/80 truncate',
            href && 'group-hover:text-foreground transition-colors'
          )}
        >
          {label}
        </div>
        <div className="text-xs text-muted-foreground truncate">{description}</div>
        {caption && (
          <div className="text-[11px] text-muted-foreground/70 truncate pt-0.5">{caption}</div>
        )}
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className="group block min-w-0">
        {content}
      </Link>
    )
  }

  return <div className="min-w-0">{content}</div>
}

export function MetricCardSkeleton() {
  return (
    <div className="space-y-2 min-w-0 animate-pulse">
      <div className="h-10 w-16 rounded bg-muted/60" />
      <div className="h-4 w-24 rounded bg-muted/50" />
      <div className="h-3 w-20 rounded bg-muted/40" />
    </div>
  )
}
