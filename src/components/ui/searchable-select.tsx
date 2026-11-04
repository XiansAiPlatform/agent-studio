'use client'

import * as React from 'react'
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchableSelectOption {
  value: string
  label: string
  /** Small muted text on the right (e.g. "active"). */
  hint?: string
  /** Optional colored dot class (e.g. "bg-green-500"). */
  dotClassName?: string
}

interface SearchableSelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder: string
  searchPlaceholder?: string
  /** Noun used in "N of M <noun>" and "No <noun> match". */
  noun?: string
  isLoading?: boolean
  error?: string | null
  disabled?: boolean
  invalid?: boolean
  /** Fires each time the list opens; use it to fetch the options. */
  onOpen?: () => void
}

// Keeps very large lists responsive; the user narrows with search.
const MAX_RENDERED = 100

function highlight(label: string, query: string) {
  if (!query) return label
  const index = label.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return label
  return (
    <>
      {label.slice(0, index)}
      <mark className="rounded-sm bg-yellow-200/70 text-inherit dark:bg-yellow-500/30">
        {label.slice(index, index + query.length)}
      </mark>
      {label.slice(index + query.length)}
    </>
  )
}

export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search',
  noun = 'items',
  isLoading,
  error,
  disabled,
  invalid,
  onOpen,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)

  const trimmed = query.trim()
  const filtered = React.useMemo(() => {
    if (!trimmed) return options
    const q = trimmed.toLowerCase()
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, trimmed])
  const visible = filtered.slice(0, MAX_RENDERED)
  const selected = options.find((o) => o.value === value)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (next) {
      setQuery('')
      setActive(0)
      onOpen?.()
    }
  }

  // The list renders inline (not in a portal): inside a Sheet, a portalled
  // search input loses focus to the sheet's focus trap and can't be typed into.
  React.useEffect(() => {
    if (!open) return
    searchRef.current?.focus()
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const select = (next: string) => {
    onChange(next)
    setOpen(false)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, visible.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const option = visible[active]
      if (option) select(option.value)
    }
  }

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <div ref={rootRef} className="relative space-y-1" onKeyDown={onKeyDown}>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || !!error}
            disabled={disabled}
            onClick={() => handleOpenChange(!open)}
            className={cn(
              'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none',
              'focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
              (invalid || error) && 'border-destructive'
            )}
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected?.label ?? placeholder}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              {selected && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear selection"
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      onChange('')
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </span>
          </button>
      {open && (
        <div className="absolute left-0 right-0 top-9 z-50 rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div ref={listRef} role="listbox" className="max-h-60 overflow-y-auto py-1">
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading {noun}…
              </div>
            ) : error ? (
              <div className="px-3 py-4 text-sm text-destructive">{error}</div>
            ) : visible.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                {trimmed ? `No ${noun} match “${trimmed}”` : `No ${noun} available`}
              </div>
            ) : (
              visible.map((option, index) => (
                <div
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => select(option.value)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-sm',
                    index === active && 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {option.dotClassName && (
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', option.dotClassName)} />
                    )}
                    <span className="truncate">{highlight(option.label, trimmed)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {option.hint && (
                      <span className="text-xs text-muted-foreground">{option.hint}</span>
                    )}
                    {option.value === value && <Check className="h-4 w-4" />}
                  </span>
                </div>
              ))
            )}
          </div>

          {!isLoading && !error && options.length > 0 && (
            <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
              {filtered.length > MAX_RENDERED
                ? `Showing ${MAX_RENDERED} of ${filtered.length} ${noun} — refine your search`
                : `${filtered.length} of ${options.length} ${noun}`}
            </div>
          )}
        </div>
      )}
      {error && !open && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
