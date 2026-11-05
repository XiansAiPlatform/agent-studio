import { formatDistanceToNow } from 'date-fns'

/** Relative receive time ("5 minutes ago") with the full local time on hover. */
export function ReceivedAt({ value }: { value: string }) {
  const date = new Date(value)
  return (
    <time dateTime={value} title={date.toLocaleString()} className="text-xs text-muted-foreground whitespace-nowrap">
      {formatDistanceToNow(date, { addSuffix: true })}
    </time>
  )
}
