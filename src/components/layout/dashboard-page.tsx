'use client'

import { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

type DashboardPageWidth = 'default' | 'narrow'

const WIDTH_CLASSES: Record<DashboardPageWidth, string> = {
  default: 'container mx-auto max-w-7xl',
  narrow: 'container mx-auto max-w-3xl',
}

const DashboardPageContext = createContext<DashboardPageWidth>('default')

function useDashboardPageWidth() {
  return useContext(DashboardPageContext)
}

interface DashboardPageProps {
  children: React.ReactNode
  /** `default` for list/table pages; `narrow` for form pages. */
  width?: DashboardPageWidth
  className?: string
}

/**
 * Shared shell for dashboard inner pages.
 * Keeps content width and padding consistent across admin/settings routes.
 */
export function DashboardPage({
  children,
  width = 'default',
  className,
}: DashboardPageProps) {
  return (
    <DashboardPageContext.Provider value={width}>
      <div
        className={cn(
          'min-h-screen bg-gradient-to-br from-background via-background to-muted/10',
          className
        )}
      >
        {children}
      </div>
    </DashboardPageContext.Provider>
  )
}

interface DashboardPageHeaderProps {
  title: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

/**
 * Sticky page header aligned to the same content width as DashboardPageBody.
 */
export function DashboardPageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: DashboardPageHeaderProps) {
  const width = useDashboardPageWidth()

  return (
    <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
      <div className={cn(WIDTH_CLASSES[width], 'p-4 sm:p-6', className)}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground sm:gap-3 sm:text-2xl">
              {icon}
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}

interface DashboardPageBodyProps {
  children: React.ReactNode
  className?: string
}

/**
 * Main content region with shared horizontal padding and max-width.
 */
export function DashboardPageBody({ children, className }: DashboardPageBodyProps) {
  const width = useDashboardPageWidth()

  return (
    <div className={cn(WIDTH_CLASSES[width], 'space-y-4 p-4 sm:p-6', className)}>
      {children}
    </div>
  )
}
